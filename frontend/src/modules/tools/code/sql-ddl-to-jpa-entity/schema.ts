import { z } from "zod";

export const sqlDdlToJpaEntityOptionsSchema = z.object({
  target: z.enum(["jakarta", "javax", "record"]).default("jakarta"),
  lombok: z.boolean().default(true),
  idStrategy: z.enum(["auto", "identity", "sequence", "uuid", "none"]).default("auto"),
  relations: z.boolean().default(false),
  packageName: z.string().default("com.example.domain"),
});
export type SqlDdlToJpaEntityOptions = z.infer<typeof sqlDdlToJpaEntityOptionsSchema>;
