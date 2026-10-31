import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { complexNumberCalculator, evaluate, fmtPolar, fmtRect, nthRoots, polyRoots, type C } from "./transform";

const ev = (s: string, angle: "deg" | "rad" = "deg") => evaluate(s, new Map(), angle);
const near = (a: C, re: number, im: number, tol = 1e-12) => {
  expect(Math.abs(a.re - re), `re of ${JSON.stringify(a)}`).toBeLessThanOrEqual(tol);
  expect(Math.abs(a.im - im), `im of ${JSON.stringify(a)}`).toBeLessThanOrEqual(tol);
};
const run = (input: string, o: Parameters<typeof complexNumberCalculator>[1] = {}) => {
  const r = complexNumberCalculator(input, o);
  if (r.error) throw new Error(r.error.message);
  return r.output;
};

describe("parser", () => {
  it("literals and arithmetic", () => {
    near(ev("3+4i"), 3, 4);
    near(ev("(3+4i)*(1-2i)"), 11, -2);
    near(ev("(3+4i)/(1-2i)"), -1, 2);
    near(ev("2.5e-1 + .5j"), 0.25, 0.5);
    near(ev("i"), 0, 1);
    near(ev("-i"), 0, -1);
  });
  it("precedence and associativity", () => {
    near(ev("-2^2"), -4, 0); // -(2^2)
    near(ev("2^3^2"), 512, 0); // right associative
    near(ev("1+2*3"), 7, 0);
    near(ev("2**3"), 8, 0);
  });
  it("implicit multiplication", () => {
    near(ev("2(1+i)"), 2, 2);
    near(ev("(1+i)(1-i)"), 2, 0);
    near(ev("2pi"), 2 * Math.PI, 0);
    near(ev("3i"), 0, 3);
  });
  it("polar input", () => {
    near(ev("5∠90"), 0, 5, 1e-12);
    near(ev("5∠90°"), 0, 5, 1e-12);
    near(ev("5@90"), 0, 5, 1e-12);
    near(ev("2∠pi", "rad"), -2, 0, 1e-12);
    near(ev("polar(2, 180)"), -2, 0, 1e-12);
    near(ev("polar(2, pi)", "rad"), -2, 0, 1e-12);
    near(ev("5∠30°", "rad"), 5 * Math.cos(Math.PI / 6), 5 * Math.sin(Math.PI / 6), 1e-12);
  });
  it("constants and exact results", () => {
    near(ev("i^2"), -1, 0, 0);
    near(ev("i^4"), 1, 0, 0);
    near(ev("exp(i*pi)"), -1, 0, 1e-15);
    near(ev("e^(i*pi)+1"), 0, 0, 1e-15);
  });
  it("errors", () => {
    expect(() => ev("1/0")).toThrow(/Division by zero/);
    expect(() => ev("foo")).toThrow(/Unknown name/);
    expect(() => ev("foo(1)")).toThrow(/Unknown function/);
    expect(() => ev("(1+2")).toThrow(/closing/);
    expect(() => ev("1+")).toThrow(/ends unexpectedly/);
    expect(() => ev("1 $ 2")).toThrow(/Unexpected/);
    expect(() => ev("ln(0)")).toThrow(/undefined/);
    expect(() => ev("sin(1,2)")).toThrow(/one argument/);
  });
});

describe("formatting", () => {
  it("rectangular", () => {
    expect(fmtRect({ re: 3, im: 4 }, 8, "i")).toBe("3 + 4i");
    expect(fmtRect({ re: 3, im: -1 }, 8, "j")).toBe("3 - j");
    expect(fmtRect({ re: 0, im: -2 }, 8, "i")).toBe("-2i");
    expect(fmtRect({ re: 1.5, im: 0 }, 8, "i")).toBe("1.5");
    expect(fmtRect({ re: 1, im: 1e-17 }, 8, "i")).toBe("1");
    expect(fmtRect({ re: 1 / 3, im: 0 }, 4, "i")).toBe("0.3333");
  });
  it("polar", () => {
    expect(fmtPolar({ re: 0, im: 5 }, 8, "deg")).toBe("5 ∠ 90°");
    expect(fmtPolar({ re: -1, im: 0 }, 8, "rad")).toBe("1 ∠ 3.1415927 rad");
  });
});

