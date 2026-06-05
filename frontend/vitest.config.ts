import { mergeConfig, defineConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Inherit the `@` alias and the vue() plugin from the Vite config so tests
// resolve imports and compile SFCs exactly like the app does.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.ts'],
      globals: false,
    },
  }),
);
