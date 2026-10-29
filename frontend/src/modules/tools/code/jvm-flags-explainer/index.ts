import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jvmFlagsExplainerTool: ToolRegistryEntry = {
  slug: "jvm-flags-explainer",
  name: "JVM Flags Explainer",
  module: "code",
  description: "Explain java command lines and JAVA_OPTS: heap and GC flags, removed and deprecated options for your JDK version, conflicting collectors, container memory settings and secret-looking -D properties.",
  aliases: ["java opts explained","jvm options checker","xx flags","unrecognized vm option","java heap settings"],
  icon: "Cpu",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["java opts explained","jvm options checker","xx flags","unrecognized vm option","java heap settings"] },
};
