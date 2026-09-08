// @ts-check
// Next 16 ships native flat-config exports, so no FlatCompat bridge needed.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

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
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
     rules: {
       'react-hooks/set-state-in-effect': 'warn',
       'react-hooks/purity': 'warn',
       'react-hooks/refs': 'warn',
     },
   },
];
