// src/lib/providers/perplexity.ts
import OpenAI from "openai";
import type { RunRequest } from "../validation";
import type { ProviderRunResult } from "./registry";
import { buildDomainRegex } from "../domainRegex";

/**
 * Check domain mention using Perplexity API
 * Perplexity uses an OpenAI-compatible API
 */
export async function checkWithPerplexity(input: RunRequest): Promise<ProviderRunResult> {
  const { keyword, domain, country, language } = input;

  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_API_KEY is not configured");
  }

  // Perplexity uses OpenAI-compatible API with custom base URL
  const perplexity = new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: "https://api.perplexity.ai",
    timeout: 50000, // 50 second timeout for slower providers
  });

  const prompt = `You are a helpful assistant answering questions about "${keyword}" for users in ${country} (language: ${language}).
Provide a comprehensive answer that includes relevant companies, websites, and services when appropriate.

Question: What are the best options for "${keyword}"?`;

  const startTime = Date.now();

  const stream = await perplexity.chat.completions.create({
    model: "sonar", // Perplexity's main model with online search
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
  });

  let rawText = "";
  let tokensUsed: number | null = null;
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

    // Extract usage info if available
    if (chunk.usage) {
      tokensUsed = chunk.usage.total_tokens;
    }
  }

  const latencyMs = Date.now() - startTime;

  // Perplexity pricing: $0.005 per request (sonar model as of 2025)
  const costUsd = 0.005; // Fixed cost per request

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
