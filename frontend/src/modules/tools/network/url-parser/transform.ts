import type { UrlParserOptions } from "./schema";

/** One parsed query-string parameter. Kept as an ordered array (not an
 * object) since a query string can legally repeat the same key more than
 * once (`?tag=a&tag=b`) and an object would silently drop the duplicate. */
export interface UrlQueryParam {
  key: string;
  value: string;
}

export interface UrlParseResult {
  protocol: string;
  username: string;
  password: string;
  hostname: string;
  port: string;
  origin: string;
  pathname: string;
  search: string;
  hash: string;
  queryParams: UrlQueryParam[];
  error: string | null;
}

const EMPTY_RESULT: Omit<UrlParseResult, "error"> = {
  protocol: "",
  username: "",
  password: "",
  hostname: "",
  port: "",
  origin: "",
  pathname: "",
  search: "",
  hash: "",
  queryParams: [],
};

/** Parses a URL into its structural parts using the browser/Node-native
 * `URL` class (no hand-rolled URL grammar — that class already implements
 * the WHATWG URL Standard correctly, including edge cases like IDN hosts
 * and IPv6 literals). If a bare relative-looking string is given without a
 * scheme, `https://` is assumed so users can paste `example.com/path` and
 * still get a useful breakdown rather than an immediate error. */
export function parseUrl(input: string, options: UrlParserOptions): UrlParseResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { ...EMPTY_RESULT, error: null };

  const candidates = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? [trimmed] : [`https://${trimmed}`, trimmed];

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      const decode = (s: string) => {
        if (!options.decodeComponents) return s;
        try {
          return decodeURIComponent(s);
        } catch {
          return s;
        }
      };

      const queryParams: UrlQueryParam[] = [];
      url.searchParams.forEach((value, key) => {
        queryParams.push({ key, value });
      });

      return {
        protocol: url.protocol.replace(/:$/, ""),
        username: url.username,
        password: url.password,
        hostname: url.hostname,
        port: url.port,
        origin: url.origin,
        pathname: decode(url.pathname),
        search: url.search,
        hash: decode(url.hash.replace(/^#/, "")),
        queryParams,
        error: null,
      };
    } catch {
      // try the next candidate (e.g. the scheme-prefixed retry)
      continue;
    }
  }

  return { ...EMPTY_RESULT, error: "Not a valid URL." };
}
