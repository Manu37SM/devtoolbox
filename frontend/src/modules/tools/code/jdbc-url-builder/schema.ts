import { z } from "zod";

export const jdbcUrlBuilderOptionsSchema = z.object({
  database: z.enum(["oracle", "postgresql", "mysql", "mariadb", "sqlserver", "db2", "h2"]).default("postgresql"),
  showSpring: z.boolean().default(true),
});
export type JdbcUrlBuilderOptions = z.infer<typeof jdbcUrlBuilderOptionsSchema>;
