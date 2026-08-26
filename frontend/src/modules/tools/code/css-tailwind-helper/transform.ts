import type { TransformResult } from "@/lib/tool-transform";
import type { CssTailwindDirection } from "./schema";

const SPACING_SCALE: [string, number][] = [
  ["0", 0], ["px", 1], ["0.5", 2], ["1", 4], ["1.5", 6], ["2", 8], ["2.5", 10], ["3", 12], ["3.5", 14],
  ["4", 16], ["5", 20], ["6", 24], ["7", 28], ["8", 32], ["9", 36], ["10", 40], ["11", 44], ["12", 48],
  ["14", 56], ["16", 64], ["20", 80], ["24", 96], ["28", 112], ["32", 128], ["36", 144], ["40", 160],
  ["44", 176], ["48", 192], ["52", 208], ["56", 224], ["60", 240], ["64", 256], ["72", 288], ["80", 320],
  ["96", 384],
];

const FONT_SIZE_SCALE: [string, number][] = [
  ["xs", 12], ["sm", 14], ["base", 16], ["lg", 18], ["xl", 20], ["2xl", 24], ["3xl", 30],
  ["4xl", 36], ["5xl", 48], ["6xl", 60], ["7xl", 72], ["8xl", 96], ["9xl", 128],
];

const RADIUS_SCALE: [string, number][] = [
  ["none", 0], ["sm", 2], ["DEFAULT", 4], ["md", 6], ["lg", 8], ["xl", 12], ["2xl", 16], ["3xl", 24],
];

const FONT_WEIGHT_SCALE: [string, number][] = [
  ["thin", 100], ["extralight", 200], ["light", 300], ["normal", 400], ["medium", 500],
  ["semibold", 600], ["bold", 700], ["extrabold", 800], ["black", 900],
];

const COLOR_PALETTE: [string, string][] = [
  ["#000000", "black"],
  ["#ffffff", "white"],
  ["#ef4444", "red-500"],
  ["#dc2626", "red-600"],
  ["#f97316", "orange-500"],
  ["#eab308", "yellow-500"],
  ["#22c55e", "green-500"],
  ["#16a34a", "green-600"],
  ["#3b82f6", "blue-500"],
  ["#2563eb", "blue-600"],
  ["#6366f1", "indigo-500"],
  ["#8b5cf6", "violet-500"],
  ["#a855f7", "purple-500"],
  ["#ec4899", "pink-500"],
  ["#64748b", "slate-500"],
  ["#6b7280", "gray-500"],
];

const KEYWORD_PROPERTIES: Record<string, { prefix: string; map: Record<string, string> }> = {
  display: {
    prefix: "",
    map: {
      block: "block",
      inline: "inline",
      "inline-block": "inline-block",
      flex: "flex",
      "inline-flex": "inline-flex",
      grid: "grid",
      "inline-grid": "inline-grid",
      none: "hidden",
    },
  },
  position: {
    prefix: "",
    map: { static: "static", relative: "relative", absolute: "absolute", fixed: "fixed", sticky: "sticky" },
  },
  "text-align": {
    prefix: "text-",
    map: { left: "left", center: "center", right: "right", justify: "justify" },
  },
  "font-style": {
    prefix: "",
    map: { italic: "italic", normal: "not-italic" },
  },
  "text-transform": {
    prefix: "",
    map: { uppercase: "uppercase", lowercase: "lowercase", capitalize: "capitalize", none: "normal-case" },
  },
  "text-decoration": {
    prefix: "",
    map: { underline: "underline", "line-through": "line-through", none: "no-underline" },
  },
  "text-decoration-line": {
    prefix: "",
    map: { underline: "underline", "line-through": "line-through", none: "no-underline" },
  },
  overflow: {
    prefix: "overflow-",
    map: { hidden: "hidden", auto: "auto", scroll: "scroll", visible: "visible" },
  },
  cursor: {
    prefix: "cursor-",
    map: { pointer: "pointer", default: "default", "not-allowed": "not-allowed", wait: "wait", grab: "grab" },
  },
  "flex-direction": {
    prefix: "flex-",
    map: { row: "row", column: "col", "row-reverse": "row-reverse", "column-reverse": "col-reverse" },
  },
  "flex-wrap": {
    prefix: "flex-",
    map: { wrap: "wrap", nowrap: "nowrap", "wrap-reverse": "wrap-reverse" },
  },
  "align-items": {
    prefix: "items-",
    map: { center: "center", "flex-start": "start", "flex-end": "end", stretch: "stretch", baseline: "baseline" },
  },
  "justify-content": {
    prefix: "justify-",
    map: {
      center: "center",
      "flex-start": "start",
      "flex-end": "end",
      "space-between": "between",
      "space-around": "around",
      "space-evenly": "evenly",
    },
  },
};

