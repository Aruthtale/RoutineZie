# agent.md — Aturan Kerja untuk AI Coding Agent

> Nama proyek sementara: **Zenn Routine** (bisa diganti). Baca file ini SEBELUM menulis kode apa pun.
> Catatan: sebagian tool membaca nama file tertentu (mis. `AGENTS.md`, `GEMINI.md`, atau folder rules milik tool). Jika perlu, salin/ubah nama file ini sesuai konvensi tool yang dipakai.

## 1. Misi

Bangun aplikasi Android **offline-first** bernama Zenn Routine: asisten rutinitas harian yang tahu **sekarang jam berapa dan harus apa** berdasarkan jadwal PKL + workout + makan + tidur milik satu pengguna (laki-laki, 17 tahun). Data jadwal ada di `data/jadwal_mingguan.json`.

Tujuan pengguna: energi, kebugaran, dan **menambah massa tubuh secara bertahap**, dengan tidur cukup (target 21.00–21.30, batas 22.00, bangun 05.00).

## 2. Urutan baca dokumen

1. `agent.md` (ini)
2. `PRD.md` — apa dan kenapa
3. `ARCHITECTURE.md` — stack, struktur folder, batasan teknis
4. `DATA_SCHEMA.md` — bentuk JSON, tipe, aturan parsing
5. `design.md` — sistem desain (manga-neubrutalism hitam-putih)
6. `skill.md` — playbook implementasi (resep per jenis tugas)
7. `INTEGRATIONS.md`, `AI_CHAT.md` — hanya saat mengerjakan fitur terkait
8. `TASKS.md` — daftar tugas dan kriteria selesai
9. `TESTING.md` — cara menguji

Jika dokumen saling bertentangan, urutan prioritas: **aturan keselamatan/wellbeing di file ini > ARCHITECTURE > DATA_SCHEMA > design > TASKS**.

## 3. Tech stack (terkunci, jangan ganti tanpa persetujuan)

- Next.js (App Router) + TypeScript strict, **static export** (`output: 'export'`)
- Capacitor untuk Android (`webDir: 'out'`)
- Tailwind CSS (token kustom, bukan default)
- Zustand (state), Zod (validasi data)
- Penyimpanan: `@capacitor/preferences` untuk pengaturan; log lewat lapisan repository (awal: Dexie/IndexedDB, bisa diganti SQLite tanpa mengubah UI)
- Plugin Capacitor: local-notifications, geolocation, haptics, share, (opsional) app, status-bar, splash-screen
- Font di-bundel lewat `next/font` (tanpa CDN saat runtime)

## 4. Aturan keras

### 4.1 Wellbeing (prioritas tertinggi)
Pengguna masih di bawah 18 tahun dan berat badan relatif ringan (BMI ±16,4). Karena itu:

- **DILARANG** membuat fitur atau copy yang mendorong defisit kalori, puasa, "bakar kalori", penurunan berat badan, atau membandingkan tubuh.
- **DILARANG** streak yang "hangus" atau bahasa yang membuat merasa bersalah/gagal. Gunakan konsistensi mingguan ("5 dari 7 hari").
- Kalori hanya ditampilkan sebagai **kisaran informasi**, bukan target ketat atau skor.
- Pelacak berat badan: maksimum 1x/minggu, tampilan netral. Jika berat **turun** dua kali berturut-turut, tampilkan pesan untuk bicara dengan orang tua/wali dan tenaga kesehatan (teks di `design.md`).
- Tidak ada klaim medis. Jangan menjanjikan penambahan tinggi badan.
- Tidur adalah prioritas: **jangan pernah** menjadwalkan sesuatu yang membuat tidur lewat 22.00.
- Chat AI wajib mengikuti `AI_CHAT.md` (guardrail).

