# PRD.md — Product Requirements

## 1. Ringkasan
**Zenn Routine** adalah aplikasi Android pribadi (offline-first) yang menampilkan dan memandu rutinitas harian: bangun, Subuh, workout, makan, PKL, belajar/project, dan tidur. Data awal dari `data/jadwal_mingguan.json`.

## 2. Pengguna
Satu pengguna utama: laki-laki, 17 tahun, 160 cm / 42 kg, PKL Senin–Jumat 08.00–17.00, tanpa alat khusus (tersedia 2 barbel @ 2 kg). Kemampuan awal: push-up 20, sit-up 20, squat 20, plank 1 menit 30 detik.

## 3. Masalah
Rutinitas padat dan terikat waktu; mudah terlewat tanpa pengingat kontekstual. Pengguna butuh satu tempat yang menjawab "sekarang harus apa?", memandu latihan, dan menjaga tidur/makan tetap cukup.

## 4. Tujuan
1. Menampilkan kegiatan sekarang dan berikutnya dengan hitung mundur.
2. Pengingat tepat waktu (bangun, workout, makan, tidur).
3. Memandu workout (set, repetisi, timer istirahat, cara melakukan).
4. Mencatat progres secara ringan (repetisi, berat badan mingguan, tidur).
5. Pengalaman visual khas: manga-neubrutalism hitam-putih (`design.md`).

## 5. Bukan tujuan (non-goals)
- Bukan aplikasi diet/penghitung kalori ketat; tidak ada target penurunan berat.
- Tidak ada fitur sosial, papan peringkat, atau streak menghukum.
- Tidak ada klaim medis atau janji penambahan tinggi badan.
- Tidak ada akun/pendaftaran wajib pada MVP.

## 6. Prinsip produk
1. **Sekarang dulu**: layar utama = kegiatan sekarang.
2. **Tidur adalah prioritas**: tidak ada fitur yang mendorong begadang.
3. **Cukup makan**: pesan selalu mendukung asupan cukup, bukan pembatasan.
4. **Offline dulu**: fitur inti tanpa internet.
5. **Tenang, bukan menghakimi**: tanpa bahasa gagal/bersalah.
6. **Data milik pengguna**: minim pengiriman data ke pihak ketiga; transparan bila ada.

## 7. Fitur
### MVP (Fase 1–3)
- Layar Hari Ini (sekarang/berikutnya/hitung mundur/timeline)
- Tampilan Minggu (7 hari)
- Pengingat lokal (bisa diatur)
- Mode Workout terpandu (timer istirahat, catat repetisi)
- Checklist makan (kisaran kalori sebagai informasi)
- Log berat badan mingguan dan tidur; grafik sederhana
- Tema terang/gelap + fase hari
- Impor/ekspor jadwal JSON, validasi Zod

### Fase lanjut (4–6)
- Cuaca + saran alternatif indoor
- Chat AI dengan konteks jadwal + guardrail
- Tes kemampuan 4 mingguan, saran progresi
- Jam Subuh dinamis (offline, mis. library perhitungan jadwal sholat)
- Ekspor ringkasan mingguan (PDF/gambar)
- Sinkron/backup (Firebase), ekspor Google Calendar, Health Connect

## 8. Metrik keberhasilan (pribadi, tanpa penilaian menghukum)
- Konsistensi mingguan: ≥ 5 dari 7 hari kegiatan inti terpenuhi
- Persentase malam tidur ≤ 22.00
- Tren berat badan mingguan naik perlahan (±0,25–0,5 kg/minggu, kisaran informasi)
- Waktu dari buka aplikasi ke mengetahui "sekarang harus apa" < 2 detik

## 9. Batasan dan asumsi
- Android saja; Next.js static export + Capacitor
- Pengguna di bawah 18 tahun: privasi dan wellbeing diutamakan
- Angka kalori/protein adalah perkiraan kasar dan bukan saran medis
- Akun billing layanan cloud memerlukan persetujuan/pengelolaan orang tua/wali

## 10. Risiko dan mitigasi
| Risiko | Mitigasi |
|---|---|
| Notifikasi tidak muncul di HP dengan penghemat baterai agresif | Panduan onboarding, uji reboot/doze |
| Timer melambat di webview | Timer berbasis timestamp + notifikasi terjadwal |
| Key API terekspos | Proxy/App Check, batasi API, kuota dan budget alert |
| Chat AI memberi saran tidak aman | System prompt guardrail, uji red-team (`AI_CHAT.md`) |
| Desain terlalu padat/melelahkan | Screentone terbatas, banyak ruang putih, tes 05.00 pagi |
| Data JSON berubah bentuk | Zod + versi skema + fallback |
