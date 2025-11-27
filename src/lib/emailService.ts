import { Resend } from "resend";
import { prisma } from "./prisma";
import { generateEmailHTML as generateEmailHTMLTemplate, generateProviderCard } from "./emailTemplate";

// Initialize Resend
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

type ProviderResult = {
  provider: string;
  status: string;
  mentioned: boolean | null;
  firstIndex?: number | null;
  evidence?: string | null;
  rawResponse: unknown;
};

type EmailData = {
  runId: string;
  email: string;
  keyword: string;
  domain: string;
  score: number;
  mentionCount: number;
  totalProviders: number;
  results: ProviderResult[];
};

function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
}

function extractAnswer(rawResponse: unknown): string | null {
  if (!rawResponse || typeof rawResponse !== 'object') return null;
  const response = rawResponse as Record<string, unknown>;

  // Try to find answer in common fields
  if (typeof response.answer === 'string') return response.answer;
  if (typeof response.text === 'string') return response.text;
  if (typeof response.content === 'string') return response.content;
  if (typeof response.response === 'string') return response.response;

  return null;
}

function extractError(rawResponse: unknown): string | null {
  if (!rawResponse || typeof rawResponse !== 'object') return null;
  const response = rawResponse as Record<string, unknown>;

  if (typeof response.error === 'string') return response.error;
  if (response.error && typeof response.error === 'object') {
    const errorObj = response.error as Record<string, unknown>;
    if (typeof errorObj.message === 'string') return errorObj.message;
  }

  return null;
}

