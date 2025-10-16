// src/lib/providers/openai.ts
import OpenAI from "openai";
import type { RunRequest } from "../validation";
import { buildDomainRegex } from "../domainRegex";

type ProviderRunResult = {
  mentioned: boolean;
  position?: number | null;
  snippet?: string | null;
  rawText: string;
  latencyMs?: number | null;
  tokensUsed?: number | null;
  costUsd?: number | null;
};

/**
 * Check if OpenAI's ChatGPT would mention the given domain for the keyword/country/language.
 * Uses regex validation to prevent hallucinations.
 */
export async function checkWithOpenAI(input: RunRequest): Promise<ProviderRunResult> {
  const { keyword, domain, country, language } = input;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  // Lazy-load OpenAI client to avoid module-level instantiation
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const startTime = Date.now();

  try {
    // Construct a prompt that simulates a user search query
    const prompt = `You are a helpful assistant responding to a user's search query.

User query: "${keyword}"
User location: ${country}
User language: ${language}

Please provide a comprehensive answer about "${keyword}" that would be most relevant for someone in ${country}. Include specific recommendations, companies, services, or websites that would be helpful for this query. Be natural and conversational.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using cost-effective model for MVP
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
    });

    const latencyMs = Date.now() - startTime;
    const rawText = completion.choices[0]?.message?.content || "";

    // Extract token usage from response
    const tokensUsed = completion.usage?.total_tokens || null;

    // Calculate cost for GPT-4o-mini
    // Pricing: $0.150 per 1M input tokens, $0.600 per 1M output tokens
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const costUsd = (inputTokens * 0.15 / 1_000_000) + (outputTokens * 0.60 / 1_000_000);

    // Use regex to validate if domain is actually mentioned (anti-hallucination)
    const domainRegex = buildDomainRegex(domain);
    const match = domainRegex.exec(rawText);

    if (match) {
      // Domain was mentioned - find position and extract snippet
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
      // Domain not mentioned
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
  } catch (error) {
    throw new Error(
      `OpenAI API error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
