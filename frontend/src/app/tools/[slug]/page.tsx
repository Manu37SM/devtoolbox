import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getToolBySlug, toolRegistry } from "@/lib/registry";
import { toolViewRegistry } from "@/lib/tool-view-registry";
import { ToolShell } from "@/components/tools/ToolShell";

// Next.js 15 App Router: dynamic route `params` are async (a Promise),
// not a plain object, in both the page component and
// generateMetadata/generateStaticParams consumers — a breaking change
// from Next 14. See AUDIT_REPORT.md §7.10.
interface ToolPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return toolRegistry.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) return {};
  return {
    title: tool.name,
    description: tool.description,
    keywords: tool.seo.keywords,
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) notFound();

  const ToolView = toolViewRegistry[tool.slug];
  if (!ToolView) notFound();

  return (
    <ToolShell tool={tool}>
      <ToolView />
    </ToolShell>
  );
}
