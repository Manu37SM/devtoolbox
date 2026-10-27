import { z } from "zod";

export const semverToolOptionsSchema = z.object({
  action: z.enum(["sort", "compare", "bump", "validate"]).default("sort"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  bumpLevel: z.enum(["major", "minor", "patch", "premajor", "preminor", "prepatch", "prerelease"]).default("patch"),
  preid: z.string().max(10000).default("rc"),
});
export type SemverToolOptions = z.infer<typeof semverToolOptionsSchema>;

export const semverToolInputSchema = z.string().max(1000000);
