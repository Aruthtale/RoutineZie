# Changelog

Semua perubahan penting pada RoutineZie akan didokumentasikan di sini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/), versi mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [1.2.0] — 2026-09-29

### Added
- **Fase 8: T8.1 Makan** — integrasi lengkap tab Makan dengan:
  - Pelacak air minum (tally gelas per hari dengan batas/target dinamis).
  - Log cepat "kalau lapar" (catatan bebas tanpa kalori/peringatan penilaian).
  - Alternatif menu per slot dengan kelompok bahan dasar sama.
  - Daftar belanja mingguan agregasi 7 hari per kelompok bahan.
- Skema Dexie versi 4 dengan tabel `waterLogs` dan `hungerLogs`.
- Ekspor/impor data mencakup riwayat air dan log lapar.

## [1.1.0] — 2026-09-29

### Added
- **Fase 7 — Substitusi Jadwal (rule-based, tanpa AI)** — pengguna bisa mengganti
  latihan hari ini secara instan saat sedang tidak fit, tanpa menyentuh
  `jadwal_mingguan.json` (file default tetap utuh).
  - **T7.1** `src/lib/schedule/substitutions.ts` — tabel substitusi 100% deterministik
    (sakit kaki/lutut, sakit tangan/bahu, capek/kurang tidur, sakit/demam, cuaca hujan).
    Membangun pengganti otomatis dari pool gerakan cadangan di JSON.
  - **T7.2** `ScheduleOverride` disimpan di IndexedDB (table `scheduleOverrides`,
    Dexie v3). `getEffectiveDay(date) = override(date) ?? defaultDay(hari)` —
    satu-satunya sumber kebenaran untuk latihan hari ini.
  - **T7.3** Kartu usulan + tombol cepat di layar Hari Ini. Konfirmasi wajib
    sebelum override ditulis — tidak pernah auto-apply.
  - **T7.4** Indikator "⚡ DIGANTI" + tombol "Batalkan Pengganti" di kartu latihan.
  - **T7.5** Konfirmasi harian untuk override yang tidak kedaluwarsa otomatis
    ("⏰ MASIH BERLAKU?") saat aplikasi dibuka.
  - Quick action chat "Sesuaikan Workout" sekarang membuka layar Hari Ini
    (rule-based) alih-alih memanggil AI.
  - 16 unit test baru (total 72 test lulus).

### Changed
- Type `NormalizedSet` dipindah ke `parser.ts` dan di-re-export dari
  `substitutions.ts` agar tidak ada dua definisi tampilan latihan.

## [1.0.2] — 2026-09-29

### Added
- **T1.5 Notifikasi Lokal** — penjadwalan penuh via `@capacitor/local-notifications`.
  - Izin kontekstual (muncul saat user mengaktifkan).
  - Jadwal terjadwal otomatis dari `jadwal_mingguan.json` (hanya item berwaktu).
  - Persist di level OS → tetap muncul setelah restart perangkat.
  - Offset menit (0/5/10/15/30 menit sebelum jadwal).
  - Pilih per-pengingat di UI.
  - Batas quota Android 12+ ditangani (`MAX_SCHEDULED_AHEAD = 40`), replenishment saat app dibuka.
  - Panduan optimasi baterai di SettingsView.
  - 13 unit test baru (total 56 test lulus).

### Fixed
- UI notifikasi diletakkan di tab Pengaturan di bawah SettingsView.

## [1.0.1] — 2026-09-29

### Fixed
- **Asisten AI tidak berfungsi** — `page.tsx` hardcode `MockChatProvider` sehingga selalu membalas dengan jawaban canned. Sekarang memakai factory `createChatProvider()` yang memilih provider otomatis.
- Autentikasi Gemini: API key hanya diterima via header `x-goog-api-key`; query param `?key=` ditolak (HTTP 400).

### Added
- `GeminiChatProvider` baru — memanggil Google Gemini REST API langsung (tanpa SDK tambahan).
- Factory `createChatProvider()` + `getChatProviderInfo()`: prioritas proxy → Gemini → mock.
- Fallback model otomatis: `gemini-3.8-flash` → `gemini-3.6-flash` → `gemini-3.5-flash` → `gemini-flash-latest` (saat 503/429).
- Label status di UI: "AI • Gemini" / "AI • Proxy" / "Mode Offline • Contoh Jawaban".
- Error handling spesifik: kuota habis (429), key tidak valid (401/403), service bermasalah.
- Riwayat chat (10 pesan terakhir) ikut dikirim ke model untuk percakapan yang kontekstual.
- Env baru: `NEXT_PUBLIC_GEMINI_API_KEY`, `NEXT_PUBLIC_GEMINI_MODEL`.
- 5 unit test baru untuk factory & builder konteks (total 43 test).

