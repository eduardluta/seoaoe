// src/app/admin/page.tsx
import { prisma } from "@/lib/prisma";
import { PROVIDER_COUNT } from "@/lib/providers/registry";
import Link from "next/link";
import { ProviderCard } from "./ProviderCard";
import { DownloadButton } from "./DownloadButton";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "ChatGPT",
  grok: "Grok",
  deepseek: "DeepSeek",
  perplexity: "Perplexity",
  gemini: "Gemini",
  claude: "Claude",
  google_ai_overview: "Google AI Overview",
};

const PROVIDER_ORDER = [
  "google_ai_overview",
  "openai",
  "perplexity",
  "grok",
  "gemini",
  "claude",
  "deepseek",
];

const PROVIDER_WEIGHTS: Record<string, number> = {
  openai: 0.15,
  grok: 0.15,
  deepseek: 0.15,
  perplexity: 0.15,
  gemini: 0.15,
  claude: 0.15,
  google_ai_overview: 0.10,
};

const TOTAL_WEIGHT = Object.values(PROVIDER_WEIGHTS).reduce((sum, value) => sum + value, 0);
const COMPLETED_STATUSES = new Set(["ok", "error", "timeout"]);

function toCostNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof value === "object" && value !== null && "toNumber" in value) {
    try {
      const numeric = (value as { toNumber: () => number }).toNumber();
      return Number.isFinite(numeric) ? numeric : 0;
    } catch {
      return 0;
    }
  }

  return 0;
}

export const dynamic = "force-dynamic"; // always fetch fresh on each load

export default async function AdminPage() {
  // get the latest 20 runs with their results
  const runs = await prisma.run.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      keyword: true,
      domain: true,
      country: true,
      language: true,
      createdAt: true,
      results: {
        select: {
          provider: true,
          model: true,
          status: true,
          mentioned: true,
          firstIndex: true,
          evidence: true,
          latencyMs: true,
          costUsd: true,
          rawResponse: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen px-4 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium mb-1">Admin Dashboard</h1>
          <p className="text-sm opacity-60">Recent visibility checks</p>
        </div>
        <Link
          href="/"
          className="text-sm opacity-60 hover:opacity-100 transition-opacity"
        >
          ← Back to Home
        </Link>
      </div>

      {/* Runs List */}
      <div className="space-y-3">
        {runs.length === 0 && (
          <div className="bg-neutral-100 dark:bg-neutral-800 rounded-xl p-8 text-center">
            <p className="opacity-60">No runs yet. Create your first check from the home page.</p>
          </div>
        )}

        {runs.map((run) => {
          const resultsByProvider = [...run.results].sort((a, b) => {
            const indexA = PROVIDER_ORDER.indexOf(a.provider);
            const indexB = PROVIDER_ORDER.indexOf(b.provider);
            if (indexA === -1 && indexB === -1) return a.provider.localeCompare(b.provider);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });

          const weightedScore = resultsByProvider.reduce((score, result) => {
            const weight = PROVIDER_WEIGHTS[result.provider] ?? 0;
            if (result.status === "ok" && result.mentioned) {
              return score + weight;
            }
            return score;
          }, 0);

          const scorePercent = Math.round((weightedScore / (TOTAL_WEIGHT || 1)) * 100);

          const mentionCount = resultsByProvider.filter(
            (result) => result.status === "ok" && result.mentioned
          ).length;
          const providerCount = resultsByProvider.length;

          const totalCost = resultsByProvider.reduce(
            (sum, result) => sum + toCostNumber(result.costUsd),
            0
          );

          const expectedProviders = PROVIDER_COUNT;
          const isStillProcessing =
            providerCount < expectedProviders ||
            resultsByProvider.some((r) => !COMPLETED_STATUSES.has(r.status));

          return (
            <div
              key={run.id}
              className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-5 shadow-sm"
            >
              {/* Query Info */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-medium text-lg mb-1">{run.keyword}</h3>
                  <p className="text-sm opacity-60">
                    {run.domain} • {run.country} • {run.language}
                  </p>
                </div>
                <div className="text-right text-xs opacity-40">
                  {new Date(run.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                {isStillProcessing ? (
                  <div className="flex items-center gap-2 text-sm opacity-60">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                    <span>Processing providers…</span>
                  </div>
                ) : (
                  <>
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-full border border-current px-3 py-1 font-semibold ${
                        mentionCount > 0
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                      }`}
                    >
                      <span>Overall score</span>
                      <span className="text-base font-bold">{scorePercent}</span>
                    </div>
                    <span className="opacity-60">
                      {mentionCount} of {expectedProviders} providers mentioned the domain
                    </span>
                    <span className="opacity-60">Cost ${totalCost.toFixed(4)}</span>
                    <DownloadButton runId={run.id} isProcessing={isStillProcessing} />
                  </>
                )}
              </div>

              {/* Provider breakdown */}
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {resultsByProvider.map((result) => {
                  const label = PROVIDER_LABELS[result.provider] ?? result.provider;
                  const weight = PROVIDER_WEIGHTS[result.provider] ?? 0;
                  const isSuccess = result.status === "ok";
                  const mentioned = Boolean(isSuccess && result.mentioned);

                  return (
                    <ProviderCard
                      key={`${run.id}-${result.provider}`}
                      label={label}
                      weight={weight}
                      model={result.model}
                      status={result.status}
                      mentioned={mentioned}
                      evidence={result.evidence}
                      latencyMs={result.latencyMs}
                      costUsd={result.costUsd}
                      rawResponse={result.rawResponse}
                      targetDomain={run.domain}
                    />
                  );
                })}
              </div>

              {/* Run ID */}
              <div className="mt-3 pt-3 border-t border-neutral-300 dark:border-neutral-700">
                <code className="text-[11px] opacity-40 font-mono">ID: {run.id}</code>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
