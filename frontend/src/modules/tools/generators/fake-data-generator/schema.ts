import { z } from "zod";

export const fakeDataGeneratorOptionsSchema = z.object({
  recordType: z.enum(["person", "address", "company", "product", "internet-user"]).default("person"),
  count: z.number().int().min(1).max(1000).default(10),
  seed: z.number().int().optional(),
});
export type FakeDataGeneratorOptions = z.infer<typeof fakeDataGeneratorOptionsSchema>;
