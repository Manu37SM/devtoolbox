import { describe, expect, it } from "vitest";
import { calculateNumberTheory, factorize, gcd, isPrime, nextPrime, prevPrime } from "./transform";

const op = (operation: "analyze" | "gcd-lcm" | "fibonacci" | "factorial" | "primes-up-to") => ({ operation });

describe("isPrime", () => {
  it("is correct for small and large values", () => {
    expect([0n, 1n, 2n, 3n, 4n, 97n, 100n].map(isPrime)).toEqual([false, false, true, true, false, true, false]);
    expect(isPrime(2147483647n)).toBe(true); // 2^31-1
    expect(isPrime(18446744073709551557n)).toBe(true); // largest 64-bit prime
    expect(isPrime(3215031751n)).toBe(false); // strong pseudoprime to bases 2,3,5,7
    expect(isPrime(561n)).toBe(false); // Carmichael
  });
});

describe("factorize / primes", () => {
  it("factorises correctly", () => {
    expect(factorize(360)).toEqual([[2, 3], [3, 2], [5, 1]]);
    expect(factorize(97)).toEqual([[97, 1]]);
    expect(factorize(600851475143)).toEqual([[71, 1], [839, 1], [1471, 1], [6857, 1]]);
    expect(factorize(2 ** 31 - 1)).toEqual([[2147483647, 1]]);
  });
  it("finds neighbouring primes and gcd", () => {
    expect(nextPrime(14n)).toBe(17n);
    expect(prevPrime(14n)).toBe(13n);
    expect(prevPrime(2n)).toBeNull();
    expect(gcd(-12n, 18n)).toBe(6n);
  });
});

describe("calculateNumberTheory", () => {
  it("analyzes a number", () => {
    const r = calculateNumberTheory("360", op("analyze"));
    expect(r.output).toContain("2^3 × 3^2 × 5");
    expect(r.output).toContain("Divisors: 24 (sum 1170)");
    expect(r.output).toContain("Euler φ(n): 96");
    expect(r.output).toContain("Next prime: 367");
  });
  it("computes gcd/lcm, fibonacci, factorial and a sieve", () => {
    expect(calculateNumberTheory("12 18 30", op("gcd-lcm")).output).toBe("GCD: 6\nLCM: 180");
    expect(calculateNumberTheory("10, 100", op("fibonacci")).output).toBe("F(10) = 55\nF(100) = 354224848179261915075");
    expect(calculateNumberTheory("20", op("factorial")).output).toBe("20! = 2432902008176640000");
    expect(calculateNumberTheory("30", op("primes-up-to")).output).toContain("π(30) = 10");
  });
  it("validates input", () => {
    expect(calculateNumberTheory("1.5", op("analyze")).error?.message).toContain("not an integer");
    expect(calculateNumberTheory("5", op("gcd-lcm")).error).not.toBeNull();
    expect(calculateNumberTheory("99999", op("fibonacci")).error).not.toBeNull();
  });
});
