import { z } from "zod";

export const apiResponseToClientCodeTargets = ["fetch", "axios"] as const;
export type ApiResponseToClientCodeTarget = (typeof apiResponseToClientCodeTargets)[number];

export const apiResponseToClientCodeOptionsSchema = z.object({
  sampleResponse: z.string().min(1).max(10_000),
  target: z.enum(apiResponseToClientCodeTargets),
  typeName: z.string().min(1).max(60).optional(),
});
export type ApiResponseToClientCodeOptions = z.infer<typeof apiResponseToClientCodeOptionsSchema>;
