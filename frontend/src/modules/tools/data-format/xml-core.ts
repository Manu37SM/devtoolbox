// Hand-rolled XML parser/serializer shared by JSON<->XML and the XML
// Formatter/Validator tool (CLAUDE.md "extract shared sub-problem" rule).
// Convention (matches the common fast-xml-parser-style shape so it reads
// naturally to anyone who's used a JS XML<->JSON library before):
//   - Attributes become keys prefixed with "@_"
//   - Text content becomes "#text" when siblings (attributes/children) exist
//   - Repeated sibling tags become arrays

export interface XmlElement {
  tag: string;
  attributes: Record<string, string>;
  children: XmlNode[];
}
export type XmlNode = XmlElement | { text: string };

export function parseXml(input: string): XmlElement {
  const withoutProlog = input.replace(/<\?xml[^>]*\?>/, "").replace(/<!--[\s\S]*?-->/g, "");
  let pos = 0;

  function skipWhitespace() {
    while (pos < withoutProlog.length && /\s/.test(withoutProlog[pos]!)) pos++;
  }

  function parseElement(): XmlElement {
    skipWhitespace();
    if (withoutProlog[pos] !== "<") throw new Error(`Expected "<" at position ${pos}`);
    pos++;

    const tagMatch = /^[^\s/>]+/.exec(withoutProlog.slice(pos));
    if (!tagMatch) throw new Error(`Malformed tag at position ${pos}`);
    const tag = tagMatch[0];
    pos += tag.length;

    const attributes: Record<string, string> = {};
    while (true) {
      skipWhitespace();
      if (withoutProlog.slice(pos, pos + 2) === "/>") {
        pos += 2;
        return { tag, attributes, children: [] };
      }
      if (withoutProlog[pos] === ">") {
        pos++;
        break;
      }
      const attrMatch = /^([^\s=/>]+)\s*=\s*"([^"]*)"|^([^\s=/>]+)\s*=\s*'([^']*)'/.exec(withoutProlog.slice(pos));
      if (!attrMatch) throw new Error(`Malformed attribute near position ${pos}`);
      const name = attrMatch[1] ?? attrMatch[3]!;
      const value = attrMatch[2] ?? attrMatch[4] ?? "";
      attributes[name] = decodeXmlEntities(value);
      pos += attrMatch[0].length;
    }

    const children: XmlNode[] = [];
    while (true) {
      const closeTag = `</${tag}>`;
      if (withoutProlog.slice(pos, pos + closeTag.length) === closeTag) {
        pos += closeTag.length;
        break;
      }
      if (pos >= withoutProlog.length) throw new Error(`Unclosed tag <${tag}>`);

      if (withoutProlog.slice(pos, pos + 9) === "<![CDATA[") {
        const end = withoutProlog.indexOf("]]>", pos);
        if (end === -1) throw new Error("Unterminated CDATA section");
        children.push({ text: withoutProlog.slice(pos + 9, end) });
        pos = end + 3;
        continue;
      }

      if (withoutProlog[pos] === "<") {
        children.push(parseElement());
      } else {
        const nextTag = withoutProlog.indexOf("<", pos);
        const rawText = withoutProlog.slice(pos, nextTag === -1 ? undefined : nextTag);
        pos = nextTag === -1 ? withoutProlog.length : nextTag;
        if (rawText.trim().length > 0) children.push({ text: decodeXmlEntities(rawText) });
      }
    }

    return { tag, attributes, children };
  }

  const root = parseElement();
  skipWhitespace();
  return root;
}

export function serializeXml(element: XmlElement, indent: number, depth = 0): string {
  const pad = " ".repeat(indent * depth);
  const attrs = Object.entries(element.attributes)
    .map(([k, v]) => ` ${k}="${encodeXmlEntities(v)}"`)
    .join("");

  if (element.children.length === 0) {
    return `${pad}<${element.tag}${attrs} />`;
  }

  const onlyText = element.children.length === 1 && "text" in element.children[0]!;
  if (onlyText) {
    const text = (element.children[0] as { text: string }).text;
    return `${pad}<${element.tag}${attrs}>${encodeXmlEntities(text)}</${element.tag}>`;
  }

  const childLines = element.children
    .map((child) =>
      "tag" in child ? serializeXml(child, indent, depth + 1) : `${" ".repeat(indent * (depth + 1))}${encodeXmlEntities(child.text)}`,
    )
    .join("\n");

  return `${pad}<${element.tag}${attrs}>\n${childLines}\n${pad}</${element.tag}>`;
}

export function xmlToJsonValue(element: XmlElement): unknown {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(element.attributes)) {
    result[`@_${key}`] = value;
  }

  const textChildren = element.children.filter((c): c is { text: string } => "text" in c);
  const elementChildren = element.children.filter((c): c is XmlElement => "tag" in c);

  if (elementChildren.length === 0 && textChildren.length === 0 && Object.keys(result).length === 0) {
    return "";
  }

  if (elementChildren.length === 0 && textChildren.length > 0) {
    const text = textChildren.map((t) => t.text).join("");
    if (Object.keys(result).length === 0) return text;
    result["#text"] = text;
    return result;
  }

  const grouped = new Map<string, unknown[]>();
  for (const child of elementChildren) {
    const value = xmlToJsonValue(child);
    const list = grouped.get(child.tag) ?? [];
    list.push(value);
    grouped.set(child.tag, list);
  }
  for (const [tag, values] of grouped) {
    result[tag] = values.length === 1 ? values[0] : values;
  }

  return result;
}

export function jsonValueToXml(tag: string, value: unknown): XmlElement {
  const attributes: Record<string, string> = {};
  const children: XmlNode[] = [];

  if (value === null || value === undefined) {
    return { tag, attributes, children: [] };
  }

  if (typeof value !== "object") {
    return { tag, attributes, children: [{ text: String(value) }] };
  }

  if (Array.isArray(value)) {
    // Arrays at this level shouldn't happen (handled by the caller), but
    // fall back to joining as repeated text nodes defensively.
    return { tag, attributes, children: value.map((v) => ({ text: String(v) })) };
  }

  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (key.startsWith("@_")) {
      attributes[key.slice(2)] = String(v);
    } else if (key === "#text") {
      children.push({ text: String(v) });
    } else if (Array.isArray(v)) {
      for (const item of v) children.push(jsonValueToXml(key, item));
    } else {
      children.push(jsonValueToXml(key, v));
    }
  }

  return { tag, attributes, children };
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function encodeXmlEntities(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
