import type { TransformResult } from "@/lib/tool-transform";
import type { WebAppManifestGeneratorOptions } from "./schema";

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function fields(input: string): Record<string, string> {
  const f: Record<string, string> = {};
  for (const l of input.split(/\r?\n/)) {
    const i = l.indexOf(":");
    if (i > 0 && !l.trim().startsWith("#")) f[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim();
  }
  return f;
}

export function generateManifest(input: string, o: WebAppManifestGeneratorOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const f = fields(input);
  const fail = (message: string): TransformResult => ({ output: "", error: { message } });
  if (!f.name) return fail("Add a name: line");
  const theme = f.theme_color ?? f.theme ?? "#ffffff", bg = f.background_color ?? f.background ?? "#ffffff";
  for (const [k, v] of [["theme_color", theme], ["background_color", bg]] as const) if (!HEX.test(v)) return fail(`${k} must be a hex colour like #1a73e8`);
  const start = f.start_url ?? "/";
  if (!/^(\/|https?:\/\/)/.test(start) && !start.startsWith("./")) return fail("start_url must be a path starting with / or a full URL");
  const iconPath = (f.icon_path ?? "/icons").replace(/\/$/, "");
  const short = f.short_name ?? f.name;
  const warnings: string[] = [];
  if (short.length > 12) warnings.push(`short_name is ${short.length} characters. Launchers truncate it around 12.`);

  const icons: Array<Record<string, string>> = [192, 512].map((s) => ({ src: `${iconPath}/icon-${s}.png`, sizes: `${s}x${s}`, type: "image/png", purpose: "any" }));
  if (o.maskableIcons) icons.push({ src: `${iconPath}/maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" });
  const manifest: Record<string, unknown> = {
    name: f.name, short_name: short,
    ...(f.description ? { description: f.description } : {}),
    id: f.id ?? start, start_url: start, scope: f.scope ?? "/", display: o.display,
    ...(o.orientation !== "any" ? { orientation: o.orientation } : {}),
    theme_color: theme, background_color: bg, lang: f.lang ?? "en", icons,
    ...(f.categories ? { categories: f.categories.split(/[,\s]+/).filter(Boolean) } : {}),
  };
  let out = JSON.stringify(manifest, null, 2) + "\n";
  if (o.includeHtml) {
    out += `\n<!-- in <head> -->\n<link rel="manifest" href="/manifest.webmanifest">\n<meta name="theme-color" content="${theme}">\n<link rel="apple-touch-icon" href="${iconPath}/icon-192.png">\n`;
    out += `\n# Serve with: Content-Type: application/manifest+json\n# Installability also needs HTTPS, a registered service worker with a fetch handler (on some browsers) and the 192px + 512px icons above.\n`;
  }
  if (warnings.length) out += warnings.map((w) => `# WARNING: ${w}\n`).join("");
  return { output: out, error: null };
}
