import { z } from "zod";

export const ipv4AddressConverterOptionsSchema = z.object({

});
export type Ipv4AddressConverterOptions = z.infer<typeof ipv4AddressConverterOptionsSchema>;

export const ipv4AddressConverterInputSchema = z.string().max(1000000);