const SPACING_PROPERTIES: Record<string, string> = {
  margin: "m",
  "margin-top": "mt",
  "margin-right": "mr",
  "margin-bottom": "mb",
  "margin-left": "ml",
  padding: "p",
  "padding-top": "pt",
  "padding-right": "pr",
  "padding-bottom": "pb",
  "padding-left": "pl",
  gap: "gap",
  width: "w",
  height: "h",
};

const WIDTH_HEIGHT_KEYWORDS: Record<string, string> = {
  auto: "auto",
  "100%": "full",
  "fit-content": "fit",
  "max-content": "max",
  "min-content": "min",
};

export function parseLengthToPx(value: string): number | null {
  const v = value.trim();
  if (v === "0") return 0;
  const rem = v.match(/^(-?[\d.]+)rem$/);
  if (rem) return parseFloat(rem[1]) * 16;
  const px = v.match(/^(-?[\d.]+)px$/);
  if (px) return parseFloat(px[1]);
  const em = v.match(/^(-?[\d.]+)em$/);
  if (em) return parseFloat(em[1]) * 16;
  return null;
}

function matchScale(scale: [string, number][], px: number): string | null {
  const found = scale.find(([, p]) => Math.abs(p - px) < 0.01);
  return found ? found[0] : null;
}

function radiusSuffixToClass(suffix: string): string {
  return suffix === "DEFAULT" ? "rounded" : `rounded-${suffix}`;
}

function hexToTailwindColor(hex: string): string | null {
  const normalized = hex.toLowerCase();
  const found = COLOR_PALETTE.find(([h]) => h === normalized);
  return found ? found[1] : null;
}

function declarationToTailwind(property: string, value: string): string | null {
  const prop = property.trim().toLowerCase();
  const val = value.trim();

  if (KEYWORD_PROPERTIES[prop]) {
    const { prefix, map } = KEYWORD_PROPERTIES[prop];
    const mapped = map[val.toLowerCase()];
    return mapped ? `${prefix}${mapped}` : null;
  }

  if (prop === "font-weight") {
    const numeric = Number(val);
    const bySuffix = Number.isFinite(numeric) ? FONT_WEIGHT_SCALE.find(([, n]) => n === numeric) : undefined;
    if (bySuffix) return `font-${bySuffix[0]}`;
    if (val.toLowerCase() === "bold") return "font-bold";
    if (val.toLowerCase() === "normal") return "font-normal";
    return Number.isFinite(numeric) ? `font-[${numeric}]` : null;
  }

  if (prop === "font-size") {
    const px = parseLengthToPx(val);
    if (px === null) return null;
    const suffix = matchScale(FONT_SIZE_SCALE, px);
    return suffix ? `text-${suffix}` : `text-[${val}]`;
  }

  if (prop === "border-radius") {
    if (val === "9999px" || val.toLowerCase() === "50%") return "rounded-full";
    const px = parseLengthToPx(val);
    if (px === null) return null;
    const suffix = matchScale(RADIUS_SCALE, px);
    return suffix ? radiusSuffixToClass(suffix) : `rounded-[${val}]`;
  }

  if (prop === "color" || prop === "background-color" || prop === "border-color") {
    const tailwindPrefix = prop === "color" ? "text" : prop === "background-color" ? "bg" : "border";
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val)) {
      const named = hexToTailwindColor(val);
      return named ? `${tailwindPrefix}-${named}` : `${tailwindPrefix}-[${val}]`;
    }
    return null;
  }

  if (SPACING_PROPERTIES[prop]) {
    const tailwindPrefix = SPACING_PROPERTIES[prop];
    if ((prop === "width" || prop === "height") && WIDTH_HEIGHT_KEYWORDS[val]) {
      return `${tailwindPrefix}-${WIDTH_HEIGHT_KEYWORDS[val]}`;
    }
    const px = parseLengthToPx(val);
    if (px === null) return null;
    const suffix = matchScale(SPACING_SCALE, px);
    return suffix ? `${tailwindPrefix}-${suffix}` : `${tailwindPrefix}-[${val}]`;
  }

  return null;
}

