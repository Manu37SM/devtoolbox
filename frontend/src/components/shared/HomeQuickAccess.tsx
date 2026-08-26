"use client";

import { useFavoriteTools } from "@/hooks/useFavorites";
import { useRecentTools } from "@/hooks/useLocalHistory";
import { ToolCard } from "@/components/shared/ToolCard";

export function HomeQuickAccess() {
  const favorites = useFavoriteTools();
  const recent = useRecentTools(6);

  if (favorites.length === 0 && recent.length === 0) return null;

  return (
    <div className="mb-10 flex flex-col gap-8">
      {favorites.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Favorites
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </section>
      )}
      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Recently used
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
