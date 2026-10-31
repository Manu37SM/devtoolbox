import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const soapEnvelopeBuilderTool: ToolRegistryEntry = {
  slug: "soap-envelope-builder",
  name: "SOAP Envelope Builder & Parser",
  module: "data-format",
  description: "Build SOAP 1.1 or 1.2 request envelopes from JSON with namespaces, WS-Security UsernameToken (text or digest), headers and Faults plus curl, or parse a SOAP message into JSON.",
  aliases: ["soap envelope", "soap request", "ws-security", "usernametoken", "soapaction", "soap fault", "wsdl request", "soap 1.2"],
  icon: "Send",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["soap envelope builder & parser", "soap envelope", "soap request", "ws-security", "usernametoken", "soapaction", "soap fault", "wsdl request", "soap 1.2"] },
};
