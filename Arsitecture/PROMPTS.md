# PROMPTS.md — Prompt Siap Pakai untuk Agent (Antigravity dll.)

## Cara memakai
1. Letakkan semua file di root repo (atau folder `docs/` dan sebutkan path-nya di prompt). Salin `agent.md` ke nama file yang dibaca tool Anda bila perlu (mis. `AGENTS.md`).
2. Berikan **satu prompt per fase**. Jangan minta semua fase sekaligus.
3. Setelah tiap fase: jalankan uji di `TESTING.md`, lalu gunakan Prompt Review sebelum lanjut.
4. Perbarui bagian [KURUNG SIKU] sesuai kebutuhan.

---

## Prompt 0 — Kickoff (Fase 0 + Fase 1)

```
Kamu adalah AI coding agent yang membangun aplikasi Android "Zenn Routine" (Next.js static export + Capacitor).

Baca dulu, berurutan: agent.md, PRD.md, ARCHITECTURE.md, DATA_SCHEMA.md, design.md, skill.md, TASKS.md. Data jadwal ada di data/jadwal_mingguan.json. Ikuti semua aturan di agent.md, terutama bagian wellbeing (pengguna 17 tahun, tujuan menambah berat badan; dilarang fitur/copy diet, bakar kalori, atau streak menghukum) dan larangan secret di klien.

Tugasmu: kerjakan Fase 0 (scaffold) lalu Fase 1 (Inti Jadwal) di TASKS.md — HANYA dua fase itu.

Ketentuan:
1. Mulai dengan rencana singkat (file yang akan dibuat, risiko), lalu implementasi bertahap dengan commit kecil (Conventional Commits).
2. Semua data jadwal lewat lib/schedule (Zod + parser). Tangani blok waktu longgar, Sabtu memakai "bagian", dan Minggu tanpa latihan (lihat DATA_SCHEMA.md bagian 4).
3. Terapkan design.md secara ketat: manga-neubrutalism hitam-putih, token CSS, tanpa gradasi/glassmorphism/emoji ikon/rounded-2xl. Font di-bundel via next/font.
4. Tulis unit test untuk parseWaktu, phase, getNowAndNext, dan normalisasi workout.
5. Jalankan lint, typecheck, test, dan build export; laporkan hasilnya jujur (apa yang diuji, apa yang belum).
6. Jangan mengerjakan fitur di luar Fase 0–1. Ide tambahan taruh di "Saran".

Format laporan akhir: Ringkasan perubahan • Cara menjalankan/menguji • Keputusan yang kuambil • Saran • Belum diverifikasi.
Gunakan bahasa Indonesia.
```

## Prompt 1 — Fase 2 (Mode Workout)
```
Lanjutkan proyek Zenn Routine. Baca ulang agent.md, skill.md (Resep D), design.md 6.2, dan TASKS.md Fase 2.
Kerjakan HANYA Fase 2 (T2.1–T2.5): sesi workout terpandu, timer istirahat berbasis timestamp + notifikasi terjadwal + haptics + SfxStamp, panel CARA dari data JSON, log repetisi aktual per set, dan latihan berbasis waktu.
Syarat: sesi harus pulih setelah aplikasi ditutup paksa; tidak ada bahasa gagal/bersalah; timer akurat saat layar mati. Tambahkan unit test untuk logika timer dan parser repetisi.
Laporan: Ringkasan • Cara uji di perangkat • Keputusan • Saran • Belum diverifikasi.
```

## Prompt 2 — Fase 3 (Log dan Progres)
```
Lanjutkan Zenn Routine. Baca agent.md (bagian 4.1 wellbeing), design.md 6.4–6.5, DATA_SCHEMA.md bagian 5–6, TASKS.md Fase 3.
Kerjakan HANYA Fase 3: repository + Dexie (antarmuka siap ditukar SQLite) dengan migrasi versi, checklist makan (kalori hanya info), log berat badan mingguan + InkChart + teks status netral (aturan berat turun 2x berturut-turut), log tidur, konsistensi mingguan, ekspor/impor JSON dengan validasi dan konfirmasi.
Larangan: target penurunan berat, skor kalori, streak menghukum. Tambahkan test migrasi dan validasi impor.
Laporan seperti format biasa.
```

