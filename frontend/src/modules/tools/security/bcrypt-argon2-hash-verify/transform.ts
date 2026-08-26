import { argon2id, argon2Verify, bcrypt, bcryptVerify } from "hash-wasm";
import type { BcryptArgon2Options } from "./schema";

export interface BcryptArgon2Result {
  output: string;
  verified: boolean | null;
  error: { message: string } | null;
}

export async function hashOrVerify(options: BcryptArgon2Options): Promise<BcryptArgon2Result> {
  try {
    if (options.mode === "verify") {
      if (!options.existingHash || options.existingHash.trim().length === 0) {
        return { output: "", verified: null, error: { message: "Provide an existing hash to verify against." } };
      }
      const verified =
        options.algorithm === "bcrypt"
          ? await bcryptVerify({ password: options.password, hash: options.existingHash.trim() })
          : await argon2Verify({ password: options.password, hash: options.existingHash.trim() });
      return { output: "", verified, error: null };
    }

    const salt = crypto.getRandomValues(new Uint8Array(16));

    if (options.algorithm === "bcrypt") {
      const hash = await bcrypt({
        password: options.password,
        salt,
        costFactor: options.bcryptCost,
        outputType: "encoded",
      });
      return { output: hash, verified: null, error: null };
    }

    const hash = await argon2id({
      password: options.password,
      salt,
      parallelism: options.argon2Parallelism,
      iterations: options.argon2Iterations,
      memorySize: options.argon2MemoryKib,
      hashLength: 32,
      outputType: "encoded",
    });
    return { output: hash, verified: null, error: null };
  } catch (err) {
    return {
      output: "",
      verified: null,
      error: { message: err instanceof Error ? err.message : "Hashing/verification failed." },
    };
  }
}