describe("evaluate mode", () => {
  it("variables, ans and all forms", () => {
    const out = run("z1 = 3+4i\nz2 = 1-2i\nz1*z2\nans/2", {});
    expect(out).toContain("z1 = 3+4i\n  = 3 + 4i\n  = 5 ∠ 53.130102°");
    expect(out).toMatch(/z1\*z2\n {2}= 11 - 2i/);
    expect(out).toMatch(/ans\/2\n {2}= 5\.5 - i/);
  });
  it("one form", () => {
    expect(run("1+i", { form: "polar" })).toBe("1+i\n  = 1.4142136 ∠ 45°");
    expect(run("1+i", { form: "exponential", angleUnit: "rad" })).toBe("1+i\n  = 1.4142136·e^(i0.78539816)");
  });
  it("roots() call and per-line errors", () => {
    const out = run("roots(1, 4)\n1/0\nbad name", {});
    expect(out).toContain("[0] 1");
    expect(out).toContain("[1] i");
    expect(out).toContain("! Division by zero");
  });
  it("reserved names", () => {
    expect(run("pi = 3\nx = 1", {})).toContain('"pi" is reserved');
    expect(complexNumberCalculator("i = 3").error?.message).toMatch(/reserved/);
  });
  it("empty", () => {
    expect(complexNumberCalculator("  \n# c").output).toBe("");
  });
});

describe("nth roots and polynomials", () => {
  it("roots of unity", () => {
    const r = nthRoots({ re: 1, im: 0 }, 6);
    expect(r).toHaveLength(6);
    r.forEach((z) => near(ev(`(${z.re}+${z.im}i)^6`), 1, 0, 1e-12));
  });
  it("nthroots mode", () => {
    const out = run("-8", { mode: "nthroots", n: 3 });
    expect(out).toContain("3 roots of -8");
    expect(out).toContain("1 + 1.7320508i");
    expect(out).toContain("-2 ");
  });
  it("polynomial mode", () => {
    const out = run("1 0 -1", { mode: "polynomial" });
    expect(out).toMatch(/x1 = -1/);
    expect(out).toMatch(/x2 = 1/);
    const q = run("1 2 5", { mode: "polynomial" });
    expect(q).toContain("-1 - 2i");
    expect(q).toContain("-1 + 2i");
  });
  it("polynomial validation", () => {
    expect(complexNumberCalculator("5", { mode: "polynomial" }).error?.message).toMatch(/at least two/);
  });
});

// ---- oracle: Python cmath / numpy ----
const py = (code: string, input = "") => spawnSync("python3", ["-c", code], { input, encoding: "utf8" });
const hasPy = py("import cmath, numpy").status === 0;

// deterministic pseudo-random points, kept off branch cuts
const pts: Array<[number, number]> = [];
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
for (let k = 0; k < 60; k++) pts.push([Number((rnd() * 3).toFixed(3)) || 0.5, Number((rnd() * 3).toFixed(3)) || -0.7]);

