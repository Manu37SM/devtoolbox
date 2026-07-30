"use client";

import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavoriteSlugs, toggleFavorite } from "@/hooks/useFavorites";

export function FavoriteButton({ toolSlug }: { toolSlug: string }) {
  const favorites = useFavoriteSlugs();
  const isFavorite = favorites.has(toolSlug);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={isFavorite}
      onClick={() => toggleFavorite(toolSlug)}
    >
      <Star className={isFavorite ? "h-4 w-4 fill-accent text-accent" : "h-4 w-4 text-text-muted"} />
    </Button>
  );
}