### 4.2 Teknis
- Tidak ada API route, SSR, middleware, atau server actions (static export). Backend, jika ada, adalah layanan terpisah dan opsional.
- **Jangan menaruh secret/API key di kode klien.** Anggap semua yang ada di bundle bisa dibongkar. Gunakan proxy atau layanan dengan proteksi (lihat `INTEGRATIONS.md`, `AI_CHAT.md`).
- Aplikasi harus berfungsi **offline** untuk fitur inti (jadwal, workout, log, notifikasi). Cuaca dan chat AI adalah peningkatan opsional dengan fallback yang jelas.
- Semua data jadwal divalidasi dengan Zod saat dimuat. Jangan mengakses JSON tanpa lewat parser di `src/lib/schedule`.
- Waktu memakai zona waktu perangkat (`Intl`); jangan hardcode zona.
- Timer berbasis **timestamp akhir**, bukan hitung mundur `setInterval` murni (webview melambat di background).
- Tidak ada `localStorage` untuk data penting; gunakan Preferences/repository.
- Aksesibilitas: target sentuh ≥ 48 dp, hormati `prefers-reduced-motion`, kontras tinggi, status tidak hanya disampaikan lewat pola/warna.
- Jangan menambah dependency berat tanpa alasan. Setiap dependency baru: catat alasan dan ukuran.

### 4.3 Desain
- Ikuti `design.md` secara ketat. Gaya: **neubrutalism hitam-putih dengan kosakata manga** (panel, screentone, garis kecepatan, onomatopoeia).
- DILARANG: gradasi, glassmorphism, warna ungu-biru bawaan AI, emoji sebagai ikon UI, ikon ✨ untuk AI, `rounded-2xl` + bayangan lembut, kartu seragam tanpa hierarki.
- Jangan menyalin karakter, tata letak, atau aset dari manga/komik nyata.

### 4.4 Disiplin lingkup
- Kerjakan hanya yang ada di `TASKS.md` untuk fase aktif. Ide tambahan → catat di bagian "Saran" pada laporan akhir, jangan diimplementasikan.
- Jika ada ambiguitas: pilih default paling aman dan konservatif, lalu tulis di bagian **Keputusan** pada laporan akhir. Hanya berhenti dan bertanya untuk hal yang berisiko (data pengguna, izin, biaya, keamanan).

## 5. Alur kerja tiap tugas

1. Baca dokumen yang relevan (bagian 2) dan cari resep di `skill.md`.
2. Tulis rencana singkat (file yang akan diubah, risiko).
3. Implementasi kecil dan bertahap; commit terpisah per unit logis (Conventional Commits, bahasa Inggris: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`).
4. Tulis/perbarui test untuk logika murni (parser waktu, fase hari, next-block, timer).
5. Jalankan: lint, typecheck, test, build export. Untuk perubahan native: `cap sync` lalu uji di perangkat/emulator.
6. Periksa checklist Definition of Done.
7. Laporkan: apa yang berubah, cara mengujinya, **Keputusan** yang diambil, **Saran**, dan hal yang belum diverifikasi.

## 6. Definition of Done

- [ ] Fitur sesuai kriteria di `TASKS.md`
- [ ] `tsc --noEmit`, lint, dan test lulus; `next build` (export) sukses
- [ ] Tidak ada secret di repo; tidak ada `console.log` sisa
- [ ] Berfungsi offline (mode pesawat) untuk fitur inti
- [ ] Sesuai `design.md` (token, tipografi, tanpa elemen terlarang)
- [ ] Lolos audit copy wellbeing (bagian 4.1)
- [ ] Layar diuji pada lebar 360 px dan 412 px, mode terang dan gelap
- [ ] Dokumen terkait diperbarui bila kontrak berubah

## 7. Perintah standar (sesuaikan bila berbeda di `package.json`)

```bash
npm run dev            # pengembangan web
npm run lint
npm run typecheck      # tsc --noEmit
npm run test
npm run build          # next build (menghasilkan folder out/)
npx cap sync android   # salin out/ + sinkron plugin
npx cap run android    # jalankan di perangkat/emulator
```

## 8. Gaya komunikasi

- Bahasa Indonesia, ringkas, langsung ke inti. Istilah teknis boleh bahasa Inggris.
- Teks UI dalam bahasa Indonesia sehari-hari, santai, spesifik (lihat "Suara & copy" di `design.md`).
- Jangan menyatakan sesuatu "sudah berfungsi" jika belum diuji; sebutkan apa yang diuji dan bagaimana.
