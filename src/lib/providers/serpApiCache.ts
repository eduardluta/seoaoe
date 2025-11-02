/**
 * Shared SerpAPI cache to avoid duplicate API calls.
 *
 * When multiple providers (Google AI Overview + Google Organic) need the same
 * SerpAPI data, this cache ensures we only make one API call and share the result.
 *
 * Cache TTL: 5 minutes (enough for a single run session)
 */

type SerpApiResponse = {
  ai_snippets?: Array<{
    answer?: string;
    follow_up_questions?: string[];
    cited_sources?: Array<{
      link?: string;
      title?: string;
      source?: string;
    }>;
  }>;
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

type CacheEntry = {
  data: SerpApiResponse;
  timestamp: number;
  latencyMs: number;
};

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate cache key from request parameters
 */
function getCacheKey(keyword: string, country: string, language: string): string {
  return `${keyword}|${country}|${language}`.toLowerCase();
}

/**
 * Fetch Google search results via SerpAPI with caching
 */
export async function fetchSerpApiData(
  keyword: string,
  country: string,
  language: string
): Promise<{ data: SerpApiResponse; latencyMs: number; cached: boolean }> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new Error("SERPAPI_API_KEY is not configured");
  }

  const cacheKey = getCacheKey(keyword, country, language);

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      data: cached.data,
      latencyMs: cached.latencyMs,
      cached: true,
    };
  }

  // Fetch from API
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

    const data = (await response.json()) as SerpApiResponse;

    if (data.error) {
      throw new Error(`SerpAPI error: ${data.error}`);
    }

    // Store in cache
    cache.set(cacheKey, { data, timestamp: Date.now(), latencyMs });

    // Clean up old cache entries (simple cleanup: remove expired entries)
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp >= CACHE_TTL_MS) {
        cache.delete(key);
      }
    }

    return { data, latencyMs, cached: false };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error("SerpAPI request timed out after 50s");
    }
    throw error;
  }
}

/**
 * Clear the entire cache (useful for testing)
 */
export function clearSerpApiCache(): void {
  cache.clear();
}
