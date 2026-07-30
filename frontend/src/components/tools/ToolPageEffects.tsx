"use client";

import { useEffect } from "react";
import { recordToolVisit } from "@/lib/db";
import { FavoriteButton } from "@/components/tools/FavoriteButton";

/** Client-only slice of ToolShell: records the visit to local history
 * (IndexedDB) on mount and renders the favorite/pin toggle. Split out from
 * ToolShell.tsx so the shell itself can stay a plain server component. */
export function ToolPageEffects({ toolSlug }: { toolSlug: string }) {
  useEffect(() => {
    recordToolVisit(toolSlug);
  }, [toolSlug]);

  return <FavoriteButton toolSlug={toolSlug} />;
}
