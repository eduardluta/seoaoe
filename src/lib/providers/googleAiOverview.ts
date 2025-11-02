"use server";

import type { RunRequest } from "../validation";
import { buildDomainRegex } from "../domainRegex";

type ProviderRunResult = {
  mentioned: boolean;
  position?: number | null;
  snippet?: string | null;
  rawText: string;
  latencyMs?: number | null;
  costUsd?: number | null;
};

type SerpApiSnippet = {
  answer?: string;
  follow_up_questions?: string[];
  cited_sources?: Array<{
    link?: string;
    title?: string;
    source?: string;
  }>;
};

type SerpApiResponse = {
  ai_snippets?: SerpApiSnippet[];
  answer_box?: {
    snippet?: string;
    link?: string;
    title?: string;
  };
  organic_results?: Array<{
    link?: string;
    title?: string;
  }>;
  error?: string;
};

const ESTIMATED_COST_PER_REQUEST = 0.01; // $50 / 5000 queries on standard SerpAPI plan

/**
 * Fetch Google AI Overview via SerpAPI and detect domain mentions.
 */
export async function checkWithGoogleAiOverview(input: RunRequest): Promise<ProviderRunResult> {
  const { keyword, domain, country, language } = input;

  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new Error("SERPAPI_API_KEY is not configured");
  }

  const params = new URLSearchParams({
    engine: "google",
    api_key: apiKey,
    q: keyword,
    udm: "14", // Force Google to serve AI Overview when available
    hl: language.toLowerCase(),
    gl: country.toLowerCase(),
    num: "10",
  });

  const requestUrl = `https://serpapi.com/search.json?${params.toString()}`;
  const startedAt = Date.now();

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 50000); // 50 second timeout

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        "User-Agent": "seoaoe-bot/1.0",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      throw new Error(`SerpAPI request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as SerpApiResponse;

    if (payload.error) {
      throw new Error(`SerpAPI error: ${payload.error}`);
    }

    const aiSnippets = Array.isArray(payload.ai_snippets) ? payload.ai_snippets : [];
    const combinedSnippetText = aiSnippets
      .map((snippet) => {
        const answerText = typeof snippet.answer === "string" ? snippet.answer : "";
        const followUps = Array.isArray(snippet.follow_up_questions)
          ? snippet.follow_up_questions.join(". ")
          : "";
        const cited = Array.isArray(snippet.cited_sources)
          ? snippet.cited_sources
              .map((source) => [source.title, source.source, source.link].filter(Boolean).join(" – "))
              .filter(Boolean)
              .join("; ")
          : "";
        return [answerText, followUps, cited].filter(Boolean).join("\n");
      })
      .filter(Boolean)
      .join("\n\n");

    const rawText =
      combinedSnippetText.length > 0 ? combinedSnippetText : JSON.stringify(aiSnippets, null, 2);

    const domainRegex = buildDomainRegex(domain);
    const match = domainRegex.exec(combinedSnippetText);

    let mentioned = false;
    let snippet: string | null = null;
    let position: number | null = null;

    // Check 1: AI Overview text mentions
    if (match) {
      mentioned = true;
      position = match.index;

      const snippetStart = Math.max(0, match.index - 60);
      const snippetEnd = Math.min(
        combinedSnippetText.length,
        match.index + (match[0]?.length ?? domain.length) + 60
      );
      snippet = `AI Overview: ...${combinedSnippetText.slice(snippetStart, snippetEnd).trim()}...`;
    }

    // Check 2: Cited sources in AI Overview
    if (!mentioned) {
      const citedSources = aiSnippets.flatMap((entry) => entry.cited_sources ?? []);
      const sourceMatch = citedSources.find((source) => {
        if (!source.link) return false;
        try {
          const hostname = new URL(source.link).hostname.replace(/^www\./, "");
          return hostname.endsWith(domain);
        } catch {
          return source.link.includes(domain);
        }
      });

      if (sourceMatch) {
        mentioned = true;
        position = null;
        snippet = `AI Overview cited source: ${sourceMatch.title ?? sourceMatch.link ?? domain}`;
      }
    }

    // Check 3: Organic search results (positions 1-10)
    const organicResults = Array.isArray(payload.organic_results) ? payload.organic_results : [];
    const organicMatch = organicResults.findIndex((result) => {
      if (!result.link) return false;
      try {
        const hostname = new URL(result.link).hostname.replace(/^www\./, "");
        return hostname.endsWith(domain);
      } catch {
        return result.link.includes(domain);
      }
    });

    if (!mentioned && organicMatch !== -1) {
      mentioned = true;
      position = null; // Don't set position for organic results - no character position in text
      const result = organicResults[organicMatch];
      snippet = `Organic result #${organicMatch + 1}: ${result.title ?? result.link ?? domain}`;
    } else if (mentioned && organicMatch !== -1) {
      // Already mentioned in AI Overview, but also show organic position
      const result = organicResults[organicMatch];
      snippet = `${snippet} | Also in organic #${organicMatch + 1}: ${result.title ?? result.link}`;
    }

    // Always include top 5 organic results for context
    const top5Results = organicResults.slice(0, 5).map((result, idx) => {
      try {
        const hostname = result.link ? new URL(result.link).hostname.replace(/^www\./, "") : "N/A";
        return `#${idx + 1}: ${result.title ?? "No title"} (${hostname})`;
      } catch {
        return `#${idx + 1}: ${result.title ?? result.link ?? "Unknown"}`;
      }
    });

    const enhancedRawText = [
      "=== AI Overview ===",
      rawText || "No AI Overview available",
      "",
      "=== Top 5 Organic Results ===",
      top5Results.length > 0 ? top5Results.join("\n") : "No organic results found",
    ].join("\n");

    return {
      mentioned,
      position: position ?? null,
      snippet,
      rawText: enhancedRawText,
      latencyMs,
      costUsd: ESTIMATED_COST_PER_REQUEST,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error("SerpAPI request timed out after 50s");
    }
    throw error;
  }
}
