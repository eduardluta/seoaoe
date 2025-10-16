/**
 * Extract all domains mentioned in a text
 */
export function extractDomains(text: string): string[] {
  // Regex to match domains (simplified pattern)
  const domainPattern = /(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/gi;
  const matches = text.matchAll(domainPattern);

  const domains = new Set<string>();

  for (const match of matches) {
    const domain = match[1];

    // Clean up the domain
    let cleaned = domain.toLowerCase();

    // Remove common suffixes like .com/path
    cleaned = cleaned.split('/')[0] || cleaned;
    cleaned = cleaned.split('?')[0] || cleaned;
    cleaned = cleaned.split('#')[0] || cleaned;

    // Only include if it looks like a valid domain
    if (cleaned.includes('.') && cleaned.length > 3) {
      domains.add(cleaned);
    }
  }

  return Array.from(domains);
}

/**
 * Highlight the target domain in text
 */
export function highlightDomain(text: string, domain: string): string {
  const domainRegex = new RegExp(
    `(https?://)?([www\\.])?${domain.replace(/\./g, '\\.')}([/?#]|\\s|$)`,
    'gi'
  );

  return text.replace(domainRegex, (match) => `**${match}**`);
}
