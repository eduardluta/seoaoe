// src/lib/providers/grok.ts
import OpenAI from "openai";
import type { RunRequest } from "../validation";
import type { ProviderRunResult } from "./registry";
import { buildDomainRegex } from "../domainRegex";

/**
 * Check domain mention using Grok (xAI) API
 * Grok uses an OpenAI-compatible API
 */
export async function checkWithGrok(input: RunRequest): Promise<ProviderRunResult> {
  const { keyword, domain, country, language } = input;

  if (!process.env.GROK_API_KEY) {
    throw new Error("GROK_API_KEY is not configured");
  }

  // Grok uses OpenAI-compatible API with custom base URL
  const grok = new OpenAI({
    apiKey: process.env.GROK_API_KEY,
    baseURL: "https://api.x.ai/v1",
    timeout: 50000, // 50 second timeout for slower providers
  });

  const prompt = `You are a helpful assistant answering questions about "${keyword}" for users in ${country} (language: ${language}).
Provide a comprehensive answer that includes relevant companies, websites, and services when appropriate.

Question: What are the best options for "${keyword}"?`;

  const startTime = Date.now();

  const stream = await grok.chat.completions.create({
    model: "grok-3", // Current Grok model (grok-beta deprecated Sept 2025)
    messages: [
      {
        role: "system",
        content: `You are a helpful assistant that provides comprehensive answers to user queries. Include relevant websites, companies, or services when appropriate.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 1000,
    stream: true,
    stream_options: { include_usage: true },
  });

  let rawText = "";
  let tokensUsed: number | null = null;
  let inputTokens = 0;
  let outputTokens = 0;
  const domainRegex = buildDomainRegex(domain);
  let foundEarly = false;
  let earlyMatch: RegExpExecArray | null = null;

  // Process stream and check for domain mention as tokens arrive
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    rawText += content;

    // Check if we found the domain mention (early exit optimization)
    if (!foundEarly && rawText.length > domain.length) {
      const match = domainRegex.exec(rawText);
      if (match) {
        foundEarly = true;
        earlyMatch = match;
      }
    }

    // Extract usage info from final chunk
    if (chunk.usage) {
      tokensUsed = chunk.usage.total_tokens;
      inputTokens = chunk.usage.prompt_tokens || 0;
      outputTokens = chunk.usage.completion_tokens || 0;
    }
  }

  const latencyMs = Date.now() - startTime;

  // Grok pricing: $5/1M input tokens, $15/1M output tokens (as of 2025)
  const costUsd = (inputTokens * 5.0 / 1_000_000) + (outputTokens * 15.0 / 1_000_000);

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
