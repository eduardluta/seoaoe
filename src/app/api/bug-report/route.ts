import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    // Validate input
    if (!name || !description) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 }
      );
    }

    // Save to database
    const bugReport = await prisma.bugReport.create({
      data: {
        id: randomUUID(),
        name: String(name).trim(),
        description: String(description).trim(),
      },
    });

    return NextResponse.json(
      { success: true, id: bugReport.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving bug report:", error);
    return NextResponse.json(
      { error: "Failed to save bug report" },
      { status: 500 }
    );
  }
}
