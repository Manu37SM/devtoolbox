import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getToolBySlug, toolRegistry } from "@/lib/registry";
import { toolViewRegistry } from "@/lib/tool-view-registry";
import { ToolShell } from "@/components/tools/ToolShell";

interface ToolPageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return toolRegistry.map((tool) => ({ slug: tool.slug }));
}

export function generateMetadata({ params }: ToolPageProps): Metadata {
  const tool = getToolBySlug(params.slug);
  if (!tool) return {};
  return {
    title: tool.name,
    description: tool.description,
    keywords: tool.seo.keywords,
  };
}

export default function ToolPage({ params }: ToolPageProps) {
  const tool = getToolBySlug(params.slug);
  if (!tool) notFound();

  const ToolView = toolViewRegistry[tool.slug];
  if (!ToolView) notFound();

  return (
    <ToolShell tool={tool}>
      <ToolView />
    </ToolShell>
  );
}