## Prompt 3 — Fase 4 (Lokasi & Cuaca)
```
Lanjutkan Zenn Routine. Baca INTEGRATIONS.md bagian 1, 2, 7 dan TASKS.md Fase 4.
Kerjakan HANYA T4.1–T4.3: Geolocation coarse dengan fallback manual, WeatherProvider (default Open-Meteo, tanpa key), cache 1–3 jam dengan label data usang, dan saran alternatif indoor pada hari lari (tidak memaksa).
Jangan menambahkan key berbayar ke klien. Siapkan antarmuka agar GoogleWeatherProvider via proxy bisa ditambahkan nanti. Semua fitur inti tetap berjalan bila izin lokasi ditolak atau offline.
Laporan seperti format biasa.
```

## Prompt 4 — Fase 5 (Chat AI)
```
Lanjutkan Zenn Routine. Baca AI_CHAT.md secara penuh, agent.md 4.1, design.md 6.6, TASKS.md Fase 5.
Kerjakan HANYA Fase 5: ChatProvider (tanpa API key mentah di klien — gunakan Firebase AI Logic dengan App Check atau proxy tipis; jelaskan pilihan dan risikonya), UI Balloon + disclaimer + quick actions, pembangun konteks minimal dari jadwal hari ini, system prompt sesuai AI_CHAT.md bagian 3, state offline/kuota habis/error, riwayat lokal dengan tombol hapus.
Wajib: buat skrip/berkas uji red-team berdasarkan tabel di AI_CHAT.md bagian 6 dan laporkan hasilnya. Jika tidak bisa memanggil model sungguhan, tandai sebagai "belum diverifikasi".
```

## Prompt 5 — Fase 6 (Poles & Rilis)
```
Lanjutkan Zenn Routine. Baca TESTING.md dan TASKS.md Fase 6.
Kerjakan HANYA Fase 6: ikon & splash hitam-putih sesuai design.md bagian 10, status bar/safe area, aksesibilitas (font scale 130%, TalkBack, target sentuh, kontras), performa (code-splitting, waktu muat), build rilis bertanda tangan (keystore di luar repo) dan CHANGELOG.md.
Sertakan daftar uji manual di perangkat yang belum bisa kamu jalankan sendiri.
```

---

## Prompt Review (sesudah tiap fase)
```
Lakukan code review dan audit terhadap hasil fase terakhir, tanpa mengubah kode kecuali memperbaiki bug jelas.
Periksa: (1) kepatuhan agent.md (wellbeing, secret, offline, timer timestamp), (2) kepatuhan design.md (token, elemen terlarang, screentone ≤ 2 area/layar, kontras), (3) audit copy wellbeing di semua teks UI dan notifikasi, (4) cakupan test dan kasus tepi di DATA_SCHEMA.md bagian 4, (5) keamanan (git grep secret, NEXT_PUBLIC_*), (6) risiko performa.
Keluaran: daftar temuan berperingkat (Kritis/Penting/Kecil) dengan file:baris dan saran perbaikan singkat.
```

## Prompt Perbaikan Bug (template)
```
Bug: [deskripsi]. Langkah reproduksi: [1..n]. Perilaku diharapkan: [..]. Perangkat/OS: [..].
Baca agent.md dan dokumen terkait. Cari akar masalah dulu (jelaskan), buat perbaikan minimal, tambahkan test regresi bila logika murni, dan jangan mengubah hal di luar lingkup bug.
Laporan: Akar masalah • Perbaikan • Cara uji • Risiko.
```

## Prompt Audit Anti-Slop Desain
```
Audit seluruh UI terhadap design.md. Laporkan setiap pelanggaran: gradasi/blur, emoji sebagai ikon, radius bulat, bayangan lembut, kartu seragam tanpa hierarki, screentone berlebihan, teks di atas pola, font di luar token, ikon tidak konsisten, copy generik/menghakimi. Sertakan screenshot atau path komponen dan perbaikan yang diusulkan. Jalankan tes grayscale dan tes "tutup logo" pada tiap layar utama.
```

## Prompt Impor Jadwal Baru (opsional)
```
Saya akan menempelkan PDF/teks jadwal baru untuk hari [..]. Ubah menjadi objek Hari sesuai DATA_SCHEMA.md (semua field: jadwal, workout, pola_makan, ringkasan_energi, catatan_khusus). Validasi dengan Zod dan laporkan asumsi yang kamu buat. Jangan mengubah hari lain.
```
