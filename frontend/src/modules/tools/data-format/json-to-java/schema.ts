import { z } from "zod";

export const jsonToJavaOptionsSchema = z.object({
  style: z.enum(["lombok", "pojo", "record"]).default("lombok"),
  rootName: z.string().max(10000).default("Root"),
  packageName: z.string().max(10000).default(""),
  jackson: z.boolean().default(true),
});
export type JsonToJavaOptions = z.infer<typeof jsonToJavaOptionsSchema>;

export const jsonToJavaInputSchema = z.string().max(1000000);
