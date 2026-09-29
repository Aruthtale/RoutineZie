# RoutineZie

Aplikasi manajemen rutinitas harian & workout untuk Zenn (17 tahun, Bahasa Indonesia) — gaya **manga neubrutalism** (hitam-putih, border tebal, bayangan keras, screentone).

![Version](https://img.shields.io/badge/version-1.0.0-09090b?style=flat-square)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20Web-09090b?style=flat-square)

## Download

Ambil APK terbaru dari [halaman Releases](../../releases/latest), install di Android (izinkan "Install dari sumber tidak dikenal").

## Fitur

- **Jadwal harian** — Senin–Minggu, blok fleksibel, fase hari, hitung mundur ke kegiatan berikutnya.
- **Mode workout terpandu** — satu latihan per layar, set/reps, timer istirahat, panel CARA, haptics.
- **Log & progres** — checklist makan, berat badan mingguan (`InkChart`), log tidur, konsistensi 7 hari.
- **Cuaca** — Open-Meteo, cache 1–3 jam, saran indoor untuk hari lari.
- **Chat AI** — asisten Bahasa Indonesia dengan guardrail (offline via MockChatProvider).
- **Notifikasi lokal** — pengingat terjadwal tahan reboot.

## Stack

Next.js 16 (App Router, `output: 'export'`) · React 19 · TypeScript strict · TailwindCSS v4 · Dexie (IndexedDB) · Zod · Capacitor 7 · Vitest · next/font (Anton / Space Mono / IBM Plex Sans)

## Pengembangan

```bash
npm install
npm run dev          # web dev server
npm run test         # vitest (38 tests)
npm run typecheck    # tsc --noEmit
npm run build        # build statis ke out/
npm run cap:sync     # build + sync ke android
npm run android:release  # build APK rilis bertanda tangan
```

Output APK: `android/app/build/outputs/apk/release/app-release.apk`

## Dokumentasi

Semua dokumen desain & arsitektur ada di `Arsitecture/` — `PRD.md`, `design.md`, `ARCHITECTURE.md`, `DATA_SCHEMA.md`, `AI_CHAT.md`, `TESTING.md`, `TASKS.md`, `agent.md`.

## Lisensi

Penggunaan pribadi. Ikon & ilustrasi buatan sendiri.
