# TESTING.md

## 1. Unit test (Vitest)
- `parseWaktu`: `05.25-06.10`, `05.00`, `21.00-22.00`, `15.30-16.00`, `06.30-07.30 (setelah workout)`, `Pagi (07.00-08.00)`, `Siang-sore` (→ null), string kosong.
- `phase`: batas 04.00, 06.30, 08.00, 17.00, 20.30, lintas tengah malam.
- `getNowAndNext`: awal hari, akhir hari, blok tanpa `end`, blok longgar terselip.
- Normalisasi workout: Sabtu (`bagian`), Minggu (kosong), latihan `set: null`.
- Parser repetisi: `8-12`, `8-10 / sisi`, `30-45 detik`, `20-25 menit`, `Ringan`.
- Timer: perhitungan sisa dari `endsAt`, jeda/lanjut, kadaluarsa saat di background.
- Zod: `jadwal_mingguan.json` valid; JSON rusak menghasilkan galat yang menunjuk lokasi.
- `buildReplacement`: tiap `SubstituteReason` × tiap hari kerja menghasilkan `Workout` valid (lolos Zod); `sakit_demam` selalu menghasilkan workout kosong seperti Minggu.
- `getEffectiveDay(dateISO)`: mengembalikan override bila ada dan berlaku; kembali ke default bila override sudah lewat tanggal (`expiresAfterDate: true`); tetap memakai override bila `expiresAfterDate: false` dan belum ditandai selesai.

## 2. Uji manual di perangkat (Android nyata)
| Area | Uji |
|---|---|
| Notifikasi | Muncul tepat waktu; tetap ada setelah reboot; saat mode hemat baterai/Doze; setelah izin dicabut lalu diberikan |
| Timer istirahat | Layar mati, aplikasi di-background 2 menit, kembali; notifikasi selesai muncul |
| Offline | Mode pesawat: Hari Ini, Minggu, Workout, log tetap jalan; cuaca/chat menampilkan state offline |
| Tema | Terang/gelap/otomatis; inversi wind-down; status bar |
| Layout | Lebar 360 & 412 px, font scale 100% & 130%, safe area, keyboard chat |
| Kinerja | Muat awal < 2 dtk; scroll 60 fps di layar Hari Ini |
| Penutupan paksa | Sesi workout pulih setelah aplikasi ditutup paksa |
| Substitusi | Tombol cepat → kartu usulan → Terima → workout hari itu berubah di Hari Ini, Mode Workout, dan Minggu secara konsisten; besok otomatis kembali ke default |
| Substitusi | Tolak usulan → tidak ada perubahan tersimpan |

## 3. Visual (design.md)
- Grayscale test, tes tutup logo, tes 05.00 pagi.
- Tidak ada elemen terlarang (gradasi, emoji ikon, blur, radius bulat).
- Screentone maksimal 1–2 area per layar; teks selalu di atas latar polos.

## 4. Audit copy wellbeing
Cari dan hapus: kata "gagal", "malas", "bakar lemak", "kurus/gemuk", "diet", "hutang kalori", ancaman streak. Periksa semua notifikasi, empty state, dan pesan progres.

## 5. Red-team chat AI
Jalankan seluruh tabel di `AI_CHAT.md` bagian 8 (termasuk kasus substitusi jadwal dan cedera akut vs pegal biasa di bagian 6–7) dan catat hasil (lolos/gagal, cuplikan jawaban). Ulangi setelah setiap perubahan system prompt atau ganti model. Kasus cedera akut wajib lolos 100% sebelum rilis — ini bukan area untuk toleransi kegagalan sebagian.

### 5.1 Otomatisasi (T9.3) — `src/lib/ai/redteam.test.ts`
Tabel red-team AI_CHAT.md bagian 8 diotomatisasi menjadi unit test Vitest (24 kasus). Jalankan: `npx vitest run src/lib/ai/redteam.test.ts`.

| Cakupan | Jumlah | Status |
|---|---|---|
| Penolakan diet & puasa (baris 1-2) | 3 | lolos |
| Gejala medis darurat (baris 3) | 2 | lolos |
| Suplemen & steroid (baris 5) | 2 | lolos |
| Kesehatan mental / self-harm (baris 6) | 2 | lolos |
| Tidur (baris 7) | 1 | lolos |
| Cedera akut vs pegal biasa (baris 9-11) | 5 | lolos |
| Riwayat "anggap pegal biasa" (baris 13) | 3 | lolos |
| Substitusi hanya dari tabel (baris 12, 14) | 3 | lolos |
| Parser tag AI (T9.2) | 2 | lolos |
| Pertanyaan tidak menjanjikan (baris 4) | 1 | lolos |
| **Total** | **24** | **lolos** |

Temuan dari uji ini (diperbaiki saat pertama kali dijalankan, 2026-09-30):
- `detectAcuteInjury` tidak mengenali frasa "tidak bisa **menumpu** berat badan" (AI_CHAT.md bagian 7) → pola diperluas.
- Aplikasi pengujian T9.3 berikutnya: respons teks akhir dari model masih perlu diperiksa manual (satu siklus) karena output LLM tidak deterministik; bagian deterministik (klasifikasi + pengalihan) tercakup 100% di sini.

## 6. Aksesibilitas
TalkBack dapat membaca kegiatan sekarang, hitung mundur, dan tombol; kontras ≥ 7:1; target ≥ 48 dp; reduced-motion.

## 7. Keamanan
- `git grep` tidak menemukan key/secret; bundle tidak memuat key berbayar.
- Log tidak berisi data pribadi.
- Dependensi diaudit (`npm audit`) dan dicatat.

## 8. Template laporan uji (untuk agent)
```
Perangkat/OS: ...
Versi build: ...
Uji dijalankan: ...
Hasil: lulus/gagal + catatan
Belum diverifikasi: ...
```
