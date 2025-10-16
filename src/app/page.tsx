"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

type RunResult = {
  provider: string;
  model: string | null;
  status: "ok" | "error" | "timeout" | string;
  mentioned: boolean | null;
  firstIndex: number | null;
  evidence: string | null;
  latencyMs: number | null;
  costUsd: number | null;
};

const COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
];

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "de", name: "German" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "it", name: "Italian" },
  { code: "nl", name: "Dutch" },
  { code: "pt", name: "Portuguese" },
  { code: "pl", name: "Polish" },
  { code: "sv", name: "Swedish" },
  { code: "no", name: "Norwegian" },
  { code: "da", name: "Danish" },
  { code: "fi", name: "Finnish" },
];

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

const COMPLETED_STATUSES = new Set(["ok", "error", "timeout"]);

const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(?:\.[a-z0-9-]{1,63})+$/i;

function normalizeDomain(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  let candidate = trimmed;

  try {
    if (candidate.includes("://")) {
      candidate = new URL(candidate).hostname;
    } else if (candidate.includes("/") || candidate.includes("?")) {
      candidate = new URL(`https://${candidate}`).hostname;
    }
  } catch {
    // Ignore URL parsing errors; fallback to manual cleanup
  }

  candidate = candidate.replace(/^https?:\/\//i, "");
  candidate = candidate.split(/[/?#]/)[0] ?? "";
  candidate = candidate.replace(/^www\./i, "").toLowerCase();

  if (!DOMAIN_PATTERN.test(candidate)) {
    return null;
  }

  return candidate;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseResults(raw: unknown): RunResult[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const mapped = raw.map((value) => {
    const item = value as Record<string, unknown>;

    const providerRaw = item.provider;
    const providerKey =
      typeof providerRaw === "string" ? providerRaw.toLowerCase() : String(providerRaw ?? "");

    const modelRaw = item.model;
    const modelValue =
      modelRaw === null || modelRaw === undefined ? null : String(modelRaw);

    let mentioned: boolean | null = null;
    if (typeof item.mentioned === "boolean") {
      mentioned = item.mentioned;
    } else if (item.mentioned !== null && item.mentioned !== undefined) {
      mentioned = Boolean(item.mentioned);
    }

    const firstIndex = toNumber(item.firstIndex);
    const latencyMs = toNumber(item.latencyMs);
    const costUsd = toNumber(item.costUsd);

    return {
      provider: providerKey,
      model: modelValue,
      status: typeof item.status === "string" ? item.status : "unknown",
      mentioned,
      firstIndex,
      evidence: typeof item.evidence === "string" ? item.evidence : null,
      latencyMs,
      costUsd,
    } satisfies RunResult;
  });

  return mapped.sort((a, b) => {
    const indexA = PROVIDER_ORDER.indexOf(a.provider);
    const indexB = PROVIDER_ORDER.indexOf(b.provider);
    if (indexA === -1 && indexB === -1) {
      return a.provider.localeCompare(b.provider);
    }
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
}

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [domain, setDomain] = useState("");
  const [country, setCountry] = useState("US");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [checkResults, setCheckResults] = useState<RunResult[]>([]);
  const [expectedProviders, setExpectedProviders] = useState<number>(PROVIDER_ORDER.length);
  const processedCount = checkResults.length;
  const mentionCount = useMemo(
    () => checkResults.filter((result) => result.status === "ok" && result.mentioned).length,
    [checkResults]
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatusMessage("Starting visibility check…");
    setCheckResults([]);
    setLoading(true);

    try {
      const normalizedDomain = normalizeDomain(domain);

      if (!normalizedDomain) {
        setError("Enter a valid domain like example.com");
        setLoading(false);
        return;
      }

      setDomain(normalizedDomain);

      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          domain: normalizedDomain,
          country,
          language,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        const message = json?.error || "Request failed";
        setError(message);
        setStatusMessage(null);
        setLoading(false);
        return;
      }

      const runId = json.run_id as string;
      const initialExpected =
        Number(json.providers_expected) || Number(json.providersExpected) || PROVIDER_ORDER.length;
      setExpectedProviders(initialExpected);
      let attempts = 0;
      const maxAttempts = 40;

      const fetchResults = async () => {
        const resultRes = await fetch(`/api/run/${runId}`);
        if (!resultRes.ok) {
          throw new Error(`Failed to load results (${resultRes.status})`);
        }
        const resultData = await resultRes.json();
        const parsedResults = parseResults(resultData.results);
        const expected =
          Number(resultData.providers_expected) || Number(resultData.providersExpected) || initialExpected;
        setExpectedProviders(expected);

        return { parsedResults, expected };
      };

      if (json.status === "completed") {
        const { parsedResults } = await fetchResults();
        setCheckResults(parsedResults);
        setStatusMessage("Fetched cached results.");
        setLoading(false);
        return;
      }

      setStatusMessage("Collecting provider responses…");

      const pollInterval = window.setInterval(async () => {
        attempts += 1;

        if (attempts > maxAttempts) {
          window.clearInterval(pollInterval);
          setError("Request timed out. Please try again in a minute or open the admin dashboard for details.");
          setStatusMessage(null);
          setLoading(false);
          return;
        }

        try {
      const { parsedResults, expected } = await fetchResults();
          const completedResults = parsedResults.filter((result) =>
            COMPLETED_STATUSES.has(result.status.toLowerCase())
          );

          if (completedResults.length > 0) {
            setCheckResults(completedResults);
            const remaining = Math.max(expected - completedResults.length, 0);
            setStatusMessage(
              remaining > 0
                ? `Collected ${completedResults.length} of ${expected} providers…`
                : "All providers have responded. Scroll down for the breakdown."
            );
          } else {
            setStatusMessage("Collecting provider responses…");
          }

          if (completedResults.length >= expected) {
            window.clearInterval(pollInterval);
            setLoading(false);
            setStatusMessage("All providers have responded. Scroll down for the breakdown.");
          }
        } catch (pollError) {
          console.error("Polling error:", pollError);
        }
      }, 1000);
    } catch {
      setError("Network error");
      setLoading(false);
      setStatusMessage(null);
    }
  }

  return (
    <div className="min-h-[100svh] bg-white text-slate-900 dark:bg-neutral-950 dark:text-neutral-50">
      <main className="mx-auto flex min-h-[100svh] w-full max-w-3xl flex-col items-center justify-center px-6 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl mb-4">
            AI SEO Ranking
          </h1>
          <p className="text-sm text-slate-500 dark:text-neutral-400 max-w-xl mx-auto">
            See how your brand ranks across Google & AI answer engines like ChatGPT & Co.
          </p>
        </div>

        {/* Form */}
        <div className="w-full max-w-2xl">
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Keyword */}
            <input
              id="keyword"
              name="keyword"
              autoComplete="off"
              required
              placeholder="Keyword (e.g., dating app)"
              className="h-14 w-full rounded-lg border border-slate-200 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus:border-neutral-600 dark:focus:ring-neutral-800"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />

            {/* Domain */}
            <input
              id="domain"
              name="domain"
              type="text"
              required
              placeholder="Domain (e.g., example.com)"
              className="h-14 w-full rounded-lg border border-slate-200 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus:border-neutral-600 dark:focus:ring-neutral-800"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
            />

            {/* Country & Language */}
            <div className="grid gap-4 sm:grid-cols-2">
              <select
                id="country"
                name="country"
                required
                className="h-14 w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-600 dark:focus:ring-neutral-800"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              >
                {COUNTRIES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.flag} {item.name}
                  </option>
                ))}
              </select>

              <select
                id="language"
                name="language"
                required
                className="h-14 w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-600 dark:focus:ring-neutral-800"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                {LANGUAGES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="h-14 w-full rounded-lg bg-slate-900 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100"
              aria-busy={loading}
            >
              {loading ? "Checking..." : "Check Visibility"}
            </button>

            {error && (
              <p className="text-sm text-rose-500 dark:text-rose-400" role="alert">
                {error}
              </p>
            )}
          </form>

          {/* Admin Link */}
          <div className="mt-8 text-center">
            <Link
              href="/admin"
              className="text-sm text-slate-400 hover:text-slate-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
            >
              View dashboard →
            </Link>
          </div>
        </div>

        {statusMessage && (
          <p className="mt-6 text-sm text-slate-500 dark:text-neutral-400">{statusMessage}</p>
        )}

        {processedCount > 0 && (
          <section className="mt-12 w-full max-w-2xl">
            {/* Summary */}
            <div className="mb-6 text-center">
              <p className="text-3xl font-bold text-slate-900 dark:text-neutral-50">
                {mentionCount}/{expectedProviders}
              </p>
              <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">
                Providers mentioned your domain
              </p>
            </div>

            {/* Results Grid */}
            <div className="space-y-3">
              {checkResults.map((result) => {
                const providerLabel = PROVIDER_LABELS[result.provider] ?? result.provider;
                const status = result.status.toLowerCase();
                const isSuccess = status === "ok";
                const mentioned = Boolean(result.mentioned);

                return (
                  <div
                    key={result.provider}
                    className="rounded-lg border border-slate-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900 dark:text-neutral-50">
                        {providerLabel}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          isSuccess && mentioned
                            ? "text-green-600 dark:text-green-400"
                            : isSuccess
                            ? "text-slate-400 dark:text-neutral-500"
                            : "text-yellow-600 dark:text-yellow-400"
                        }`}
                      >
                        {isSuccess ? (mentioned ? "✓ Mentioned" : "Not mentioned") : "Error"}
                      </span>
                    </div>

                    {mentioned && result.evidence && (
                      <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400 italic">
                        &ldquo;{result.evidence}&rdquo;
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* View Details Link */}
            <div className="mt-6 text-center">
              <Link
                href="/admin"
                className="text-sm text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
              >
                View full details in dashboard →
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
