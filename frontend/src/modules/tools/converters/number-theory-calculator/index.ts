import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const numberTheoryCalculatorTool: ToolRegistryEntry = {
  slug: "number-theory-calculator",
  name: "Prime, Factor, GCD & Fibonacci Calculator",
  module: "converters",
  description: "Primality test (exact up to 64-bit), prime factorisation, divisor count and sum, Euler's totient, next/previous prime, GCD/LCM, Fibonacci, factorials and a prime sieve.",
  aliases: ["is prime","prime factorization","gcd lcm calculator","fibonacci number","euler totient","sieve of eratosthenes"],
  icon: "Sigma",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["is prime","prime factorization","gcd lcm calculator","fibonacci number","euler totient","sieve of eratosthenes"] },
};
