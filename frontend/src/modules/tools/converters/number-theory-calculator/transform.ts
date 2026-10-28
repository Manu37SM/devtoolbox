import type { TransformResult } from "@/lib/tool-transform";
import type { NumberTheoryCalculatorOptions } from "./schema";

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

function modPow(b: bigint, e: bigint, m: bigint): bigint {
  let r = 1n;
  b %= m;
  while (e > 0n) {
    if (e & 1n) r = (r * b) % m;
    b = (b * b) % m;
    e >>= 1n;
  }
  return r;
}

/** Deterministic Miller–Rabin, exact for n < 3.3e24 (covers all 64-bit values). */
export function isPrime(n: bigint): boolean {
  if (n < 2n) return false;
  const small = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
  for (const p of small) {
    if (n === p) return true;
    if (n % p === 0n) return false;
  }
  let d = n - 1n;
  let s = 0;
  while ((d & 1n) === 0n) { d >>= 1n; s++; }
  outer: for (const a of small) {
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    for (let i = 1; i < s; i++) {
      x = (x * x) % n;
      if (x === n - 1n) continue outer;
    }
    return false;
  }
  return true;
}

export function factorize(n: number): Array<[number, number]> {
  const f: Array<[number, number]> = [];
  const take = (p: number) => {
    let e = 0;
    while (n % p === 0) { n /= p; e++; }
    if (e) f.push([p, e]);
  };
  take(2); take(3);
  for (let p = 5; p * p <= n; p += 6) {
    if (n === 1) break;
    take(p);
    take(p + 2);
    if (n >= 1e12 && isPrime(BigInt(n))) break;
  }
  if (n > 1) f.push([n, 1]);
  return f;
}

export function nextPrime(n: bigint): bigint {
  let c = n + 1n;
  while (!isPrime(c)) c++;
  return c;
}
export function prevPrime(n: bigint): bigint | null {
  let c = n - 1n;
  while (c >= 2n && !isPrime(c)) c--;
  return c >= 2n ? c : null;
}

export function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a; b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
}

const sup = (e: number) => (e === 1 ? "" : `^${e}`);

function analyze(n: bigint): string {
  if (n < 0n) return `${n}: enter a non-negative integer`;
  const lines = [`${n}`];
  const prime = isPrime(n);
  lines.push(`  Prime: ${prime ? "yes" : "no"}`);
  if (n >= 2n && n <= MAX_SAFE) {
    const f = factorize(Number(n));
    lines.push(`  Factorization: ${f.map(([p, e]) => p + sup(e)).join(" × ")}`);
    const divCount = f.reduce((a, [, e]) => a * (e + 1), 1);
    const sigma = f.reduce((a, [p, e]) => a * ((p ** (e + 1) - 1) / (p - 1)), 1);
    const phi = f.reduce((a, [p, e]) => a * (p ** (e - 1) * (p - 1)), 1);
    lines.push(`  Divisors: ${divCount} (sum ${sigma})`, `  Euler φ(n): ${phi}`);
    lines.push(`  Perfect square: ${Number.isInteger(Math.sqrt(Number(n))) ? "yes" : "no"}`);
  } else if (n > MAX_SAFE) lines.push("  Factorization skipped: values above 2^53 are only tested for primality");
  const prev = prevPrime(n);
  lines.push(`  Previous prime: ${prev ?? "none"}`, `  Next prime: ${nextPrime(n)}`);
  return lines.join("\n");
}

function fib(n: number): bigint {
  let a = 0n, b = 1n;
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
}

export function calculateNumberTheory(input: string, options: NumberTheoryCalculatorOptions): TransformResult {
  const tokens = input.split(/[\s,;]+/).filter(Boolean);
  if (!tokens.length) return { output: "", error: null };
  const nums: bigint[] = [];
  for (const t of tokens) {
    if (!/^-?\d+$/.test(t)) return { output: "", error: { message: `"${t}" is not an integer` } };
    nums.push(BigInt(t));
  }
  switch (options.operation) {
    case "analyze":
      if (nums.length > 50) return { output: "", error: { message: "At most 50 numbers at a time" } };
      return { output: nums.map(analyze).join("\n\n"), error: null };
    case "gcd-lcm": {
      if (nums.length < 2) return { output: "", error: { message: "Enter at least two integers" } };
      let g = nums[0]!, l = nums[0]! < 0n ? -nums[0]! : nums[0]!;
      for (const x of nums.slice(1)) {
        g = gcd(g, x);
        const ax = x < 0n ? -x : x;
        l = l === 0n || ax === 0n ? 0n : (l / gcd(l, ax)) * ax;
      }
      return { output: `GCD: ${g}\nLCM: ${l}`, error: null };
    }
    case "fibonacci": {
      const out: string[] = [];
      for (const n of nums) {
        if (n < 0n || n > 20000n) return { output: "", error: { message: "Fibonacci index must be between 0 and 20000" } };
        out.push(`F(${n}) = ${fib(Number(n))}`);
      }
      return { output: out.join("\n"), error: null };
    }
    case "factorial": {
      const out: string[] = [];
      for (const n of nums) {
        if (n < 0n || n > 3000n) return { output: "", error: { message: "Factorial input must be between 0 and 3000" } };
        let r = 1n;
        for (let i = 2n; i <= n; i++) r *= i;
        const s = r.toString();
        out.push(`${n}! = ${s.length > 400 ? `${s.slice(0, 40)}… (${s.length} digits)` : s}`);
      }
      return { output: out.join("\n"), error: null };
    }
    case "primes-up-to": {
      const n = Number(nums[0]);
      if (n < 2 || n > 5_000_000) return { output: "", error: { message: "Enter a limit between 2 and 5,000,000" } };
      const sieve = new Uint8Array(n + 1);
      const primes: number[] = [];
      for (let i = 2; i <= n; i++) {
        if (sieve[i]) continue;
        primes.push(i);
        for (let j = i * i; j <= n; j += i) sieve[j] = 1;
      }
      const shown = primes.length > 500 ? `${primes.slice(0, 500).join(", ")}, … (first 500 of ${primes.length})` : primes.join(", ");
      return { output: `π(${n}) = ${primes.length}\n${shown}`, error: null };
    }
  }
}
