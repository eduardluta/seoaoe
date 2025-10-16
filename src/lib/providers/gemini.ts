// src/lib/providers/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { RunRequest } from "../validation";
import type { ProviderRunResult } from "./registry";
import { buildDomainRegex } from "../domainRegex";

/**
 * Check domain mention using Google Gemini API
 */
export async function checkWithGemini(input: RunRequest): Promise<ProviderRunResult> {
  const { keyword, domain, country, language } = input;

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const prompt = `You are a helpful assistant answering questions about "${keyword}" for users in ${country} (language: ${language}).
Provide a comprehensive answer that includes relevant companies, websites, and services when appropriate.

Question: What are the best options for "${keyword}"?`;

  const startTime = Date.now();

  const result = await model.generateContent(prompt);
  const response = result.response;
  const rawText = response.text();

  const latencyMs = Date.now() - startTime;

  // Gemini pricing for gemini-2.0-flash-exp (as of 2025):
  // Free tier: 15 RPM, 1 million TPM, 1,500 RPD
  // For paid tier: $0.075/1M input tokens, $0.30/1M output tokens
  // Since we're likely using free tier, cost is $0
  // For production, you'd use: response.usageMetadata to get token counts
  const tokensUsed = (response.usageMetadata?.totalTokenCount) || null;
  const inputTokens = response.usageMetadata?.promptTokenCount || 0;
  const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
  const costUsd = (inputTokens * 0.075 / 1_000_000) + (outputTokens * 0.30 / 1_000_000);

  // Use regex to validate domain mention
  const domainRegex = buildDomainRegex(domain);
  const match = domainRegex.exec(rawText);

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
