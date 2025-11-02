"use server";

import type { RunRequest } from "../validation";
import { buildDomainRegex } from "../domainRegex";
import { fetchSerpApiData } from "./serpApiCache";

type ProviderRunResult = {
  mentioned: boolean;
  position?: number | null;
  snippet?: string | null;
  rawText: string;
  latencyMs?: number | null;
  costUsd?: number | null;
};

const ESTIMATED_COST_PER_REQUEST = 0.01; // $50 / 5000 queries on standard SerpAPI plan

/**
 * Check Google AI Overview for domain mentions.
 * Only checks AI Overview content (text and cited sources).
 * Use googleOrganic provider for organic search rankings.
 */
export async function checkWithGoogleAiOverview(input: RunRequest): Promise<ProviderRunResult> {
  const { keyword, domain, country, language } = input;

  try {
    // Fetch from SerpAPI (with caching)
    const { data: payload, latencyMs, cached } = await fetchSerpApiData(keyword, country, language);

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
      combinedSnippetText.length > 0 ? combinedSnippetText : "No AI Overview available";

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

    // Include top 5 organic results for context (but don't check them for mentions)
    const organicResults = Array.isArray(payload.organic_results) ? payload.organic_results : [];
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
      rawText,
      "",
      "=== Top 5 Organic Results (for context) ===",
      top5Results.length > 0 ? top5Results.join("\n") : "No organic results found",
    ].join("\n");

    return {
      mentioned,
      position: position ?? null,
      snippet,
      rawText: enhancedRawText,
      latencyMs,
      // Only charge once if using cached data (other provider will also use cache)
      costUsd: cached ? 0 : ESTIMATED_COST_PER_REQUEST,
    };
  } catch (error) {
    throw error;
  }
}
