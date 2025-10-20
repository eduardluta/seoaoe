import Redis from "ioredis";

// Lazy Redis client initialization
// Only create the connection when it's actually used at runtime
let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    // Initialize Redis client
    // If REDIS_URL is not provided, Redis will default to localhost:6379
    redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
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
      // Prevent connection during build
      lazyConnect: true,
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

    // Only connect if not in build mode
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      redis.connect().catch((err) => {
        console.error("Failed to connect to Redis:", err);
      });
    }
  }
  return redis;
}

export { getRedisClient };

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
    const client = getRedisClient();
    const cached = await client.get(cacheKey);
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
    const client = getRedisClient();
    await client.setex(cacheKey, ttl, JSON.stringify(results));
  } catch (error) {
    console.error("Error setting cached results:", error);
  }
}
