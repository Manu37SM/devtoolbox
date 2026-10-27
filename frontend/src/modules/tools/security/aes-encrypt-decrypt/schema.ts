import { z } from "zod";

export const aesEncryptDecryptOptionsSchema = z.object({
  mode: z.enum(["encrypt", "decrypt"]).default("encrypt"),
  password: z.string().max(10000).default(""),
});
export type AesEncryptDecryptOptions = z.infer<typeof aesEncryptDecryptOptionsSchema>;

export const aesEncryptDecryptInputSchema = z.string().max(1000000);
