import { z } from "zod";

export const CURL_TARGETS = [
  ["fetch", "JavaScript fetch"],
  ["axios", "JavaScript axios"],
  ["python", "Python requests"],
  ["java-httpclient", "Java HttpClient (11+)"],
  ["spring-restclient", "Spring RestClient (6.1+)"],
  ["spring-webclient", "Spring WebClient"],
  ["okhttp", "Java OkHttp"],
  ["go", "Go net/http"],
  ["csharp", "C# HttpClient"],
  ["powershell", "PowerShell"],
] as const;

export const curlTargetSchema = z.enum(["fetch", "axios", "python", "java-httpclient", "spring-restclient", "spring-webclient", "okhttp", "go", "csharp", "powershell"]);
export type CurlTarget = z.infer<typeof curlTargetSchema>;

export const curlToCodeOptionsSchema = z.object({
  target: curlTargetSchema.default("fetch"),
  /** Java targets: write JSON bodies as text blocks (Java 15+) instead of escaped string literals. */
  javaTextBlocks: z.boolean().default(true),
});
export type CurlToCodeOptions = z.infer<typeof curlToCodeOptionsSchema>;

export const curlToCodeInputSchema = z.string().max(200_000);
