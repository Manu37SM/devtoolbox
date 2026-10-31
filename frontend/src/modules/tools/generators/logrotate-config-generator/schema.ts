import { z } from "zod";

export const logrotateConfigGeneratorOptionsSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]).default("daily"),
  rotate: z.number().int().min(0).max(3650).default(14),
  compress: z.enum(["none", "gzip", "xz", "zstd", "bzip2"]).default("gzip"),
  delayCompress: z.boolean().default(true),
  missingOk: z.boolean().default(true),
  notIfEmpty: z.boolean().default(true),
  /** copytruncate copies then truncates in place; create makes a fresh file — they are mutually exclusive */
  method: z.enum(["create", "copytruncate", "none"]).default("create"),
  createMode: z.string().default("0640"),
  createUser: z.string().default(""),
  createGroup: z.string().default(""),
  dateExt: z.boolean().default(false),
  dateFormat: z.string().default("-%Y%m%d"),
  maxSize: z.string().default(""),
  minSize: z.string().default(""),
  maxAge: z.number().int().min(0).max(3650).default(0),
  suUser: z.string().default(""),
  suGroup: z.string().default(""),
  shared: z.boolean().default(false),
  postrotate: z.string().default(""),
  prerotate: z.string().default(""),
  olddir: z.string().default(""),
});
export type LogrotateConfigGeneratorOptions = z.infer<typeof logrotateConfigGeneratorOptionsSchema>;
