import { Resend } from "resend";
import { prisma } from "./prisma";
import path from "path";
import fs from "fs/promises";

// Initialize Resend
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

type ProviderResult = {
  provider: string;
  status: string;
  mentioned: boolean;
  answer: string | null;
  error: string | null;
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
  pdfUrl?: string;
};

interface EmailPayload {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
  }>;
}

function generateEmailHTML(data: EmailData): string {
  const { keyword, domain, score, mentionCount, totalProviders, results, pdfUrl } = data;

  const providerNames: Record<string, string> = {
    openai: 'ChatGPT (OpenAI)',
    grok: 'Grok (xAI)',
    deepseek: 'DeepSeek',
    perplexity: 'Perplexity AI',
    gemini: 'Gemini (Google)',
    claude: 'Claude (Anthropic)',
    google_ai_overview: 'Google AI Overview',
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 30px 0;
      border-bottom: 3px solid #e5e7eb;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      color: #111827;
    }
    .content {
      padding: 30px 0;
    }
    .summary {
      background: #f9fafb;
      border-radius: 8px;
      padding: 24px;
      margin: 20px 0;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .summary-row:last-child {
      border-bottom: none;
    }
    .summary-label {
      font-weight: 600;
      color: #6b7280;
    }
    .summary-value {
      color: #111827;
      font-weight: 600;
    }
    .score-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 999px;
      font-weight: 600;
      font-size: 18px;
      margin: 20px 0;
    }
    .score-good { background: #d1fae5; color: #065f46; }
    .score-bad { background: #fee2e2; color: #991b1b; }
    .cta-button {
      display: inline-block;
      background: #2563eb;
      color: white;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
    }
    .results-section {
      margin: 30px 0;
    }
    .results-section h2 {
      font-size: 20px;
      margin-bottom: 16px;
      color: #111827;
    }
    .provider-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
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
    }
    .status-badge {
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-mentioned {
      background: #d1fae5;
      color: #065f46;
    }
    .status-not-mentioned {
      background: #fee2e2;
      color: #991b1b;
    }
    .status-error {
      background: #fef3c7;
      color: #92400e;
    }
    .provider-answer {
      color: #4b5563;
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .provider-error {
      color: #991b1b;
      font-size: 14px;
      font-style: italic;
    }
    .footer {
      text-align: center;
      padding: 30px 0;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎯 Your AI SEO Ranking Report is Ready</h1>
  </div>

  <div class="content">
    <p>Hi there,</p>
    <p>Your AI visibility check for <strong>${keyword}</strong> has been completed. Here's a quick summary:</p>

    <div class="summary">
      <div class="summary-row">
        <span class="summary-label">Domain</span>
        <span class="summary-value">${domain}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Keyword</span>
        <span class="summary-value">${keyword}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Overall Score</span>
        <span class="summary-value">
          <span class="score-badge ${mentionCount > 0 ? 'score-good' : 'score-bad'}">
            ${score}%
          </span>
        </span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Mentions</span>
        <span class="summary-value">${mentionCount} of ${totalProviders} providers</span>
      </div>
    </div>

    <div class="results-section">
      <h2>Detailed Results by AI Provider</h2>
      ${results.map(result => {
        const statusClass = result.status === 'ok'
          ? (result.mentioned ? 'status-mentioned' : 'status-not-mentioned')
          : 'status-error';
        const statusText = result.status === 'ok'
          ? (result.mentioned ? '✓ Mentioned' : '✗ Not Mentioned')
          : '⚠ Error';

        return `
        <div class="provider-card">
          <div class="provider-header">
            <span class="provider-name">${providerNames[result.provider] || result.provider}</span>
            <span class="status-badge ${statusClass}">${statusText}</span>
          </div>
          ${result.status === 'ok' && result.answer ? `
            <div class="provider-answer">${result.answer}</div>
          ` : result.error ? `
            <div class="provider-error">Error: ${result.error}</div>
          ` : `
            <div class="provider-error">No response available</div>
          `}
        </div>
        `;
      }).join('')}
    </div>

    ${pdfUrl ? `
    <p style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${pdfUrl}" class="cta-button">
        📄 Download Full Report (PDF)
      </a>
    </p>
    ` : ''}
  </div>

  <div class="footer">
    <p>AI SEO Ranking • Track your brand's visibility across AI answer engines</p>
    <p style="font-size: 12px; margin-top: 10px;">
      This is an automated email. If you didn't request this report, please ignore this message.
    </p>
  </div>
</body>
</html>
  `;
}

function generateEmailText(data: EmailData): string {
  const { keyword, domain, score, mentionCount, totalProviders, results, pdfUrl } = data;

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

    let content = `\n${providerName}: ${statusText}\n${'='.repeat(60)}`;

    if (result.status === 'ok' && result.answer) {
      content += `\n${result.answer}\n`;
    } else if (result.error) {
      content += `\nError: ${result.error}\n`;
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

${pdfUrl ? `\nDownload your full PDF report:\n${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${pdfUrl}\n` : ''}
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
    const emailPayload: EmailPayload = {
      from: process.env.RESEND_FROM_EMAIL as string,
      to: data.email,
      subject: `Your AI SEO Ranking Report for "${data.keyword}"`,
      text: generateEmailText(data),
      html: generateEmailHTML(data),
    };

    // Attach PDF if URL is provided
    if (data.pdfUrl) {
      const pdfPath = path.join(process.cwd(), "public", data.pdfUrl);
      const pdfBuffer = await fs.readFile(pdfPath);
      emailPayload.attachments = [
        {
          filename: `ai-seo-report-${data.domain}.pdf`,
          content: pdfBuffer,
        },
      ];
    }

    await resend.emails.send(emailPayload);

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
