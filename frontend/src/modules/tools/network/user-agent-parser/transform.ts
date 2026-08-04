import { UAParser } from "ua-parser-js";

export interface UserAgentParsedResult {
  ua: string;
  browser: { name?: string; version?: string; major?: string; type?: string };
  cpu: { architecture?: string };
  device: { vendor?: string; model?: string; type?: string };
  engine: { name?: string; version?: string };
  os: { name?: string; version?: string };
}

export interface UserAgentParserResult {
  output: string;
  error: { message: string } | null;
}

/** Parses a User-Agent string into structured browser/OS/device/engine/CPU
 * info via ua-parser-js. Returns the raw structured object for UI table
 * rendering, keeping this function pure and DOM-free. */
export function parseUserAgentStructured(uaString: string): UserAgentParsedResult {
  const parser = new UAParser(uaString);
  const result = parser.getResult();
  return {
    ua: result.ua ?? uaString,
    browser: { ...result.browser },
    cpu: { ...result.cpu },
    device: { ...result.device },
    engine: { ...result.engine },
    os: { ...result.os },
  };
}

/** Parses a User-Agent string and returns pretty-printed JSON, following the
 * standard {output, error} tool contract. */
export function parseUserAgent(uaString: string): UserAgentParserResult {
  if (!uaString.trim()) {
    return { output: "", error: { message: "Enter a User-Agent string to parse." } };
  }
  try {
    const structured = parseUserAgentStructured(uaString);
    return { output: JSON.stringify(structured, null, 2), error: null };
  } catch {
    return { output: "", error: { message: "Could not parse the provided User-Agent string." } };
  }
}
