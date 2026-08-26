"use client";

import { icons, HelpCircle, type LucideProps } from "lucide-react";

export function DynamicIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = icons[name as keyof typeof icons] ?? HelpCircle;
  return <Icon {...props} />;
}
