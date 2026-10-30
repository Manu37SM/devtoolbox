import { z } from "zod";

export const ipv4AddressConverterOptionsSchema = z.object({
  /** details = every representation; the others print one value per input line (bulk conversion). */
  output: z.enum(["details", "dotted", "integer", "hex", "binary", "csv"]).default("details"),
  /**
   * Also read the legacy inet_aton forms that browsers, curl and most C libraries accept:
   * shortened (10.1 = 10.0.0.1), octal octets (0177.0.0.1) and hex octets (0x7f.1).
   * These are a classic way to slip past SSRF allow/deny lists.
   */
  inetAton: z.boolean().default(false),
});
export type Ipv4AddressConverterOptions = z.infer<typeof ipv4AddressConverterOptionsSchema>;

export const ipv4AddressConverterInputSchema = z.string().max(1000000);
