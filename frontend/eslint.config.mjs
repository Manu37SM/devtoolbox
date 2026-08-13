// @ts-check
// ESLint 9 flat config. Next.js 15 doesn't ship a native flat preset yet,
// so this bridges the legacy "next/core-web-vitals"/"next/typescript"
// shareable configs (already installed via eslint-config-next) through
// @eslint/eslintrc's compatibility layer — the same shape `next lint`
// itself scaffolds for a flat-config Next 15 project.
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
});

export default [
  {
    ignores: [
      '.next/**',
      'storybook-static/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
      'eslint.config.mjs',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];
