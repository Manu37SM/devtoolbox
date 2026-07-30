import { generateUuids } from "../../security/uuid-generator/transform";
import type { UuidBulkOptions } from "./schema";

/** Thin wrapper around the Module 3 UUID engine (CLAUDE.md "reuse existing
 * shared code" rule) that adds bulk export formatting. */
export function generateUuidBulk(options: UuidBulkOptions): string {
  const uuids = generateUuids({
    version: options.version,
    count: options.count,
    uppercase: false,
    hyphens: true,
  });

  switch (options.format) {
    case "json-array":
      return JSON.stringify(uuids, null, 2);
    case "csv":
      return ["id", ...uuids].join("\n");
    case "newline":
    default:
      return uuids.join("\n");
  }
}
