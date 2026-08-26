import type { UrlParserOptions } from "./schema";

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

      continue;
    }
  }

  return { ...EMPTY_RESULT, error: "Not a valid URL." };
}
