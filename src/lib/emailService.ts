import { Resend } from "resend";
import { prisma } from "./prisma";
import path from "path";
import fs from "fs/promises";

// Initialize Resend
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

type EmailData = {
  runId: string;
  email: string;
  keyword: string;
  domain: string;
  score: number;
  mentionCount: number;
  totalProviders: number;
  pdfUrl?: string;
};

function generateEmailHTML(data: EmailData): string {
  const { keyword, domain, score, mentionCount, totalProviders, pdfUrl } = data;

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

    ${pdfUrl ? `
    <p style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${pdfUrl}" class="cta-button">
        📄 Download Full Report (PDF)
      </a>
    </p>
    ` : ''}

    <p style="font-size: 14px; color: #6b7280;">
      ${pdfUrl ? 'The full report includes detailed breakdowns for each AI provider, evidence snippets, and technical metrics. You can also' : 'You can'} view your results in the
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin" style="color: #2563eb;">admin dashboard</a>.
    </p>
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
  const { keyword, domain, score, mentionCount, totalProviders, pdfUrl } = data;

  return `
AI SEO Ranking Report

Your AI visibility check for "${keyword}" has been completed.

Summary:
- Domain: ${domain}
- Keyword: ${keyword}
- Overall Score: ${score}%
- Mentions: ${mentionCount} of ${totalProviders} providers

${pdfUrl ? `Download your full PDF report:\n${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${pdfUrl}\n\n` : ''}View results in the admin dashboard:
${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin

---
AI SEO Ranking
Track your brand's visibility across AI answer engines
  `.trim();
}

export async function sendReportEmail(data: EmailData): Promise<void> {
  if (!resend) {
    console.warn("RESEND_API_KEY not configured. Skipping email send.");

    // Mark as failed in database
    await prisma.email.create({
      data: {
        runId: data.runId,
        toEmail: data.email,
        status: "failed",
        error: "Resend API key not configured",
      },
    });

    return;
  }

  if (!process.env.RESEND_FROM_EMAIL) {
    console.warn("RESEND_FROM_EMAIL not configured. Skipping email send.");

    await prisma.email.create({
      data: {
        runId: data.runId,
        toEmail: data.email,
        status: "failed",
        error: "Resend from email not configured",
      },
    });

    return;
  }

  try {
    const emailPayload: any = {
      from: process.env.RESEND_FROM_EMAIL,
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
    await prisma.email.create({
      data: {
        runId: data.runId,
        toEmail: data.email,
        status: "sent",
        sentAt: new Date(),
        provider: "resend",
      },
    });

    console.log(`Email sent successfully to ${data.email}`);
  } catch (error) {
    console.error("Error sending email:", error);

    // Mark as failed in database
    await prisma.email.create({
      data: {
        runId: data.runId,
        toEmail: data.email,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        provider: "resend",
      },
    });

    throw error;
  }
}
