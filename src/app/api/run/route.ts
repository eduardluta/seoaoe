import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { RunRequestSchema, type RunRequest } from "../../../lib/validation";
import {
  PROVIDERS,
  PROVIDER_COUNT,
  type ProviderRunResult,
} from "../../../lib/providers/registry";
import { generateCacheKey, getCachedResults, setCachedResults } from "../../../lib/redis";

function buildRawResponse(result: ProviderRunResult) {
  const payload: Record<string, unknown> = { text: result.rawText };
  if (typeof result.tokensUsed === "number") {
    payload.tokens = result.tokensUsed;
  }
  return payload;
}

type CachedProviderResult = {
  provider: string;
  model?: string;
  status: string;
  mentioned: boolean;
  firstIndex?: number | null;
  evidence?: string | null;
  rawResponse: Record<string, unknown>;
  latencyMs?: number | null;
  costUsd?: number | null;
};

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = RunRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { keyword, domain, country, language, email } = parsed.data;

    // Generate cache key
    const cacheKey = generateCacheKey(keyword, domain, country, language);

    // Check cache first
    const cachedResults = (await getCachedResults(cacheKey)) as CachedProviderResult[] | null;

    if (cachedResults) {
      // Cache hit: create Run and populate with cached results
      const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      const runRecord = await prisma.run.create({
        data: {
          id: runId,
          keyword: keyword.trim(),
          domain: domain.toLowerCase().trim(),
          country: country.toUpperCase(),
          language: language.trim(),
          email: email ? { create: { id: `email_${runId}`, toEmail: email, status: "queued" } } : undefined,
        },
        select: { id: true, createdAt: true },
      });

      // Insert cached results into database sequentially
      for (const cachedResult of cachedResults) {
        const resultId = `result_${runRecord.id}_${cachedResult.provider}_${Date.now()}`;
        await prisma.runResult.create({
          data: {
            id: resultId,
            runId: runRecord.id,
            provider: cachedResult.provider,
            model: cachedResult.model,
            status: cachedResult.status,
            mentioned: cachedResult.mentioned,
            firstIndex: cachedResult.firstIndex ?? undefined,
            evidence: cachedResult.evidence ?? undefined,
            rawResponse: JSON.parse(JSON.stringify(cachedResult.rawResponse)),
            latencyMs: cachedResult.latencyMs ?? undefined,
            costUsd: cachedResult.costUsd ?? undefined,
          },
        });
      }

      return NextResponse.json(
        {
          run_id: runRecord.id,
          status: "completed",
          created_at: runRecord.createdAt,
          providers_expected: PROVIDER_COUNT,
          cached: true,
        },
        { status: 200 }
      );
    }

    // Cache miss: create Run and execute providers
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const runRecord = await prisma.run.create({
      data: {
        id: runId,
        keyword: keyword.trim(),
        domain: domain.toLowerCase().trim(),
        country: country.toUpperCase(),
        language: language.trim(),
        email: email ? { create: { id: `email_${runId}`, toEmail: email, status: "queued" } } : undefined,
      },
      select: { id: true, createdAt: true },
    });

    // Step 2: run all providers in parallel
    const input: RunRequest = { keyword, domain, country, language, email };

    // Run providers in parallel and collect results
    const providerResults = await Promise.all(
      PROVIDERS.map(({ key, model, run }) =>
        run(input)
          .then((result) => ({
            provider: key,
            model,
            status: "ok" as const,
            mentioned: result.mentioned,
            firstIndex: result.position ?? undefined,
            evidence: result.snippet ?? undefined,
            rawResponse: buildRawResponse(result),
            latencyMs: result.latencyMs ?? undefined,
            costUsd: result.costUsd ?? undefined,
          }))
          .catch((error) => ({
            provider: key,
            model,
            status: "error" as const,
            mentioned: false,
            firstIndex: undefined,
            evidence: undefined,
            rawResponse: { error: String(error) },
            latencyMs: undefined,
            costUsd: undefined,
          }))
      )
    );

    // Save results to database sequentially to avoid connection pool exhaustion
    for (const result of providerResults) {
      const resultId = `result_${runRecord.id}_${result.provider}_${Date.now()}`;
      await prisma.runResult.create({
        data: {
          id: resultId,
          runId: runRecord.id,
          provider: result.provider,
          model: result.model,
          status: result.status,
          mentioned: result.mentioned,
          firstIndex: result.firstIndex,
          evidence: result.evidence,
          rawResponse: JSON.parse(JSON.stringify(result.rawResponse)),
          latencyMs: result.latencyMs,
          costUsd: result.costUsd,
        },
      });
    }

    // Cache the results for 24 hours
    await setCachedResults(cacheKey, providerResults, 86400);

    // Minimal success response for now
    return NextResponse.json(
      {
        run_id: runRecord.id,
        status: "queued",
        created_at: runRecord.createdAt,
        providers_expected: PROVIDER_COUNT,
      },
      { status: 202 }
    );
  } catch (err) {
    console.error("POST /api/run error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
