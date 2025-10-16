import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReportEmail } from "@/lib/emailService";

type Params = { params: Promise<{ id: string }> };

const PROVIDER_WEIGHTS: Record<string, number> = {
  openai: 0.15,
  grok: 0.15,
  deepseek: 0.15,
  perplexity: 0.15,
  gemini: 0.15,
  claude: 0.15,
  google_ai_overview: 0.10,
};

export async function PATCH(request: Request, context: Params) {
  const { id: runId } = await context.params;

  try {
    // Parse request body
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Fetch run with results
    const run = await prisma.run.findUnique({
      where: { id: runId },
      select: {
        id: true,
        keyword: true,
        domain: true,
        results: {
          select: {
            provider: true,
            status: true,
            mentioned: true,
            rawResponse: true,
          },
        },
      },
    });

    if (!run) {
      return NextResponse.json(
        { error: "Run not found" },
        { status: 404 }
      );
    }

    // Upsert email record (create or update)
    await prisma.email.upsert({
      where: { runId },
      create: {
        runId,
        toEmail: email.trim(),
        status: "queued",
      },
      update: {
        toEmail: email.trim(),
        status: "queued",
      },
    });

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

    // Send email immediately
    try {
      await sendReportEmail({
        runId,
        email: email.trim(),
        keyword: run.keyword,
        domain: run.domain,
        score: scorePercent,
        mentionCount,
        totalProviders: run.results.length,
        results: run.results,
      });

      return NextResponse.json({
        success: true,
        email: email.trim(),
        emailSent: true,
      });
    } catch (emailError) {
      console.error("Email send failed:", emailError);
      return NextResponse.json(
        { error: "Failed to send email. Please try again." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing email request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
