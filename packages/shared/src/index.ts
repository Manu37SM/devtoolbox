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

// Response shape for GET /auth/oauth/linked — which providers the signed-in
// user has connected, for account-settings UI (not a request DTO, so no
// Zod schema needed; the backend is the only producer).
export interface LinkedOAuthAccount {
  provider: OAuthProvider;
  createdAt: string;
}

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
  // Phase 4 team workspaces (API.md §17) — caller must be a member of this org.
  organizationId: z.string().uuid().optional(),
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
  // Phase 4 team workspaces (API.md §17) — caller must be a member of this org.
  organizationId: z.string().uuid().optional(),
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
  // Optional org attribution (API.md §8.1, AUDIT_REPORT.md §22) — the
  // creator must be a member of this org (checked server-side); anonymous
  // (no access token) callers can never set this, since there's no caller
  // identity to check membership against.
  organizationId: z.string().uuid().optional(),
});
export type CreateShareLinkDto = z.infer<typeof CreateShareLinkSchema>;

export interface ShareLinkResult {
  slug: string;
  url: string;
  expiresAt: string | null;
}

// Org branding shown on a share link's public page when the link was
// created with an `organizationId` and that org has branding set — `null`
// means "no org attribution or the org hasn't set branding," in which case
// the frontend falls back to default DevToolbox branding.
export interface ShareLinkBranding {
  name: string;
  logoUrl: string | null;
}

export interface ShareLinkView {
  toolSlug: string;
  payload: Record<string, unknown>;
  createdAt: string;
  branding: ShareLinkBranding | null;
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

// ── AI Gateway DTOs (see API.md §9, ARCHITECTURE.md §8.3, CLAUDE.md rule 7) ─
// Every one of these schemas bounds input length — the AI gateway is the
// one surface in this app where user text reaches a model, so keeping
// payloads small is both a cost control and part of the prompt-injection
// mitigation (less room for an attacker to bury instructions in a huge blob
// the system prompt has to visually compete with).
export const AiExplainSubjects = ["regex", "cron", "json-schema", "sql"] as const;
export type AiExplainSubject = (typeof AiExplainSubjects)[number];

export const AiExplainSchema = z.object({
  toolSlug: z.string().min(1).max(80),
  subject: z.enum(AiExplainSubjects),
  input: z.string().min(1).max(4_000),
});
export type AiExplainDto = z.infer<typeof AiExplainSchema>;

export interface AiExplainResult {
  explanation: string;
  model: string;
  dataSentPreview: string;
}

export const AiGenerateTargets = ["regex", "cron", "json-schema"] as const;
export type AiGenerateTarget = (typeof AiGenerateTargets)[number];

export const AiGenerateSchema = z.object({
  target: z.enum(AiGenerateTargets),
  // 4_000 (not 1_000) so the "Generate From Example" tool can pass a raw
  // JSON sample as `prompt` for the json-schema target — matches
  // AiExplainSchema's input ceiling rather than inventing a new one.
  prompt: z.string().min(1).max(4_000),
  examples: z.array(z.string().max(500)).max(10).optional(),
});
export type AiGenerateDto = z.infer<typeof AiGenerateSchema>;

export interface AiGenerateResult {
  result: string;
  explanation: string;
  validated: boolean;
  validationNote?: string;
  model: string;
  dataSentPreview: string;
}

export const AiDiffSummarySchema = z.object({
  before: z.string().max(20_000),
  after: z.string().max(20_000),
  format: z.enum(["text", "json"]),
});
export type AiDiffSummaryDto = z.infer<typeof AiDiffSummarySchema>;

export interface AiDiffSummaryResult {
  summary: string;
  model: string;
  dataSentPreview: string;
}

export const AiJsonRepairSchema = z.object({
  input: z.string().min(1).max(20_000),
});
export type AiJsonRepairDto = z.infer<typeof AiJsonRepairSchema>;

export interface AiJsonRepairResult {
  repaired: string;
  repairedBy: "deterministic" | "ai";
  model?: string; // present only when repairedBy === "ai"
  dataSentPreview?: string;
}

export const AiCommitMessageSchema = z.object({
  diff: z.string().min(1).max(20_000),
});
export type AiCommitMessageDto = z.infer<typeof AiCommitMessageSchema>;

export interface AiCommitMessageResult {
  commitMessage: string;
  prDescription: string;
  model: string;
  dataSentPreview: string;
}

export const AiCodeCommentSchema = z.object({
  code: z.string().min(1).max(10_000),
  language: z.string().min(1).max(40).optional(),
});
export type AiCodeCommentDto = z.infer<typeof AiCodeCommentSchema>;

export interface AiCodeCommentResult {
  commented: string;
  model: string;
  dataSentPreview: string;
}

export const AiClientCodeTargets = ["fetch", "axios"] as const;
export type AiClientCodeTarget = (typeof AiClientCodeTargets)[number];

export const AiClientCodeSchema = z.object({
  sampleResponse: z.string().min(1).max(10_000),
  target: z.enum(AiClientCodeTargets),
  typeName: z.string().min(1).max(60).optional(),
});
export type AiClientCodeDto = z.infer<typeof AiClientCodeSchema>;

export interface AiClientCodeResult {
  code: string;
  model: string;
  dataSentPreview: string;
}

export interface AiUsageSummary {
  plan: "FREE" | "PRO" | "TEAM";
  periodStart: string;
  requestCount: number;
  quota: number;
}

// ── Public API / CLI (Phase 4 — API.md §11/§12) ────────────────────────────
export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(60),
});
export type CreateApiKeyDto = z.infer<typeof CreateApiKeySchema>;

