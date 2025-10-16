import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { generatePDFReport } from "../../../../lib/pdfGenerator";
import { sendReportEmail } from "../../../../lib/emailService";

const PROVIDER_WEIGHTS: Record<string, number> = {
  openai: 0.15,
  grok: 0.15,
  deepseek: 0.15,
  perplexity: 0.15,
  gemini: 0.15,
  claude: 0.15,
  google_ai_overview: 0.10,
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: runId } = await params;

    // Fetch run with results
    const run = await prisma.run.findUnique({
      where: { id: runId },
      select: {
        id: true,
        keyword: true,
        domain: true,
        email: true,
        results: {
          select: {
            provider: true,
            status: true,
            mentioned: true,
            answer: true,
            error: true,
          },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    // Check if already has a report
    const existingReport = await prisma.report.findUnique({
      where: { runId },
    });

    let pdfUrl: string;

    if (existingReport) {
      pdfUrl = existingReport.pdfUrl;
    } else {
      // Generate PDF report
      pdfUrl = await generatePDFReport(runId);
    }

    // Calculate score for email
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

    // Send email if email was provided
    if (run.email) {
      try {
        await sendReportEmail({
          runId,
          email: run.email.toEmail,
          keyword: run.keyword,
          domain: run.domain,
          score: scorePercent,
          mentionCount,
          totalProviders: run.results.length,
          results: run.results,
          pdfUrl,
        });
      } catch (emailError) {
        console.error("Email send failed, but PDF was generated:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      pdfUrl,
      emailSent: !!run.email,
    });
  } catch (error) {
    console.error("POST /api/report/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
