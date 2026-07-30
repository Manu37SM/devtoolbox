export interface StringStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  lines: number;
  sentences: number;
  paragraphs: number;
  bytesUtf8: number;
  readingTimeMinutes: number;
}

const AVERAGE_WORDS_PER_MINUTE = 200;

/** Pure text analysis — no locale-dependent Intl.Segmenter dependency so
 * results are stable across environments (browser/Node/Worker). */
export function analyzeText(input: string): StringStats {
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

  const characters = [...input].length;
  const charactersNoSpaces = [...input.replace(/\s/g, "")].length;
  const words = (input.match(/\S+/g) ?? []).length;
  const lines = input.split(/\r\n|\r|\n/).length;
  const sentences = (input.match(/[^.!?]+[.!?]+/g) ?? (input.trim() ? [input] : [])).length;
  const paragraphs = input
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean).length;
  const bytesUtf8 = new TextEncoder().encode(input).length;
  const readingTimeMinutes = words / AVERAGE_WORDS_PER_MINUTE;

  return { characters, charactersNoSpaces, words, lines, sentences, paragraphs, bytesUtf8, readingTimeMinutes };
}
