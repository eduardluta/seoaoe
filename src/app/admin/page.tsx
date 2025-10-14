// src/app/admin/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";

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
    <main className="min-h-screen px-6 py-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
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
      <div className="space-y-4">
        {runs.length === 0 && (
          <div className="bg-neutral-100 dark:bg-neutral-800 rounded-xl p-8 text-center">
            <p className="opacity-60">No runs yet. Create your first check from the home page.</p>
          </div>
        )}

        {runs.map((run) => {
          const result = run.results[0]; // For now we only have OpenAI
          const hasMention = result?.mentioned === true;
          const hasResult = result?.status === "ok";

          return (
            <div
              key={run.id}
              className="bg-neutral-100 dark:bg-neutral-800 rounded-xl p-6"
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

              {/* Results */}
              <div className="flex items-center gap-4">
                {!hasResult && (
                  <div className="flex items-center gap-2 text-sm opacity-60">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                    <span>Processing...</span>
                  </div>
                )}

                {hasResult && (
                  <>
                    {/* Status Badge */}
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                        hasMention
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                      }`}
                    >
                      {hasMention ? (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Mentioned
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Not Mentioned
                        </>
                      )}
                    </div>

                    {/* Provider Info */}
                    <div className="flex items-center gap-4 flex-wrap text-sm opacity-60">
                      <span className="capitalize">
                        {result.provider} {result.model && `(${result.model})`}
                      </span>
                      {result.latencyMs && (
                        <span>• {(result.latencyMs / 1000).toFixed(1)}s</span>
                      )}
                      {result.rawResponse?.tokens && (
                        <span>• {result.rawResponse.tokens} tokens</span>
                      )}
                      {result.costUsd !== null && result.costUsd !== undefined && (
                        <span className="font-medium text-green-600 dark:text-green-400">
                          • ${result.costUsd.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Evidence Snippet - Only show if mentioned */}
              {hasResult && hasMention && result.evidence && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-2 mb-2">
                    <svg
                      className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                        Found at position {result.firstIndex}
                      </p>
                      <p className="text-sm text-green-900 dark:text-green-100 italic">
                        {result.evidence}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Run ID */}
              <div className="mt-4 pt-4 border-t border-neutral-300 dark:border-neutral-700">
                <code className="text-xs opacity-40 font-mono">ID: {run.id}</code>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

