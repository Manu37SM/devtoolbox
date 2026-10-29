import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const msgpackCborJsonTool: ToolRegistryEntry = {
  slug: "msgpack-cbor-json",
  name: "MessagePack & CBOR to JSON",
  module: "encoding",
  description: "Decode MessagePack or CBOR (RFC 8949) from hex or base64 to JSON and encode JSON back, with exact 64-bit integers, binary data, tags, timestamps and indefinite-length items.",
  aliases: ["msgpack decoder","cbor to json","json to messagepack","cbor diagnostic","decode messagepack hex"],
  icon: "PackageOpen",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["msgpack decoder","cbor to json","json to messagepack","cbor diagnostic","decode messagepack hex"] },
};
