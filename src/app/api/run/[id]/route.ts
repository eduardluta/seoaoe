import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { PROVIDER_COUNT } from "../../../../lib/providers/registry";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: runId } = await params;

    const run = await prisma.run.findUnique({
      where: { id: runId },
      select: {
        id: true,
        keyword: true,
        domain: true,
        country: true,
        language: true,
        createdAt: true,
        RunResult: {
          select: {
            provider: true,
            model: true,
            status: true,
            mentioned: true,
            firstIndex: true,
            evidence: true,
            latencyMs: true,
            costUsd: true,
            rawResponse: true,
          },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...run,
      results: run.RunResult,
      providers_expected: PROVIDER_COUNT,
    });
  } catch (err) {
    console.error("GET /api/run/[id] error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
