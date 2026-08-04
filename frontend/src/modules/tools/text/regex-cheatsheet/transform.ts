export interface RegexPatternEntry {
  pattern: string;
  description: string;
  example?: string;
  category: string;
}

/** Static reference data for common regular expression syntax, grouped by
 * category (anchors, character classes, quantifiers, groups, lookarounds,
 * flags). */
export const REGEX_PATTERNS: RegexPatternEntry[] = [
  { pattern: "^", description: "Start of string (or line, with the m flag).", example: "^Hello", category: "Anchors" },
  { pattern: "$", description: "End of string (or line, with the m flag).", example: "world$", category: "Anchors" },
  { pattern: "\\b", description: "Word boundary.", example: "\\bcat\\b", category: "Anchors" },
  { pattern: "\\B", description: "Not a word boundary.", example: "\\Bcat\\B", category: "Anchors" },
  { pattern: ".", description: "Any character except line breaks.", example: "a.c", category: "Character classes" },
  { pattern: "\\d", description: "Digit character (0-9).", example: "\\d{3}", category: "Character classes" },
  { pattern: "\\D", description: "Non-digit character.", example: "\\D+", category: "Character classes" },
  { pattern: "\\w", description: "Word character (letters, digits, underscore).", example: "\\w+", category: "Character classes" },
  { pattern: "\\W", description: "Non-word character.", example: "\\W", category: "Character classes" },
  { pattern: "\\s", description: "Whitespace character (space, tab, newline).", example: "\\s+", category: "Character classes" },
  { pattern: "\\S", description: "Non-whitespace character.", example: "\\S+", category: "Character classes" },
  { pattern: "[abc]", description: "Character class: matches a, b, or c.", example: "[aeiou]", category: "Character classes" },
  { pattern: "[^abc]", description: "Negated character class: matches anything except a, b, or c.", example: "[^0-9]", category: "Character classes" },
  { pattern: "[a-z]", description: "Character range: matches any character from a to z.", example: "[a-zA-Z]", category: "Character classes" },
  { pattern: "*", description: "Zero or more of the preceding token.", example: "ab*", category: "Quantifiers" },
  { pattern: "+", description: "One or more of the preceding token.", example: "ab+", category: "Quantifiers" },
  { pattern: "?", description: "Zero or one of the preceding token (optional).", example: "colou?r", category: "Quantifiers" },
  { pattern: "{n}", description: "Exactly n occurrences of the preceding token.", example: "\\d{4}", category: "Quantifiers" },
  { pattern: "{n,m}", description: "Between n and m occurrences (inclusive) of the preceding token.", example: "\\d{2,4}", category: "Quantifiers" },
  { pattern: "{n,}", description: "n or more occurrences of the preceding token.", example: "\\d{2,}", category: "Quantifiers" },
  { pattern: ".*?", description: "Non-greedy (lazy) match: as few characters as possible.", example: "<.*?>", category: "Quantifiers" },
  { pattern: "(...)", description: "Capturing group: captures the matched text for later reference.", example: "(\\d{3})-(\\d{4})", category: "Groups" },
  { pattern: "(?:...)", description: "Non-capturing group: groups without capturing the match.", example: "(?:abc)+", category: "Groups" },
  { pattern: "(?<name>...)", description: "Named capturing group.", example: "(?<year>\\d{4})", category: "Groups" },
  { pattern: "|", description: "Alternation: matches either the expression before or after it.", example: "cat|dog", category: "Groups" },
  { pattern: "\\1", description: "Backreference to the first capturing group.", example: "(\\w)\\1", category: "Groups" },
  { pattern: "(?=...)", description: "Positive lookahead: matches if followed by the given pattern.", example: "foo(?=bar)", category: "Lookarounds" },
  { pattern: "(?!...)", description: "Negative lookahead: matches if NOT followed by the given pattern.", example: "foo(?!bar)", category: "Lookarounds" },
  { pattern: "(?<=...)", description: "Positive lookbehind: matches if preceded by the given pattern.", example: "(?<=\\$)\\d+", category: "Lookarounds" },
  { pattern: "(?<!...)", description: "Negative lookbehind: matches if NOT preceded by the given pattern.", example: "(?<!\\$)\\d+", category: "Lookarounds" },
  { pattern: "g", description: "Global flag: find all matches rather than stopping after the first.", example: "/abc/g", category: "Flags" },
  { pattern: "i", description: "Case-insensitive flag.", example: "/abc/i", category: "Flags" },
  { pattern: "m", description: "Multiline flag: ^ and $ match at line breaks, not just string start/end.", example: "/^abc/m", category: "Flags" },
  { pattern: "s", description: "Dotall flag: . also matches line break characters.", example: "/a.b/s", category: "Flags" },
  { pattern: "u", description: "Unicode flag: treats the pattern as a sequence of Unicode code points.", example: "/\\u{1F600}/u", category: "Flags" },
];

/** Case-insensitive substring search over pattern and description fields.
 * A blank query returns the full list unchanged. */
export function filterPatterns(patterns: RegexPatternEntry[], query: string): RegexPatternEntry[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return patterns;
  return patterns.filter(
    (entry) =>
      entry.pattern.toLowerCase().includes(trimmed) ||
      entry.description.toLowerCase().includes(trimmed) ||
      entry.category.toLowerCase().includes(trimmed),
  );
}
