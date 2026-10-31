import { z } from "zod";

export const upiPaymentLinkBuilderOptionsSchema = z.object({
  mode: z.enum(["build", "parse"]).default("build"),
  /** Payee name (pn) */
  payeeName: z.string().default(""),
  /** Amount in INR, empty for payer-entered */
  amount: z.string().default(""),
  /** Transaction note (tn) */
  note: z.string().default(""),
  /** Merchant transaction reference (tr) */
  reference: z.string().default(""),
  /** 4-digit merchant category code (mc); empty for person-to-person */
  merchantCode: z.string().default(""),
  /** Which links to print */
  targets: z.array(z.enum(["upi", "gpay", "phonepe", "paytm", "android-intent", "html", "qr-payload"])).default(["upi", "qr-payload"]),
  /** Android package used for intent links */
  androidPackage: z.string().default("com.google.android.apps.nbu.paisa.user"),
});
export type UpiPaymentLinkBuilderOptions = z.infer<typeof upiPaymentLinkBuilderOptionsSchema>;
