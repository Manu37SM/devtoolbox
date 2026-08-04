import { z } from "zod";

export const gzipDeflateOptionsSchema = z.object({
  format: z.enum(["gzip", "deflate", "deflate-raw"]).default("gzip"),
  mode: z.enum(["compress", "decompress"]).default("compress"),
});
export type GzipDeflateOptions = z.infer<typeof gzipDeflateOptionsSchema>;

export const gzipDeflateInputSchema = z.string().max(5_000_000, {
  message: "Input exceeds the 5MB client-side processing limit.",
});
