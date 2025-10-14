// src/lib/domainRegex.ts
/**
 * Build a safe regex to detect a domain mention in text.
 * - case-insensitive
 * - matches with or without www.
 * - matches both full domain (e.g., "bumble.com") and brand name (e.g., "Bumble")
 * - enforces non-alphanumeric boundaries around the match
 */
export function buildDomainRegex(domain: string): RegExp {
  // Extract the brand name from the domain
  // e.g., "bumble.com" -> "bumble"
  // e.g., "www.example.co.uk" -> "example"
  const brandName = domain
    .replace(/^www\./i, '') // remove www prefix
    .split('.')[0]; // take first part before first dot

  const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedBrand = brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Match either:
  // 1. Full domain with optional www: www.bumble.com or bumble.com
  // 2. Brand name only: Bumble
  const pattern = `(^|[^a-z0-9])((?:www\\.)?${escapedDomain}|${escapedBrand})([^a-z0-9]|$)`;
  return new RegExp(pattern, "i");
}

