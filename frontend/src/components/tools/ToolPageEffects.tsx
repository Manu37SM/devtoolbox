"use client";

import { useEffect } from "react";
import { recordToolVisit } from "@/lib/db";
import { FavoriteButton } from "@/components/tools/FavoriteButton";

export function ToolPageEffects({ toolSlug }: { toolSlug: string }) {
  useEffect(() => {
    recordToolVisit(toolSlug);
  }, [toolSlug]);

  return <FavoriteButton toolSlug={toolSlug} />;
}
