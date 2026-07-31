"use strict";
// Shared types & schemas between frontend and backend.
// Single source of truth for anything crossing the API boundary — see
// DEVELOPMENT_GUIDE.md §3 and CLAUDE.md rule 6.
//
// Keep this package framework-agnostic (no React, no Nest decorators):
// pure TypeScript types + Zod schemas only.
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePipelineSchema = exports.PipelineStepSchema = exports.AiDiffSummaryRequestSchema = exports.AiGenerateRequestSchema = exports.AiExplainRequestSchema = exports.TOOL_MODULES = void 0;
const zod_1 = require("zod");
// ── Tool module taxonomy (mirrors FEATURE.md) ─────────────────────────────
exports.TOOL_MODULES = [
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
];
// ── AI Gateway DTOs (see API.md §9) ────────────────────────────────────────
exports.AiExplainRequestSchema = zod_1.z.object({
    toolSlug: zod_1.z.string(),
    subject: zod_1.z.enum(["regex", "cron", "json-schema", "sql"]),
    input: zod_1.z.string().max(20_000),
});
exports.AiGenerateRequestSchema = zod_1.z.object({
    target: zod_1.z.enum(["regex", "cron", "json-schema"]),
    prompt: zod_1.z.string().max(2_000),
    examples: zod_1.z.array(zod_1.z.string()).max(20).optional(),
});
exports.AiDiffSummaryRequestSchema = zod_1.z.object({
    before: zod_1.z.string().max(50_000),
    after: zod_1.z.string().max(50_000),
    format: zod_1.z.enum(["text", "json"]),
});
// ── Pipeline DTOs (see API.md §7, DATABASE.md) ─────────────────────────────
exports.PipelineStepSchema = zod_1.z.object({
    toolSlug: zod_1.z.string(),
    optionsJson: zod_1.z.record(zod_1.z.unknown()),
});
exports.CreatePipelineSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(120),
    description: zod_1.z.string().max(500).optional(),
    steps: zod_1.z.array(exports.PipelineStepSchema).min(1),
});
