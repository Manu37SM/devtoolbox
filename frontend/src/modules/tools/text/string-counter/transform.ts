import type { StringCounterOptions } from "./schema";

export interface SmsInfo {
  /** GSM-7 fits the basic SMS alphabet; anything else forces UCS-2 (UTF-16). */
  encoding: "GSM-7" | "UCS-2";
  segments: number;
  /** Characters per segment for this message (160/153 for GSM-7, 70/67 for UCS-2). */
  perSegment: number;
}

export interface LimitInfo {
  name: string;
  max: number;
  used: number;
  remaining: number;
}

export interface StringStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  lines: number;
  sentences: number;
  paragraphs: number;
  bytesUtf8: number;
  readingTimeMinutes: number;
  /** User-perceived characters (emoji sequences and accents count once). */
  graphemes?: number;
  /** JavaScript/Java String.length (UTF-16 code units). */
  utf16Units?: number;
  bytesUtf16?: number;
  uniqueWords?: number;
  longestLine?: number;
  speakingTimeMinutes?: number;
  sms?: SmsInfo;
  limit?: LimitInfo | null;
}

const SPEAKING_WPM = 130;

// GSM 03.38 basic set and the extension table (extension characters take two septets).
const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€\f";

export function smsInfo(text: string): SmsInfo {
  let septets = 0;
  let gsm = true;
  for (const ch of text) {
    if (GSM_BASIC.includes(ch)) septets += 1;
    else if (GSM_EXT.includes(ch)) septets += 2;
    else {
      gsm = false;
      break;
    }
  }
  if (gsm) {
    const single = septets <= 160;
    return { encoding: "GSM-7", segments: septets === 0 ? 0 : single ? 1 : Math.ceil(septets / 153), perSegment: single ? 160 : 153 };
  }
  const units = text.length;
  const single = units <= 70;
  return { encoding: "UCS-2", segments: single ? 1 : Math.ceil(units / 67), perSegment: single ? 70 : 67 };
}

const LIMITS: Record<Exclude<StringCounterOptions["limit"], "none" | "custom">, [string, number]> = {
  tweet: ["Post on X (280)", 280],
  sms: ["Single SMS (160)", 160],
  metaTitle: ["SEO title (60)", 60],
  metaDescription: ["Meta description (160)", 160],
};

function graphemeCount(input: string): number {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    let n = 0;
    for (const _ of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(input)) n++;
    return n;
  }
  return [...input].length;
}

function wordList(input: string, mode: StringCounterOptions["wordMode"]): string[] {
  if (mode === "locale" && typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const out: string[] = [];
    for (const s of new Intl.Segmenter(undefined, { granularity: "word" }).segment(input)) if (s.isWordLike) out.push(s.segment);
    return out;
  }
  return input.match(/\S+/g) ?? [];
}

export function analyzeText(input: string, options: Partial<StringCounterOptions> = {}): StringStats {
  if (input.length === 0) {
    return {
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      lines: 0,
      sentences: 0,
      paragraphs: 0,
      bytesUtf8: 0,
      readingTimeMinutes: 0,
    };
  }
  const mode = options.charMode ?? "codepoints";
  const graphemes = graphemeCount(input);
  const count = (s: string) => (mode === "graphemes" ? graphemeCount(s) : mode === "utf16" ? s.length : [...s].length);

  const characters = count(input);
  const charactersNoSpaces = count(input.replace(/\s/g, ""));
  const wl = wordList(input, options.wordMode ?? "whitespace");
  const words = wl.length;
  const lineList = input.split(/\r\n|\r|\n/);
  const sentences = (input.match(/[^.!?]+[.!?]+/g) ?? (input.trim() ? [input] : [])).length;
  const paragraphs = input
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean).length;
  const bytesUtf8 = new TextEncoder().encode(input).length;
  const readingTimeMinutes = words / (options.wpm ?? 200);
  const uniqueWords = new Set(wl.map((w) => w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")).filter(Boolean)).size;

  let limit: LimitInfo | null = null;
  const l = options.limit ?? "none";
  if (l !== "none") {
    const [name, max] = l === "custom" ? ["Custom limit", options.customLimit ?? 500] : LIMITS[l];
    // X counts every code point (a few emoji ranges count double, which this ignores); others use the chosen mode.
    const used = l === "sms" ? smsUnits(input) : characters;
    limit = { name, max, used, remaining: max - used };
  }

  return {
    characters,
    charactersNoSpaces,
    words,
    lines: lineList.length,
    sentences,
    paragraphs,
    bytesUtf8,
    readingTimeMinutes,
    graphemes,
    utf16Units: input.length,
    bytesUtf16: input.length * 2,
    uniqueWords,
    longestLine: Math.max(...lineList.map((x) => count(x))),
    speakingTimeMinutes: words / SPEAKING_WPM,
    sms: smsInfo(input),
    limit,
  };
}

/** Length as an SMS sees it: GSM septets, or UTF-16 units once any non-GSM character appears. */
function smsUnits(text: string): number {
  const info = smsInfo(text);
  if (info.encoding === "UCS-2") return text.length;
  let n = 0;
  for (const ch of text) n += GSM_EXT.includes(ch) ? 2 : 1;
  return n;
}
