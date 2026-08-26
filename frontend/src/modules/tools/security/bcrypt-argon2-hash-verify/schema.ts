import { z } from "zod";

export const bcryptArgon2AlgorithmSchema = z.enum(["bcrypt", "argon2id"]);
export type BcryptArgon2Algorithm = z.infer<typeof bcryptArgon2AlgorithmSchema>;

export const bcryptArgon2ModeSchema = z.enum(["hash", "verify"]);
export type BcryptArgon2Mode = z.infer<typeof bcryptArgon2ModeSchema>;

export const bcryptArgon2OptionsSchema = z.object({
  algorithm: bcryptArgon2AlgorithmSchema.default("bcrypt"),
  mode: bcryptArgon2ModeSchema.default("hash"),
  password: z.string().min(1).max(1000),

  existingHash: z.string().max(1000).optional(),
  bcryptCost: z.number().int().min(4).max(15).default(10),
  argon2Iterations: z.number().int().min(1).max(10).default(2),
  argon2MemoryKib: z.number().int().min(8).max(262144).default(19456),
  argon2Parallelism: z.number().int().min(1).max(4).default(1),
});
export type BcryptArgon2Options = z.infer<typeof bcryptArgon2OptionsSchema>;