function extractDomainsMentionedBefore(text: string, targetIndex: number): string[] {
  const textBefore = text.substring(0, targetIndex);

  // Find the last section header to limit scope (same as frontend)
  const lastHeaderMatch = textBefore.match(/(?:^|\n)#{2,}\s+[^\n]+$/m);
  const startIndex = lastHeaderMatch
    ? textBefore.lastIndexOf(lastHeaderMatch[0])
    : Math.max(0, textBefore.length - 1200);

  const relevantText = text.substring(startIndex, targetIndex);

  const seenBrands = new Set<string>();

  // Expanded skip words - generic terms that should NEVER be counted as brands
  const skipWords = new Set([
    'the', 'and', 'for', 'with', 'you', 'your', 'this', 'that', 'best', 'tips',
    'also', 'make', 'find', 'help', 'meetup', 'eventbrite', 'timeout', 'speeddater',
    'privacy', 'language', 'neutrality', 'security', 'safety', 'quality', 'features',
    'options', 'service', 'services', 'online', 'dating', 'website', 'platform',
    'app', 'mobile', 'social', 'network', 'community', 'profiles', 'profile'
  ]);

  // Ambiguous words that need strong brand context
  const ambiguousBrands = new Set([
    'match', 'wish', 'apple', 'amazon', 'target', 'mint', 'chase', 'discover',
    'zoom', 'slack', 'meet', 'hinge'
  ]);

  // Known dating/relationship brands that can be counted without TLD if in proper context
  const knownDatingBrands = new Set([
    'tinder', 'bumble', 'hinge', 'okcupid', 'pof', 'eharmony', 'match',
    'coffeemeetsbagel', 'happn', 'feeld', 'raya', 'boo', 'swissfriends'
  ]);

  // Pattern 1: EXPLICIT domains with TLDs (this is the most reliable)
  // Expanded TLD list to include more common extensions
  const domainMatches = relevantText.matchAll(/\b([a-z0-9-]{2,})\.(com|de|net|org|co|io|app|ai|ch|fr|it|nl|uk|eu|dating|love|singles)\b/gi);
  for (const match of domainMatches) {
    const brand = match[1].toLowerCase().replace(/-/g, '');
    const tld = match[2].toLowerCase();

    // Skip generic/common words and test domains
    if (skipWords.has(brand) || brand.includes('example') || brand.includes('test') || brand.length < 2) {
      continue;
    }

    seenBrands.add(`${brand}.${tld}`);
  }

  // Pattern 2: Markdown table cells - ONLY if they contain explicit TLD or are known brands
  const tableRegex = /\|\s*\*{0,2}([A-Za-z][a-zA-Z0-9-]{2,}(?:\.[a-z]{2,})?)\*{0,2}\s*\|/gm;
  let match;
  while ((match = tableRegex.exec(relevantText)) !== null) {
    const content = match[1].toLowerCase().replace(/-/g, '');

    // Check if it already has a TLD
    if (content.includes('.')) {
      const parts = content.split('.');
      const brand = parts[0];
      const tld = parts[1];
      if (!skipWords.has(brand) && brand.length >= 2) {
        seenBrands.add(content);
      }
    }
    // Only add .com if it's a known dating brand
    else if (knownDatingBrands.has(content) && content.length >= 3) {
      seenBrands.add(`${content}.com`);
    }
  }

  // Pattern 3: List items and emphasized text - MUCH MORE CONSERVATIVE
  // Only match if followed by brand indicators or if it's a known brand
  const listItemRegex = /(?:(?:^|\n)\s*(?:\d+[\.)]+|[-*•])\s+\*{0,2})([A-Za-z][a-zA-Z0-9-]{2,})(?:\*{0,2}\s*(?::|\(|\.com\b)|\*{1,2}(?:\s|$))/gm;
  while ((match = listItemRegex.exec(relevantText)) !== null) {
    const brand = match[1].toLowerCase().replace(/-/g, '');

    // Skip if already seen, too short, or generic word
    if (seenBrands.has(`${brand}.com`) || brand.length < 3 || skipWords.has(brand)) {
      continue;
    }

    // Get extended context (100 chars) to check for brand indicators
    const contextStart = Math.max(0, match.index - 20);
    const contextEnd = Math.min(relevantText.length, match.index + match[0].length + 100);
    const context = relevantText.substring(contextStart, contextEnd);

    // Check if it's a known dating brand with good context
    if (knownDatingBrands.has(brand)) {
      seenBrands.add(`${brand}.com`);
      continue;
    }

    // For unknown brands, require VERY strong evidence
    const hasExplicitDomain = /\.com\b|\.de\b|\.ch\b|\.net\b|\.app\b|\.io\b/i.test(context);
    const hasStrongBrandContext = /\b(app|website|site|platform|service)\b/i.test(context);
    const hasGenericContext = /\b(privacy|security|features|quality|language|neutrality|safety|tips|options|best)\b/i.test(context);

    // Only add if explicit domain mention OR (strong brand context AND NOT generic context)
    if (hasExplicitDomain) {
      seenBrands.add(`${brand}.com`);
    } else if (hasStrongBrandContext && !hasGenericContext && !ambiguousBrands.has(brand)) {
      seenBrands.add(`${brand}.com`);
    }
  }

  return Array.from(seenBrands);
}

function generateEmailHTML(data: EmailData): string {
  const { keyword, domain, score, mentionCount, totalProviders, results } = data;

  const providerNames: Record<string, string> = {
    openai: 'ChatGPT',
    grok: 'Grok',
    deepseek: 'DeepSeek',
    perplexity: 'Perplexity',
    gemini: 'Gemini',
    claude: 'Claude',
    google_ai_overview: 'Google AI Overview',
    google_organic: 'Google Organic',
  };

  // Determine score color and message
  const getScoreColor = (score: number) => {
    if (score >= 70) return '#10b981'; // green
    if (score >= 40) return '#f59e0b'; // orange
    return '#ef4444'; // red
  };

  const getScoreMessage = (score: number) => {
    if (score >= 70) return 'Excellent visibility! Your domain is well-represented across Google & AI engines.';
    if (score >= 40) return 'Good start! Consider optimizing content to improve Google & AI visibility.';
    return 'Low visibility. Focus on creating content optimized for Google & AI engines to improve rankings.';
  };

  // Sort results: mentioned first, then not mentioned, then errors
  const sortedResults = [...results].sort((a, b) => {
    if (a.status === 'ok' && a.mentioned && !(b.status === 'ok' && b.mentioned)) return -1;
    if (!(a.status === 'ok' && a.mentioned) && (b.status === 'ok' && b.mentioned)) return 1;
    if (a.status === 'ok' && !a.mentioned && b.status !== 'ok') return -1;
    if (a.status !== 'ok' && b.status === 'ok' && !b.mentioned) return 1;
    return 0;
  });

  // Generate provider cards
  const providerCards = sortedResults.map(result => {
    const providerName = providerNames[result.provider] || result.provider;
    const isMentioned = result.status === 'ok' && result.mentioned === true;
    const isError = result.status !== 'ok';

    const statusBadgeColor = isMentioned ? '#10b981' : isError ? '#f59e0b' : '#ef4444';
    const statusBadgeText = isMentioned ? '✓ MENTIONED' : isError ? '⚠ ERROR' : '✗ NOT FOUND';

    const answer = extractAnswer(result.rawResponse);
    const error = extractError(result.rawResponse);
    const hasPosition = typeof result.firstIndex === 'number' && result.firstIndex >= 0;

    // Competitor analysis and brand ranking calculation
    // Skip for google_organic which uses ranking position (1-10)
    let competitors: string[] = [];
    let brandRanking: number | null = null;
    if (isMentioned && hasPosition && answer && result.provider !== 'google_organic') {
      competitors = extractDomainsMentionedBefore(answer, result.firstIndex!);
      brandRanking = competitors.length + 1; // Ranking = number of competitors before + 1
    } else if (isMentioned && hasPosition && result.provider === 'google_organic') {
      // For Google Organic, firstIndex is already the ranking (1-10)
      brandRanking = result.firstIndex!;
    }

    // Extract full paragraph for better context
    let snippet: string | null = null;
    if (isMentioned && (result.evidence || answer)) {
      const fullText = result.evidence || answer || '';
      const mentionIndex = fullText.toLowerCase().indexOf(domain.toLowerCase());

      if (mentionIndex >= 0) {
        // Find paragraph boundaries around the mention
        let start = mentionIndex;
        let end = mentionIndex + domain.length;

        // Look backward for paragraph start (newline + bullet, number, or double newline)
        for (let i = mentionIndex - 1; i >= 0; i--) {
          if (fullText[i] === '\n') {
            const nextChar = fullText[i + 1];
            if (nextChar === '\n' || nextChar === '-' || nextChar === '*' || /\d/.test(nextChar)) {
              start = i + 1;
              break;
            }
          }
          if (mentionIndex - i > 650) {  // Increased from 500 to 650 (30% more)
            start = i;
            break;
          }
        }

        // Look forward for paragraph end (period + space/newline, or double newline)
        for (let i = end; i < fullText.length; i++) {
          if (fullText[i] === '.' && (i + 1 >= fullText.length || fullText[i + 1] === '\n' || fullText[i + 1] === ' ')) {
            end = i + 1;
            break;
          }
          if (fullText[i] === '\n' && i + 1 < fullText.length && fullText[i + 1] === '\n') {
            end = i;
            break;
          }
          if (i - mentionIndex > 780) {  // Increased from 600 to 780 (30% more)
            end = i;
            break;
          }
        }

        snippet = escapeHtml(fullText.substring(start, end).trim().replace(/^[-*•\d.)\s]+/, ''));
      } else {
        // Fallback if domain not found in text
        snippet = escapeHtml(fullText.substring(0, 400)) + (fullText.length > 400 ? '...' : '');
      }
    }

    return generateProviderCard({
      providerName: escapeHtml(providerName),
      providerKey: result.provider,
      statusBadgeColor,
      statusBadgeText,
      isMentioned,
      position: brandRanking, // Pass the calculated brand ranking, not character position
      competitorCount: competitors.length,
      competitors: escapeHtml(competitors.join(', ')),
      snippet,
      errorMessage: error ? escapeHtml(error) : null,
      fullResponse: answer ? escapeHtml(answer) : null,
    });
  }).join('\n');

  return generateEmailHTMLTemplate({
    keyword: escapeHtml(keyword),
    domain: escapeHtml(domain),
    score,
    mentionCount,
    totalProviders,
    providerCards,
    scoreColor: getScoreColor(score),
    scoreMessage: getScoreMessage(score),
  });
}


