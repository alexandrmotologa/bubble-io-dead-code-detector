import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  dts: true,
  splitting: false,
  sourcemap: true,
  // shebang is added via package.json bin field — do NOT use banner here
  // because Node.js ESM loader doesn't allow shebang in bundled files
  esbuildOptions(options) {
    options.platform = 'node';
  },
});