export function cssToTailwind(input: string): TransformResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { output: "", error: null };

  const body = trimmed.replace(/^[^{]*\{/, "").replace(/}\s*$/, "");
  const declarations = body
    .split(";")
    .map((d) => d.trim())
    .filter((d) => d.length > 0);

  if (declarations.length === 0) {
    return { output: "", error: { message: "No CSS declarations found (expected `property: value;` pairs)." } };
  }

  const classes: string[] = [];
  const unmapped: string[] = [];

  for (const decl of declarations) {
    const colonIndex = decl.indexOf(":");
    if (colonIndex === -1) {
      unmapped.push(decl);
      continue;
    }
    const property = decl.slice(0, colonIndex);
    const value = decl.slice(colonIndex + 1);
    const mapped = declarationToTailwind(property, value);
    if (mapped) {
      classes.push(mapped);
    } else {
      unmapped.push(decl);
    }
  }

  let output = classes.join(" ");
  if (unmapped.length > 0) {
    output += `${output ? "\n\n" : ""}/* No Tailwind mapping for: ${unmapped.join("; ")} */`;
  }

  return { output, error: null };
}

export function tailwindToCss(input: string): TransformResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { output: "", error: null };

  const classes = trimmed.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  const unmapped: string[] = [];

  for (const cls of classes) {
    const line = tailwindClassToCss(cls);
    if (line) {
      lines.push(line);
    } else {
      unmapped.push(cls);
    }
  }

  let output = lines.length > 0 ? `{\n${lines.map((l) => `  ${l}`).join("\n")}\n}` : "";
  if (unmapped.length > 0) {
    output += `${output ? "\n\n" : ""}/* No CSS mapping for: ${unmapped.join(", ")} */`;
  }

  return { output, error: null };
}

function tailwindClassToCss(cls: string): string | null {

  const arbitrary = cls.match(/^([a-zA-Z-]+)-\[(.+)\]$/);
  if (arbitrary) {
    const [, prefix, value] = arbitrary;
    const looksLikeColor = /^#|^rgb|^hsl/.test(value);

    if (prefix === "text") return `${looksLikeColor ? "color" : "font-size"}: ${value};`;
    if (prefix === "border") return `${looksLikeColor ? "border-color" : "border-width"}: ${value};`;
    const prop = arbitraryPrefixToProperty(prefix);
    return prop ? `${prop}: ${value};` : null;
  }

  for (const [prop, { prefix, map }] of Object.entries(KEYWORD_PROPERTIES)) {
    for (const [cssValue, suffix] of Object.entries(map)) {
      if (`${prefix}${suffix}` === cls) return `${prop}: ${cssValue};`;
    }
  }

  const fontWeight = FONT_WEIGHT_SCALE.find(([suffix]) => `font-${suffix}` === cls);
  if (fontWeight) return `font-weight: ${fontWeight[1]};`;

  const fontSize = FONT_SIZE_SCALE.find(([suffix]) => `text-${suffix}` === cls);
  if (fontSize) return `font-size: ${fontSize[1] / 16}rem;`;

  if (cls === "rounded-full") return "border-radius: 9999px;";
  const radius = RADIUS_SCALE.find(([suffix]) => radiusSuffixToClass(suffix) === cls);
  if (radius) return `border-radius: ${radius[1] / 16}rem;`;

  for (const [tailwindPrefix, cssProp] of [
    ["text", "color"],
    ["bg", "background-color"],
    ["border", "border-color"],
  ] as const) {
    const match = COLOR_PALETTE.find(([, name]) => `${tailwindPrefix}-${name}` === cls);
    if (match) return `${cssProp}: ${match[0]};`;
  }

  for (const [cssProp, tailwindPrefix] of Object.entries(SPACING_PROPERTIES)) {
    for (const [keyword, suffix] of Object.entries(WIDTH_HEIGHT_KEYWORDS)) {
      if (`${tailwindPrefix}-${suffix}` === cls) return `${cssProp}: ${keyword};`;
    }
    const spacing = SPACING_SCALE.find(([suffix]) => `${tailwindPrefix}-${suffix}` === cls);
    if (spacing) return `${cssProp}: ${spacing[1] / 16}rem;`;
  }

  return null;
}

function arbitraryPrefixToProperty(prefix: string): string | null {
  const direct: Record<string, string> = {
    w: "width",
    h: "height",
    m: "margin",
    mt: "margin-top",
    mr: "margin-right",
    mb: "margin-bottom",
    ml: "margin-left",
    p: "padding",
    pt: "padding-top",
    pr: "padding-right",
    pb: "padding-bottom",
    pl: "padding-left",
    gap: "gap",
    text: "color",
    bg: "background-color",
    border: "border-color",
    rounded: "border-radius",
    font: "font-weight",
  };
  return direct[prefix] ?? null;
}

export function convertCssTailwind(input: string, direction: CssTailwindDirection): TransformResult {
  return direction === "css-to-tailwind" ? cssToTailwind(input) : tailwindToCss(input);
}
