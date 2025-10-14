// src/app/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

type RunResult = {
  provider: string;
  model: string | null;
  mentioned: boolean;
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

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [domain, setDomain] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkResults, setCheckResults] = useState<RunResult[]>([]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCheckResults([]);
    setLoading(true);

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          domain,
          country,
          language,
          email: email || undefined,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json?.error || "Request failed");
        return;
      }

      // Poll for results
      const runId = json.run_id;
      let attempts = 0;
      const maxAttempts = 40; // 40 seconds max wait

      const pollInterval = setInterval(async () => {
        attempts++;

        if (attempts > maxAttempts) {
          clearInterval(pollInterval);
          setError("Request timed out. Check admin dashboard for results.");
          setLoading(false);
          return;
        }

        try {
          const resultRes = await fetch(`/api/run/${runId}`);
          const resultData = await resultRes.json();

          if (resultData.results && resultData.results.length > 0) {
            // Check if all providers have completed
            const completedResults = resultData.results.filter(
              (r: RunResult) => r.status === "ok" || r.status === "error"
            );

            if (completedResults.length >= 6) {
              // All providers completed
              setCheckResults(completedResults.filter((r: RunResult) => r.status === "ok"));
              clearInterval(pollInterval);
              setLoading(false);
            }
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 1000);

    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      {/* Admin Link - Top Right */}
      <Link
        href="/admin"
        className="absolute top-6 right-6 text-sm opacity-60 hover:opacity-100 transition-opacity"
      >
        Admin
      </Link>

      {/* Main Content - Centered */}
      <div className="w-full max-w-2xl mx-auto">
        {/* Greeting */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-medium mb-2">AI Visibility Checker</h1>
          <p className="text-sm opacity-60">Check if leading LLMs mention your website</p>
        </div>

        {/* Form Card */}
        <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-8 shadow-sm">
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Keyword */}
            <div>
              <input
                className="w-full bg-transparent border-none outline-none text-base placeholder:opacity-50 focus:placeholder:opacity-30"
                placeholder="Enter keyword (e.g., SEO agency Switzerland)"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                required
              />
            </div>

            {/* Divider */}
            <div className="h-px bg-neutral-300 dark:bg-neutral-600" />

            {/* Domain */}
            <div>
              <input
                className="w-full bg-transparent border-none outline-none text-base placeholder:opacity-50 focus:placeholder:opacity-30"
                placeholder="Domain (e.g., example.com)"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                required
              />
            </div>

            {/* Divider */}
            <div className="h-px bg-neutral-300 dark:bg-neutral-600" />

            {/* Country & Language - Side by side */}
            <div className="grid grid-cols-2 gap-4">
              <select
                className="w-full bg-transparent border-none outline-none text-base cursor-pointer appearance-none pr-8 bg-[length:20px] bg-[position:right_center] bg-no-repeat"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`
                }}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select country
                </option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>

              <select
                className="w-full bg-transparent border-none outline-none text-base cursor-pointer appearance-none pr-8 bg-[length:20px] bg-[position:right_center] bg-no-repeat"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`
                }}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select language
                </option>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Divider */}
            <div className="h-px bg-neutral-300 dark:bg-neutral-600" />

            {/* Email (optional) */}
            <div>
              <input
                type="email"
                className="w-full bg-transparent border-none outline-none text-base placeholder:opacity-50 focus:placeholder:opacity-30"
                placeholder="Email (optional, for PDF report)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-900 rounded-full py-3 px-6 font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Checking..." : "Check AOE"}
            </button>
          </form>
        </div>

        {/* Loading State */}
        {loading && checkResults.length === 0 && (
          <div className="mt-6 bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-8 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-neutral-400 border-t-neutral-900 dark:border-t-neutral-100 rounded-full animate-spin" />
              <p className="text-sm opacity-60">Checking with OpenAI, Grok, DeepSeek, Perplexity, Gemini, and Claude...</p>
            </div>
          </div>
        )}

        {/* Results Display */}
        {checkResults.length > 0 && (
          <div className="mt-6 space-y-4">
            {checkResults.map((checkResult) => (
              <div
                key={checkResult.provider}
                className={`rounded-2xl p-8 text-center ${
                  checkResult.mentioned
                    ? "bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800"
                }`}
              >
              {/* Icon */}
              <div className="flex justify-center mb-4">
                {checkResult.mentioned ? (
                  <svg
                    className="w-16 h-16 text-green-600 dark:text-green-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-16 h-16 text-red-600 dark:text-red-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              {/* Main Result */}
              <h2
                className={`text-2xl font-semibold mb-2 ${
                  checkResult.mentioned
                    ? "text-green-900 dark:text-green-100"
                    : "text-red-900 dark:text-red-100"
                }`}
              >
                {checkResult.mentioned ? "Domain Mentioned!" : "Domain Not Mentioned"}
              </h2>

              <p
                className={`text-sm mb-6 ${
                  checkResult.mentioned
                    ? "text-green-700 dark:text-green-300"
                    : "text-red-700 dark:text-red-300"
                }`}
              >
                {checkResult.mentioned
                  ? `${domain} was found in ${checkResult.provider === "openai" ? "ChatGPT" : checkResult.provider === "grok" ? "Grok" : checkResult.provider === "deepseek" ? "DeepSeek" : checkResult.provider === "perplexity" ? "Perplexity" : checkResult.provider === "gemini" ? "Gemini" : checkResult.provider === "claude" ? "Claude" : checkResult.provider}'s response`
                  : `${domain} was not mentioned by ${checkResult.provider === "openai" ? "ChatGPT" : checkResult.provider === "grok" ? "Grok" : checkResult.provider === "deepseek" ? "DeepSeek" : checkResult.provider === "perplexity" ? "Perplexity" : checkResult.provider === "gemini" ? "Gemini" : checkResult.provider === "claude" ? "Claude" : checkResult.provider} for "${keyword}"`}
              </p>

              {/* Evidence Snippet (only for positive results) */}
              {checkResult.mentioned && checkResult.evidence && (
                <div className="mt-6 p-4 bg-white dark:bg-green-950/50 rounded-xl text-left">
                  <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2">
                    Found at position {checkResult.firstIndex}
                  </p>
                  <p className="text-sm text-green-900 dark:text-green-100 italic">
                    {checkResult.evidence}
                  </p>
                </div>
              )}

              {/* Metadata */}
              <div className="mt-6 pt-6 border-t border-current opacity-30">
                <div className="flex items-center justify-center gap-4 text-xs opacity-60">
                  <span className="capitalize">{checkResult.provider} ({checkResult.model})</span>
                  {checkResult.latencyMs && (
                    <span>• {(checkResult.latencyMs / 1000).toFixed(1)}s</span>
                  )}
                  {checkResult.costUsd !== null && checkResult.costUsd !== undefined && (
                    <span>• ${Number(checkResult.costUsd).toFixed(4)}</span>
                  )}
                </div>
              </div>
            </div>
            ))}

            {/* Admin Link */}
            <div className="text-center">
              <Link
                href="/admin"
                className="text-sm underline opacity-60 hover:opacity-100 transition-opacity"
              >
                View detailed results in Admin Dashboard →
              </Link>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
            <p className="font-medium text-red-900 dark:text-red-100">Error</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center text-xs opacity-40">
        <p>Powered by OpenAI, Grok, Google Gemini, Anthropic Claude, Perplexity, and DeepSeek</p>
      </div>
    </main>
  );
}
