import { z } from "zod";

export const classicalCiphersOptionsSchema = z.object({
  cipher: z.enum(["rot13", "caesar", "atbash", "rot47", "vigenere"]).default("rot13"),
  mode: z.enum(["encrypt", "decrypt"]).default("encrypt"),
  shift: z.number().int().min(-25).max(25).default(3),
  key: z.string().max(10000).default("KEY"),
});
export type ClassicalCiphersOptions = z.infer<typeof classicalCiphersOptionsSchema>;

export const classicalCiphersInputSchema = z.string().max(1000000);
