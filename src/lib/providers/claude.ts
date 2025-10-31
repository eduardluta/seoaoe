// src/lib/providers/claude.ts
import Anthropic from "@anthropic-ai/sdk";
import type { RunRequest } from "../validation";
import type { ProviderRunResult } from "./registry";
import { buildDomainRegex } from "../domainRegex";

/**
 * Check domain mention using Anthropic Claude API
 */
export async function checkWithClaude(input: RunRequest): Promise<ProviderRunResult> {
  const { keyword, domain, country, language } = input;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 50000, // 50 second timeout for slower providers
  });

  const prompt = `You are a helpful assistant answering questions about "${keyword}" for users in ${country} (language: ${language}).
Provide a comprehensive answer that includes relevant companies, websites, and services when appropriate.

Question: What are the best options for "${keyword}"?`;

  const startTime = Date.now();

  const stream = await anthropic.messages.stream({
    model: "claude-3-7-sonnet-20250219",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  let rawText = "";
  const domainRegex = buildDomainRegex(domain);
  let foundEarly = false;
  let earlyMatch: RegExpExecArray | null = null;

  // Process stream and check for domain mention as tokens arrive
  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
      const content = chunk.delta.text;
      rawText += content;

      // Check if we found the domain mention (early detection)
      if (!foundEarly && rawText.length > domain.length) {
        const match = domainRegex.exec(rawText);
        if (match) {
          foundEarly = true;
          earlyMatch = match;
        }
      }
    }
  }

  const message = await stream.finalMessage();
  const latencyMs = Date.now() - startTime;

  // Claude pricing for claude-3-7-sonnet-20250219 (as of 2025):
  // $3.00/1M input tokens, $15.00/1M output tokens
  const tokensUsed = (message.usage.input_tokens || 0) + (message.usage.output_tokens || 0);
  const inputTokens = message.usage.input_tokens || 0;
  const outputTokens = message.usage.output_tokens || 0;
  const costUsd = (inputTokens * 3.0 / 1_000_000) + (outputTokens * 15.0 / 1_000_000);

  // Use the early match if found, otherwise check final text
  const match = earlyMatch || domainRegex.exec(rawText);

  if (match) {
    const position = match.index;
    const snippetStart = Math.max(0, position - 50);
    const snippetEnd = Math.min(rawText.length, position + domain.length + 50);
    const snippet = rawText.substring(snippetStart, snippetEnd).trim();

    return {
      mentioned: true,
      position,
      snippet: `...${snippet}...`,
      rawText,
      latencyMs,
      tokensUsed,
      costUsd,
    };
  } else {
    return {
      mentioned: false,
      position: -1,
      snippet: null,
      rawText,
      latencyMs,
      tokensUsed,
      costUsd,
    };
  }
}
