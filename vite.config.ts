import nkzw from '@nkzw/oxlint-config/with-sorting';
import fbtee from '@nkzw/vite-plugin-fbtee';
import { voidReact } from '@void/react/plugin';
import { defineConfig } from 'vite-plus';
import { voidPlugin } from 'void';
import { localCardAssets } from './scripts/local-card-assets';

export default defineConfig({
  fmt: {
    experimentalSortImports: { newlinesBetween: false },
    experimentalSortPackageJson: { sortScripts: true },
    ignorePatterns: [
      'dist/',
      '.void/',
      '.cloudflare/',
      '.wrangler/',
      '.void-wrangler.jsonc',
      'db/migrations/',
      'pnpm-lock.yaml',
      'src/german-card-details.json',
      'src/vs-card-details.json',
      'source_strings.json',
      'src/translations/',
      '.enum_manifest.json',
    ],
    singleQuote: true,
  },
  lint: {
    extends: [nkzw],
    ignorePatterns: [
      'dist/',
      '.void/',
      '.cloudflare/',
      '.wrangler/',
      '.void-wrangler.jsonc',
      'db/migrations/',
      'vite.config.ts.timestamp-*',
    ],
    options: { typeCheck: true },
  },
  plugins: [
    localCardAssets(),
    fbtee(),
    ...(process.env.VITEST
      ? []
      : [
          voidPlugin(),
          voidReact({ prefetch: { defaultStrategy: 'hover' }, viewTransitions: true }),
        ]),
  ],
  server: {
    host: '127.0.0.1',
    port: 5217,
    strictPort: true,
  },
  staged: { '*': 'vp check --fix' },
  test: { include: ['tests/**/*.test.ts'] },
});
