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
  - AC: notifikasi muncul tepat waktu; tetap ada setelah restart perangkat; panduan optimasi baterai tersedia.

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

## Fase 7 — Substitusi Jadwal (rule-based, tanpa AI)
- T7.1 Tabel substitusi statis `src/lib/schedule/substitutions.ts` sesuai `DATA_SCHEMA.md` 7.1–7.2 (`buildReplacement` per alasan, fungsi murni).
  - AC: unit test untuk tiap `SubstituteReason` × tiap hari kerja (Senin–Jumat, Sabtu) menghasilkan `Workout` valid (lolos Zod).
- T7.2 `ScheduleOverride` repository + `getEffectiveDay(dateISO)` yang dicek di semua tempat penampil workout (Hari Ini, Mode Workout, Minggu).
  - AC: override hari ini tampil di ketiga layar; besok otomatis kembali ke default tanpa aksi manual (kecuali `expiresAfterDate: false`).
- T7.3 Tombol cepat di layar Hari Ini (🦵 Kaki/lutut, 💪 Tangan/bahu, 😴 Capek, 🤒 Sakit/demam) → kartu usulan → konfirmasi → tulis override.
  - AC: tidak ada auto-apply tanpa konfirmasi; kartu usulan sesuai `design.md` bagian 13.1.
- T7.4 Indikator "hari ini disubstitusi" pada Hari Ini dan Minggu (mis. `Tag` "DIGANTI" + alasan singkat), dengan opsi "batalkan, pakai jadwal asli".
- T7.5 UI harian sederhana untuk override `expiresAfterDate: false` ("masih berlaku hari ini?" ya/tidak) agar tidak menggantung diam-diam.

## Fase 8 — Ekspansi Fitur Tab (Makan, Progres, Pengaturan, Chat, Jadwal)
Rujuk `skill.md` Resep K–L untuk detail tiap fitur.
- T8.1 **Makan**: checklist per slot, alternatif menu per slot, daftar belanja mingguan (agregasi 7 hari), pelacak air minum, log cepat "kalau lapar".
- T8.2 **Progres**: grafik berat + catatan mingguan, tes kemampuan 4 mingguan + riwayat, grid stempel riwayat latihan, milestone sebagai stempel, skor tidur mingguan, riwayat override (pola alasan), ekspor ringkasan mingguan.
- T8.3 **Pengaturan**: jam tiap pengingat on/off, tema, edit profil (`kemampuan_saat_ini`, tinggi/berat) sebagai override lokal (tanpa mengubah file JSON asal), edit jam PKL, kontrol lokasi, status kuota chat AI, panduan izin/baterai + tombol notifikasi contoh, ekspor/impor data, tentang aplikasi + disclaimer.
- T8.4 **Chat**: starter prompts di state kosong, jawaban penjelasan gerakan sebagai kartu `Latihan` (bukan teks polos), rangkum minggu dari data Progres.
- T8.5 **Jadwal**: hitung mundur ke jam pulang PKL, swipe antar hari.
- T8.6 **Rating energi pasca-workout**: 5 titik tinta opsional setelah sesi selesai, mengisi `WorkoutLog.energyRating`.
  - AC per T8.x: masing-masing state kosong/error/offline ada; lolos audit copy wellbeing (`agent.md` 4.1); sesuai `design.md`.

## Fase 9 — Substitusi Jadwal via Chat AI
Prasyarat: Fase 5 (Chat AI dasar) dan Fase 7 (tabel substitusi) sudah selesai.
- T9.1 Pemetaan maksud pengguna → `SubstituteReason` tertutup (bukan generative content untuk penggantinya); lihat `skill.md` Resep J dan `AI_CHAT.md` bagian 6.
- T9.2 Kartu usulan di dalam thread chat memakai komponen yang sama dengan T7.3 (bukan daftar latihan yang ditulis ulang AI dalam teks).
- T9.3 Guardrail cedera akut vs pegal biasa (`AI_CHAT.md` bagian 7) diterapkan dan diuji.
  - AC: semua baris baru di tabel red-team `AI_CHAT.md` bagian 8 (kasus kepeleset, bengkak, "anggap pegal biasa", permintaan di luar tabel) lolos, dicatat di `TESTING.md`.
- T9.4 Fallback untuk permintaan di luar kategori: AI menjelaskan keterbatasan, menawarkan opsi aman dari tabel, tidak menyusun program baru.

## Fase 10 — Audit Anti-Slop & Elemen 3D (opsional, setelah Fase 1–3 stabil dan sudah dipakai nyata)
- T10.1 **Audit komposisi seluruh layar** terhadap `design.md` bagian 11 (checklist 11.6). Perbaiki minimal: variasi ukuran panel, ikon inti gambar ulang (bukan library mentah), 1 elemen full-bleed/miring per layar utama.
  - AC: setiap layar lolos ≥ 5/6 poin checklist 11.6; dicatat per layar di laporan.
- T10.2 Gambar ulang 6–8 ikon inti sebagai SVG guratan tinta (lihat `design.md` 11.2), simpan di `src/components/icons/`.
  - AC: ikon lama dari library umum diganti di semua layar yang memakainya.
- T10.3 (Opsional) **Elemen 3D pertama**: stempel 3D saat set selesai di Mode Workout, sesuai `THREE_JS.md`.
  - AC: fallback 2D berfungsi, render loop berhenti saat tidak terlihat, diuji FPS di perangkat Android menengah-bawah nyata, memenuhi Definition of Done tambahan di `THREE_JS.md` bagian 11.

## Ide setelah rilis (jangan dikerjakan tanpa persetujuan)
Jam Subuh dinamis, Health Connect, Google Calendar, sinkron Firebase, widget layar utama (butuh kode native), tes kemampuan 4 mingguan otomatis, ekspor PDF ringkasan mingguan, elemen 3D tambahan di luar T10.3 (menara progres, transisi page-flip).
