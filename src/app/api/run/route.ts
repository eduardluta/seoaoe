import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { RunRequestSchema, type RunRequest } from "../../../lib/validation";
import { checkWithOpenAI } from "../../../lib/providers/openai";
import { checkWithGrok } from "../../../lib/providers/grok";
import { checkWithDeepSeek } from "../../../lib/providers/deepseek";
import { checkWithPerplexity } from "../../../lib/providers/perplexity";
import { checkWithGemini } from "../../../lib/providers/gemini";
import { checkWithClaude } from "../../../lib/providers/claude";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = RunRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { keyword, domain, country, language, email } = parsed.data;

    // Step 1: create Run
    const run = await prisma.run.create({
      data: {
        keyword: keyword.trim(),
        domain: domain.toLowerCase().trim(),
        country: country.toUpperCase(),
        language: language.trim(),
        email: email ? { create: { toEmail: email, status: "queued" } } : undefined,
      },
      select: { id: true, createdAt: true },
    });

    // Step 2: run all providers in parallel
    const input: RunRequest = { keyword, domain, country, language, email };

    // Run OpenAI, Grok, DeepSeek, Perplexity, Gemini, and Claude in parallel
    const providerPromises = [
      // OpenAI
      checkWithOpenAI(input)
        .then((r) =>
          prisma.runResult.create({
            data: {
              runId: run.id,
              provider: "openai",
              model: "gpt-4o-mini",
              status: "ok",
              mentioned: r.mentioned,
              firstIndex: r.position ?? undefined,
              evidence: r.snippet ?? undefined,
              rawResponse: { text: r.rawText, tokens: r.tokensUsed },
              latencyMs: r.latencyMs ?? undefined,
              costUsd: r.costUsd ?? undefined,
            },
          })
        )
        .catch((e) =>
          prisma.runResult.create({
            data: {
              runId: run.id,
              provider: "openai",
              status: "error",
              mentioned: false,
              rawResponse: { error: String(e) },
            },
          })
        ),

      // Grok
      checkWithGrok(input)
        .then((r) =>
          prisma.runResult.create({
            data: {
              runId: run.id,
              provider: "grok",
              model: "grok-3",
              status: "ok",
              mentioned: r.mentioned,
              firstIndex: r.position ?? undefined,
              evidence: r.snippet ?? undefined,
              rawResponse: { text: r.rawText, tokens: r.tokensUsed },
              latencyMs: r.latencyMs ?? undefined,
              costUsd: r.costUsd ?? undefined,
            },
          })
        )
        .catch((e) =>
          prisma.runResult.create({
            data: {
              runId: run.id,
              provider: "grok",
              status: "error",
              mentioned: false,
              rawResponse: { error: String(e) },
            },
          })
        ),

      // DeepSeek
      checkWithDeepSeek(input)
        .then((r) =>
          prisma.runResult.create({
            data: {
              runId: run.id,
              provider: "deepseek",
              model: "deepseek-chat",
              status: "ok",
              mentioned: r.mentioned,
              firstIndex: r.position ?? undefined,
              evidence: r.snippet ?? undefined,
              rawResponse: { text: r.rawText, tokens: r.tokensUsed },
              latencyMs: r.latencyMs ?? undefined,
              costUsd: r.costUsd ?? undefined,
            },
          })
        )
        .catch((e) =>
          prisma.runResult.create({
            data: {
              runId: run.id,
              provider: "deepseek",
              status: "error",
              mentioned: false,
              rawResponse: { error: String(e) },
            },
          })
        ),

      // Perplexity
      checkWithPerplexity(input)
        .then((r) =>
          prisma.runResult.create({
            data: {
              runId: run.id,
              provider: "perplexity",
              model: "sonar",
              status: "ok",
              mentioned: r.mentioned,
              firstIndex: r.position ?? undefined,
              evidence: r.snippet ?? undefined,
              rawResponse: { text: r.rawText, tokens: r.tokensUsed },
              latencyMs: r.latencyMs ?? undefined,
              costUsd: r.costUsd ?? undefined,
            },
          })
        )
        .catch((e) =>
          prisma.runResult.create({
            data: {
              runId: run.id,
              provider: "perplexity",
              status: "error",
              mentioned: false,
              rawResponse: { error: String(e) },
            },
          })
        ),

      // Gemini
      checkWithGemini(input)
        .then((r) =>
          prisma.runResult.create({
            data: {
              runId: run.id,
              provider: "gemini",
              model: "gemini-2.0-flash-exp",
              status: "ok",
              mentioned: r.mentioned,
              firstIndex: r.position ?? undefined,
              evidence: r.snippet ?? undefined,
              rawResponse: { text: r.rawText, tokens: r.tokensUsed },
              latencyMs: r.latencyMs ?? undefined,
              costUsd: r.costUsd ?? undefined,
            },
          })
        )
        .catch((e) =>
          prisma.runResult.create({
            data: {
              runId: run.id,
              provider: "gemini",
              status: "error",
              mentioned: false,
              rawResponse: { error: String(e) },
            },
          })
        ),

      // Claude
      checkWithClaude(input)
        .then((r) =>
          prisma.runResult.create({
            data: {
              runId: run.id,
              provider: "claude",
              model: "claude-3-7-sonnet-20250219",
              status: "ok",
              mentioned: r.mentioned,
              firstIndex: r.position ?? undefined,
              evidence: r.snippet ?? undefined,
              rawResponse: { text: r.rawText, tokens: r.tokensUsed },
              latencyMs: r.latencyMs ?? undefined,
              costUsd: r.costUsd ?? undefined,
            },
          })
        )
        .catch((e) =>
          prisma.runResult.create({
            data: {
              runId: run.id,
              provider: "claude",
              status: "error",
              mentioned: false,
              rawResponse: { error: String(e) },
            },
          })
        ),
    ];

    // Wait for all providers to complete
    await Promise.all(providerPromises);

    // Minimal success response for now
    return NextResponse.json(
      {
        run_id: run.id,
        status: "queued", // until we re-enable provider
        created_at: run.createdAt,
      },
      { status: 202 }
    );
  } catch (err) {
    console.error("POST /api/run error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
