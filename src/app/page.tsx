"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type RunResult = {
  provider: string;
  model: string | null;
  status: "ok" | "error" | "timeout" | string;
  mentioned: boolean | null;
  firstIndex: number | null;
  evidence: string | null;
  latencyMs: number | null;
  costUsd: number | null;
  rawText: string | null;
};

const COUNTRIES = [
  // Top economies (by GDP)
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },

  // All other countries (A-Z)
  { code: "AL", name: "Albania", flag: "🇦🇱" },
  { code: "AD", name: "Andorra", flag: "🇦🇩" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "BY", name: "Belarus", flag: "🇧🇾" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "BA", name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { code: "BG", name: "Bulgaria", flag: "🇧🇬" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "HR", name: "Croatia", flag: "🇭🇷" },
  { code: "CU", name: "Cuba", flag: "🇨🇺" },
  { code: "CY", name: "Cyprus", flag: "🇨🇾" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "DO", name: "Dominican Republic", flag: "🇩🇴" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻" },
  { code: "EE", name: "Estonia", flag: "🇪🇪" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "GY", name: "Guyana", flag: "🇬🇾" },
  { code: "HN", name: "Honduras", flag: "🇭🇳" },
  { code: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "IS", name: "Iceland", flag: "🇮🇸" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "JM", name: "Jamaica", flag: "🇯🇲" },
  { code: "XK", name: "Kosovo", flag: "🇽🇰" },
  { code: "LV", name: "Latvia", flag: "🇱🇻" },
  { code: "LT", name: "Lithuania", flag: "🇱🇹" },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
  { code: "MT", name: "Malta", flag: "🇲🇹" },
  { code: "MD", name: "Moldova", flag: "🇲🇩" },
  { code: "MC", name: "Monaco", flag: "🇲🇨" },
  { code: "ME", name: "Montenegro", flag: "🇲🇪" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮" },
  { code: "MK", name: "North Macedonia", flag: "🇲🇰" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "PA", name: "Panama", flag: "🇵🇦" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "PE", name: "Peru", flag: "🇵🇪" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "PR", name: "Puerto Rico", flag: "🇵🇷" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "SM", name: "San Marino", flag: "🇸🇲" },
  { code: "RS", name: "Serbia", flag: "🇷🇸" },
  { code: "SK", name: "Slovakia", flag: "🇸🇰" },
  { code: "SI", name: "Slovenia", flag: "🇸🇮" },
  { code: "SR", name: "Suriname", flag: "🇸🇷" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "TT", name: "Trinidad and Tobago", flag: "🇹🇹" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "VA", name: "Vatican City", flag: "🇻🇦" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
];

const LANGUAGES = [
  // Top 5 most spoken languages globally
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "pt", name: "Portuguese" },
  { code: "de", name: "German" },

  // All other languages (A-Z)
  { code: "sq", name: "Albanian" },
  { code: "eu", name: "Basque" },
  { code: "be", name: "Belarusian" },
  { code: "bs", name: "Bosnian" },
  { code: "bg", name: "Bulgarian" },
  { code: "ca", name: "Catalan" },
  { code: "hr", name: "Croatian" },
  { code: "cs", name: "Czech" },
  { code: "da", name: "Danish" },
  { code: "nl", name: "Dutch" },
  { code: "et", name: "Estonian" },
  { code: "fi", name: "Finnish" },
  { code: "gl", name: "Galician" },
  { code: "el", name: "Greek" },
  { code: "hu", name: "Hungarian" },
  { code: "is", name: "Icelandic" },
  { code: "ga", name: "Irish" },
  { code: "it", name: "Italian" },
  { code: "lv", name: "Latvian" },
  { code: "lt", name: "Lithuanian" },
  { code: "lb", name: "Luxembourgish" },
  { code: "mk", name: "Macedonian" },
  { code: "mt", name: "Maltese" },
  { code: "me", name: "Montenegrin" },
  { code: "no", name: "Norwegian" },
  { code: "pl", name: "Polish" },
  { code: "ro", name: "Romanian" },
  { code: "sr", name: "Serbian" },
  { code: "sk", name: "Slovak" },
  { code: "sl", name: "Slovenian" },
  { code: "sv", name: "Swedish" },
  { code: "uk", name: "Ukrainian" },

  // Regional variants (A-Z)
  { code: "de-AT", name: "German (Austria)" },
  { code: "de-DE", name: "German (Germany)" },
  { code: "de-CH", name: "German (Switzerland)" },
  { code: "nl-BE", name: "Dutch (Belgium)" },
  { code: "nl-NL", name: "Dutch (Netherlands)" },
  { code: "en-CA", name: "English (Canada)" },
  { code: "en-GB", name: "English (UK)" },
  { code: "en-US", name: "English (US)" },
  { code: "fr-CA", name: "French (Canada)" },
  { code: "fr-FR", name: "French (France)" },
  { code: "it-CH", name: "Italian (Switzerland)" },
  { code: "it-IT", name: "Italian (Italy)" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "pt-PT", name: "Portuguese (Portugal)" },
  { code: "es-AR", name: "Spanish (Argentina)" },
  { code: "es-ES", name: "Spanish (Spain)" },
  { code: "es-MX", name: "Spanish (Mexico)" },
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

const LOADING_MESSAGES = [
  "Starting visibility check…",
  "Querying AI engines…",
  "Checking ChatGPT responses…",
  "Analyzing Google AI Overview…",
  "Gathering Perplexity results…",
  "Scanning Claude outputs…",
  "Reviewing Gemini answers…",
  "Checking Grok mentions…",
  "Processing DeepSeek data…",
  "Comparing AI responses…",
  "Almost there…",
];

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

function extractDomainsMentionedBefore(text: string, targetIndex: number): string[] {
  // Extract text before the target domain
  const textBefore = text.substring(0, targetIndex);

  // Regex to match domain patterns (e.g., example.com, website.de, etc.)
  const domainRegex = /\b([a-z0-9-]+\.(?:com|de|net|org|co|io|app|ai|ch|fr|it|nl|uk|eu))\b/gi;

  const domains = new Set<string>();
  let match;

  while ((match = domainRegex.exec(textBefore)) !== null) {
    const domain = match[1].toLowerCase();
    // Filter out common non-brand domains
    if (!domain.includes('example.') && !domain.includes('test.')) {
      domains.add(domain);
    }
  }

  return Array.from(domains);
}

function extractContextAroundMention(text: string, mentionIndex: number, domain: string): string {
  // Clean up formatting artifacts
  text = text.replace(/===\s*AI Overview\s*===/gi, '').replace(/===+/g, '').trim();

  // Look for the start of the list item or paragraph
  let contextStart = mentionIndex;
  for (let i = mentionIndex - 1; i >= 0; i--) {
    if (text[i] === '\n' && i > 0) {
      const nextChar = text[i + 1];
      if (nextChar === '-' || nextChar === '*' || /\d/.test(nextChar)) {
        contextStart = i + 1;
        break;
      }
    }
    if (i > 0 && text[i] === '\n' && text[i - 1] === '\n') {
      contextStart = i + 1;
      break;
    }
    if (mentionIndex - i > 300) {
      contextStart = i;
      break;
    }
    if (i === 0) contextStart = 0;
  }

  // Look forward for end of context
  let contextEnd = mentionIndex + domain.length;
  for (let i = contextEnd; i < text.length; i++) {
    if (text[i] === '.' || text[i] === '!' || text[i] === '?') {
      if (i + 1 >= text.length || text[i + 1] === '\n' || text[i + 1] === ' ') {
        contextEnd = i + 1;
        break;
      }
    }
    if (text[i] === '\n' && i + 1 < text.length) {
      const nextChar = text[i + 1];
      if (nextChar === '-' || nextChar === '*' || /\d/.test(nextChar)) {
        contextEnd = i;
        break;
      }
    }
    if (i - mentionIndex > 400) {
      contextEnd = i;
      break;
    }
  }

  // Extract and clean the context
  let contextText = text.substring(contextStart, contextEnd).trim();
  contextText = contextText.replace(/^[-*\d.)\s]+/, '').replace(/^\*\*/, '');

  // If still too short or looks incomplete, use a fixed window
  if (contextText.length < 50 || !contextText.includes('.')) {
    contextText = text.substring(
      Math.max(0, mentionIndex - 100),
      Math.min(text.length, mentionIndex + 250)
    ).trim().replace(/^[-*\d.)\s]+/, '');
  }

  return contextText;
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
      rawText:
        typeof item.rawResponse === "object" && item.rawResponse !== null && typeof (item.rawResponse as Record<string, unknown>).text === "string"
          ? ((item.rawResponse as Record<string, unknown>).text as string)
          : null,
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
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});
  const [runId, setRunId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const processedCount = checkResults.length;
  const mentionCount = useMemo(
    () => checkResults.filter((result) => result.status === "ok" && result.mentioned).length,
    [checkResults]
  );

  // Rotate loading messages every 3 seconds
  useEffect(() => {
    if (!loading || processedCount > 0) return;

    let messageIndex = 0;
    const rotateMessage = () => {
      messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
      setStatusMessage(LOADING_MESSAGES[messageIndex]);
    };

    const interval = setInterval(rotateMessage, 3000);
    return () => clearInterval(interval);
  }, [loading, processedCount]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatusMessage("Starting visibility check…");
    setCheckResults([]);
    setExpandedProviders({});
    setRunId(null);
    setEmail("");
    setEmailSaved(false);
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

      const currentRunId = json.run_id as string;
      setRunId(currentRunId);
      const initialExpected =
        Number(json.providers_expected) || Number(json.providersExpected) || PROVIDER_ORDER.length;
      setExpectedProviders(initialExpected);
      let attempts = 0;
      const maxAttempts = 40;

      const fetchResults = async () => {
        const resultRes = await fetch(`/api/run/${currentRunId}`);
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

  async function handleSaveEmail() {
    if (!runId || !email.trim()) return;

    setEmailSaving(true);
    try {
      const res = await fetch(`/api/run/${runId}/email`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        let errorMessage = "Failed to send email";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use default error message
        }
        throw new Error(errorMessage);
      }

      // Parse successful response
      await res.json();
      setEmailSaved(true);
      setEmailSaving(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send email. Please try again.");
      console.error(err);
      setEmailSaving(false);
    }
  }

  return (
    <div className="min-h-[100svh]">
      {/* Black upper section with hero and form */}
      <div className="-mb-48 w-full bg-gradient-to-br from-neutral-950 to-black pb-48 pt-28 text-white sm:pt-32">
        <div className="mx-auto w-full max-w-3xl px-6">
          {/* Header */}
          <div className="mb-12 text-center">
            <p className="text-sm text-amber-500 font-semibold uppercase tracking-wider mb-4">
              AI Search Analytics
            </p>
            <h1 className="text-5xl font-bold tracking-tight md:text-7xl mb-4">
              See How AI Ranks Your Brand
            </h1>
            <p className="text-base text-neutral-300 max-w-xl mx-auto">
              Check how your brand ranks across Google AI & LLM&apos;s like ChatGPT & Co.
            </p>
          </div>

          {/* Form in white card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl mx-auto">
            <form onSubmit={onSubmit} className="space-y-4">
              {/* Keyword */}
              <input
                id="keyword"
                name="keyword"
                autoComplete="off"
                required
                placeholder="Keyword (e.g., dating app)"
                className="h-14 w-full rounded-lg border-2 border-amber-500 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
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
                className="h-14 w-full rounded-lg border-2 border-amber-500 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
              />

              {/* Country & Language */}
              <div className="grid gap-4 sm:grid-cols-2">
                <select
                  id="country"
                  name="country"
                  required
                  className="h-14 w-full appearance-none rounded-lg border-2 border-amber-500 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
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
                  className="h-14 w-full appearance-none rounded-lg border-2 border-amber-500 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
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
                className="h-14 w-full rounded-lg bg-amber-500 text-base font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                aria-busy={loading}
              >
                {loading ? "Checking..." : "Check Visibility"}
              </button>

              {error && (
                <p className="text-sm text-rose-500" role="alert">
                  {error}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Lower section for results */}
      <div className="w-full bg-gradient-to-br from-neutral-950 to-black pb-16 pt-12">
        <div className="mx-auto w-full max-w-3xl px-6">

          {/* Loading State */}
          {loading && (
            <div className="w-full max-w-2xl mx-auto">
              <div className="rounded-xl border border-slate-200 bg-white p-8">
                {/* Spinner */}
                <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="relative">
                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900"></div>
                    <div className="absolute inset-0 h-16 w-16 animate-pulse rounded-full border-4 border-slate-100 opacity-25"></div>
                  </div>

                  {/* Status Message */}
                  <div className="text-center">
                    <p className="text-lg font-semibold text-slate-900 mb-2">
                      {statusMessage || "Processing your request..."}
                    </p>
                    <p className="text-sm text-slate-500">
                      This may take up to 30 seconds
                    </p>
                  </div>

                  {/* Progress Info */}
                  {processedCount > 0 && (
                    <div className="w-full">
                      <div className="flex justify-between text-sm text-slate-600 mb-2">
                        <span>Progress</span>
                        <span>{processedCount} of {expectedProviders} providers</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-slate-900 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(processedCount / expectedProviders) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Status Message when not loading */}
          {!loading && statusMessage && (
            <p className="mb-6 text-center text-base text-neutral-400">{statusMessage}</p>
          )}

          {processedCount > 0 && !loading && (
            <section className="w-full max-w-2xl mx-auto">
              {/* Summary */}
              <div className="mb-8 text-center">
                <p className="text-5xl font-bold text-white mb-3">
                  {mentionCount}/{expectedProviders}
                </p>
                <p className="text-base text-neutral-300">
                  Providers mentioned your domain
                </p>
              </div>

              {/* Results Grid */}
              <div className="space-y-4">
                {checkResults.map((result, index) => {
                  const providerLabel = PROVIDER_LABELS[result.provider] ?? result.provider;
                  const status = result.status.toLowerCase();
                  const isSuccess = status === "ok";
                  const mentioned = Boolean(result.mentioned);
                  const providerKey = `${result.provider}-${result.model ?? index}`;
                  const isExpanded = Boolean(expandedProviders[providerKey]);

                  const statusBadge =
                    isSuccess && mentioned
                      ? "bg-emerald-100 text-emerald-700"
                      : isSuccess
                      ? "bg-slate-100 text-slate-600"
                      : "bg-yellow-100 text-yellow-700";

                  return (
                    <div
                      key={providerKey}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900">
                            {providerLabel}
                          </p>
                          {typeof result.firstIndex === "number" && result.firstIndex >= 0 && mentioned && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Position #{result.firstIndex + 1}
                            </span>
                          )}
                        </div>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadge}`}>
                          {isSuccess ? (mentioned ? "Mentioned" : "Not mentioned") : result.status}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        {isSuccess
                          ? mentioned
                            ? `${domain} was mentioned in the response.`
                            : `${domain} was not mentioned.`
                          : "Provider failed to return a response."}
                      </p>

                      {typeof result.firstIndex === "number" && result.firstIndex >= 0 && mentioned && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-slate-600">
                            Your domain appears at character {result.firstIndex + 1} of the AI&apos;s response. Lower positions = earlier mention = better visibility.
                          </p>
                          {result.rawText && (() => {
                            const otherDomains = extractDomainsMentionedBefore(result.rawText, result.firstIndex);
                            return otherDomains.length > 0 ? (
                              <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 mb-1">
                                  {otherDomains.length} {otherDomains.length === 1 ? 'competitor' : 'competitors'} mentioned before you
                                </p>
                                <p className="text-xs text-amber-800">
                                  {otherDomains.join(', ')}
                                </p>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      )}

                      {mentioned && result.rawText && typeof result.firstIndex === "number" && (() => {
                        const brandName = domain.split('.')[0];
                        const contextText = extractContextAroundMention(result.rawText, result.firstIndex, domain);

                        // Highlight the brand/domain in the context
                        const highlightPattern = new RegExp(
                          `(${domain.replace(/\./g, '\\.')}|\\*\\*${brandName}\\*\\*|${brandName})`,
                          'gi'
                        );
                        const parts = contextText.split(highlightPattern);

                        return contextText ? (
                          <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 leading-relaxed">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                              Context
                            </p>
                            <p>
                              &ldquo;
                              {parts.map((part, index) => {
                                if (part && (
                                  part.toLowerCase() === domain.toLowerCase() ||
                                  part.toLowerCase() === brandName.toLowerCase() ||
                                  part.toLowerCase() === `**${brandName.toLowerCase()}**`
                                )) {
                                  return (
                                    <span key={index} className="bg-yellow-200 font-semibold">
                                      {part}
                                    </span>
                                  );
                                }
                                return <span key={index}>{part}</span>;
                              })}
                              &rdquo;
                            </p>
                          </div>
                        ) : null;
                      })()}

                      {result.rawText && (
                        <div className="mt-3">
                          <button
                            type="button"
                            className="text-xs font-medium text-slate-600 underline decoration-dotted underline-offset-4 transition hover:text-slate-900"
                            onClick={() =>
                              setExpandedProviders((prev) => ({
                                ...prev,
                                [providerKey]: !prev[providerKey],
                              }))
                            }
                          >
                            {isExpanded ? "Hide full response" : "View full response"}
                          </button>
                          {isExpanded && (() => {
                            // Highlight all occurrences of the domain/brand in the full response
                            const text = result.rawText;

                            // Extract brand name from domain (e.g., "tinder" from "tinder.com")
                            const brandName = domain.split('.')[0];

                            // Create regex to match both domain and brand name (case-insensitive)
                            const searchPattern = new RegExp(
                              `(${domain.replace(/\./g, '\\.')}|\\*\\*${brandName}\\*\\*|${brandName})`,
                              'gi'
                            );

                            // Split text and highlight matches
                            const parts = text.split(searchPattern);

                            return (
                              <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 shadow-inner">
                                <pre className="whitespace-pre-wrap break-words font-sans text-[12px]">
                                  {parts.map((part, index) => {
                                    // Check if this part matches our search pattern
                                    if (part && (
                                      part.toLowerCase() === domain.toLowerCase() ||
                                      part.toLowerCase() === brandName.toLowerCase() ||
                                      part.toLowerCase() === `**${brandName.toLowerCase()}**`
                                    )) {
                                      return (
                                        <mark key={index} className="bg-yellow-300 font-bold px-0.5">
                                          {part}
                                        </mark>
                                      );
                                    }
                                    return <span key={index}>{part}</span>;
                                  })}
                                </pre>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {!isSuccess && (
                        <p className="mt-3 text-xs text-rose-500">
                          We couldn&apos;t fetch this provider&apos;s answer. Try again later or open the admin dashboard for logs.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Email Section - appears after results */}
              {!loading && !emailSaved && (
                <div className="mt-8 p-6 bg-white rounded-lg border border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Get Your Report via Email</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Enter your email to instantly receive a PDF report with detailed analysis
                  </p>
                  <div className="flex gap-3">
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={emailSaving}
                      className="flex-1 h-12 rounded-lg border-2 border-amber-500 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
                    />
                    <button
                      onClick={handleSaveEmail}
                      disabled={emailSaving || !email.trim()}
                      className="h-12 px-6 rounded-lg bg-amber-500 text-white font-semibold transition hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {emailSaving ? "Sending..." : "Send Report"}
                    </button>
                  </div>
                </div>
              )}

              {emailSaved && (
                <div className="mt-8 p-6 bg-green-50 rounded-lg text-center">
                  <p className="text-green-800 font-medium">
                    ✓ Report sent! Check your inbox for the PDF report.
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
