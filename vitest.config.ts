import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    // Pasang polyfill indexedDB sebelum modul mana pun dievaluasi — kode
    // produksi tidak lagi mengimpor fake-indexeddb (dulu ikut ke bundle APK).
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
