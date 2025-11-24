import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

/**
 * Health check endpoint that queries the database to keep it active
 * This prevents Supabase from going into inactive mode
 */
export async function GET() {
  try {
    // Perform a simple database query to keep connection active
    // We'll just count the number of runs (lightweight query)
    const count = await prisma.run.count();

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
      runCount: count
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 503 }
    );
  }
}
