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

// ── Auth / Users DTOs (see API.md §2-3, ARCHITECTURE.md §9) ────────────────
export const RegisterSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(10).max(200),
  displayName: z.string().min(1).max(80).optional(),
});
export type RegisterDto = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const OAuthProviders = ["github", "google"] as const;
export type OAuthProvider = (typeof OAuthProviders)[number];

// The frontend completes the OAuth authorize redirect itself (constructs
// the provider's authorize URL, receives the `code` back at a callback
// route it owns) and POSTs the code here for server-side exchange — the
// backend never issues a redirect itself, keeping this a plain JSON API
// like every other route (see API.md §2's single POST callback endpoint).
export const OAuthCallbackSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url(),
});
export type OAuthCallbackDto = z.infer<typeof OAuthCallbackSchema>;

export const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailDto = z.infer<typeof VerifyEmailSchema>;

export const PasswordResetRequestSchema = z.object({
  email: z.string().email().max(255),
});
export type PasswordResetRequestDto = z.infer<typeof PasswordResetRequestSchema>;

export const PasswordResetConfirmSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(10).max(200),
});
export type PasswordResetConfirmDto = z.infer<typeof PasswordResetConfirmSchema>;

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  avatarUrl: z.string().url().max(1000).optional(),
});
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  plan: "FREE" | "PRO" | "TEAM";
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  expiresIn: number;
  user: UserProfile;
}

// ── Sync DTOs — Favorites / History (see API.md §4-5) ───────────────────────
export const AddFavoriteSchema = z.object({
  toolSlug: z.string().min(1).max(120),
});
export type AddFavoriteDto = z.infer<typeof AddFavoriteSchema>;

export const HistoryQuerySchema = z.object({
  toolSlug: z.string().min(1).max(120).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type HistoryQueryDto = z.infer<typeof HistoryQuerySchema>;

export const CreateHistoryEntrySchema = z.object({
  toolSlug: z.string().min(1).max(120),
  inputPreview: z.string().max(4_000).optional(),
  outputPreview: z.string().max(4_000).optional(),
});
export type CreateHistoryEntryDto = z.infer<typeof CreateHistoryEntrySchema>;

export const CursorQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type CursorQueryDto = z.infer<typeof CursorQuerySchema>;

// ── Snippets DTOs (see API.md §6) ───────────────────────────────────────────
export const CreateSnippetSchema = z.object({
  toolSlug: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  content: z.string().max(200_000),
  isPublic: z.boolean().optional().default(false),
});
export type CreateSnippetDto = z.infer<typeof CreateSnippetSchema>;

export const UpdateSnippetSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(200_000).optional(),
  isPublic: z.boolean().optional(),
});
export type UpdateSnippetDto = z.infer<typeof UpdateSnippetSchema>;

// ── Server-synced Pipelines DTOs (see API.md §7) — distinct from the
// client-only pipeline builder's CreatePipelineSchema below, which has no
// userId/persistence concept. ──────────────────────────────────────────────
export const CreateSyncedPipelineSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  steps: z
    .array(
      z.object({
        toolSlug: z.string().min(1).max(120),
        optionsJson: z.record(z.unknown()),
      }),
    )
    .min(1)
    .max(20),
});
export type CreateSyncedPipelineDto = z.infer<typeof CreateSyncedPipelineSchema>;

export const UpdateSyncedPipelineSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  steps: z
    .array(
      z.object({
        toolSlug: z.string().min(1).max(120),
        optionsJson: z.record(z.unknown()),
      }),
    )
    .min(1)
    .max(20)
    .optional(),
});
export type UpdateSyncedPipelineDto = z.infer<typeof UpdateSyncedPipelineSchema>;

// ── Share Links DTOs (see API.md §8) ────────────────────────────────────────
export const CreateShareLinkSchema = z.object({
  toolSlug: z.string().min(1).max(120),
  payload: z.record(z.unknown()),
});
export type CreateShareLinkDto = z.infer<typeof CreateShareLinkSchema>;

export interface ShareLinkResult {
  slug: string;
  url: string;
  expiresAt: string | null;
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
