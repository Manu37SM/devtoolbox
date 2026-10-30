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

export const passwordStrengthOptionsSchema = z.object({
  /** Attack the headline crack time assumes. */
  scenario: z.enum(["online-throttled", "online", "offline-slow", "offline-fast"]).default("offline-fast"),
  /** Words tied to the user or site (name, company, email, product) that shouldn't appear in the password. */
  userInputs: z.string().max(500).default(""),
  /** Check against a password policy. */
  policy: z.enum(["none", "nist", "pci", "custom"]).default("none"),
  /** Minimum length for the custom policy. */
  customMinLength: z.number().int().min(1).max(128).default(12),
});
export type PasswordStrengthOptions = z.infer<typeof passwordStrengthOptionsSchema>;
