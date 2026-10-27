import { z } from "zod";

export const downloadTimeCalculatorOptionsSchema = z.object({
  speed: z.number().min(0).default(100),
  speedUnit: z.enum(["Kbps", "Mbps", "Gbps", "MBps"]).default("Mbps"),
  efficiency: z.number().int().min(1).max(100).default(90),
});
export type DownloadTimeCalculatorOptions = z.infer<typeof downloadTimeCalculatorOptionsSchema>;

export const downloadTimeCalculatorInputSchema = z.string().max(1000000);
