# SEO-AOE — AI Visibility Checker

**SEO-AOE** checks whether leading LLMs would **mention your website** for a given **keyword**, **country**, and **language**.
The application queries 6 major AI providers in parallel and returns binary results (mentioned / not mentioned) with evidence snippets, position index, latency, and cost tracking.

## Features
- ✅ Inputs: **Keyword**, **Domain**, **Country (ISO-2)**, **Language (ISO-639-1)**
- ✅ Parallel checks across **7 AI Providers**:
  - OpenAI (gpt-4o-mini)
  - Grok (grok-3)
  - DeepSeek (deepseek-chat)
  - Perplexity (sonar)
  - Google Gemini (gemini-2.0-flash-exp)
  - Anthropic Claude (claude-3-7-sonnet-20250219)
  - Google AI Overview (via SerpAPI)
- ✅ **Redis caching** for instant results on duplicate queries (24h TTL)
- ✅ **Regex** validation of mentions (anti-hallucination)
- ✅ **Real-time results** with provider-specific metrics
- ✅ **Admin dashboard** with full run history
- ✅ **Cost & latency tracking** per provider
- ✅ **Evidence snippets** showing exact mention location

## Tech Stack
- **Next.js 15.5.4** (App Router) + React 19 + Tailwind CSS
- **TypeScript** with strict type checking
- **Prisma ORM** + **PostgreSQL** (Supabase)
- **Redis** (ioredis) for caching
- **AI Provider SDKs**:
  - OpenAI SDK
  - Anthropic SDK
  - Google Generative AI SDK
  - OpenAI-compatible APIs (Grok, DeepSeek, Perplexity)
  - SerpAPI for Google AI Overview

## Project Structure
```
/src/
  app/
    page.tsx              # Main form UI
    layout.tsx            # Root layout
    api/
      run/
        route.ts          # POST /api/run - Create new check
        [id]/route.ts     # GET /api/run/:id - Get results
    admin/
      page.tsx            # Admin dashboard
  lib/
    prisma.ts             # Prisma client
    redis.ts              # Redis client & caching utilities
    validation.ts         # Zod schemas
    domainRegex.ts        # Domain matching logic
    providers/            # AI provider integrations
      registry.ts         # Provider registry & types
      openai.ts
      grok.ts
      deepseek.ts
      perplexity.ts
      gemini.ts
      claude.ts
      googleAiOverview.ts
/prisma/
  schema.prisma           # Database schema
```

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd seoaoe
npm install
```

### 2. Database Setup

1. Create a Supabase project at https://supabase.com
2. Get your connection string from Project Settings > Database
3. Copy `.env.example` to `.env.local`
4. Update `DATABASE_URL` with your Supabase pooler connection string

```bash
cp .env.example .env.local
```

### 3. Redis Setup (Optional but Recommended)

Redis is used for caching duplicate queries (24h TTL) to save costs and improve response times.

**Local Development (macOS):**
```bash
# Install Redis
brew install redis

# Start Redis
brew services start redis
```

**Production (Upstash recommended):**
1. Create a free Redis database at https://upstash.com
2. Copy the Redis URL
3. Add to `.env.local`:
```env
REDIS_URL=redis://default:password@redis-12345.upstash.io:6379
```

If Redis is not configured, the app will attempt to connect to `localhost:6379` and log errors if unavailable, but will continue to function without caching.

### 4. Configure API Keys

Add your API keys to `.env.local`:

```env
# Required API Keys
OPENAI_API_KEY=sk-proj-...          # https://platform.openai.com/api-keys
GROK_API_KEY=xai-...                 # https://console.x.ai/
DEEPSEEK_API_KEY=sk-...              # https://platform.deepseek.com/api_keys
PERPLEXITY_API_KEY=pplx-...          # https://www.perplexity.ai/settings/api
GEMINI_API_KEY=AIzaSy...             # https://aistudio.google.com/app/apikey
ANTHROPIC_API_KEY=sk-ant-api03-...   # https://console.anthropic.com/settings/keys
SERPAPI_API_KEY=...                  # https://serpapi.com/manage-api-key

# Optional: Redis URL for caching
REDIS_URL=redis://localhost:6379
```

### 5. Initialize Database

```bash
npx prisma generate
npx prisma db push
```

### 6. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000 to see the application.

## API Endpoints

### POST /api/run
Create a new AI visibility check.

**Request Body:**
```json
{
  "keyword": "dating app",
  "domain": "bumble.com",
  "country": "US",
  "language": "en",
  "email": "user@example.com" // optional
}
```

**Response (Cache Miss):**
```json
{
  "run_id": "cmgqbcm1d001wu873ym68k15d",
  "status": "queued",
  "created_at": "2025-10-14T08:41:52.210Z",
  "providers_expected": 7
}
```

**Response (Cache Hit):**
```json
{
  "run_id": "cmgqbcm1d001wu873ym68k15d",
  "status": "completed",
  "created_at": "2025-10-14T08:41:52.210Z",
  "providers_expected": 7,
  "cached": true
}
```

### GET /api/run/:id
Get results for a specific run.

**Response:**
```json
{
  "run": {
    "id": "cmgqbcm1d001wu873ym68k15d",
    "keyword": "dating app",
    "domain": "bumble.com",
    "country": "US",
    "language": "en"
  },
  "results": [
    {
      "provider": "claude",
      "model": "claude-3-7-sonnet-20250219",
      "status": "ok",
      "mentioned": true,
      "firstIndex": 292,
      "evidence": "...snippet...",
      "latencyMs": 10208,
      "costUsd": "0.008613"
    }
  ]
}
```

## Performance Benchmarks

Based on production testing with keyword "dating app" and domain "bumble.com":

| Provider | Model | Avg Latency | Avg Cost | Detection Rate |
|----------|-------|-------------|----------|----------------|
| Claude | claude-3-7-sonnet-20250219 | ~10s | $0.0086 | 100% |
| OpenAI | gpt-4o-mini | ~14-16s | $0.0005 | 100% |
| Gemini | gemini-2.0-flash-exp | ~13-19s | $0.0006 | 100% |
| Perplexity | sonar | ~3-27s | $0.0050 | 100% |
| Grok | grok-3 | ~28-37s | $0.0154 | 100% |
| DeepSeek | deepseek-chat | ~44-46s | $0.0011 | 100% |

**Total cost per check:** ~$0.03 (all 6 providers)
**Total time:** ~45s (limited by slowest provider)

## Development

### Build for Production

```bash
npm run build
```

### Linting

```bash
npm run lint
```

### Database Management

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes
npx prisma db push

# Open Prisma Studio
npx prisma studio
```

## Deployment

The application is ready to deploy on Vercel:

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Caching Behavior

The application uses Redis to cache provider results for 24 hours based on the combination of:
- Keyword (normalized to lowercase)
- Domain (normalized to lowercase)
- Country (uppercase)
- Language (lowercase)

**Cache Key Format:** `aoe:{keyword}:{domain}:{country}:{language}`

**Benefits:**
- **Instant results** for duplicate queries (typically <100ms vs 45s)
- **Cost savings** by not re-querying AI providers
- **Reduced API rate limiting** risk

**Cache Invalidation:**
- Automatic expiry after 24 hours
- Manual flush: `redis-cli FLUSHDB` (development only)

## Future Enhancements

- [x] Redis caching layer for duplicate requests ✅
- [ ] PDF report generation with Playwright
- [ ] Email delivery with SendGrid
- [ ] Rate limiting per IP
- [ ] User authentication
- [ ] Historical tracking and analytics
- [ ] Custom model selection per provider
- [ ] Webhook support for async results

## License
MIT
