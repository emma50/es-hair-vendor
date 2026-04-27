import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    setupFiles: ['src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // `server-only` is Next's runtime guard package — it throws on
      // import in any non-server environment. The package isn't
      // installed (Next bundles it as a virtual marker), so without
      // an alias here vitest fails to resolve the import in any
      // module that uses `import 'server-only'` (rate-limit, queries,
      // orders helpers). Point it at an empty file: the test runner
      // is server-side anyway, so the guard is moot.
      'server-only': path.resolve(__dirname, './src/__tests__/helpers/server-only-stub.ts'),
    },
  },
});
