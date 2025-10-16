import type { RunRequest } from "../validation";
import { checkWithOpenAI } from "./openai";
import { checkWithGrok } from "./grok";
import { checkWithDeepSeek } from "./deepseek";
import { checkWithPerplexity } from "./perplexity";
import { checkWithGemini } from "./gemini";
import { checkWithClaude } from "./claude";
import { checkWithGoogleAiOverview } from "./googleAiOverview";

export type ProviderRunResult = {
  mentioned: boolean;
  position?: number | null;
  snippet?: string | null;
  rawText: string;
  latencyMs?: number | null;
  costUsd?: number | null;
  tokensUsed?: number | null;
};

export type ProviderRunner = (input: RunRequest) => Promise<ProviderRunResult>;

export type ProviderConfig = {
  key: string;
  model?: string;
  run: ProviderRunner;
};

export const PROVIDERS: ProviderConfig[] = [
  { key: "openai", model: "gpt-4o-mini", run: checkWithOpenAI },
  { key: "grok", model: "grok-3", run: checkWithGrok },
  { key: "deepseek", model: "deepseek-chat", run: checkWithDeepSeek },
  { key: "perplexity", model: "sonar", run: checkWithPerplexity },
  { key: "gemini", model: "gemini-2.0-flash-exp", run: checkWithGemini },
  { key: "claude", model: "claude-3-7-sonnet-20250219", run: checkWithClaude },
  { key: "google_ai_overview", model: "serpapi-ai-overview", run: checkWithGoogleAiOverview },
];

export const PROVIDER_COUNT = PROVIDERS.length;
