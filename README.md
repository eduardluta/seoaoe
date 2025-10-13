# SEO-AOE — AI Visibility Checker (MVP)

**SEO-AOE** checks whether leading LLMs (ChatGPT/OpenAI, Claude/Anthropic, Gemini/Google, Perplexity) would **mention your website** for a given **keyword**, **country**, and **language**.  
V0.1 returns a **binary result** (mentioned / not mentioned) with a short evidence snippet and position index, and emails a simple PDF report.

## Features (V0.1)
- ✅ Inputs: **Keyword**, **Domain**, **Country (ISO-2)**, **Language (BCP-47)**
- ✅ Parallel checks across **OpenAI, Claude, Gemini, Perplexity**
- ✅ **Regex** validation of mentions (anti-hallucination)
- ✅ Minimal UI results table + **PDF via email**
- ✅ **Admin dashboard** (runs, errors, provider costs)
- ✅ **5-minute cache** for identical requests

## Tech Stack
- **Next.js (App Router)** + React + Tailwind
- **Node.js** serverless (Vercel)
- **Postgres** (Prisma) + **Redis** cache
- **Playwright** for PDF, **SendGrid** for email
- **Cloudflare R2** (or any S3-compatible) for PDF storage

## Project Structure
/docs/ # Specs & planning
/src/
app/
page.tsx # Main form UI
api/run/route.ts # Backend endpoint
admin/ # Admin dashboard (MVP)
components/ # UI components
lib/ # utils: validation, regex, pdf, email, cache
styles/globals.css
/prisma/schema.prisma # DB schema
public/ # static assets
.env.example
vercel.json

## Environment Variables
Copy `.env.example` → `.env.local` and fill in your keys:
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
PERPLEXITY_API_KEY=
SENDGRID_API_KEY=
DATABASE_URL=
REDIS_URL=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_URL=