/** Returned only once, at creation — `key` (the raw secret) is never
 * retrievable again afterward. Every later listing uses ApiKeySummary. */
export interface ApiKeyCreatedResult {
  id: string;
  name: string;
  key: string;
  keyPrefix: string;
  createdAt: string;
}

export interface ApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export const PublicHashAlgorithms = ["md5", "sha1", "sha256", "sha512"] as const;
export type PublicHashAlgorithm = (typeof PublicHashAlgorithms)[number];

export const PublicHashSchema = z.object({
  input: z.string().min(1).max(100_000),
  algorithm: z.enum(PublicHashAlgorithms),
});
export type PublicHashDto = z.infer<typeof PublicHashSchema>;

export interface PublicHashResult {
  digest: string;
}

export const PublicJsonValidateSchema = z.object({
  input: z.string().min(1).max(1_000_000),
});
export type PublicJsonValidateDto = z.infer<typeof PublicJsonValidateSchema>;

export interface PublicJsonValidateResult {
  valid: boolean;
  error?: string;
}

// ── Billing (Phase 4 — API.md §9; migrated Stripe → Razorpay, see
// AUDIT_REPORT.md §20 for rationale — Stripe billing isn't available for
// this business's country of operation) ────────────────────────────────────
export const BillablePlans = ["PRO", "TEAM"] as const;
export type BillablePlan = (typeof BillablePlans)[number];

export const CreateSubscriptionSchema = z.object({
  plan: z.enum(BillablePlans),
});
export type CreateSubscriptionDto = z.infer<typeof CreateSubscriptionSchema>;

// Razorpay has no hosted Checkout page like Stripe's — the frontend opens
// Razorpay's Checkout.js modal client-side using these fields (API.md §9).
export interface CreateSubscriptionResult {
  razorpaySubscriptionId: string;
  razorpayKeyId: string;
  plan: BillablePlan;
}

// Razorpay Checkout.js's success handler returns these three fields to the
// frontend; they're POSTed here so the backend can verify the HMAC
// signature before trusting the payment (never trust a client-reported
// "it worked" without verifying it server-side).
export const VerifyPaymentSchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_subscription_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});
export type VerifyPaymentDto = z.infer<typeof VerifyPaymentSchema>;

// Razorpay has no self-serve billing portal equivalent to Stripe's Customer
// Portal (AUDIT_REPORT.md §20 deviation note) — cancellation is a direct
// API call the account page triggers instead of a redirect.
export interface CancelSubscriptionResult {
  cancelled: boolean;
}

export const SubscriptionStatuses = [
  "CREATED",
  "AUTHENTICATED",
  "ACTIVE",
  "PENDING",
  "HALTED",
  "CANCELLED",
  "COMPLETED",
  "EXPIRED",
] as const;
export type SubscriptionStatus = (typeof SubscriptionStatuses)[number];

