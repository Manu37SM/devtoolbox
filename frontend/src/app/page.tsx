import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { toolRegistry, getToolsByModule } from "@/lib/registry";
import { MODULE_META, MODULE_ORDER } from "@/lib/module-meta";
import { FEATURED_SLUGS, resolveFeatured } from "@/lib/featured-tools";
import { ToolCard } from "@/components/shared/ToolCard";
import { HomeQuickAccess } from "@/components/shared/HomeQuickAccess";
import { HomeSearchButton } from "@/components/shared/HomeSearchButton";
import { DynamicIcon } from "@/components/ui/DynamicIcon";

export default function HomePage() {
  const featured = resolveFeatured(FEATURED_SLUGS);
  const modules = MODULE_ORDER.filter((m) => getToolsByModule(m).length > 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-semibold text-text-primary">DevToolbox</h1>
      <p className="mt-2 max-w-2xl text-text-secondary">
        {toolRegistry.length} free developer tools. Nothing you paste here leaves your browser unless a tool explicitly says
        otherwise.
      </p>
      <HomeSearchButton total={toolRegistry.length} />

      <div className="mt-10">
        <HomeQuickAccess />
      </div>

      <section className="mb-12">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Popular starting points</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Browse by category</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {modules.map((m) => {
            const meta = MODULE_META[m];
            const tools = getToolsByModule(m);
            return (
              <Link
                key={m}
                href={`/category/${m}`}
                className="group flex flex-col gap-2 rounded-md border border-border-subtle bg-bg-raised p-4 transition-colors hover:border-accent"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-bg-base text-accent">
                    <DynamicIcon name={meta.icon} className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="flex-1 font-medium text-text-primary">{meta.label}</span>
                  <span className="rounded-full bg-bg-base px-2 py-0.5 text-xs tabular-nums text-text-muted">{tools.length}</span>
                </span>
                <span className="text-sm text-text-muted">{meta.description}</span>
                <span className="truncate text-xs text-text-muted">
                  {tools.slice(0, 3).map((t) => t.name).join(" · ")}
                </span>
                <span className="mt-auto flex items-center gap-1 text-sm text-accent">
                  Browse all <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
