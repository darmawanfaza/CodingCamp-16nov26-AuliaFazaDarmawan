import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom provides window, document, and localStorage in the test environment
    environment: 'jsdom',
  },
});
