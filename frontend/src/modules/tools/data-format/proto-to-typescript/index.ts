import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const protoToTypescriptTool: ToolRegistryEntry = {
  slug: "proto-to-typescript",
  name: "Protobuf .proto to TypeScript",
  module: "data-format",
  description: "Turn proto3 or proto2 message and enum definitions into TypeScript interfaces or JSON samples that follow the protobuf JSON mapping, including maps, oneofs and well-known types.",
  aliases: ["proto to ts","protobuf json mapping","grpc typescript types","proto to json example","protobuf interface generator"],
  icon: "FileType",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["proto to ts","protobuf json mapping","grpc typescript types","proto to json example","protobuf interface generator"] },
};
