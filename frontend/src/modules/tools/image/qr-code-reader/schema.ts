import { z } from "zod";

export const qrCodeReaderOptionsSchema = z.object({});
export type QrCodeReaderOptions = z.infer<typeof qrCodeReaderOptionsSchema>;