## [1.0.0] — 2026-09-29

Rilis perdana. Aplikasi manajemen rutinitas harian & workout untuk Zenn (17 tahun, Bahasa Indonesia) dengan gaya manga neubrutalism.

### Fase 0 — Scaffold
- Inisialisasi Next.js 16 (App Router, TypeScript strict, TailwindCSS v4) dengan `output: 'export'`.
- Capacitor 7 + platform Android, `webDir: 'out'`.
- Tooling: ESLint, Prettier, `typecheck`, Vitest, `.env.example`.
- Token desain manga neubrutalism (`--ink` #09090b, `--paper` #ffffff), border 2–3px, bayangan keras `4px 4px 0`, radius 0.

### Fase 1 — Inti Jadwal
- `lib/schedule`: schema Zod, loader, `parseWaktu`, `phase`, `getNowAndNext`, normalisasi `bagian`/`latihan`.
- Layar **Hari Ini**: sekarang, berikutnya, hitung mundur, timeline; refresh tiap 30 detik.
- Layar **Minggu** (7 panel) + navigasi bawah.
- Tema mengikuti fase hari; menghormati `prefers-reduced-motion`.
- Notifikasi lokal (izin kontekstual, pengingat, pengaturan per pengingat).

### Fase 2 — Mode Workout
- Sesi workout terpandu: satu latihan per layar, set/repetisi, tombol "SET BERES".
- Timer istirahat berbasis timestamp + notifikasi terjadwal + haptics.
- Panel "CARA" (`cara_melakukan`, `tips_form`, `kesalahan_umum`, versi mudah/sulit).
- Pencatatan repetisi aktual per set ke repository; sesi tahan banting terhadap penutupan aplikasi.
- Latihan berbasis waktu (jalan/jogging/stretching) dengan timer durasi.

### Fase 3 — Log dan Progres
- Repository Dexie (IndexedDB) dengan migrasi versi.
- Checklist makan (kisaran kalori/protein sebagai info, bukan target kaku).
- Log berat badan mingguan + grafik `InkChart` + teks status netral.
- Log tidur + persentase malam tidur ≤ 22.00.
- Konsistensi mingguan ("5 dari 7 hari") tanpa streak yang menghukum.
- Ekspor/impor JSON (validasi Zod, pratinjau, konfirmasi).

### Fase 4 — Lokasi dan Cuaca
- Geolocation coarse + fallback manual.
- `WeatherProvider` + Open-Meteo; cache 1–3 jam; label data usang.
- Saran alternatif indoor pada hari lari (tidak memaksa).

### Fase 5 — Chat AI
- `ChatProvider` (Mock/Proxy/Firebase AI Logic) — tanpa key mentah di klien.
- UI `Balloon` + disclaimer + quick actions.
- System prompt + guardrail (menolak pertanyaan medis darurat, PII, konten berbahaya).
- Kuota/offline/error state; riwayat lokal + hapus.
- Uji red-team lolos semua (`RED_TEAM_TEST_REPORT.md`).

### Fase 6 — Poles dan Rilis
- Ikon aplikasi manga (jam petir + SFX "ZU!"), splash screen, status bar, safe area.
- Font kustom via `next/font`: Anton (display), Space Mono (angka), IBM Plex Sans (teks).
- Aksesibilitas: `aria-pressed`/`aria-current`/`aria-label`, target sentuh ≥ 44px, fokus-visible, font scale 130%, kontras tinggi.
- Performa: total bundle ~1.3 MB, prerender statis penuh.
- Build rilis bertanda tangan (keystore 10000 hari), `versionCode 100`, `versionName 1.0.0`.

### Pengaturan
- Nama paket: `com.routinezie.app`
- Bahasa UI: Bahasa Indonesia
- Mode default: fully offline (MockChatProvider) — siap untuk LLM nyata di produksi.
