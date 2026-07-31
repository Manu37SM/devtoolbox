"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { toolRegistry, getToolsByModule } from "@/lib/registry";
import { MODULE_META, MODULE_ORDER } from "@/lib/module-meta";
import { useNavStore } from "@/store/nav-store";

/** Persistent left nav (UI_GUIDELINES.md §3): 240px full width (~ `w-64`
 * in Tailwind's scale), collapsible to a 64px icon rail (`w-16`) on
 * desktop. Below `lg` (UI_GUIDELINES.md §7) it becomes a
 * hamburger-triggered drawer instead — the `collapsed` state only ever
 * applies at `lg`+ so the drawer is always shown at full width with
 * labels on mobile, regardless of the desktop collapse preference. One
 * component renders both cases so there's a single source of truth for
 * the tool list instead of two nav implementations to keep in sync. */
export function LeftNav() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed, isMobileOpen, closeMobile } = useNavStore();
  const modules = MODULE_ORDER.filter((m) => getToolsByModule(m).length > 0);

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={closeMobile} aria-hidden="true" />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-col border-r border-border-subtle bg-bg-base transition-transform lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-16" : "lg:w-64"}`}
        aria-label="Tool navigation"
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2 lg:hidden">
          <span className="text-sm font-semibold text-text-primary">Tools</span>
          <button onClick={closeMobile} aria-label="Close navigation" className="rounded-sm p-1 hover:bg-bg-raised">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2" aria-label="Tool modules">
          {modules.map((moduleKey) => {
            const meta = MODULE_META[moduleKey];
            const tools = getToolsByModule(moduleKey);
            return (
              <div key={moduleKey} className="mb-1">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted ${
                    collapsed ? "lg:justify-center" : ""
                  }`}
                  title={collapsed ? meta.label : undefined}
                >
                  <DynamicIcon name={meta.icon} className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className={collapsed ? "lg:hidden" : ""}>{meta.label}</span>
                </div>
                <ul>
                  {tools.map((tool) => {
                    const href = `/tools/${tool.slug}`;
                    const isActive = pathname === href;
                    return (
                      <li key={tool.slug}>
                        <Link
                          href={href}
                          title={collapsed ? tool.name : undefined}
                          onClick={closeMobile}
                          className={`mx-2 flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm ${
                            collapsed ? "lg:justify-center" : ""
                          } ${
                            isActive
                              ? "bg-accent text-accent-foreground"
                              : "text-text-secondary hover:bg-bg-raised hover:text-text-primary"
                          }`}
                        >
                          <DynamicIcon name={tool.icon} className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className={collapsed ? "lg:hidden" : ""}>{tool.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
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

// Total tool count exported for a lightweight sanity check other code
// (e.g. a future "N tools" footer) can rely on without recomputing.
export const totalToolCount = toolRegistry.length;
