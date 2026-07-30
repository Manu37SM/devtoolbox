import { z } from "zod";

export const markdownHtmlInputSchema = z.string().max(2_000_000);
