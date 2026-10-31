import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const uriTemplateExpanderTool: ToolRegistryEntry = {
  slug: "uri-template-expander",
  name: "URI Template Expander (RFC 6570)",
  module: "network",
  description: "Expand RFC 6570 URI templates ({var}, {+path}, {#frag}, {/seg}, {;p}, {?q}, {&r}, prefix and explode modifiers) from JSON variables, or list the variables a template uses.",
  aliases: ["rfc 6570", "uri template", "url template", "openapi path template", "hal link template"],
  icon: "Link2",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["uri template expander (rfc 6570)", "rfc 6570", "uri template", "url template", "openapi path template", "hal link template"] },
};
