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

## Prompt 6 — Fase 7 (Substitusi Jadwal, rule-based)
```
Lanjutkan Zenn Routine. Baca DATA_SCHEMA.md bagian 7, skill.md Resep I, design.md bagian 13.1, agent.md (aturan substitusi & cedera akut), dan TASKS.md Fase 7.
Kerjakan HANYA Fase 7 (T7.1-T7.5): tabel substitusi statis (bukan mengarang di komponen UI), repository ScheduleOverride + getEffectiveDay yang dipakai konsisten di Hari Ini/Mode Workout/Minggu, tombol cepat dengan kartu usulan wajib konfirmasi (tidak ada auto-apply), indikator "DIGANTI" dengan opsi batalkan, dan penanganan override yang tidak otomatis kedaluwarsa.
Wajib: jadwal default di data/jadwal_mingguan.json TIDAK PERNAH ditulis ulang; override tersimpan terpisah. Tambahkan unit test buildReplacement dan getEffectiveDay sesuai TESTING.md.
Laporan seperti format biasa.
```

## Prompt 7 — Fase 8 (Ekspansi Fitur Tab)
```
Lanjutkan Zenn Routine. Baca skill.md Resep K-L, design.md bagian 13.2-13.4, dan TASKS.md Fase 8.
Kerjakan HANYA Fase 8 (T8.1-T8.6). Boleh dikerjakan bertahap per tab jika terlalu besar untuk satu sesi -- sebutkan di rencana awalmu tab mana yang kamu kerjakan dulu (sarankan urutan: Pengaturan -> Makan -> Progres -> Chat -> Jadwal, karena Pengaturan dibutuhkan fitur lain).
Untuk tiap fitur: sesuai design.md (grid stempel biner untuk riwayat, titik tinta untuk rating energi, bukan bintang/emoji), lolos audit copy wellbeing agent.md 4.1 (tidak ada skor kalori ketat, tidak ada streak menghukum), ada state kosong/error/offline.
Edit profil dan jam PKL di Pengaturan disimpan sebagai override lokal, TIDAK mengubah data/jadwal_mingguan.json.
Laporan: tab yang selesai, tab yang belum, Keputusan, Saran, Belum diverifikasi.
```

## Prompt 8 — Fase 9 (Substitusi Jadwal via Chat AI)
```
Lanjutkan Zenn Routine. Prasyarat: Fase 5 (Chat AI) dan Fase 7 (tabel substitusi) sudah selesai -- konfirmasi dulu sebelum mulai.
Baca AI_CHAT.md bagian 6-8 secara penuh, skill.md Resep J, dan TASKS.md Fase 9.
Kerjakan HANYA Fase 9 (T9.1-T9.4): pemetaan maksud pengguna ke SubstituteReason tertutup (bukan AI menyusun latihan pengganti dalam teks), kartu usulan di chat memakai komponen sama dengan tombol cepat (T7.3), guardrail cedera akut vs pegal biasa, fallback untuk permintaan di luar tabel.
WAJIB: jalankan semua baris baru di tabel red-team AI_CHAT.md bagian 8 (kasus kepeleset, bengkak, "anggap pegal biasa", permintaan di luar tabel) dan laporkan hasil lolos/gagal per kasus. Kasus cedera akut harus 100% lolos sebelum kamu menandai fase ini selesai -- jika ada yang gagal, perbaiki dan uji ulang, jangan lanjut ke fase lain.
Laporan: hasil red-team lengkap, Keputusan, Belum diverifikasi.
```

## Prompt 9 — Fase 10 (Audit Komposisi & Ikon Kustom)
```
Lanjutkan Zenn Routine. Aplikasi sudah jalan di HP tapi desainnya masih terasa "AI slop" walau token warna sudah sesuai design.md.
Baca design.md bagian 11 (Diagnosis: kenapa masih terasa AI slop) dan TASKS.md Fase 7.
Kerjakan HANYA T7.1–T7.2:
1. Audit tiap layar utama (Hari Ini, Minggu, Workout, Makan, Progres) terhadap checklist 11.6. Untuk tiap layar, tuliskan skor (berapa dari 6 poin lolos) dan sebutkan poin yang gagal secara spesifik dengan path komponen/file.
2. Perbaiki: variasikan ukuran panel (jangan seragam), tambahkan minimal 1 elemen full-bleed atau miring sengaja per layar utama, dan gambar ulang 6-8 ikon inti sebagai SVG guratan tinta 3px (bukan pakai library ikon mentah) — simpan di src/components/icons/.
3. JANGAN mengubah palet warna, struktur data, atau fitur di luar tata letak/ikon.
Laporan: skor sebelum/sesudah per layar, daftar file yang diubah, screenshot deskripsi (jika ada tooling), Keputusan, Saran, Belum diverifikasi.
```

## Prompt 10 — Elemen 3D (Stempel Tinta, opsional)
```
Lanjutkan Zenn Routine. Baca design.md bagian 12 dan THREE_JS.md secara penuh sebelum menulis kode apa pun.
Tambahkan SATU elemen 3D: stempel tinta 3D yang muncul saat pengguna menandai satu set selesai di Mode Workout (T7.3 di TASKS.md).
Wajib ikuti THREE_JS.md: instalasi via npm (bukan CDN), lazy-load dengan dynamic import ssr:false, material toon + outline hitam-putih (bukan realistis), render loop berhenti otomatis setelah animasi ±400-600ms dan saat layar tak terlihat, deteksi WebGL/reduced-motion sebelum mount dengan fallback ke SfxStamp 2D yang sudah ada.
Jangan menambahkan three.js ke layar lain. Jangan membuat objek 3D dekoratif tanpa fungsi (bola/partikel mengambang).
Uji di perangkat Android menengah-bawah nyata jika tersedia; catat FPS kasar dan ukuran chunk bundle 3D terpisah dari bundle utama.
Laporan: Ringkasan • Cara uji • Hasil Definition of Done THREE_JS.md bagian 11 (checklist lolos/gagal) • Keputusan • Belum diverifikasi.
```

## Prompt Impor Jadwal Baru (opsional)
```
Saya akan menempelkan PDF/teks jadwal baru untuk hari [..]. Ubah menjadi objek Hari sesuai DATA_SCHEMA.md (semua field: jadwal, workout, pola_makan, ringkasan_energi, catatan_khusus). Validasi dengan Zod dan laporkan asumsi yang kamu buat. Jangan mengubah hari lain.
```
