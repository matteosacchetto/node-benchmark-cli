// rollup.config.js
import json from '@rollup/plugin-json';
import eslint from '@rollup/plugin-eslint';
import typescript from '@rollup/plugin-typescript';
import run from '@rollup/plugin-run';

// Import dependencies
import { dependencies } from './package.json';

const preferConst = true; // Use "const" instead of "var"
const isWatched = process.env.ROLLUP_WATCH === 'true'; // `true` if -w option is used

const nodeDependencies = ['child_process', 'path', 'fs/promises', 'util', 'os'];

export default {
  external: dependencies
    ? [...Object.keys(dependencies), ...nodeDependencies]
    : nodeDependencies,
  input: 'src/app.ts',
  output: {
    dir: 'dist',
    format: 'es',
    preferConst: preferConst,
    preserveModules: false,
    strict: true,
    entryFileNames: '[name].mjs',
    banner: '#!/usr/bin/env node',
  },
  plugins: [
    eslint({
      throwOnError: true,
    }),
    json({
      preferConst: preferConst,
    }),
    typescript(),
    isWatched ? run() : undefined,
  ],
};
