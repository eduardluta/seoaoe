"use server";

import type { RunRequest } from "../validation";
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
 * Check Google Organic Search Results (top 10) for domain presence.
 * Returns the organic ranking position (1-10).
 * Use googleAiOverview provider for AI Overview mentions.
 */
export async function checkWithGoogleOrganic(input: RunRequest): Promise<ProviderRunResult> {
  const { keyword, domain, country, language } = input;

  try {
    // Fetch from SerpAPI (with caching - likely cached from Google AI Overview)
    const { data: payload, latencyMs, cached } = await fetchSerpApiData(keyword, country, language);

    const organicResults = Array.isArray(payload.organic_results) ? payload.organic_results : [];

    // Find domain in organic results
    const organicMatch = organicResults.findIndex((result) => {
      if (!result.link) return false;
      try {
        const hostname = new URL(result.link).hostname.replace(/^www\./, "");
        return hostname.endsWith(domain);
      } catch {
        return result.link.includes(domain);
      }
    });

    let mentioned = false;
    let position: number | null = null;
    let snippet: string | null = null;

    if (organicMatch !== -1) {
      mentioned = true;
      position = organicMatch + 1; // 1-indexed position (1st, 2nd, 3rd, etc.)
      const result = organicResults[organicMatch];
      snippet = `Ranked #${position} in organic results: ${result.title ?? result.link ?? domain}`;
    }

    // Build context with top 10 organic results
    const top10Results = organicResults.slice(0, 10).map((result, idx) => {
      try {
        const hostname = result.link ? new URL(result.link).hostname.replace(/^www\./, "") : "N/A";
        const isTarget = idx === organicMatch;
        const marker = isTarget ? " ← YOUR DOMAIN" : "";
        return `#${idx + 1}: ${result.title ?? "No title"} (${hostname})${marker}`;
      } catch {
        return `#${idx + 1}: ${result.title ?? result.link ?? "Unknown"}`;
      }
    });

    const rawText = [
      "=== Top 10 Organic Search Results ===",
      top10Results.length > 0 ? top10Results.join("\n") : "No organic results found",
      "",
      mentioned ? `✓ Your domain is ranked #${position}` : "✗ Your domain is not in the top 10 organic results",
    ].join("\n");

    return {
      mentioned,
      position: position ?? null,
      snippet,
      rawText,
      latencyMs,
      // Only charge once if using cached data (Google AI Overview already charged)
      costUsd: cached ? 0 : ESTIMATED_COST_PER_REQUEST,
    };
  } catch (error) {
    throw error;
  }
}
