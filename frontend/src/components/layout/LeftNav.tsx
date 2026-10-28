"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronsLeft, ChevronsRight, Workflow, X } from "lucide-react";
import type { ToolModule } from "@devtoolbox/shared";
import { moduleForPath } from "@/lib/nav-utils";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { toolRegistry, getToolsByModule } from "@/lib/registry";
import { MODULE_META, MODULE_ORDER } from "@/lib/module-meta";
import { useNavStore } from "@/store/nav-store";

export function LeftNav() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed, isMobileOpen, closeMobile } = useNavStore();
  const modules = MODULE_ORDER.filter((m) => getToolsByModule(m).length > 0);
  const activeModule = moduleForPath(pathname);
  // Manual choices win; otherwise the category being viewed is open.
  const [manual, setManual] = useState<Partial<Record<ToolModule, boolean>>>({});
  const isModuleOpen = (m: ToolModule) => manual[m] ?? m === activeModule;
  const toggle = (m: ToolModule) => setManual((prev) => ({ ...prev, [m]: !(prev[m] ?? m === activeModule) }));

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={closeMobile} aria-hidden="true" />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-72 flex-col border-r border-border-subtle bg-bg-base transition-transform lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-16" : "lg:w-64"}`}
        aria-label="Tool navigation"
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2 lg:hidden">
          <span className="text-sm font-semibold text-text-primary">Categories</span>
          <button onClick={closeMobile} aria-label="Close navigation" className="rounded-sm p-1 hover:bg-bg-raised">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Link
          href="/pipelines"
          onClick={closeMobile}
          className="mx-2 mt-2 flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text-secondary hover:bg-bg-raised hover:text-text-primary lg:hidden"
        >
          <Workflow className="h-4 w-4 shrink-0" aria-hidden="true" />
          Pipelines
        </Link>

        <nav className="flex-1 overflow-y-auto py-2" aria-label="Tool categories">
          {modules.map((moduleKey) => {
            const meta = MODULE_META[moduleKey];
            const tools = getToolsByModule(moduleKey);
            const isOpen = isModuleOpen(moduleKey) && !collapsed;
            const isActiveModule = activeModule === moduleKey;
            const panelId = `nav-${moduleKey}`;

            if (collapsed) {
              return (
                <Link
                  key={moduleKey}
                  href={`/category/${moduleKey}`}
                  title={`${meta.label} (${tools.length})`}
                  aria-label={meta.label}
                  className={`mx-2 mb-1 hidden items-center justify-center rounded-sm p-2 lg:flex ${
                    isActiveModule ? "bg-bg-raised text-text-primary" : "text-text-secondary hover:bg-bg-raised hover:text-text-primary"
                  }`}
                >
                  <DynamicIcon name={meta.icon} className="h-4 w-4" aria-hidden="true" />
                </Link>
              );
            }

            return (
              <div key={moduleKey} className="mb-0.5">
                <button
                  type="button"
                  onClick={() => toggle(moduleKey)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className={`mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-sm px-2 py-2 text-left text-sm font-medium hover:bg-bg-raised ${
                    isActiveModule ? "text-text-primary" : "text-text-secondary"
                  }`}
                >
                  <DynamicIcon name={meta.icon} className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1 truncate">{meta.label}</span>
                  <span className="text-xs tabular-nums text-text-muted">{tools.length}</span>
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                {isOpen && (
                  <ul id={panelId} className="mb-1 ml-5 border-l border-border-subtle pl-1">
                    <li>
                      <Link
                        href={`/category/${moduleKey}`}
                        onClick={closeMobile}
                        className="mx-2 block rounded-sm px-2 py-1 text-xs font-medium text-accent hover:underline"
                      >
                        View all {tools.length} tools
                      </Link>
                    </li>
                    {tools.map((tool) => {
                      const href = `/tools/${tool.slug}`;
                      const isActive = pathname === href;
                      return (
                        <li key={tool.slug}>
                          <Link
                            href={href}
                            onClick={closeMobile}
                            aria-current={isActive ? "page" : undefined}
                            className={`mx-2 block truncate rounded-sm px-2 py-1.5 text-sm ${
                              isActive ? "bg-accent text-accent-foreground" : "text-text-secondary hover:bg-bg-raised hover:text-text-primary"
                            }`}
                          >
                            {tool.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          className="hidden items-center justify-center gap-2 border-t border-border-subtle px-3 py-2 text-xs text-text-muted hover:bg-bg-raised hover:text-text-primary lg:flex"
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" /> Collapse
            </>
          )}
        </button>
      </aside>
    </>
  );
}

export const totalToolCount = toolRegistry.length;
