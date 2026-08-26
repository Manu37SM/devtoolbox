

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
