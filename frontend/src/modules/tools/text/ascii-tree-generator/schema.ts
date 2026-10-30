import { z } from "zod";

export const asciiTreeGeneratorOptionsSchema = z.object({
  /** How to read the input; "auto" picks paths, indent or tree-command output. */
  inputFormat: z.enum(["auto", "paths", "indent", "tree"]).default("auto"),
  output: z.enum(["tree", "paths", "markdown", "json"]).default("tree"),
  charset: z.enum(["unicode", "ascii"]).default("unicode"),
  sort: z.enum(["none", "alpha", "folders-first"]).default("none"),
  /** Append "/" to directory names. */
  trailingSlash: z.boolean().default(true),
  /** Root label; empty = automatic (the single top folder, otherwise "."). */
  rootName: z.string().max(200).default(""),
  /** Show only this many levels below the root (0 = all). */
  maxDepth: z.number().int().min(0).max(50).default(0),
  /** Append "N directories, M files" like the tree command. */
  summary: z.boolean().default(false),
});
export type AsciiTreeGeneratorOptions = z.infer<typeof asciiTreeGeneratorOptionsSchema>;

export const asciiTreeGeneratorInputSchema = z.string().max(2_000_000);
