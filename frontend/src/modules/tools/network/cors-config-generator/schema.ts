import { z } from "zod";

export const CORS_TARGETS = ["spring-mvc", "spring-security", "nginx", "apache", "express", "kong", "http-headers"] as const;

export const corsConfigGeneratorOptionsSchema = z.object({
  target: z.enum(CORS_TARGETS).default("spring-mvc"),
});
export type CorsConfigGeneratorOptions = z.infer<typeof corsConfigGeneratorOptionsSchema>;
