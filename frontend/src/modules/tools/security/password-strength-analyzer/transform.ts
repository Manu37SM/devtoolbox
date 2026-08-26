import type { PasswordStrengthLabel, PasswordStrengthScore } from "./schema";

export interface PasswordAnalysis {
  score: PasswordStrengthScore;
  label: PasswordStrengthLabel;
  entropyBits: number;
  feedback: string[];
  crackTimeEstimate: string;
}

const COMMON_PASSWORDS = [
  "password",
  "123456",
  "12345678",
  "123456789",
  "qwerty",
  "letmein",
  "admin",
  "welcome",
  "dragon",
  "monkey",
  "football",
  "iloveyou",
  "abc123",
  "111111",
  "123123",
  "sunshine",
  "master",
  "shadow",
  "superman",
  "michael",
  "trustno1",
  "hello",
  "login",
  "passw0rd",
  "starwars",
  "freedom",
  "whatever",
  "qazwsx",
  "princess",
  "baseball",
  "batman",
  "access",
  "ninja",
  "flower",
  "hunter",
  "buster",
  "soccer",
  "harley",
  "ranger",
  "jordan",
  "letme",
  "biteme",
  "asdfgh",
  "121212",
  "654321",
  "666666",
  "000000",
  "1q2w3e4r",
  "admin123",
  "welcome1",
];

const LOWER_RE = /[a-z]/;
const UPPER_RE = /[A-Z]/;
const DIGIT_RE = /[0-9]/;
const SYMBOL_RE = /[^a-zA-Z0-9]/;

function hasSequentialOrRepeated(password: string): boolean {
  const lower = password.toLowerCase();
  for (let i = 0; i <= lower.length - 4; i++) {
    const a = lower.charCodeAt(i);
    const b = lower.charCodeAt(i + 1);
    const c = lower.charCodeAt(i + 2);
    const d = lower.charCodeAt(i + 3);
    if (b - a === 1 && c - b === 1 && d - c === 1) return true;
    if (a - b === 1 && b - c === 1 && c - d === 1) return true;
    if (a === b && b === c && c === d) return true;
  }
  return false;
}

function estimateCharsetSize(password: string): number {
  let size = 0;
  if (LOWER_RE.test(password)) size += 26;
  if (UPPER_RE.test(password)) size += 26;
  if (DIGIT_RE.test(password)) size += 10;
  if (SYMBOL_RE.test(password)) size += 32;
  return size || 1;
}

function formatCrackTime(seconds: number): string {
  if (seconds < 1) return "instantly";
  const units: [string, number][] = [
    ["second", 1],
    ["minute", 60],
    ["hour", 3600],
    ["day", 86400],
    ["month", 2_629_800],
    ["year", 31_557_600],
    ["century", 3_155_760_000],
  ];
  let chosen: [string, number] | undefined;
  for (const unit of units) {
    if (seconds >= unit[1]) chosen = unit;
    else break;
  }
  const [label, unitSeconds] = chosen!;
  const value = seconds / unitSeconds;
  if (value > 1e6) return "centuries";
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${label}${rounded === 1 ? "" : "s"}`;
}

export function analyzePassword(password: string): PasswordAnalysis {
  const feedback: string[] = [];

  if (password.length === 0) {
    return {
      score: 0,
      label: "Very Weak",
      entropyBits: 0,
      feedback: ["Enter a password to analyze."],
      crackTimeEstimate: "instantly",
    };
  }

  const lower = password.toLowerCase();
  const hasLower = LOWER_RE.test(password);
  const hasUpper = UPPER_RE.test(password);
  const hasDigit = DIGIT_RE.test(password);
  const hasSymbol = SYMBOL_RE.test(password);
  const classCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  const isCommon = COMMON_PASSWORDS.some(
    (common) => lower === common || lower.includes(common),
  );
  const isSequentialOrRepeated = hasSequentialOrRepeated(password);

  const charsetSize = estimateCharsetSize(password);
  let entropyBits = password.length * Math.log2(charsetSize);

  if (isCommon) entropyBits = Math.min(entropyBits, 12);
  if (isSequentialOrRepeated) entropyBits *= 0.5;

  entropyBits = Math.round(entropyBits * 10) / 10;

  const guessesPerSecond = 1e10;
  const combinations = Math.pow(2, entropyBits);
  const crackTimeEstimate = formatCrackTime(combinations / 2 / guessesPerSecond);

  if (password.length < 8) feedback.push("Use at least 8 characters.");
  if (password.length < 12) feedback.push("Consider using 12 or more characters for better security.");
  if (!hasLower) feedback.push("Add lowercase letters.");
  if (!hasUpper) feedback.push("Add uppercase letters.");
  if (!hasDigit) feedback.push("Add numbers.");
  if (!hasSymbol) feedback.push("Add symbols (e.g. !@#$%).");
  if (isCommon) feedback.push("Avoid common passwords or dictionary words.");
  if (isSequentialOrRepeated) feedback.push("Avoid sequential or repeated characters (e.g. \"abcd\", \"1111\").");

  let score: PasswordStrengthScore;
  if (isCommon && password.length < 12) {
    score = 0;
  } else if (entropyBits < 28) {
    score = 0;
  } else if (entropyBits < 36) {
    score = 1;
  } else if (entropyBits < 60) {
    score = 2;
  } else if (entropyBits < 80) {
    score = 3;
  } else {
    score = 4;
  }

  if (classCount <= 1 && score > 1) score = 1;

  const labels: readonly PasswordStrengthLabel[] = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  const label = labels[score]!;

  if (feedback.length === 0) feedback.push("Great password!");

  return { score, label, entropyBits, feedback, crackTimeEstimate };
}
