// Type declarations for CSS side-effect imports (e.g. `import "./globals.css"`).
// Next.js's `next/types/global.d.ts` only declares `*.module.css` / `*.module.sass`
// / `*.module.scss`, not plain `*.css` files. Without this declaration, TypeScript
// (with `noUncheckedSideEffectImports` behavior) reports:
//   "Cannot find module or type declarations for side-effect import of './globals.css'."
declare module "*.css";