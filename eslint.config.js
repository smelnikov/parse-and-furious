import { base, node, typescript, vitest } from '@faergeek/eslint-config';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  base,
  typescript,
  { files: ['*.js'], extends: [node] },
  { files: ['**/*.spec.*'], extends: [vitest] },
]);