export interface SubscriptionSummary {
  plan: BillablePlan;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

// ── Team workspaces (Phase 4 — API.md §17) ─────────────────────────────────
export const OrgRoles = ["OWNER", "ADMIN", "MEMBER"] as const;
export type OrgRole = (typeof OrgRoles)[number];

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(80),
});
export type CreateOrganizationDto = z.infer<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(80),
});
export type UpdateOrganizationDto = z.infer<typeof UpdateOrganizationSchema>;

export const AddOrganizationMemberSchema = z.object({
  email: z.string().email(),
});
export type AddOrganizationMemberDto = z.infer<typeof AddOrganizationMemberSchema>;

export const UpdateOrganizationMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});
export type UpdateOrganizationMemberRoleDto = z.infer<typeof UpdateOrganizationMemberRoleSchema>;

// Custom branding for org-shared links (API.md §8.1/§17, AUDIT_REPORT.md
// §22) — a separate schema/route from rename (`UpdateOrganizationSchema`)
// rather than folding in, since these are optional/clearable fields with
// different validation (`brandLogoUrl` is a URL) and a different mental
// model ("how this org's shares look to visitors" vs. "the org's own
// name"). Both fields nullable so either can be explicitly cleared by
// sending `null`, not just omitted.
export const UpdateOrganizationBrandingSchema = z.object({
  brandName: z.string().max(80).nullable().optional(),
  brandLogoUrl: z.string().url().max(2048).nullable().optional(),
});
export type UpdateOrganizationBrandingDto = z.infer<typeof UpdateOrganizationBrandingSchema>;

export interface OrganizationSummary {
  id: string;
  name: string;
  role: OrgRole;
  createdAt: string;
  brandName: string | null;
  brandLogoUrl: string | null;
}

export interface OrganizationMemberSummary {
  userId: string;
  email: string;
  displayName: string | null;
  role: OrgRole;
  joinedAt: string;
}

export interface OrganizationDetail {
  id: string;
  name: string;
  role: OrgRole;
  members: OrganizationMemberSummary[];
  createdAt: string;
  brandName: string | null;
  brandLogoUrl: string | null;
}

export interface OrganizationUsageSummary {
  organizationId: string;
  periodDays: number;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byMember: { userId: string; email: string; requests: number; inputTokens: number; outputTokens: number }[];
}

// ── Team workspace invites (email-token flow — API.md §17.4;
// AUDIT_REPORT.md §17.2 originally deferred this, shipped here) ────────────
// `POST /organizations/:id/invites` reuses AddOrganizationMemberSchema's
// `{ email }` shape — if an account already exists for that email it's
// added immediately (unchanged behavior), otherwise a pending invite is
// created and emailed instead of the old 404 "they'll need to sign up
// first." Same MEMBER-only scope as the existing immediate-add path — no
// role is exposed to invite as ADMIN/OWNER directly, matching
// `updateMemberRole`'s existing promote-after-joining pattern.
export interface OrganizationInviteSummary {
  id: string;
  email: string;
  role: OrgRole;
  invitedByEmail: string;
  createdAt: string;
  expiresAt: string;
}

export type AddOrganizationMemberResult =
  | { status: "added"; member: OrganizationMemberSummary }
  | { status: "invited"; invite: OrganizationInviteSummary };

export interface AcceptOrganizationInviteResult {
  organizationId: string;
  organizationName: string;
  role: OrgRole;
}

// ── Org SSO (AUDIT_REPORT.md §23) — the last item deferred from the
// original team workspaces MVP pass. One connection per org, discriminated
// by protocol. `UpsertSsoConnectionSchema` uses a Zod discriminated union so
// the OIDC-only/SAML-only fields are mutually validated at the boundary
// (CLAUDE.md rule 5) rather than a loose object where the "wrong" protocol's
// fields could be silently accepted. The client secret is write-only —
// never returned by any read endpoint, hence no `oidcClientSecret` field on
// `SsoConnectionSummary`.
export const UpsertSsoConnectionSchema = z.discriminatedUnion("protocol", [
  z.object({
    protocol: z.literal("OIDC"),
    domain: z.string().min(1).max(255),
    oidcIssuer: z.string().url().max(2048),
    oidcClientId: z.string().min(1).max(255),
    // Optional on update — omit to leave an already-configured secret
    // unchanged, matching UpdateOrganizationBrandingSchema's omit-vs-null
    // convention (though here there's no "clear" case; a connection without
    // a secret can't authenticate, so it's simply required on first create,
    // enforced in the service layer since Zod alone can't see prior state).
    oidcClientSecret: z.string().min(1).optional(),
  }),
  z.object({
    protocol: z.literal("SAML"),
    domain: z.string().min(1).max(255),
    samlEntryPoint: z.string().url().max(2048),
    samlIssuer: z.string().min(1).max(2048),
    samlCert: z.string().min(1),
  }),
]);
export type UpsertSsoConnectionDto = z.infer<typeof UpsertSsoConnectionSchema>;

