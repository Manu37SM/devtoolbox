import type { HtmlEntityOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

const NAMED_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Named references from the HTML spec: the basic five, Latin-1 and common typographic/symbol entities. */
const ENTITY_CODEPOINTS: Record<string, number> = {
  amp: 0x26,
  lt: 0x3c,
  gt: 0x3e,
  quot: 0x22,
  apos: 0x27,
  nbsp: 0xa0,
  iexcl: 0xa1,
  cent: 0xa2,
  pound: 0xa3,
  curren: 0xa4,
  yen: 0xa5,
  brvbar: 0xa6,
  sect: 0xa7,
  uml: 0xa8,
  copy: 0xa9,
  ordf: 0xaa,
  laquo: 0xab,
  not: 0xac,
  shy: 0xad,
  reg: 0xae,
  macr: 0xaf,
  deg: 0xb0,
  plusmn: 0xb1,
  sup2: 0xb2,
  sup3: 0xb3,
  acute: 0xb4,
  micro: 0xb5,
  para: 0xb6,
  middot: 0xb7,
  cedil: 0xb8,
  sup1: 0xb9,
  ordm: 0xba,
  raquo: 0xbb,
  frac14: 0xbc,
  frac12: 0xbd,
  frac34: 0xbe,
  iquest: 0xbf,
  Agrave: 0xc0,
  Aacute: 0xc1,
  Acirc: 0xc2,
  Atilde: 0xc3,
  Auml: 0xc4,
  Aring: 0xc5,
  AElig: 0xc6,
  Ccedil: 0xc7,
  Egrave: 0xc8,
  Eacute: 0xc9,
  Ecirc: 0xca,
  Euml: 0xcb,
  Igrave: 0xcc,
  Iacute: 0xcd,
  Icirc: 0xce,
  Iuml: 0xcf,
  ETH: 0xd0,
  Ntilde: 0xd1,
  Ograve: 0xd2,
  Oacute: 0xd3,
  Ocirc: 0xd4,
  Otilde: 0xd5,
  Ouml: 0xd6,
  times: 0xd7,
  Oslash: 0xd8,
  Ugrave: 0xd9,
  Uacute: 0xda,
  Ucirc: 0xdb,
  Uuml: 0xdc,
  Yacute: 0xdd,
  THORN: 0xde,
  szlig: 0xdf,
  agrave: 0xe0,
  aacute: 0xe1,
  acirc: 0xe2,
  atilde: 0xe3,
  auml: 0xe4,
  aring: 0xe5,
  aelig: 0xe6,
  ccedil: 0xe7,
  egrave: 0xe8,
  eacute: 0xe9,
  ecirc: 0xea,
  euml: 0xeb,
  igrave: 0xec,
  iacute: 0xed,
  icirc: 0xee,
  iuml: 0xef,
  eth: 0xf0,
  ntilde: 0xf1,
  ograve: 0xf2,
  oacute: 0xf3,
  ocirc: 0xf4,
  otilde: 0xf5,
  ouml: 0xf6,
  divide: 0xf7,
  oslash: 0xf8,
  ugrave: 0xf9,
  uacute: 0xfa,
  ucirc: 0xfb,
  uuml: 0xfc,
  yacute: 0xfd,
  thorn: 0xfe,
  yuml: 0xff,
  OElig: 0x152,
  oelig: 0x153,
  Scaron: 0x160,
  scaron: 0x161,
  Yuml: 0x178,
  fnof: 0x192,
  circ: 0x2c6,
  tilde: 0x2dc,
  Alpha: 0x391,
  Beta: 0x392,
  Gamma: 0x393,
  Delta: 0x394,
  Epsilon: 0x395,
  Theta: 0x398,
  Lambda: 0x39b,
  Pi: 0x3a0,
  Sigma: 0x3a3,
  Phi: 0x3a6,
  Psi: 0x3a8,
  Omega: 0x3a9,
  alpha: 0x3b1,
  beta: 0x3b2,
  gamma: 0x3b3,
  delta: 0x3b4,
  epsilon: 0x3b5,
  theta: 0x3b8,
  lambda: 0x3bb,
  mu: 0x3bc,
  pi: 0x3c0,
  sigma: 0x3c3,
  phi: 0x3c6,
  psi: 0x3c8,
  omega: 0x3c9,
  ensp: 0x2002,
  emsp: 0x2003,
  thinsp: 0x2009,
  zwnj: 0x200c,
  zwj: 0x200d,
  lrm: 0x200e,
  rlm: 0x200f,
  ndash: 0x2013,
  mdash: 0x2014,
  lsquo: 0x2018,
  rsquo: 0x2019,
  sbquo: 0x201a,
  ldquo: 0x201c,
  rdquo: 0x201d,
  bdquo: 0x201e,
  dagger: 0x2020,
  Dagger: 0x2021,
  bull: 0x2022,
  hellip: 0x2026,
  permil: 0x2030,
  prime: 0x2032,
  Prime: 0x2033,
  lsaquo: 0x2039,
  rsaquo: 0x203a,
  oline: 0x203e,
  frasl: 0x2044,
  euro: 0x20ac,
  image: 0x2111,
  weierp: 0x2118,
  real: 0x211c,
  trade: 0x2122,
  alefsym: 0x2135,
  larr: 0x2190,
  uarr: 0x2191,
  rarr: 0x2192,
  darr: 0x2193,
  harr: 0x2194,
  crarr: 0x21b5,
  lArr: 0x21d0,
  uArr: 0x21d1,
  rArr: 0x21d2,
  dArr: 0x21d3,
  hArr: 0x21d4,
  forall: 0x2200,
  part: 0x2202,
  exist: 0x2203,
  empty: 0x2205,
  nabla: 0x2207,
  isin: 0x2208,
  notin: 0x2209,
  ni: 0x220b,
  prod: 0x220f,
  sum: 0x2211,
  minus: 0x2212,
  lowast: 0x2217,
  radic: 0x221a,
  prop: 0x221d,
  infin: 0x221e,
  ang: 0x2220,
  and: 0x2227,
  or: 0x2228,
  cap: 0x2229,
  cup: 0x222a,
  int: 0x222b,
  there4: 0x2234,
  sim: 0x223c,
  cong: 0x2245,
  asymp: 0x2248,
  ne: 0x2260,
  equiv: 0x2261,
  le: 0x2264,
  ge: 0x2265,
  sub: 0x2282,
  sup: 0x2283,
  nsub: 0x2284,
  sube: 0x2286,
  supe: 0x2287,
  oplus: 0x2295,
  otimes: 0x2297,
  perp: 0x22a5,
  sdot: 0x22c5,
  lceil: 0x2308,
  rceil: 0x2309,
  lfloor: 0x230a,
  rfloor: 0x230b,
  lang: 0x2329,
  rang: 0x232a,
  loz: 0x25ca,
  spades: 0x2660,
  clubs: 0x2663,
  hearts: 0x2665,
  diams: 0x2666,
};

const NAMED_DECODE: Record<string, string> = Object.fromEntries(
  Object.entries(ENTITY_CODEPOINTS).map(([name, cp]) => [name, String.fromCodePoint(cp)]),
);

const NAME_FOR_CHAR: Record<string, string> = Object.fromEntries(
  Object.entries(ENTITY_CODEPOINTS)
    .filter(([name]) => name !== "apos")
    .map(([name, cp]) => [String.fromCodePoint(cp), name]),
);

export function transformHtmlEntity(input: string, options: HtmlEntityOptions): TransformResult {
  if (input.length === 0) return { output: "", error: null };

  if (options.mode === "encode") {
    return { output: encode(input, options), error: null };
  }

  try {
    return { output: decode(input), error: null };
  } catch (err) {
    return {
      output: "",
      error: { message: err instanceof Error ? err.message : "Invalid HTML entity" },
    };
  }
}

function reference(char: string, style: HtmlEntityOptions["entityStyle"]): string {
  const cp = char.codePointAt(0)!;
  const name = NAME_FOR_CHAR[char];
  if (style === "named" && name) return `&${name};`;
  if (style === "hex") return `&#x${cp.toString(16).toUpperCase()};`;
  return `&#${cp};`;
}

function encode(input: string, options: HtmlEntityOptions): string {
  const style = options.entityStyle ?? "basic";
  let output = "";
  for (const char of input) {
    if (char === "&" || char === "<" || char === ">") {
      output += style === "named" || style === "basic" ? NAMED_ENTITIES[char] : reference(char, style);
    } else if (char === '"' || char === "'") {
      output += options.escapeQuotes === false ? char : style === "named" || style === "basic" ? NAMED_ENTITIES[char] : reference(char, style);
    } else if (options.encodeAllNonAscii && char.codePointAt(0)! > 127) {
      output += reference(char, style);
    } else {
      output += char;
    }
  }
  return output;
}

function decode(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, ref: string) => {
    if (ref.startsWith("#x") || ref.startsWith("#X")) {
      return String.fromCodePoint(parseInt(ref.slice(2), 16));
    }
    if (ref.startsWith("#")) {
      return String.fromCodePoint(parseInt(ref.slice(1), 10));
    }
    return NAMED_DECODE[ref] ?? match;
  });
}