function generateEmailText(data: EmailData): string {
  const { keyword, domain, score, mentionCount, totalProviders, results } = data;

  const providerNames: Record<string, string> = {
    openai: 'ChatGPT (OpenAI)',
    grok: 'Grok (xAI)',
    deepseek: 'DeepSeek',
    perplexity: 'Perplexity AI',
    gemini: 'Gemini (Google)',
    claude: 'Claude (Anthropic)',
    google_ai_overview: 'Google AI Overview',
    google_organic: 'Google Organic Search',
  };

  const resultsText = results.map(result => {
    const providerName = providerNames[result.provider] || result.provider;
    const statusText = result.status === 'ok'
      ? (result.mentioned ? 'MENTIONED' : 'NOT MENTIONED')
      : 'ERROR';

    const answer = extractAnswer(result.rawResponse);
    const error = extractError(result.rawResponse);

    let content = `\n${providerName}: ${statusText}\n${'='.repeat(60)}`;

    if (result.status === 'ok' && answer) {
      content += `\n${answer}\n`;
    } else if (error) {
      content += `\nError: ${error}\n`;
    } else {
      content += `\nNo response available\n`;
    }

    return content;
  }).join('\n');

  return `
AI SEO Ranking Report

Your AI visibility check for "${keyword}" has been completed.

Summary:
- Domain: ${domain}
- Keyword: ${keyword}
- Overall Score: ${score}%
- Mentions: ${mentionCount} of ${totalProviders} providers

DETAILED RESULTS BY AI PROVIDER
${'='.repeat(60)}
${resultsText}

---
AI SEO Ranking
Track your brand's visibility across AI answer engines
${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}
  `.trim();
}

