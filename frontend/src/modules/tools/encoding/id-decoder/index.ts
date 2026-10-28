import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const idDecoderTool: ToolRegistryEntry = {
  slug: "id-decoder",
  name: "ID Decoder (UUID / ULID / ObjectId / Snowflake)",
  module: "encoding",
  description: "Decode the hidden data in identifiers: UUID version/variant and v1/v6/v7 timestamps, ULID time, MongoDB ObjectId, Twitter/X and Discord snowflakes. One ID per line, auto-detected.",
  aliases: ["uuid v7 timestamp","ulid timestamp","objectid date","snowflake id decoder","uuid version checker","discord id date"],
  icon: "FingerprintPattern",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["uuid v7 timestamp","ulid timestamp","objectid date","snowflake id decoder","uuid version checker","discord id date"] },
};
