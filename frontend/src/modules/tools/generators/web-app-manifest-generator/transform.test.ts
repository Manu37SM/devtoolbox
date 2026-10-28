import { describe, expect, it } from "vitest";
import { generateManifest } from "./transform";

const base = { display: "standalone" as const, orientation: "any" as const, maskableIcons: true, includeHtml: false };
const gen = (s: string, o = {}) => generateManifest(s, { ...base, ...o });

describe("generateManifest", () => {
  it("emits valid manifest JSON with sensible defaults", () => {
    const m = JSON.parse(gen("name: My App\nshort_name: App\ntheme_color: #1a73e8\ndescription: Does things").output);
    expect(m).toMatchObject({ name: "My App", short_name: "App", start_url: "/", id: "/", scope: "/", display: "standalone", theme_color: "#1a73e8", background_color: "#ffffff", lang: "en", description: "Does things" });
    expect(m.icons).toHaveLength(3);
    expect(m.icons[2]).toEqual({ src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" });
    expect("orientation" in m).toBe(false);
  });
  it("options and custom icon path", () => {
    const m = JSON.parse(gen("name: A\nicon_path: /img/\ncategories: productivity, utilities", { display: "fullscreen", orientation: "portrait", maskableIcons: false }).output);
    expect(m.display).toBe("fullscreen");
    expect(m.orientation).toBe("portrait");
    expect(m.icons.map((i: { src: string }) => i.src)).toEqual(["/img/icon-192.png", "/img/icon-512.png"]);
    expect(m.categories).toEqual(["productivity", "utilities"]);
  });
  it("html snippet and short_name warning", () => {
    const o = gen("name: A very long application name\ntheme_color: #000", { includeHtml: true }).output;
    expect(o).toContain('<link rel="manifest" href="/manifest.webmanifest">');
    expect(o).toContain('<meta name="theme-color" content="#000">');
    expect(o).toContain("# WARNING: short_name is 28 characters");
  });
  it("validation", () => {
    expect(gen("short_name: x").error?.message).toMatch(/name/);
    expect(gen("name: x\ntheme_color: blue").error?.message).toMatch(/hex/);
    expect(gen("name: x\nstart_url: home").error?.message).toMatch(/start_url/);
    expect(gen("")).toEqual({ output: "", error: null });
  });
});
