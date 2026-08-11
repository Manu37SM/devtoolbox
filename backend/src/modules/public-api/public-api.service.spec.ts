import { createHash } from "node:crypto";
import { PublicApiService } from "./public-api.service";

describe("PublicApiService", () => {
  const service = new PublicApiService();

  describe("hash", () => {
    it("returns the correct digest for each supported algorithm", () => {
      for (const algorithm of ["md5", "sha1", "sha256", "sha512"] as const) {
        const result = service.hash({ input: "hello world", algorithm });
        expect(result.digest).toBe(createHash(algorithm).update("hello world").digest("hex"));
      }
    });
  });

  describe("jsonValidate", () => {
    it("returns valid: true for well-formed JSON", () => {
      expect(service.jsonValidate({ input: '{"a":1}' })).toEqual({ valid: true });
    });

    it("returns valid: false with an error message for malformed JSON", () => {
      const result = service.jsonValidate({ input: '{"a":1,}' });
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
