import type { HtmlJsxOptions } from "./schema";

export interface HtmlJsxResult {
  output: string;
  error: { message: string } | null;
}

const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const ATTR_NAME_MAP: Record<string, string> = {
  class: "className",
  for: "htmlFor",
  readonly: "readOnly",
  autofocus: "autoFocus",
  autocomplete: "autoComplete",
  autoplay: "autoPlay",
  contenteditable: "contentEditable",
  crossorigin: "crossOrigin",
  novalidate: "noValidate",
  formnovalidate: "formNoValidate",
  frameborder: "frameBorder",
  maxlength: "maxLength",
  minlength: "minLength",
  spellcheck: "spellCheck",
  tabindex: "tabIndex",
  usemap: "useMap",
  colspan: "colSpan",
  rowspan: "rowSpan",
  srcdoc: "srcDoc",
  srcset: "srcSet",
  enctype: "encType",
  accesskey: "accessKey",
  allowfullscreen: "allowFullScreen",
  cellpadding: "cellPadding",
  cellspacing: "cellSpacing",
};

function kebabToCamel(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
}

function mapAttrName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.startsWith("data-") || lower.startsWith("aria-")) return lower;
  if (ATTR_NAME_MAP[lower]) return ATTR_NAME_MAP[lower]!;
  if (lower.includes("-")) return kebabToCamel(lower);
  return name;
}

function styleAttrToJsx(styleValue: string): string {
  const declarations = styleValue
    .split(";")
    .map((d) => d.trim())
    .filter((d) => d.length > 0);

  const props = declarations
    .map((decl) => {
      const idx = decl.indexOf(":");
      if (idx === -1) return null;
      const prop = decl.slice(0, idx).trim();
      const value = decl.slice(idx + 1).trim();
      const jsProp = prop.startsWith("--") ? prop : kebabToCamel(prop.toLowerCase());
      const key = /^[a-zA-Z_$][\w$]*$/.test(jsProp) ? jsProp : `'${jsProp}'`;
      const quotedValue = `'${value.replace(/'/g, "\\'")}'`;
      return `${key}: ${quotedValue}`;
    })
    .filter((p): p is string => p !== null);

  return `{{ ${props.join(", ")} }}`;
}

const ATTR_TOKEN_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function convertAttributes(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return "";

  const parts: string[] = [];
  let match: RegExpExecArray | null;
  ATTR_TOKEN_RE.lastIndex = 0;
  while ((match = ATTR_TOKEN_RE.exec(trimmed)) !== null) {
    const rawName = match[1]!;
    const doubleQuoted = match[2];
    const singleQuoted = match[3];
    const unquoted = match[4];
    const hasValue = doubleQuoted !== undefined || singleQuoted !== undefined || unquoted !== undefined;
    const lowerName = rawName.toLowerCase();

    if (!hasValue) {

      parts.push(mapAttrName(rawName));
      continue;
    }

    const value = doubleQuoted ?? singleQuoted ?? unquoted ?? "";
    const jsxName = mapAttrName(rawName);

    if (lowerName === "style") {
      parts.push(`style=${styleAttrToJsx(value)}`);
      continue;
    }

    const escaped = value.replace(/"/g, "&quot;");
    parts.push(`${jsxName}="${escaped}"`);
  }

  return parts.length > 0 ? " " + parts.join(" ") : "";
}

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^"'<>])*)>/g;
const COMMENT_RE = /<!--([\s\S]*?)-->/g;

export function htmlToJsx(html: string, options: HtmlJsxOptions): HtmlJsxResult {
  if (html.trim().length === 0) {
    return { output: "", error: null };
  }

  try {
    const withoutComments = html.replace(COMMENT_RE, (_m, content: string) => `{/*${content}*/}`);

    const output = withoutComments.replace(TAG_RE, (_full, closing: string, tagName: string, rest: string) => {
      const isClosing = closing === "/";
      let attrPart = rest;
      let alreadySelfClosed = false;
      if (attrPart.trim().endsWith("/")) {
        alreadySelfClosed = true;
        attrPart = attrPart.trim().slice(0, -1);
      }

      const isVoid = VOID_ELEMENTS.has(tagName.toLowerCase());

      if (isClosing) {

        if (isVoid && options.selfClosingVoidElements) return "";
        return `</${tagName}>`;
      }

      const attrsJsx = convertAttributes(attrPart);
      const shouldSelfClose = alreadySelfClosed || (isVoid && options.selfClosingVoidElements);

      return `<${tagName}${attrsJsx}${shouldSelfClose ? " />" : ">"}`;
    });

    return { output, error: null };
  } catch (err) {
    return {
      output: "",
      error: { message: err instanceof Error ? err.message : "Failed to convert HTML to JSX." },
    };
  }
}
