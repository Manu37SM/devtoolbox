import { z } from "zod";

export const jsonToTypesOptionsSchema = z.object({
  language: z.enum(["typescript", "go", "python"]).default("typescript"),
  rootName: z.string().default("Root"),
  /** TypeScript: interface or type alias declarations. */
  tsDeclaration: z.enum(["interface", "type"]).default("interface"),
  exportTypes: z.boolean().default(false),
  readonlyFields: z.boolean().default(false),
  /** Go: package clause. */
  goPackage: z.string().max(100).default("main"),
  /** Go: add ,omitempty to every json tag (optional fields always get it). */
  goOmitEmpty: z.boolean().default(false),
  pythonStyle: z.enum(["dataclass", "typeddict", "pydantic"]).default("dataclass"),
});
export type JsonToTypesOptions = z.infer<typeof jsonToTypesOptionsSchema>;

export const jsonToTypesInputSchema = z.string().max(5_000_000, {
  message: "Input exceeds the 5MB client-side processing limit.",
});