export const SetSsoConnectionEnabledSchema = z.object({ enabled: z.boolean() });
export type SetSsoConnectionEnabledDto = z.infer<typeof SetSsoConnectionEnabledSchema>;

export const OidcCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  redirectUri: z.string().url(),
});
export type OidcCallbackDto = z.infer<typeof OidcCallbackSchema>;

export interface SsoConnectionSummary {
  protocol: "OIDC" | "SAML";
  domain: string;
  enabled: boolean;
  // Present only for the matching protocol; the other group is always
  // undefined rather than a mix of nulls, mirroring the discriminated
  // request shape above.
  oidcIssuer: string | null;
  oidcClientId: string | null;
  oidcHasClientSecret: boolean;
  samlEntryPoint: string | null;
  samlIssuer: string | null;
  samlCert: string | null;
  createdAt: string;
  updatedAt: string;
}

// GET /sso/discover?domain= — public, unauthenticated: tells the login page
// whether this email domain has an SSO connection to route to, without
// exposing which org owns it (avoids leaking org existence/membership from
// an arbitrary domain guess beyond "yes/no, SSO is configured").
export interface SsoDiscoveryResult {
  available: boolean;
  protocol: "OIDC" | "SAML" | null;
  organizationId: string | null;
}

// ── Plugin marketplace (Phase 4, v1 — API.md §18, ARCHITECTURE.md §16) ────
export const PluginStatuses = ["DRAFT", "IN_REVIEW", "PUBLISHED", "REJECTED", "SUSPENDED"] as const;
export type PluginStatus = (typeof PluginStatuses)[number];

// Deliberately narrow — v1 has no `permissions` grant beyond "none" (§16.5's
// open question, left unresolved). Every plugin gets identical, minimal
// capability: read one input string, one flat options bag, return one
// output string.
export const PluginManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, hyphens only"),
  name: z.string().min(1).max(80),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "must be semver (e.g. 1.0.0)"),
  description: z.string().min(1).max(500),
  author: z.string().min(1).max(120),
});
export type PluginManifest = z.infer<typeof PluginManifestSchema>;

export const CreatePluginSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, hyphens only"),
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(500),
});
export type CreatePluginDto = z.infer<typeof CreatePluginSchema>;

const MAX_WASM_BASE64_LENGTH = Math.ceil((2 * 1024 * 1024 * 4) / 3); // ~2MB decoded

export const SubmitPluginVersionSchema = z.object({
  manifest: PluginManifestSchema,
  wasmBase64: z.string().min(1).max(MAX_WASM_BASE64_LENGTH),
});
export type SubmitPluginVersionDto = z.infer<typeof SubmitPluginVersionSchema>;

export const ReviewPluginVersionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
});
export type ReviewPluginVersionDto = z.infer<typeof ReviewPluginVersionSchema>;

export interface PluginSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: PluginStatus;
  authorEmail: string;
  latestVersion: string | null;
  createdAt: string;
}

export interface PluginVersionSummary {
  id: string;
  version: string;
  manifest: PluginManifest;
  checksumSha256: string;
  reviewedAt: string | null;
  createdAt: string;
}

export interface PluginDetail extends PluginSummary {
  versions: PluginVersionSummary[];
}

// Fetched by the frontend PluginRunner to actually execute a plugin.
// Publicly readable for PUBLISHED versions (anyone can run a published
// plugin); DRAFT/IN_REVIEW versions are only returned to the plugin's own
// author or an admin (so an author can preview before it's public, and a
// reviewer can test it, without exposing unreviewed code to the world).
export interface PluginRunPayload {
  version: string;
  wasmBase64: string;
  checksumSha256: string;
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
