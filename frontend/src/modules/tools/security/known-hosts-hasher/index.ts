import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const knownHostsHasherTool: ToolRegistryEntry = {
  slug: "known-hosts-hasher",
  name: "known_hosts Hasher & Matcher",
  module: "security",
  description: "Hash host names the way ssh-keygen -H does for known_hosts (HMAC-SHA1 salted entries) and test whether a host name matches a hashed entry, for auditing and cleaning known_hosts files.",
  aliases: ["ssh known_hosts hash", "ssh-keygen -H", "hashknownhosts", "known hosts hashed", "ssh-keygen -F"],
  icon: "KeyRound",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["known_hosts hasher & matcher", "ssh known_hosts hash", "ssh-keygen -H", "hashknownhosts", "known hosts hashed", "ssh-keygen -F"] },
};
