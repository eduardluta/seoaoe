import { chromium } from "playwright";
import { prisma } from "./prisma";
import path from "path";
import fs from "fs/promises";

type ProviderResult = {
  provider: string;
  model: string | null;
  status: string;
  mentioned: boolean | null;
  evidence: string | null;
  latencyMs: number | null;
  costUsd: unknown;
};

type RunData = {
  id: string;
  keyword: string;
  domain: string;
  country: string;
  language: string;
  createdAt: Date;
  results: ProviderResult[];
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "ChatGPT",
  grok: "Grok",
  deepseek: "DeepSeek",
  perplexity: "Perplexity",
  gemini: "Gemini",
  claude: "Claude",
  google_ai_overview: "Google AI Overview",
};

const PROVIDER_WEIGHTS: Record<string, number> = {
  openai: 0.15,
  grok: 0.15,
  deepseek: 0.15,
  perplexity: 0.15,
  gemini: 0.15,
  claude: 0.15,
  google_ai_overview: 0.10,
};

function generateHTML(run: RunData): string {
  const totalWeight = Object.values(PROVIDER_WEIGHTS).reduce((sum, w) => sum + w, 0);

  const weightedScore = run.results.reduce((score, result) => {
    const weight = PROVIDER_WEIGHTS[result.provider] ?? 0;
    if (result.status === "ok" && result.mentioned) {
      return score + weight;
    }
    return score;
  }, 0);

  const scorePercent = Math.round((weightedScore / totalWeight) * 100);
  const mentionCount = run.results.filter(r => r.status === "ok" && r.mentioned).length;
  const totalProviders = run.results.length;

  const totalCost = run.results.reduce((sum, r) => {
    const cost = typeof r.costUsd === "number" ? r.costUsd :
                 typeof r.costUsd === "string" ? parseFloat(r.costUsd) : 0;
    return sum + cost;
  }, 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 40px;
      background: #f9fafb;
      color: #1f2937;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 3px solid #e5e7eb;
    }
    .header h1 {
      font-size: 32px;
      margin-bottom: 12px;
      color: #111827;
    }
    .header .subtitle {
      font-size: 14px;
      color: #6b7280;
    }
    .summary {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .summary h2 {
      font-size: 20px;
      margin-bottom: 20px;
      color: #111827;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    .summary-item {
      padding: 16px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .summary-item label {
      display: block;
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .summary-item .value {
      font-size: 24px;
      font-weight: 600;
      color: #111827;
    }
    .score-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 999px;
      font-weight: 600;
      font-size: 20px;
    }
    .score-good { background: #d1fae5; color: #065f46; }
    .score-bad { background: #fee2e2; color: #991b1b; }
    .providers {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .providers h2 {
      font-size: 20px;
      margin-bottom: 20px;
      color: #111827;
    }
    .provider-item {
      padding: 20px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 16px;
      page-break-inside: avoid;
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
    .provider-status {
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-mentioned { background: #d1fae5; color: #065f46; }
    .status-not-mentioned { background: #fee2e2; color: #991b1b; }
    .status-error { background: #fef3c7; color: #92400e; }
    .provider-evidence {
      padding: 12px;
      background: #f0fdf4;
      border-left: 3px solid #10b981;
      border-radius: 4px;
      font-size: 13px;
      color: #065f46;
      font-style: italic;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    @media print {
      body { background: white; padding: 20px; }
      .provider-item { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>AI SEO Ranking Report</h1>
    <div class="subtitle">Generated on ${new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })}</div>
  </div>

  <div class="summary">
    <h2>Query Summary</h2>
    <div class="summary-grid">
      <div class="summary-item">
        <label>Keyword</label>
        <div class="value">${run.keyword}</div>
      </div>
      <div class="summary-item">
        <label>Domain</label>
        <div class="value">${run.domain}</div>
      </div>
      <div class="summary-item">
        <label>Location & Language</label>
        <div class="value">${run.country} • ${run.language}</div>
      </div>
      <div class="summary-item">
        <label>Overall Score</label>
        <div class="value">
          <span class="score-badge ${mentionCount > 0 ? 'score-good' : 'score-bad'}">
            ${scorePercent}%
          </span>
        </div>
      </div>
      <div class="summary-item">
        <label>Mentions</label>
        <div class="value">${mentionCount} of ${totalProviders}</div>
      </div>
      <div class="summary-item">
        <label>Total Cost</label>
        <div class="value">$${totalCost.toFixed(4)}</div>
      </div>
    </div>
  </div>

  <div class="providers">
    <h2>Provider Breakdown</h2>
    ${run.results.map(result => {
      const label = PROVIDER_LABELS[result.provider] ?? result.provider;
      const isSuccess = result.status === "ok";
      const mentioned = isSuccess && result.mentioned;

      return `
        <div class="provider-item">
          <div class="provider-header">
            <div class="provider-name">${label}</div>
            <div class="provider-status ${
              isSuccess
                ? (mentioned ? 'status-mentioned' : 'status-not-mentioned')
                : 'status-error'
            }">
              ${isSuccess ? (mentioned ? '✓ Mentioned' : '✗ Not mentioned') : '⚠ Error'}
            </div>
          </div>
          ${mentioned && result.evidence ? `
            <div class="provider-evidence">
              "${result.evidence}"
            </div>
          ` : ''}
        </div>
      `;
    }).join('')}
  </div>

  <div class="footer">
    <div>Report ID: ${run.id}</div>
    <div>AI SEO Ranking • https://seoaoe.com</div>
  </div>
</body>
</html>
  `;
}

export async function generatePDFReport(runId: string): Promise<string> {
  // Fetch run data
  const run = await prisma.run.findUnique({
    where: { id: runId },
    select: {
      id: true,
      keyword: true,
      domain: true,
      country: true,
      language: true,
      createdAt: true,
      results: {
        select: {
          provider: true,
          model: true,
          status: true,
          mentioned: true,
          evidence: true,
          latencyMs: true,
          costUsd: true,
        },
      },
    },
  });

  if (!run) {
    throw new Error(`Run not found: ${runId}`);
  }

  // Create reports directory if it doesn't exist
  const reportsDir = path.join(process.cwd(), "public", "reports");
  await fs.mkdir(reportsDir, { recursive: true });

  // Generate PDF filename
  const filename = `report-${runId}-${Date.now()}.pdf`;
  const filePath = path.join(reportsDir, filename);
  const publicUrl = `/reports/${filename}`;

  // Generate HTML
  const html = generateHTML(run as RunData);

  // Launch browser and generate PDF
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html);
    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });

    // Store report metadata in database
    await prisma.report.create({
      data: {
        runId,
        pdfUrl: publicUrl,
      },
    });

    return publicUrl;
  } finally {
    await browser.close();
  }
}
