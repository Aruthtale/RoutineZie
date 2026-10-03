/**
 * Setup vitest — dijalankan SEKALI sebelum file test mana pun (dan sebelum
 * import di-hoist di file test), jadi `indexedDB` global sudah tersedia saat
 * `src/lib/db/index.ts` dievaluasi.
 *
 * `fake-indexeddb/auto` memasang polyfill ke globalThis — hanya untuk test.
 * Kode produksi TIDAK mengimpor fake-indexeddb (dulu ikut terbundel ke APK).
 */
import 'fake-indexeddb/auto';
