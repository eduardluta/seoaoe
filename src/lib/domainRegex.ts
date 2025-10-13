// src/lib/domainRegex.ts
/**
 * Build a safe regex to detect a domain mention in text.
 * - case-insensitive
 * - matches with or without www.
 * - enforces non-alphanumeric boundaries around the match
 */
export function buildDomainRegex(domain: string): RegExp {
  const escaped = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // allow optional leading www.
  const pattern = `(^|[^a-z0-9])(?:www\\.)?${escaped}([^a-z0-9]|$)`;
  return new RegExp(pattern, "i");
}

