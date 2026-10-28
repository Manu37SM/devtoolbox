import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const htpasswdGeneratorTool: ToolRegistryEntry = {
  slug: "htpasswd-generator",
  name: "htpasswd Generator (APR1 / SHA1)",
  module: "security",
  description: "Create .htpasswd entries for Apache and nginx basic auth, using Apache APR1-MD5 with a random salt or legacy {SHA}. Runs in your browser, so passwords are never sent anywhere.",
  aliases: ["apache htpasswd online","nginx basic auth password","apr1 md5 hash","basic auth file generator","htpasswd -m"],
  icon: "KeyRound",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["apache htpasswd online","nginx basic auth password","apr1 md5 hash","basic auth file generator","htpasswd -m"] },
};