export async function sendReportEmail(data: EmailData): Promise<void> {
  if (!resend) {
    console.warn("RESEND_API_KEY not configured. Skipping email send.");

    // Mark as failed in database
    await prisma.email.upsert({
      where: { runId: data.runId },
      create: {
        id: `email_${data.runId}`,
        runId: data.runId,
        toEmail: data.email,
        status: "failed",
        error: "Resend API key not configured",
      },
      update: {
        status: "failed",
        error: "Resend API key not configured",
      },
    });

    return;
  }

  if (!process.env.RESEND_FROM_EMAIL) {
    console.warn("RESEND_FROM_EMAIL not configured. Skipping email send.");

    await prisma.email.upsert({
      where: { runId: data.runId },
      create: {
        id: `email_${data.runId}`,
        runId: data.runId,
        toEmail: data.email,
        status: "failed",
        error: "Resend from email not configured",
      },
      update: {
        status: "failed",
        error: "Resend from email not configured",
      },
    });

    return;
  }

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL as string,
      to: data.email,
      subject: `${data.domain} - AI SEO Ranking Report`,
      text: generateEmailText(data),
      html: generateEmailHTML(data),
    });

    // Mark as sent in database
    await prisma.email.upsert({
      where: { runId: data.runId },
      create: {
        id: `email_${data.runId}`,
        runId: data.runId,
        toEmail: data.email,
        status: "sent",
        sentAt: new Date(),
        provider: "resend",
      },
      update: {
        status: "sent",
        sentAt: new Date(),
        provider: "resend",
      },
    });

    console.log(`Email sent successfully to ${data.email}`);
  } catch (error) {
    console.error("Error sending email:", error);

    // Mark as failed in database
    await prisma.email.upsert({
      where: { runId: data.runId },
      create: {
        id: `email_${data.runId}`,
        runId: data.runId,
        toEmail: data.email,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        provider: "resend",
      },
      update: {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        provider: "resend",
      },
    });

    throw error;
  }
}
