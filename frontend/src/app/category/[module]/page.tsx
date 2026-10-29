import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ToolModule } from "@devtoolbox/shared";
import { getToolsByModule } from "@/lib/registry";
import { MODULE_META, MODULE_ORDER } from "@/lib/module-meta";
import { CategoryToolList } from "@/components/shared/CategoryToolList";
import { DynamicIcon } from "@/components/ui/DynamicIcon";

interface CategoryPageProps {
  params: Promise<{ module: string }>;
}

const isModule = (v: string): v is ToolModule => (MODULE_ORDER as string[]).includes(v);

export function generateStaticParams() {
  return MODULE_ORDER.filter((m) => getToolsByModule(m).length > 0).map((module) => ({ module }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { module } = await params;
  if (!isModule(module)) return {};
  const meta = MODULE_META[module];
  return { title: `${meta.label} tools`, description: meta.description };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { module } = await params;
  if (!isModule(module)) notFound();
  const tools = getToolsByModule(module);
  if (tools.length === 0) notFound();
  const meta = MODULE_META[module];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-text-muted">
        <Link href="/" className="hover:text-text-primary">All tools</Link> <span aria-hidden="true">/</span> {meta.label}
      </nav>
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-bg-raised text-accent">
          <DynamicIcon name={meta.icon} className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{meta.label}</h1>
          <p className="mt-1 text-text-secondary">{meta.description}</p>
        </div>
      </div>
      <CategoryToolList tools={tools} label={meta.label} />
    </div>
  );
}
