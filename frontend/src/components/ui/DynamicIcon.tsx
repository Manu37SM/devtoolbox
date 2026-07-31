"use client";

import { icons, HelpCircle, type LucideProps } from "lucide-react";

/** Resolves a tool/module's `icon` registry field (a lucide-react icon
 * name string, e.g. "Braces") to the actual icon component at runtime.
 * Falls back to a generic icon rather than throwing if a name is ever
 * mistyped in a tool's index.ts — a missing icon shouldn't break the nav. */
export function DynamicIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = icons[name as keyof typeof icons] ?? HelpCircle;
  return <Icon {...props} />;
}
