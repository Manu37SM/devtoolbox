import { z } from "zod";

export const databaseErrorLookupOptionsSchema = z.object({
  database: z.enum(["auto", "oracle", "postgresql", "mysql"]).default("auto"),
});
export type DatabaseErrorLookupOptions = z.infer<typeof databaseErrorLookupOptionsSchema>;
