import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const runId = params.id;

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
            firstIndex: true,
            evidence: true,
            latencyMs: true,
            costUsd: true,
          },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (err) {
    console.error("GET /api/run/[id] error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
