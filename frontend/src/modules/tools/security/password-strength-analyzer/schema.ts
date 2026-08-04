import { z } from "zod";

export const passwordStrengthInputSchema = z.string().max(1000);

export const passwordStrengthScoreSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);
export type PasswordStrengthScore = z.infer<typeof passwordStrengthScoreSchema>;

export const passwordStrengthLabelSchema = z.enum([
  "Very Weak",
  "Weak",
  "Fair",
  "Strong",
  "Very Strong",
]);
export type PasswordStrengthLabel = z.infer<typeof passwordStrengthLabelSchema>;
