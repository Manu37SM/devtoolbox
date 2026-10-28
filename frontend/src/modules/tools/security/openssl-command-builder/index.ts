import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const opensslCommandBuilderTool: ToolRegistryEntry = {
  slug: "openssl-command-builder",
  name: "OpenSSL Command Builder",
  module: "security",
  description: "Build the right openssl command for keys, CSRs with SAN, self-signed certificates, certificate inspection, chain verification, PKCS#12 conversion, TLS checks with s_client and key/cert matching.",
  aliases: ["openssl req command","generate csr with san","self signed certificate command","openssl s_client check","pkcs12 export command"],
  icon: "Terminal",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["openssl req command","generate csr with san","self signed certificate command","openssl s_client check","pkcs12 export command"] },
};
