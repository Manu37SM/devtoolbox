import { z } from "zod";

export const pemToolkitOptionsSchema = z.object({
  action: z.enum(["list", "extract", "rewrap", "strip", "to-der", "from-der", "reverse", "dedupe"]).default("list"),
  /** 1-based block number for "extract" (0 = all blocks) */
  index: z.number().int().min(0).max(1000).default(1),
  /** Only keep blocks with this label (empty = all), e.g. CERTIFICATE */
  labelFilter: z.string().max(60).default(""),
  /** Label used by "from-der" */
  label: z.string().max(60).default("CERTIFICATE"),
  lineWidth: z.number().int().min(16).max(1000).default(64),
  derFormat: z.enum(["base64", "hex", "hex-spaced"]).default("base64"),
  eol: z.enum(["lf", "crlf"]).default("lf"),
});
export type PemToolkitOptions = z.infer<typeof pemToolkitOptionsSchema>;
