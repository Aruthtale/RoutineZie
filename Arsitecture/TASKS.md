# TASKS.md — Roadmap dan Kriteria Selesai

Kerjakan **satu fase pada satu waktu**. Setiap tugas punya kriteria (AC = acceptance criteria). Jangan mengerjakan fase berikutnya sebelum fase aktif lolos Definition of Done (`agent.md` bagian 6).

## Fase 0 — Scaffold
- T0.1 Inisialisasi Next.js (App Router, TS strict, Tailwind) dengan `output: 'export'`.
  - AC: `npm run build` menghasilkan `out/`.
- T0.2 Pasang Capacitor + platform Android; `webDir: 'out'`.
  - AC: `npx cap sync android` dan aplikasi kosong berjalan di emulator/perangkat.
- T0.3 Tooling: ESLint, Prettier, `typecheck`, Vitest, skrip npm standar, `.env.example`.
  - AC: semua skrip berjalan hijau.
- T0.4 Token desain (`tokens.css`, `tone.css`, preset Tailwind) dan font via `next/font`.
  - AC: halaman contoh menampilkan token, tema terang/gelap, tanpa CDN.

## Fase 1 — Inti Jadwal
- T1.1 `lib/schedule`: schema Zod, loader, `parseWaktu`, `phase`, `getNowAndNext`, normalisasi `bagian`/`latihan`.
  - AC: unit test untuk semua hari di `jadwal_mingguan.json` (blok fleksibel, Sabtu `bagian`, Minggu kosong) lulus.
- T1.2 Layar **Hari Ini** sesuai `design.md` 6.1 (sekarang, berikutnya, hitung mundur, timeline).
  - AC: memperbarui tiap 30 dtk dan saat kembali foreground; blok fleksibel tampil tanpa error.
- T1.3 Layar **Minggu** (7 panel) + navigasi bawah.
  - AC: hari ini ditandai; membuka detail hari.
- T1.4 Tema mengikuti fase hari + pengaturan tema manual.
  - AC: wind-down = inversi; reduced-motion dihormati.
- T1.5 **Notifikasi lokal** (izin kontekstual, pengingat bawaan, pengaturan per pengingat).
  - AC: notifikasi muncul tepat waktu; tetap ada setelah restart perangkat; panduan optimasi baterai tersedia. ✅ **SELESAI v1.0.2**

## Fase 2 — Mode Workout
- T2.1 Sesi workout terpandu: satu latihan per layar, set/repetisi, tombol "SET BERES".
- T2.2 Timer istirahat berbasis timestamp + notifikasi terjadwal + haptics + `SfxStamp`.
  - AC: timer akurat saat layar mati/kembali dari background.
- T2.3 Panel "CARA" (cara_melakukan, tips_form, kesalahan_umum, versi mudah/sulit).
- T2.4 Catat repetisi aktual per set ke repository; sesi tahan banting terhadap penutupan aplikasi.
  - AC: menutup paksa aplikasi lalu membuka lagi memulihkan sesi.
- T2.5 Latihan berbasis waktu (jalan/jogging/stretching) dengan timer durasi.

## Fase 3 — Log dan Progres
- T3.1 Repository + Dexie (antarmuka siap ditukar SQLite), migrasi versi.
- T3.2 Checklist makan (kisaran kalori/protein sebagai info).
- T3.3 Log berat badan mingguan + grafik `InkChart` + teks status netral (`design.md` 6.5).
  - AC: berat turun 2x berturut-turut menampilkan pesan bicara dengan ortu/tenaga kesehatan.
- T3.4 Log tidur + persentase malam tidur ≤ 22.00 (netral).
- T3.5 Konsistensi mingguan ("5 dari 7 hari") tanpa streak menghukum.
- T3.6 Ekspor/impor JSON (validasi Zod, pratinjau, konfirmasi).

## Fase 4 — Lokasi dan Cuaca
- T4.1 Geolocation coarse + fallback manual.
- T4.2 `WeatherProvider` + Open-Meteo; cache 1–3 jam; label data usang.
- T4.3 Saran alternatif indoor pada hari lari (tidak memaksa).
- T4.4 (Opsional) `GoogleWeatherProvider` lewat proxy; perbandingan kualitas data.

## Fase 5 — Chat AI
- T5.1 `ChatProvider` + proxy/Firebase AI Logic (tanpa key mentah di klien).
- T5.2 UI `Balloon` + disclaimer + quick actions.
- T5.3 System prompt + guardrail (`AI_CHAT.md`), pembangun konteks minimal.
- T5.4 Kuota/offline/error state; riwayat lokal + hapus.
- T5.5 Uji red-team lolos semua (`TESTING.md`).

## Fase 6 — Poles dan Rilis
- T6.1 Ikon aplikasi, splash screen, status bar, safe area.
- T6.2 Aksesibilitas: font scale 130%, target sentuh, kontras.
- T6.3 Performa: waktu muat < 2 dtk pada perangkat menengah; code-splitting.
- T6.4 Build rilis bertanda tangan; `CHANGELOG.md`.

## Ide setelah rilis (jangan dikerjakan tanpa persetujuan)
Jam Subuh dinamis, Health Connect, Google Calendar, sinkron Firebase, widget layar utama (butuh kode native), tes kemampuan 4 mingguan otomatis, ekspor PDF ringkasan mingguan.
