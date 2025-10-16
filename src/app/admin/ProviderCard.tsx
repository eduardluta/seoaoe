"use client";

import { useMemo } from "react";

type ProviderCardProps = {
  label: string;
  weight: number;
  model: string | null;
  status: string;
  mentioned: boolean;
  evidence: string | null;
  latencyMs: number | null;
  costUsd: number | string | unknown | null;
  rawResponse: unknown;
  targetDomain: string;
};

function extractDomains(text: string): string[] {
  const domainPattern = /(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/gi;
  const matches = text.matchAll(domainPattern);
  const domains = new Set<string>();

  for (const match of matches) {
    const domain = match[1];
    let cleaned = domain.toLowerCase();
    cleaned = cleaned.split('/')[0] || cleaned;
    cleaned = cleaned.split('?')[0] || cleaned;
    cleaned = cleaned.split('#')[0] || cleaned;

    if (cleaned.includes('.') && cleaned.length > 3) {
      domains.add(cleaned);
    }
  }

  return Array.from(domains);
}

function highlightText(text: string, targetDomain: string): React.ReactNode[] {
  const domainPattern = new RegExp(
    `(https?://)?([www\\.])?${targetDomain.replace(/\./g, '\\.')}([/?#\\s]|$)`,
    'gi'
  );

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = domainPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <mark key={match.index} className="bg-yellow-200 dark:bg-yellow-700 font-semibold">
        {match[0]}
      </mark>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function ProviderCard({
  label,
  weight,
  model,
  status,
  mentioned,
  evidence,
  latencyMs,
  costUsd,
  rawResponse,
  targetDomain,
}: ProviderCardProps) {
  const isSuccess = status === "ok";
  const costValue = typeof costUsd === "number" ? costUsd : typeof costUsd === "string" ? parseFloat(costUsd) : 0;

  // Extract raw text from rawResponse
  const rawText = (rawResponse && typeof rawResponse === 'object' && 'text' in rawResponse ? rawResponse.text : undefined) as string | undefined;
  const rawError = (rawResponse && typeof rawResponse === 'object' && 'error' in rawResponse ? String(rawResponse.error) : null);

  // Extract all domains mentioned in the response
  const mentionedDomains = useMemo(() => {
    if (!rawText || typeof rawText !== 'string') return [];
    return extractDomains(rawText);
  }, [rawText]);

  // Highlight the target domain in the text
  const highlightedText = useMemo(() => {
    if (!rawText || typeof rawText !== 'string') return [];
    return highlightText(rawText, targetDomain);
  }, [rawText, targetDomain]);

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/60 p-4 shadow hover:shadow-md transition-shadow">
      {/* Header: Provider Name + Status */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{label}</p>
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
            isSuccess
              ? mentioned
                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
          }`}
        >
          {isSuccess ? (mentioned ? "✓ Mentioned" : "✗ Not mentioned") : "⚠ Error"}
        </span>
      </div>

      {/* Evidence Snippet - only for mentioned */}
      {mentioned && evidence && (
        <div className="mt-3 rounded-lg bg-green-50/80 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-200">
          <p className="font-medium text-xs uppercase tracking-wide text-green-600 dark:text-green-300 mb-1.5">
            Evidence
          </p>
          <p className="italic">{evidence}</p>
        </div>
      )}

      {/* Domains Mentioned - Compact View */}
      {mentionedDomains.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">
            Domains mentioned ({mentionedDomains.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {mentionedDomains.slice(0, 5).map((domain) => (
              <span
                key={domain}
                className={`text-xs px-2.5 py-1 rounded-full ${
                  domain.toLowerCase().includes(targetDomain.toLowerCase())
                    ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 font-semibold ring-2 ring-yellow-400 dark:ring-yellow-600"
                    : "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                }`}
              >
                {domain}
              </span>
            ))}
            {mentionedDomains.length > 5 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400">
                +{mentionedDomains.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Collapsible Sections */}
      <div className="mt-3 space-y-2">
        {/* Technical Details Toggle */}
        <details className="group">
          <summary className="cursor-pointer text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors list-none flex items-center gap-1.5">
            <span className="group-open:rotate-90 transition-transform">▶</span>
            Technical details
          </summary>
          <div className="mt-2 pl-5 space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
            {model && <p>Model: <span className="font-mono">{model}</span></p>}
            <p>Weight: {(weight * 100).toFixed(0)}%</p>
            {typeof latencyMs === "number" && <p>Latency: {(latencyMs / 1000).toFixed(2)}s</p>}
            {costValue > 0 && <p>Cost: ${costValue.toFixed(4)}</p>}
            {!isSuccess && rawError && (
              <p className="text-red-500 dark:text-red-400">Error: {rawError}</p>
            )}
          </div>
        </details>

        {/* Full Response Toggle */}
        {rawText && (
          <details className="group">
            <summary className="cursor-pointer text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors list-none flex items-center gap-1.5">
              <span className="group-open:rotate-90 transition-transform">▶</span>
              Full response
            </summary>
            <div className="mt-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 p-3 text-xs whitespace-pre-wrap text-neutral-700 dark:text-neutral-300 max-h-80 overflow-y-auto leading-relaxed">
              {highlightedText}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
