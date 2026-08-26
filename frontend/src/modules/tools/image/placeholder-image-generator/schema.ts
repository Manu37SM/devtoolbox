import { z } from "zod";

export const placeholderImageOptionsSchema = z.object({
  width: z.number().int().min(1).max(4000).default(600),
  height: z.number().int().min(1).max(4000).default(400),
  backgroundColor: z.string().default("#94a3b8"),
  textColor: z.string().default("#ffffff"),
  text: z.string().max(100).optional(),
});
export type PlaceholderImageOptions = z.infer<typeof placeholderImageOptionsSchema>;
