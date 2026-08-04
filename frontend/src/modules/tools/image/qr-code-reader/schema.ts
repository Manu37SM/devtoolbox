import { z } from "zod";

// No meaningful options for QR decoding — jsQR's only configurable knob is
// `inversionAttempts`, which we always run at its most permissive
// ("attemptBoth") since there's no UX reason to expose a narrower setting.
// Kept as an (empty) schema for contract consistency with every other tool
// per DEVELOPMENT_GUIDE.md §5 rather than skipping schema.ts entirely.
export const qrCodeReaderOptionsSchema = z.object({});
export type QrCodeReaderOptions = z.infer<typeof qrCodeReaderOptionsSchema>;
