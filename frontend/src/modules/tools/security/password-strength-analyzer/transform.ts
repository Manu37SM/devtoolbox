import type { PasswordStrengthLabel, PasswordStrengthOptions, PasswordStrengthScore } from "./schema";

export interface PasswordAnalysis {
  score: PasswordStrengthScore;
  label: PasswordStrengthLabel;
  entropyBits: number;
  feedback: string[];
  crackTimeEstimate: string;
  /** Crack time under each attack scenario. */
  crackTimes?: { scenario: PasswordStrengthOptions["scenario"]; label: string; time: string }[];
  /** Policy result, when a policy is selected. */
  policy?: { name: string; passed: boolean; failures: string[] };
}

/** Guess rates: throttled login, unthrottled login, bcrypt (cost 10) on one GPU, fast hash (MD5/NTLM) on a GPU rig. */
export const SCENARIOS: { scenario: PasswordStrengthOptions["scenario"]; label: string; perSecond: number }[] = [
  { scenario: "online-throttled", label: "Online, rate-limited (100/hour)", perSecond: 100 / 3600 },
  { scenario: "online", label: "Online, no rate limit (10/s)", perSecond: 10 },
  { scenario: "offline-slow", label: "Offline, bcrypt/Argon2 hash (10k/s)", perSecond: 1e4 },
  { scenario: "offline-fast", label: "Offline, fast hash like MD5/SHA-1 (10B/s)", perSecond: 1e10 },
];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g", "@": "a", $: "s", "!": "i", "|": "l", "+": "t" };
const unleet = (s: string) => [...s.toLowerCase()].map((c) => LEET[c] ?? c).join("");

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

export function analyzePassword(password: string, options: Partial<PasswordStrengthOptions> = {}): PasswordAnalysis {
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

  // Also catch leetspeak spellings such as P@ssw0rd.
  const plain = unleet(password);
  const isCommon = COMMON_PASSWORDS.some(
    (common) => lower === common || lower.includes(common) || plain.includes(common),
  );
  const personal = (options.userInputs ?? "")
    .split(/[\s,;@.]+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length >= 3)
    .filter((w) => lower.includes(w) || plain.includes(unleet(w)));
  const isSequentialOrRepeated = hasSequentialOrRepeated(password);

  const charsetSize = estimateCharsetSize(password);
  let entropyBits = password.length * Math.log2(charsetSize);

  if (isCommon) entropyBits = Math.min(entropyBits, 12);
  // A personal word is guessed as a unit: count it as ~10 bits instead of per-character entropy.
  for (const w of personal) entropyBits -= Math.max(0, w.length * Math.log2(charsetSize) - 10);
  entropyBits = Math.max(0, entropyBits);
  if (isSequentialOrRepeated) entropyBits *= 0.5;

  entropyBits = Math.round(entropyBits * 10) / 10;

  const combinations = Math.pow(2, entropyBits);
  const crackTimes = SCENARIOS.map((s) => ({ scenario: s.scenario, label: s.label, time: formatCrackTime(combinations / 2 / s.perSecond) }));
  const crackTimeEstimate = crackTimes.find((c) => c.scenario === (options.scenario ?? "offline-fast"))!.time;

  if (password.length < 8) feedback.push("Use at least 8 characters.");
  if (password.length < 12) feedback.push("Consider using 12 or more characters for better security.");
  if (!hasLower) feedback.push("Add lowercase letters.");
  if (!hasUpper) feedback.push("Add uppercase letters.");
  if (!hasDigit) feedback.push("Add numbers.");
  if (!hasSymbol) feedback.push("Add symbols (e.g. !@#$%).");
  if (isCommon) feedback.push("Avoid common passwords or dictionary words.");
  if (isSequentialOrRepeated) feedback.push("Avoid sequential or repeated characters (e.g. \"abcd\", \"1111\").");
  if (personal.length) feedback.push(`Avoid words tied to you or the site: ${personal.join(", ")}.`);

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

  if (feedback.length === 0) feedback.push("Great password!");

  if (personal.length && score > 2) score = 2;
  const finalLabel = labels[score]!;
  const policy = checkPolicy(password, options, isCommon || personal.length > 0);
  return { score, label: finalLabel, entropyBits, feedback, crackTimeEstimate, crackTimes, ...(policy ? { policy } : {}) };
}

function checkPolicy(password: string, o: Partial<PasswordStrengthOptions>, isBlocklisted: boolean): PasswordAnalysis["policy"] {
  const length = [...password].length;
  switch (o.policy ?? "none") {
    case "nist": {
      // NIST SP 800-63B (rev. 4): length matters, composition rules don't; blocklisted passwords are rejected.
      const failures: string[] = [];
      if (length < 15) failures.push("At least 15 characters when the password is the only factor (8 with MFA).");
      if (length > 64) failures.push("Verifiers must accept at least 64 characters — check your system allows this length.");
      if (isBlocklisted) failures.push("Appears on a blocklist of common or context-specific words.");
      return { name: "NIST SP 800-63B", passed: failures.length === 0, failures };
    }
    case "pci": {
      // PCI DSS v4.0 requirement 8.3.6: at least 12 characters with both letters and numbers.
      const failures: string[] = [];
      if (length < 12) failures.push("At least 12 characters (PCI DSS 4.0, 8.3.6).");
      if (!/[a-z]/i.test(password)) failures.push("Must contain letters.");
      if (!/\d/.test(password)) failures.push("Must contain numbers.");
      return { name: "PCI DSS 4.0", passed: failures.length === 0, failures };
    }
    case "custom": {
      const min = o.customMinLength ?? 12;
      const failures = length < min ? [`At least ${min} characters.`] : [];
      if (isBlocklisted) failures.push("Contains a common or personal word.");
      return { name: `Minimum ${min} characters`, passed: failures.length === 0, failures };
    }
    default:
      return undefined;
  }
}
