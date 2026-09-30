import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

// Reuses the app's own vite.config.js (same React plugin, same aliases if we
// ever add any) and layers test-only settings on top, so dev/build and test
// never drift apart into two different setups.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./test/setup.js'],
    },
  })
);
