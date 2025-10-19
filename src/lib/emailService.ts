import { Resend } from "resend";
import { prisma } from "./prisma";

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
  const domainRegex = /\b([a-z0-9-]+\.(?:com|de|net|org|co|io|app|ai|ch|fr|it|nl|uk|eu))\b/gi;
  const domains = new Set<string>();
  let match;

  while ((match = domainRegex.exec(textBefore)) !== null) {
    const domain = match[1].toLowerCase();
    if (!domain.includes('example.') && !domain.includes('test.')) {
      domains.add(domain);
    }
  }

  return Array.from(domains);
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
  };

  // Determine score color and message
  const getScoreColor = (score: number) => {
    if (score >= 70) return '#10b981'; // green
    if (score >= 40) return '#f59e0b'; // orange
    return '#ef4444'; // red
  };

  const getScoreMessage = (score: number) => {
    if (score >= 70) return 'Excellent visibility! Your domain is well-represented across AI engines.';
    if (score >= 40) return 'Good start! Consider optimizing content to improve AI visibility.';
    return 'Low visibility. Focus on creating AI-friendly content to improve rankings.';
  };

  // Sort results: mentioned first, then not mentioned, then errors
  const sortedResults = [...results].sort((a, b) => {
    if (a.status === 'ok' && a.mentioned && !(b.status === 'ok' && b.mentioned)) return -1;
    if (!(a.status === 'ok' && a.mentioned) && (b.status === 'ok' && b.mentioned)) return 1;
    if (a.status === 'ok' && !a.mentioned && b.status !== 'ok') return -1;
    if (a.status !== 'ok' && b.status === 'ok' && !b.mentioned) return 1;
    return 0;
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f9fafb;
      padding: 20px;
    }
    .email-container {
      max-width: 600px;
      width: 100%;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    .header p {
      font-size: 16px;
      opacity: 0.95;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 24px;
      color: #374151;
    }
    .score-container {
      background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
      border-radius: 12px;
      padding: 32px;
      text-align: center;
      margin: 30px 0;
    }
    .score-circle {
      width: 140px;
      height: 140px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      position: relative;
    }
    .score-number {
      font-size: 48px;
      font-weight: 700;
      color: ${getScoreColor(score)};
    }
    .score-label {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      color: #6b7280;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .score-message {
      font-size: 15px;
      color: #4b5563;
      margin-top: 16px;
      line-height: 1.5;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 30px 0;
    }
    .summary-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    .summary-card-value {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }
    .summary-card-label {
      font-size: 13px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin: 40px 0 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e5e7eb;
    }
    .providers-grid {
      display: grid;
      gap: 12px;
      margin: 20px 0;
    }
    .provider-card {
      background: #ffffff;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      padding: 18px;
      transition: all 0.2s;
    }
    .provider-card.mentioned {
      border-color: #10b981;
      background: #f0fdf4;
    }
    .provider-card.not-mentioned {
      border-color: #ef4444;
      background: #fef2f2;
    }
    .provider-card.error {
      border-color: #f59e0b;
      background: #fffbeb;
    }
    .provider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .provider-name {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .provider-icon {
      width: 24px;
      height: 24px;
      display: inline-block;
    }
    .status-badge {
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-mentioned {
      background: #10b981;
      color: white;
    }
    .status-not-mentioned {
      background: #ef4444;
      color: white;
    }
    .status-error {
      background: #f59e0b;
      color: white;
    }
    .provider-snippet {
      color: #4b5563;
      font-size: 14px;
      line-height: 1.6;
      padding: 12px;
      background: white;
      border-radius: 6px;
      border-left: 3px solid #e5e7eb;
      margin-top: 8px;
      max-height: 150px;
      overflow: hidden;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .provider-card.mentioned .provider-snippet {
      border-left-color: #10b981;
    }
    .provider-error {
      color: #dc2626;
      font-size: 13px;
      font-style: italic;
      margin-top: 8px;
    }
    .position-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #10b981;
      color: white;
      padding: 8px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      margin-top: 12px;
    }
    .position-explanation {
      font-size: 12px;
      color: #6b7280;
      margin-top: 8px;
      line-height: 1.5;
      word-wrap: break-word;
    }
    .competitors-box {
      background: #fffbeb;
      border: 1px solid #fbbf24;
      border-radius: 8px;
      padding: 12px;
      margin-top: 10px;
    }
    .competitors-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #b45309;
      margin-bottom: 6px;
    }
    .competitors-list {
      font-size: 12px;
      color: #92400e;
      line-height: 1.4;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .cta-section {
      text-align: center;
      padding: 30px;
      background: #f9fafb;
      border-radius: 8px;
      margin: 30px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin-top: 12px;
      transition: all 0.2s;
    }
    .footer {
      text-align: center;
      padding: 30px;
      background: #f9fafb;
      color: #6b7280;
      font-size: 13px;
      line-height: 1.8;
    }
    .footer-logo {
      font-weight: 700;
      font-size: 16px;
      color: #111827;
      margin-bottom: 8px;
    }
    .divider {
      height: 1px;
      background: #e5e7eb;
      margin: 30px 0;
    }
    @media only screen and (max-width: 1024px) {
      body {
        padding: 10px;
      }
      .email-container {
        max-width: 100%;
      }
      .header h1 {
        font-size: 24px;
      }
      .header p {
        font-size: 14px;
      }
      .content {
        padding: 30px 20px;
      }
      .header {
        padding: 30px 20px;
      }
      .score-container {
        padding: 24px;
      }
      .score-circle {
        width: 120px;
        height: 120px;
      }
      .score-number {
        font-size: 42px;
      }
      .score-label {
        font-size: 12px;
      }
      .score-message {
        font-size: 14px;
      }
      .summary-card {
        padding: 16px;
      }
      .summary-card-value {
        font-size: 22px;
      }
      .summary-card-label {
        font-size: 12px;
      }
      .section-title {
        font-size: 18px;
        margin: 30px 0 16px;
      }
      .provider-card {
        padding: 14px;
      }
      .provider-name {
        font-size: 14px;
      }
      .status-badge {
        font-size: 11px;
        padding: 5px 10px;
      }
      .position-badge {
        font-size: 12px;
        padding: 6px 12px;
      }
      .position-explanation {
        font-size: 11px;
      }
      .competitors-title {
        font-size: 10px;
      }
      .competitors-list {
        font-size: 11px;
      }
      .provider-snippet {
        font-size: 13px;
        padding: 10px;
      }
      .cta-section {
        padding: 24px 20px;
      }
      .cta-button {
        padding: 12px 28px;
        font-size: 15px;
      }
    }
    @media only screen and (max-width: 768px) {
      .summary-grid {
        gap: 12px;
      }
      .greeting {
        font-size: 15px;
      }
      .provider-header {
        flex-wrap: wrap;
        gap: 8px;
      }
    }
    @media only screen and (max-width: 600px) {
      body {
        padding: 5px;
      }
      .summary-grid {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .content {
        padding: 24px 16px;
      }
      .header {
        padding: 24px 16px;
      }
      .header h1 {
        font-size: 22px;
      }
      .header p {
        font-size: 13px;
      }
      .score-container {
        padding: 20px;
      }
      .score-circle {
        width: 100px;
        height: 100px;
      }
      .score-number {
        font-size: 36px;
      }
      .greeting {
        font-size: 14px;
      }
      .section-title {
        font-size: 16px;
      }
      .cta-section h3 {
        font-size: 16px !important;
      }
      .cta-section p {
        font-size: 13px !important;
      }
      .footer {
        padding: 24px 16px;
        font-size: 12px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <h1>🎯 AI Visibility Report</h1>
      <p>Your brand's performance across AI answer engines</p>
    </div>

    <!-- Content -->
    <div class="content">
      <div class="greeting">
        Hello! 👋<br><br>
        Your AI visibility check for <strong>"${escapeHtml(keyword)}"</strong> is complete. Here's how <strong>${escapeHtml(domain)}</strong> performs across major AI platforms.
      </div>

      <!-- Score Section -->
      <div class="score-container">
        <div class="score-label">Overall Visibility Score</div>
        <div class="score-circle">
          <div class="score-number">${score}%</div>
        </div>
        <div class="score-message">${getScoreMessage(score)}</div>
      </div>

      <!-- Summary Grid -->
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-card-value" style="color: #10b981;">${mentionCount}</div>
          <div class="summary-card-label">Mentioned</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-value" style="color: #6b7280;">${totalProviders - mentionCount}</div>
          <div class="summary-card-label">Not Mentioned</div>
        </div>
      </div>

      <!-- Results Section -->
      <h2 class="section-title">Provider Breakdown</h2>
      <div class="providers-grid">
        ${sortedResults.map(result => {
          const providerName = providerNames[result.provider] || result.provider;
          const isMentioned = result.status === 'ok' && result.mentioned;
          const isNotMentioned = result.status === 'ok' && !result.mentioned;
          const isError = result.status !== 'ok';

          const cardClass = isMentioned ? 'mentioned' : isNotMentioned ? 'not-mentioned' : 'error';
          const statusClass = isMentioned ? 'status-mentioned' : isNotMentioned ? 'status-not-mentioned' : 'status-error';
          const statusText = isMentioned ? '✓ Mentioned' : isNotMentioned ? '✗ Not Found' : '⚠ Error';

          const answer = extractAnswer(result.rawResponse);
          const error = extractError(result.rawResponse);
          const hasPosition = typeof result.firstIndex === 'number' && result.firstIndex >= 0;

          let competitorsHtml = '';
          if (isMentioned && hasPosition && answer) {
            const competitors = extractDomainsMentionedBefore(answer, result.firstIndex!);
            if (competitors.length > 0) {
              competitorsHtml = `
                <div class="competitors-box">
                  <div class="competitors-title">${competitors.length} ${competitors.length === 1 ? 'competitor' : 'competitors'} mentioned before you</div>
                  <div class="competitors-list">${escapeHtml(competitors.join(', '))}</div>
                </div>
              `;
            }
          }

          return `
          <div class="provider-card ${cardClass}">
            <div class="provider-header">
              <span class="provider-name">${escapeHtml(providerName)}</span>
              <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            ${isMentioned && hasPosition ? `
              <div class="position-badge">
                ✓ Position #${result.firstIndex! + 1}
              </div>
              <div class="position-explanation">
                Your domain appears at character ${result.firstIndex! + 1} of the AI's response. Lower positions = earlier mention = better visibility.
              </div>
            ` : ''}
            ${competitorsHtml}
            ${isMentioned && (result.evidence || answer) ? `
              <div class="provider-snippet">${escapeHtml((result.evidence || answer || '').substring(0, 250))}${(result.evidence || answer || '').length > 250 ? '...' : ''}</div>
            ` : isError && error ? `
              <div class="provider-error">Error: ${escapeHtml(error)}</div>
            ` : ''}
          </div>
          `;
        }).join('')}
      </div>

      <div class="divider"></div>

      <!-- CTA Section -->
      <div class="cta-section">
        <h3 style="font-size: 18px; margin-bottom: 8px; color: #111827;">Want to improve your AI visibility?</h3>
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">
          Track changes over time and optimize your content for AI answer engines
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://seoaoe.com'}" class="cta-button">
          Run Another Check →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-logo">SEO-AOE</div>
      <p>AI Visibility Checker for Google & ChatGPT Rankings</p>
      <p style="margin-top: 12px; font-size: 12px; color: #9ca3af;">
        This is an automated email. If you didn't request this report, you can safely ignore it.
      </p>
    </div>
  </div>
</body>
</html>
  `;
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
      subject: `Your AI SEO Ranking Report for "${data.keyword}"`,
      text: generateEmailText(data),
      html: generateEmailHTML(data),
    });

    // Mark as sent in database
    await prisma.email.upsert({
      where: { runId: data.runId },
      create: {
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
