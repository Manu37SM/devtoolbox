// Bundles the extension's TypeScript sources into dist/ and copies static
// assets (manifest.json, popup.html) alongside them. Plain esbuild script
// rather than a bundler config file — this package has exactly three entry
// points and no framework, so a config-driven build would be more ceremony
// than the problem needs.
import { build } from "esbuild";
import { cpSync, mkdirSync } from "node:fs";

const entryPoints = ["src/background.ts", "src/popup.ts"];

mkdirSync("dist", { recursive: true });

await build({
  entryPoints,
  outdir: "dist",
  bundle: true,
  format: "iife",
  target: "chrome110",
  platform: "browser",
  sourcemap: true,
  logLevel: "info",
});

cpSync("manifest.json", "dist/manifest.json");
cpSync("src/popup.html", "dist/popup.html");

console.log("Extension build complete → dist/");