describe.skipIf(!hasPy)("python cmath oracle", () => {
  const fns = ["sqrt", "exp", "log", "sin", "cos", "tan", "sinh", "cosh", "tanh", "asin", "acos", "atan", "asinh", "acosh", "atanh"] as const;
  const mapName: Record<string, string> = { log: "ln" };
  for (const fn of fns) {
    it(`${fn}(z)`, () => {
      const r = py(
        `import cmath,json,sys
pts=json.loads(sys.stdin.read())
out=[]
for a,b in pts:
    try:
        v=getattr(cmath,${JSON.stringify(fn)})(complex(a,b)); out.append([v.real,v.imag])
    except Exception as e:
        out.append(None)
print(json.dumps(out))`,
        JSON.stringify(pts),
      );
      const expected = JSON.parse(r.stdout) as Array<[number, number] | null>;
      let compared = 0;
      pts.forEach(([a, b], i) => {
        const e = expected[i];
        if (!e) return;
        const got = ev(`${mapName[fn] ?? fn}(${a}${b < 0 ? "-" : "+"}${Math.abs(b)}i)`);
        const scale = Math.max(1, Math.abs(e[0]), Math.abs(e[1]));
        expect(Math.abs(got.re - e[0]) / scale, `${fn}(${a}+${b}i).re`).toBeLessThan(1e-11);
        expect(Math.abs(got.im - e[1]) / scale, `${fn}(${a}+${b}i).im`).toBeLessThan(1e-11);
        compared++;
      });
      expect(compared).toBeGreaterThan(50);
    });
  }

  it("arithmetic and powers", () => {
    const pairs = pts.slice(0, 30).map((p, i) => [p, pts[(i + 7) % pts.length]!] as const);
    const r = py(
      `import json,sys
pairs=json.loads(sys.stdin.read())
out=[]
for (a,b),(c,d) in pairs:
    z=complex(a,b); w=complex(c,d)
    row=[z*w, z/w, z**w, z**3, z**-2, z**0.5]
    out.append([[x.real,x.imag] for x in row])
print(json.dumps(out))`,
      JSON.stringify(pairs),
    );
    const exp = JSON.parse(r.stdout) as number[][][];
    const lit = ([a, b]: readonly [number, number]) => `(${a}${b < 0 ? "-" : "+"}${Math.abs(b)}i)`;
    pairs.forEach(([z, w], i) => {
      const exprs = [`${lit(z)}*${lit(w)}`, `${lit(z)}/${lit(w)}`, `${lit(z)}^${lit(w)}`, `${lit(z)}^3`, `${lit(z)}^-2`, `${lit(z)}^0.5`];
      exprs.forEach((x, k) => {
        const got = ev(x);
        const e = exp[i]![k]!;
        const scale = Math.max(1, Math.abs(e[0]!), Math.abs(e[1]!));
        expect(Math.abs(got.re - e[0]!) / scale, x).toBeLessThan(1e-10);
        expect(Math.abs(got.im - e[1]!) / scale, x).toBeLessThan(1e-10);
      });
    });
  });

  it("abs, arg, polar form", () => {
    const r = py(`import cmath,json,sys
pts=json.loads(sys.stdin.read())
print(json.dumps([[abs(complex(a,b)), cmath.phase(complex(a,b))] for a,b in pts]))`, JSON.stringify(pts));
    const e = JSON.parse(r.stdout) as number[][];
    pts.forEach(([a, b], i) => {
      const z = { re: a, im: b };
      expect(Math.hypot(a, b)).toBeCloseTo(e[i]![0]!, 12);
      expect(ev(`arg(${a}+${b}i)`).re).toBeCloseTo(e[i]![1]!, 12);
      expect(ev(`abs(${a}+${b}i)`).re).toBeCloseTo(e[i]![0]!, 12);
      void z;
    });
  });

  it("polynomial roots match numpy.roots", () => {
    const polys = [[1, -6, 11, -6], [1, 0, 0, -1], [2, 3, -5, 7, 1], [1, 2, 5], [1, 0, 1], [1, -10, 35, -50, 24], [3, 0, 0, 0, 0, -2]];
    const r = py(`import numpy as np,json,sys
ps=json.loads(sys.stdin.read())
out=[]
for p in ps:
    rs=np.roots(p)
    out.append(sorted([[float(x.real),float(x.imag)] for x in rs]))
print(json.dumps(out))`, JSON.stringify(polys));
    const exp = JSON.parse(r.stdout) as number[][][];
    polys.forEach((p, i) => {
      const { roots } = polyRoots(p.map((x) => ({ re: x, im: 0 })));
      expect(roots).toHaveLength(exp[i]!.length);
      // every numpy root has a matching root of ours
      for (const [er, ei] of exp[i]!) {
        const best = Math.min(...roots.map((z) => Math.hypot(z.re - er!, z.im - ei!)));
        expect(best, `poly ${p} root ${er}+${ei}i`).toBeLessThan(1e-8);
      }
    });
  });
});
