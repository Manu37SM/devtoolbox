import { z } from "zod";

export const mockFieldTypeSchema = z.enum([
  "uuid",
  "name",
  "email",
  "phone",
  "boolean",
  "int",
  "float",
  "date",
  "sentence",
  "word",
  "url",
  "company",
  "city",
  "country",
]);
export type MockFieldType = z.infer<typeof mockFieldTypeSchema>;

export const mockFieldSchema = z.object({
  name: z.string().min(1).max(60),
  type: mockFieldTypeSchema,
});
export type MockField = z.infer<typeof mockFieldSchema>;

export const mockApiResponseOptionsSchema = z.object({
  fields: z
    .array(mockFieldSchema)
    .min(1)
    .default([
      { name: "id", type: "uuid" },
      { name: "name", type: "name" },
      { name: "email", type: "email" },
    ]),
  count: z.number().int().min(1).max(500).default(5),
  wrapInDataKey: z.boolean().default(false),
  seed: z.number().int().optional(),
});
export type MockApiResponseOptions = z.infer<typeof mockApiResponseOptionsSchema>;
