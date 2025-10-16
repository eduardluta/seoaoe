import Redis from "ioredis";

// Initialize Redis client
// If REDIS_URL is not provided, Redis will default to localhost:6379
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  // Retry strategy: exponential backoff
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  // Connection timeout
  connectTimeout: 10000,
  // Max retry attempts
  maxRetriesPerRequest: 3,
  // Enable offline queue
  enableOfflineQueue: true,
});

redis.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

redis.on("connect", () => {
  console.log("Redis Client Connected");
});

redis.on("ready", () => {
  console.log("Redis Client Ready");
});

export { redis };

/**
 * Generate a cache key for a run request
 */
export function generateCacheKey(
  keyword: string,
  domain: string,
  country: string,
  language: string
): string {
  // Normalize inputs to ensure consistent keys
  const normalizedKeyword = keyword.trim().toLowerCase();
  const normalizedDomain = domain.trim().toLowerCase();
  const normalizedCountry = country.trim().toUpperCase();
  const normalizedLanguage = language.trim().toLowerCase();

  return `aoe:${normalizedKeyword}:${normalizedDomain}:${normalizedCountry}:${normalizedLanguage}`;
}

/**
 * Get cached results for a run request
 * Returns null if cache miss
 */
export async function getCachedResults(cacheKey: string): Promise<unknown> {
  try {
    const cached = await redis.get(cacheKey);
    if (!cached) {
      return null;
    }
    return JSON.parse(cached);
  } catch (error) {
    console.error("Error getting cached results:", error);
    return null;
  }
}

/**
 * Store results in cache
 * TTL: 24 hours (86400 seconds)
 */
export async function setCachedResults(
  cacheKey: string,
  results: unknown,
  ttl: number = 86400
): Promise<void> {
  try {
    await redis.setex(cacheKey, ttl, JSON.stringify(results));
  } catch (error) {
    console.error("Error setting cached results:", error);
  }
}
