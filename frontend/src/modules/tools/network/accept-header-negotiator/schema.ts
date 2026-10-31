import { z } from "zod";

export const acceptHeaderNegotiatorOptionsSchema = z.object({
  /** Which header the input is */
  kind: z.enum(["accept", "language", "encoding", "charset"]).default("accept"),
  /** parse: ranked list of what the client asked for; negotiate: pick from the offered list */
  mode: z.enum(["parse", "negotiate"]).default("negotiate"),
  /** Comma separated values the server can produce, in server preference order */
  offered: z.string().default("application/json, text/html"),
  /** Show which client range decided each offered value */
  reasons: z.boolean().default(true),
  /** Also print the Vary header and the HTTP status the result implies */
  responseHints: z.boolean().default(true),
});
export type AcceptHeaderNegotiatorOptions = z.infer<typeof acceptHeaderNegotiatorOptionsSchema>;
