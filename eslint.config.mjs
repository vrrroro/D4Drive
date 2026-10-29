import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

/**
 * ESLint flat config, run with the ESLint CLI (`npm run lint`).
 *
 * Replaces `.eslintrc.json` and `next lint`, which Next.js deprecated in 15
 * and removes in 16. The rule set is unchanged: `next/core-web-vitals`,
 * bridged through FlatCompat, which is the setup the Next.js docs give.
 */
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/**',
      // Read-only prototype material; not part of the app (see its REFERENCE.md).
      'reference/**',
      'smoke-shots/**',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals'),
];

export default config;
