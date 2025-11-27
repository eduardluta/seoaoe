"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import FAQ from "@/components/FAQ";

type RunResult = {
  provider: string;
  model: string | null;
  status: "ok" | "error" | "timeout" | "pending" | string;
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

const PROVIDER_LABELS: Record<string, string> = {
  openai: "ChatGPT",
  grok: "Grok",
  perplexity: "Perplexity",
  gemini: "Gemini",
  claude: "Claude",
  google_ai_overview: "Google AI Overview",
  google_organic: "Google Organic",
};

const PROVIDER_ORDER = [
  "google_ai_overview",
  "google_organic",
  "openai",
  "perplexity",
  "grok",
  "gemini",
  "claude",
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

// Helper to get ordinal suffix (1st, 2nd, 3rd, 4th...)
function getOrdinalSuffix(num: number): string {
  return num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
}

// Helper to get badge color based on ranking
function getRankBadgeColor(rank: number): string {
  return rank === 1
    ? "bg-emerald-100 text-emerald-700"
    : rank <= 3
    ? "bg-orange-100 text-orange-700"
    : "bg-red-100 text-red-700";
}

// Combined function to extract competitors and calculate ranking in one pass
// Optimized for performance with fewer regex passes and early exits
function analyzeBrandPosition(text: string, targetIndex: number): { ranking: number; competitors: string[] } {
  // Find the last section header (##) before the target to limit scope
  const textBeforeTarget = text.substring(0, targetIndex);
  const lastHeaderMatch = textBeforeTarget.match(/(?:^|\n)#{2,}\s+[^\n]+$/m);

  // Only analyze brands after the last section header (same category)
  // If no header found, use last 1200 chars to avoid counting unrelated brands
  const startIndex = lastHeaderMatch
    ? textBeforeTarget.lastIndexOf(lastHeaderMatch[0])
    : Math.max(0, textBeforeTarget.length - 1200);

  const relevantText = text.substring(startIndex, targetIndex);

  // Ambiguous brands that need context validation
  const ambiguousBrands = new Set(['match', 'wish', 'apple', 'amazon', 'target', 'mint', 'chase', 'discover', 'zoom', 'slack', 'meet']);

  // Skip common words and non-competitor platforms
  const skipWords = new Set(['the', 'and', 'for', 'with', 'you', 'your', 'this', 'that', 'best', 'tips', 'also', 'make', 'find', 'help', 'meetup', 'eventbrite', 'timeout', 'speeddater']);

  const seenBrands = new Set<string>();
  const uniqueDomains: string[] = [];

  // Helper to add brand if not seen
  const addBrand = (name: string) => {
    if (!seenBrands.has(name)) {
      seenBrands.add(name);
      uniqueDomains.push(`${name}.com`);
      return true;
    }
    return false;
  };

  // Pattern 1: Explicit .com/.net/.org domains (highest confidence)
  // Also handles domains with hyphens and numbers
  const domainMatches = relevantText.matchAll(/\b([a-z0-9-]{3,})\.(com|net|org)\b/gi);
  for (const match of domainMatches) {
    const brand = match[1].toLowerCase().replace(/-/g, '');
    if (!skipWords.has(brand) && brand.length >= 3) addBrand(brand);
  }

  // Pattern 2: Improved brand detection for list items and emphasized text
  // Matches formats like: "* **Brand:**", "1. Brand:", "**Brand**", etc.
  // Handles mixed case brands (eHarmony, OkCupid, etc.)
  const combinedRegex = /(?:(?:^|\n)\s*(?:\d+[\.)]+|[-*•])\s+\*{0,2}|(?:^|\n)\s*\*{1,2})([A-Za-z][a-zA-Z0-9]{2,})(?:\*{0,2}\s*:|\*{1,2}(?:\s|$)|(?=\s+[-—]))/gm;

  let match;
  while ((match = combinedRegex.exec(relevantText)) !== null) {
    const brand = match[1].toLowerCase();

    // Skip if already seen, too short, or common word
    if (seenBrands.has(brand) || brand.length < 3 || skipWords.has(brand)) continue;

    // Non-ambiguous brands: add immediately
    if (!ambiguousBrands.has(brand)) {
      addBrand(brand);
      continue;
    }

    // Ambiguous brands: quick context check (60 chars after match)
    const contextEnd = Math.min(relevantText.length, match.index + match[0].length + 60);
    const context = relevantText.substring(match.index, contextEnd);

    // Check for brand indicators vs verb indicators
    const hasBrandContext = /\.com|app\b|site|platform|dating|website/i.test(context);
    const hasVerbContext = /\s+(you|with|your|users|people|based)\b/i.test(context);

    // Add if brand context present and verb context absent
    if (hasBrandContext || !hasVerbContext) {
      addBrand(brand);
    }
  }

  // Pattern 3: Markdown table cells
  // Matches formats like: "| **Brand** |" or "| Brand |"
  const tableRegex = /\|\s*\*{0,2}([A-Za-z][a-zA-Z0-9-]{2,})\*{0,2}\s*\|/gm;

  while ((match = tableRegex.exec(relevantText)) !== null) {
    const brand = match[1].toLowerCase().replace(/-/g, '');

    // Skip if already seen, too short, or common word
    if (seenBrands.has(brand) || brand.length < 3 || skipWords.has(brand)) continue;

    addBrand(brand);
  }

  return {
    ranking: seenBrands.size + 1,
    competitors: uniqueDomains
  };
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
  const processedCount = useMemo(
    () => checkResults.filter((result) => COMPLETED_STATUSES.has(result.status.toLowerCase())).length,
    [checkResults]
  );
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
          language: "en", // Default to English - keyword defines actual language
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
      const maxAttempts = 100; // Extended to 100 seconds for DeepSeek which can be very slow

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

      // Initialize pending provider blocks for progressive loading
      const initialResults: RunResult[] = PROVIDER_ORDER.map(provider => ({
        provider,
        model: null,
        status: "pending",
        mentioned: null,
        firstIndex: null,
        evidence: null,
        latencyMs: null,
        costUsd: null,
        rawText: null,
      }));
      setCheckResults(initialResults);

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

          // Merge completed results with pending ones (progressive loading)
          setCheckResults(prev => {
            const updated = [...prev];
            completedResults.forEach(completedResult => {
              const index = updated.findIndex(r => r.provider === completedResult.provider);
              if (index !== -1) {
                updated[index] = completedResult;
              }
            });
            return updated;
          });

          const remaining = Math.max(expected - completedResults.length, 0);
          setStatusMessage(
            remaining > 0
              ? `Collected ${completedResults.length} of ${expected} providers…`
              : "All providers have responded. Scroll down for the breakdown."
          );

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
      <div className="-mb-48 w-full bg-black pb-48 pt-28 text-white sm:pt-32">
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

              {/* Country */}
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
      <div className="w-full bg-black pb-16 pt-12">
        <div className="mx-auto w-full max-w-3xl px-6">

          {/* Loading State */}
          {loading && (
            <div className="w-full max-w-2xl mx-auto space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-8">
                {/* Spinner */}
                <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="relative">
                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-black"></div>
                    <div className="absolute inset-0 h-16 w-16 animate-pulse rounded-full border-4 border-slate-100 opacity-25"></div>
                  </div>

                  {/* Status Message */}
                  <div className="text-center">
                    <p className="text-lg font-semibold text-black mb-2">
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
                          className="bg-black h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(processedCount / expectedProviders) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Progressive Provider Cards */}
              {checkResults.length > 0 && (
                <div className="space-y-4">
                  {checkResults.map((result, index) => {
                    const providerLabel = PROVIDER_LABELS[result.provider] ?? result.provider;
                    const status = result.status.toLowerCase();
                    const isPending = status === "pending";
                    const isSuccess = status === "ok";
                    const mentioned = Boolean(result.mentioned);
                    const providerKey = `${result.provider}-${result.model ?? index}`;

                    if (isPending) {
                      // Skeleton loading state for pending providers
                      return (
                        <div
                          key={providerKey}
                          className="rounded-2xl border-2 border-blue-200 bg-white p-5 shadow-sm animate-pulse"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"></div>
                              <p className="text-sm font-semibold text-black">
                                {providerLabel}
                              </p>
                            </div>
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                              Loading...
                            </span>
                          </div>
                          <div className="mt-3 space-y-2">
                            <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      );
                    }

                    // Completed provider card (same as non-loading state)
                    const statusBadge =
                      isSuccess && mentioned
                        ? "bg-emerald-100 text-emerald-700"
                        : isSuccess
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700";

                    return (
                      <div
                        key={providerKey}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-black">
                              {providerLabel}
                            </p>
                            {typeof result.firstIndex === "number" && result.firstIndex >= 0 && mentioned && result.rawText && (() => {
                              const isGoogleOrganic = result.provider === "google_organic";
                              const brandRank = isGoogleOrganic
                                ? result.firstIndex
                                : analyzeBrandPosition(result.rawText, result.firstIndex).ranking;
                              return (
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getRankBadgeColor(brandRank)}`}>
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {isGoogleOrganic ? `#${brandRank}` : `${brandRank}${getOrdinalSuffix(brandRank)} brand`}
                                </span>
                              );
                            })()}
                          </div>
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadge}`}>
                            {isSuccess ? (mentioned ? "Mentioned" : "Not mentioned") : result.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Status Message when not loading */}
          {!loading && statusMessage && (
            <p className="mb-6 text-center text-base text-neutral-400">{statusMessage}</p>
          )}

          {processedCount > 0 && !loading && (() => {
            const successRate = (mentionCount / expectedProviders) * 100;
            const isGoodPerformance = successRate >= 50;

            return (
            <section className="w-full max-w-2xl mx-auto">
              {/* Enhanced Summary Card */}
              <div className="mb-8 relative group">
                {/* Background gradient blob */}
                <div className={`absolute inset-0 bg-gradient-to-r ${isGoodPerformance ? 'from-amber-500/20 via-orange-500/20 to-amber-500/20' : 'from-red-500/20 via-rose-500/20 to-red-500/20'} blur-3xl rounded-full transform scale-110 group-hover:scale-125 transition-transform duration-700`}></div>

                {/* Main Card */}
                <div className={`relative bg-black rounded-2xl border-2 ${isGoodPerformance ? 'border-amber-500/30' : 'border-red-500/30'} p-8 shadow-2xl backdrop-blur-sm ${isGoodPerformance ? 'group-hover:border-amber-500/50' : 'group-hover:border-red-500/50'} transition-all duration-300`}>
                  {/* Status Badge */}
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r ${isGoodPerformance ? 'from-amber-600 to-orange-600' : 'from-red-600 to-rose-600'} rounded-full shadow-lg`}>
                    <p className="text-xs font-bold text-white uppercase tracking-wider">
                      Analysis Complete
                    </p>
                  </div>

                  {/* Main Score */}
                  <div className="text-center mt-2">
                    <div className="inline-flex items-center justify-center gap-3 mb-4">
                      {/* Success Icon */}
                      {mentionCount > 0 ? (
                        <svg className={`w-12 h-12 ${isGoodPerformance ? 'text-emerald-400' : 'text-red-400'} animate-pulse`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}

                      {/* Large Score Display */}
                      <div>
                        <p className={`text-6xl font-black bg-gradient-to-r ${isGoodPerformance ? 'from-amber-400 via-orange-400 to-amber-400' : 'from-red-400 via-rose-400 to-red-400'} bg-clip-text text-transparent leading-none`}>
                          {mentionCount}
                          <span className="text-4xl text-slate-500 font-normal">/{expectedProviders}</span>
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-lg font-semibold text-white mb-3">
                      {mentionCount === expectedProviders
                        ? "Perfect Score! All providers mentioned your domain"
                        : mentionCount >= expectedProviders - 1
                        ? "Great visibility across AI providers"
                        : mentionCount >= expectedProviders - 2
                        ? "Good visibility across AI providers"
                        : mentionCount > 0
                        ? "Providers mentioned your domain"
                        : "No mentions found"}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-700/50 rounded-full h-3 mb-4 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-emerald-500/50"
                        style={{ width: `${(mentionCount / expectedProviders) * 100}%` }}
                      ></div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 hover:border-emerald-500/50 transition-colors">
                        <p className="text-2xl font-bold text-emerald-400">{mentionCount}</p>
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Mentioned</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 hover:border-slate-500/50 transition-colors">
                        <p className="text-2xl font-bold text-slate-400">{expectedProviders - mentionCount}</p>
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Not Found</p>
                      </div>
                      <div className={`bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 ${isGoodPerformance ? 'hover:border-amber-500/50' : 'hover:border-red-500/50'} transition-colors`}>
                        <p className={`text-2xl font-bold ${isGoodPerformance ? 'text-amber-400' : 'text-red-400'}`}>{Math.round((mentionCount / expectedProviders) * 100)}%</p>
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Success Rate</p>
                      </div>
                    </div>

                    {/* Scroll hint */}
                    <div className={`mt-6 flex items-center justify-center gap-2 ${isGoodPerformance ? 'text-amber-400/70' : 'text-red-400/70'} animate-bounce`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      <p className="text-xs font-medium">Scroll down for detailed breakdown</p>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
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
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700";

                  // Pre-compute values once for this result
                  const hasValidMention = typeof result.firstIndex === "number" && result.firstIndex >= 0 && mentioned && result.rawText;
                  const brandAnalysis = hasValidMention ? analyzeBrandPosition(result.rawText!, result.firstIndex!) : null;
                  const brandName = domain.split('.')[0];

                  // Create highlight regex once
                  const highlightRegex = new RegExp(
                    `(${domain.replace(/\./g, '\\.')}|\\*\\*${brandName}\\*\\*|${brandName})`,
                    'gi'
                  );
                  const domainLower = domain.toLowerCase();
                  const brandNameLower = brandName.toLowerCase();

                  return (
                    <div
                      key={providerKey}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-black">
                            {providerLabel}
                          </p>
                          {brandAnalysis && (
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getRankBadgeColor(brandAnalysis.ranking)}`}>
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {brandAnalysis.ranking}{getOrdinalSuffix(brandAnalysis.ranking)} brand
                            </span>
                          )}
                        </div>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadge}`}>
                          {isSuccess ? (mentioned ? "Mentioned" : "Not mentioned") : result.status}
                        </span>
                      </div>

                      {brandAnalysis && (
                        <div className="mt-3 space-y-2">
                          {(() => {
                            const { ranking: brandRank, competitors: otherDomains } = brandAnalysis;

                            return (
                              <>
                                <p className="text-xs text-slate-600">
                                  {brandRank === 1
                                    ? `🎉 Your domain is the first brand mentioned in this response!`
                                    : `Your domain is the ${brandRank}${getOrdinalSuffix(brandRank)} brand mentioned.`
                                  }
                                </p>
                                {otherDomains.length > 0 && (
                                  <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 mb-1">
                                      {otherDomains.length} {otherDomains.length === 1 ? 'competitor' : 'competitors'} mentioned before you
                                    </p>
                                    <p className="text-xs text-amber-800">
                                      {otherDomains.join(', ')}
                                    </p>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}

                      {hasValidMention && (() => {
                        const contextText = extractContextAroundMention(result.rawText!, result.firstIndex!, domain);
                        if (!contextText) return null;

                        const parts = contextText.split(highlightRegex);

                        return (
                          <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 leading-relaxed">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                              Context
                            </p>
                            <p>
                              &ldquo;
                              {parts.map((part, index) => {
                                const partLower = part?.toLowerCase();
                                if (part && (
                                  partLower === domainLower ||
                                  partLower === brandNameLower ||
                                  partLower === `**${brandNameLower}**`
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
                        );
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
                            const parts = result.rawText!.split(highlightRegex);

                            return (
                              <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 shadow-inner">
                                <pre className="whitespace-pre-wrap break-words font-sans text-[12px]">
                                  {parts.map((part, index) => {
                                    const partLower = part?.toLowerCase();
                                    if (part && (
                                      partLower === domainLower ||
                                      partLower === brandNameLower ||
                                      partLower === `**${brandNameLower}**`
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
                  <h3 className="text-lg font-semibold text-black mb-3">Get Your Report via Email</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Enter your email to receive the detailed report
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveEmail();
                    }}
                    className="flex gap-3"
                  >
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={emailSaving}
                      className="flex-1 h-12 rounded-lg border-2 border-amber-500 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
                    />
                    <button
                      type="submit"
                      disabled={emailSaving || !email.trim()}
                      className="h-12 px-6 rounded-lg bg-amber-500 text-white font-semibold transition hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {emailSaving ? "Sending..." : "Send Report"}
                    </button>
                  </form>
                </div>
              )}

              {emailSaved && (
                <div className="mt-8 p-6 bg-green-50 rounded-lg text-center">
                  <p className="text-green-800 font-medium">
                    ✓ Report sent! Check your inbox for the detailed report.
                  </p>
                </div>
              )}
            </section>
            );
          })()}
        </div>
      </div>

      {/* FAQ Section */}
      <FAQ />
    </div>
  );
}
