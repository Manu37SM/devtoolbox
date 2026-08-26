

import { z } from "zod";

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

export const RegisterSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(10).max(200),
  displayName: z.string().min(1).max(80).optional(),
  captchaToken: z.string().optional(),
});
export type RegisterDto = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
  captchaToken: z.string().optional(),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const OAuthProviders = ["github", "google"] as const;
export type OAuthProvider = (typeof OAuthProviders)[number];

export const OAuthCallbackSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url(),
});
export type OAuthCallbackDto = z.infer<typeof OAuthCallbackSchema>;

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
  captchaToken: z.string().optional(),
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

export const CreateSnippetSchema = z.object({
  toolSlug: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  content: z.string().max(200_000),
  isPublic: z.boolean().optional().default(false),

  organizationId: z.string().uuid().optional(),
});
export type CreateSnippetDto = z.infer<typeof CreateSnippetSchema>;

export const UpdateSnippetSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(200_000).optional(),
  isPublic: z.boolean().optional(),
});
export type UpdateSnippetDto = z.infer<typeof UpdateSnippetSchema>;

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

export const CreateShareLinkSchema = z.object({
  toolSlug: z.string().min(1).max(120),
  payload: z.record(z.unknown()),

  organizationId: z.string().uuid().optional(),
});
export type CreateShareLinkDto = z.infer<typeof CreateShareLinkSchema>;

export interface ShareLinkResult {
  slug: string;
  url: string;
  expiresAt: string | null;
}

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
  ip: z.string().max(45).optional(),
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
  expiresAt: z.number(),
});
export type WebhookInboxCreateResultDto = z.infer<typeof WebhookInboxCreateResult>;

export interface WebhookInboxEvent {
  id: string;
  receivedAt: number;
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
  model?: string;
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

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(60),
});
export type CreateApiKeyDto = z.infer<typeof CreateApiKeySchema>;

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

export const BillablePlans = ["PRO", "TEAM"] as const;
export type BillablePlan = (typeof BillablePlans)[number];

export const CreateSubscriptionSchema = z.object({
  plan: z.enum(BillablePlans),
});
export type CreateSubscriptionDto = z.infer<typeof CreateSubscriptionSchema>;

export interface CreateSubscriptionResult {
  razorpaySubscriptionId: string;
  razorpayKeyId: string;
  plan: BillablePlan;
}

export const VerifyPaymentSchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_subscription_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});
export type VerifyPaymentDto = z.infer<typeof VerifyPaymentSchema>;

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

export const UpsertSsoConnectionSchema = z.discriminatedUnion("protocol", [
  z.object({
    protocol: z.literal("OIDC"),
    domain: z.string().min(1).max(255),
    oidcIssuer: z.string().url().max(2048),
    oidcClientId: z.string().min(1).max(255),

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

  oidcIssuer: string | null;
  oidcClientId: string | null;
  oidcHasClientSecret: boolean;
  samlEntryPoint: string | null;
  samlIssuer: string | null;
  samlCert: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SsoDiscoveryResult {
  available: boolean;
  protocol: "OIDC" | "SAML" | null;
  organizationId: string | null;
}

export const PluginStatuses = ["DRAFT", "IN_REVIEW", "PUBLISHED", "REJECTED", "SUSPENDED"] as const;
export type PluginStatus = (typeof PluginStatuses)[number];

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

const MAX_WASM_BASE64_LENGTH = Math.ceil((2 * 1024 * 1024 * 4) / 3);

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

export interface PluginRunPayload {
  version: string;
  wasmBase64: string;
  checksumSha256: string;
}

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
