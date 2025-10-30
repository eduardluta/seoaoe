// src/lib/validation.ts
import { z } from "zod";

// ISO-2 country (e.g., CH, DE, US)
const countryIso2 = z
  .string()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Use ISO-2 country code");

// BCP-47 language (e.g., de, de-CH, en-US). Permissive for MVP.
const languageTag = z
  .string()
  .regex(/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/, "Use a valid BCP-47 language tag");

// Domain only (no scheme, no path)
const domainOnly = z
  .string()
  .toLowerCase()
  .trim()
  .regex(
    /^(?!-)[a-z0-9-]{1,63}(?<!-)(?:\.[a-z0-9-]{1,63})+$/,
    "Enter a domain like example.com (no http://, no path)"
  );

export const RunRequestSchema = z.object({
  keyword: z.string().min(1).max(120),
  domain: domainOnly,
  country: countryIso2,
  language: languageTag.default("en"), // Default to English - keyword defines actual language
  email: z.string().email().optional(), // optional in v0.1
});

export type RunRequest = z.infer<typeof RunRequestSchema>;

