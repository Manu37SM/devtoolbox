import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const protobufBinaryDecoderTool: ToolRegistryEntry = {
  slug: "protobuf-binary-decoder",
  name: "Protobuf Binary Decoder",
  module: "encoding",
  description: "Decode raw protobuf bytes without a .proto file: field numbers, wire types, varints with signed and zigzag readings, fixed-width numbers, nested messages, strings and gRPC frames.",
  aliases: ["protoc decode raw online","protobuf hex decoder","decode grpc payload","protobuf without schema","protobuf wire format viewer"],
  icon: "Layers",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["protoc decode raw online","protobuf hex decoder","decode grpc payload","protobuf without schema","protobuf wire format viewer"] },
};
