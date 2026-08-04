// Shared types & schemas between frontend and backend.
// Single source of truth for anything crossing the API boundary — see
// DEVELOPMENT_GUIDE.md §3 and CLAUDE.md rule 6.
//
// Keep this package framework-agnostic (no React, no Nest decorators):
// pure TypeScript types + Zod schemas only.

import { z } from "zod";

// ── Tool module taxonomy (mirrors FEATURE.md) ─────────────────────────────
export const TOOL_MODULES = [
  "data-format",
  "encoding",
  "security",
  "text",
  "code",
  "converters",
  "image",
  "network",
  "generators",
  "ai",
] as const;

export type ToolModule = (typeof TOOL_MODULES)[number];

// ── Tool registry entry (frontend registry.ts implements arrays of this) ──
export interface ToolRegistryEntry {
  slug: string;
  name: string;
  module: ToolModule;
  description: string;
  aliases: string[];
  icon: string;
  isClientOnly: boolean;
  isWorkerEligible: boolean;
  seo: {
    keywords: string[];
  };
}

// ── AI Gateway DTOs (see API.md §9) ────────────────────────────────────────
export const AiExplainRequestSchema = z.object({
  toolSlug: z.string(),
  subject: z.enum(["regex", "cron", "json-schema", "sql"]),
  input: z.string().max(20_000),
});
export type AiExplainRequest = z.infer<typeof AiExplainRequestSchema>;

export const AiGenerateRequestSchema = z.object({
  target: z.enum(["regex", "cron", "json-schema"]),
  prompt: z.string().max(2_000),
  examples: z.array(z.string()).max(20).optional(),
});
export type AiGenerateRequest = z.infer<typeof AiGenerateRequestSchema>;

export const AiDiffSummaryRequestSchema = z.object({
  before: z.string().max(50_000),
  after: z.string().max(50_000),
  format: z.enum(["text", "json"]),
});
export type AiDiffSummaryRequest = z.infer<typeof AiDiffSummaryRequestSchema>;

// ── Pipeline DTOs (see API.md §7, DATABASE.md) ─────────────────────────────
export const PipelineStepSchema = z.object({
  toolSlug: z.string(),
  optionsJson: z.record(z.unknown()),
});
export type PipelineStepDto = z.infer<typeof PipelineStepSchema>;

export const CreatePipelineSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  steps: z.array(PipelineStepSchema).min(1),
});
export type CreatePipelineDto = z.infer<typeof CreatePipelineSchema>;

// ── Network Tool Proxy DTOs (see API.md §10 — Module 8 server-proxied
// tools; server-assisted, non-persistent per ARCHITECTURE.md §8.4 tier 2) ──
export const HttpRequestProxySchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
  url: z.string().url().max(4_000),
  headers: z.record(z.string().max(4_000)).optional().default({}),
  body: z.string().max(1_000_000).optional(),
});
export type HttpRequestProxyDto = z.infer<typeof HttpRequestProxySchema>;

export interface HttpRequestProxyResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  bodyTruncated: boolean;
  durationMs: number;
}

export const DnsLookupSchema = z.object({
  domain: z
    .string()
    .min(1)
    .max(253)
    .regex(/^[a-zA-Z0-9.-]+$/, "Not a valid hostname."),
  recordType: z.enum(["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA"]).default("A"),
});
export type DnsLookupDto = z.infer<typeof DnsLookupSchema>;

export interface DnsLookupResult {
  domain: string;
  recordType: DnsLookupDto["recordType"];
  records: string[];
}

export const IpLookupSchema = z.object({
  ip: z.string().max(45).optional(), // omitted -> looks up the caller's own IP
});
export type IpLookupDto = z.infer<typeof IpLookupSchema>;

export interface IpLookupResult {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  org?: string;
  timezone?: string;
}

export const WebhookInboxCreateResult = z.object({
  id: z.string(),
  inboxUrl: z.string(),
  expiresAt: z.number(), // epoch ms
});
export type WebhookInboxCreateResultDto = z.infer<typeof WebhookInboxCreateResult>;

export interface WebhookInboxEvent {
  id: string;
  receivedAt: number; // epoch ms
  method: string;
  headers: Record<string, string>;
  body: string;
  query: Record<string, string>;
}

export const UrlPreviewSchema = z.object({
  url: z.string().url().max(2_000),
});
export type UrlPreviewDto = z.infer<typeof UrlPreviewSchema>;

export interface UrlPreviewResult {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

// ── Standard API error shape (see API.md §1) ───────────────────────────────
export interface ApiErrorBody {
  error: {
    code:
      | "VALIDATION_ERROR"
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "RATE_LIMITED"
      | "INTERNAL_ERROR";
    message: string;
    details?: Array<{ field: string; issue: string }>;
    requestId: string;
  };
}
