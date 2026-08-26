import { toolRegistry } from "@/lib/registry";
import { ToolCard } from "@/components/shared/ToolCard";
import { HomeQuickAccess } from "@/components/shared/HomeQuickAccess";
import type { ToolModule } from "@devtoolbox/shared";

const MODULE_LABELS: Record<ToolModule, string> = {
  "data-format": "Data Format",
  encoding: "Encoding & Decoding",
  security: "Security & Crypto",
  text: "Text & String",
  code: "Code",
  converters: "Converters",
  image: "Image & Graphics",
  network: "Network & Web",
  generators: "Generators & Test Data",
  ai: "AI-Powered",
};

export default function HomePage() {
  const byModule = new Map<ToolModule, typeof toolRegistry>();
  for (const tool of toolRegistry) {
    const list = byModule.get(tool.module) ?? [];
    list.push(tool);
    byModule.set(tool.module, list);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-text-primary">DevToolbox</h1>
      <p className="mt-2 max-w-2xl text-text-secondary">
        Free, client-side developer tools. Nothing you paste here leaves your browser unless a
        tool explicitly says otherwise. Press <kbd className="rounded-sm border border-border-subtle px-1.5 py-0.5 text-xs">⌘K</kbd> to search.
      </p>

      <div className="mt-8">
        <HomeQuickAccess />
      </div>

      <div className="flex flex-col gap-10">
        {Array.from(byModule.entries()).map(([module, tools]) => (
          <section key={module}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
              {MODULE_LABELS[module]}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
