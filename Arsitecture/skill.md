---
name: zenn-routine-builder
description: Playbook untuk membangun dan memodifikasi aplikasi Android "Zenn Routine" (Next.js static export + Capacitor) berbasis jadwal PKL, workout, makan, dan tidur. Gunakan saat menambah layar, mem-parsing jadwal, membuat notifikasi, timer istirahat, integrasi cuaca/lokasi, chat AI, atau menerapkan gaya visual manga-neubrutalism hitam-putih.
---

# skill.md — Zenn Routine Builder

Playbook ini berisi resep konkret. Selalu baca `agent.md` dulu; skill ini tidak menggantikannya.

## Kapan memakai skill ini
Setiap tugas di repo ini: layar baru, logika jadwal, notifikasi, timer, cuaca, chat AI, styling, build Android.

## Prinsip inti
1. **Jadwal adalah data**, bukan hard-code. Semua tampilan berasal dari `data/jadwal_mingguan.json` yang divalidasi Zod.
2. **Fokus pada "sekarang"**: setiap layar utama menjawab "apa yang harus kulakukan sekarang dan berikutnya".
3. **Offline dulu**; jaringan hanya peningkatan.
4. **Tenang, bukan menghakimi**: tidak ada bahasa gagal/bersalah (lihat `agent.md` 4.1).

---

## Resep A — Menambah layar baru
1. Cek `TASKS.md` untuk kriteria layar dan `design.md` untuk komponen.
2. Buat rute di `src/app/<layar>/page.tsx` (client component bila perlu state/timer). Semua rute harus bisa di-export statis (tidak ada rute dinamis tanpa `generateStaticParams`).
3. Logika di `src/features/<layar>/`, komponen UI murni di `src/components/`.
4. Gunakan hanya token dari `design.md` (variabel CSS + preset Tailwind). Jangan menulis warna/ukuran sembarang.
5. Tambahkan state kosong, state error, dan state offline.
6. Uji lebar 360/412 px, terang/gelap.

## Resep B — Parsing jadwal dan waktu

Format waktu di JSON memakai titik: `"05.25-06.10"`, `"05.00"`. **Tetapi** beberapa blok akhir pekan/makan berisi teks longgar (`"Siang-sore"`, `"Setelah workout"`, `"Jika lapar"`, `"06.30-07.30 (setelah workout)"`). Parser harus menangani keduanya.

```ts
// src/lib/schedule/time.ts
const RANGE = /(\d{1,2})[.:](\d{2})(?:\s*[-–]\s*(\d{1,2})[.:](\d{2}))?/;

export type ParsedTime = { start: number; end?: number }; // menit sejak 00:00

export function parseWaktu(raw: string): ParsedTime | null {
  const m = RANGE.exec(raw);
  if (!m) return null;                       // blok "longgar" (flexible)
  const start = +m[1] * 60 + +m[2];
  const end = m[3] ? +m[3] * 60 + +m[4] : undefined;
  return { start, end };
}
```

Aturan:
- Blok dengan `parseWaktu === null` adalah **flexible block**: tampil berurutan pada tempatnya, tanpa hitung mundur dan tanpa notifikasi otomatis.
- Blok tanpa `end` berlangsung sampai `start` blok berikutnya (atau tengah malam untuk blok terakhir).
- Blok "21.00-22.00" (wind-down) dipakai sebagai jendela tidur; batas maksimal 22.00.
- Uji: input aneh, blok lintas tengah malam, hari dengan blok flexible.

### Fase hari (untuk tema dan pola visual)
```ts
export type Phase = 'fajar' | 'pagi' | 'siang' | 'sore' | 'winddown';
// menit sejak 00:00 (waktu lokal perangkat)
// fajar    04:00–06:30  (pola titik rapat)
// pagi     06:30–08:00  (putih bersih)
// siang    08:00–17:00  (putih + garis tipis)   // PKL di hari kerja
// sore     17:00–20:30  (putih + tone ringan)
// winddown 20:30–04:00  (inversi hitam, titik putih)
```

### Menentukan blok "sekarang" dan "berikutnya"
```ts
export function getNowAndNext(blocks: Block[], now: Date) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const timed = blocks
    .map((b, i) => ({ b, i, t: parseWaktu(b.waktu) }))
    .filter((x): x is { b: Block; i: number; t: ParsedTime } => x.t !== null)
    .sort((a, z) => a.t.start - z.t.start);
  const currentIdx = timed.findLastIndex(x => x.t.start <= nowMin);
  return { current: timed[currentIdx]?.b ?? null, next: timed[currentIdx + 1]?.b ?? null,
           minutesToNext: timed[currentIdx + 1] ? timed[currentIdx + 1].t.start - nowMin : null };
}
```
Perbarui tiap 30 detik dan saat aplikasi kembali ke foreground (`visibilitychange` / event `appStateChange`).

## Resep C — Notifikasi lokal
1. Minta izin notifikasi (Android 13+) dan izin alarm tepat (Android 12+) lewat **alur onboarding**, dengan penjelasan singkat sebelum dialog sistem.
2. Jadwalkan berulang mingguan berdasarkan hari; gunakan `schedule.on = { weekday, hour, minute }` dan `allowWhileIdle: true`. Verifikasi konvensi nomor `weekday` di dokumentasi Capacitor versi terpasang.
3. Gunakan ID deterministik: `hash(hari + kunciPengingat)` agar mudah dibatalkan/diperbarui.
4. Jadwal ulang saat pengaturan berubah, saat aplikasi dibuka, dan uji setelah perangkat di-restart.
5. Pengingat bawaan (dapat diatur pengguna): bangun 05.00, mulai workout 05.20, snack 10.00, makan siang 12.00, snack 15.30, makan malam 18.30, wind-down 20.30, "last call" tidur 21.45. Akhir pekan memakai jadwal sendiri.
6. Copy notifikasi: pendek, netral, tanpa rasa bersalah. Contoh: "Subuh dulu. Lari mulai 05.25." / "Snack sore sudah waktunya."
7. Sediakan halaman panduan mematikan optimasi baterai untuk perangkat Xiaomi/Oppo/Vivo dll.

## Resep D — Timer istirahat (mode workout)
- Simpan `endsAt = Date.now() + durasiMs`. Tampilan menghitung `endsAt - Date.now()` tiap ~250 ms.
- Jadwalkan juga notifikasi lokal pada `endsAt` (untuk saat layar mati/di background) dan batalkan bila timer dilewati/dihentikan.
- Saat selesai: haptics + efek onomatopoeia "TENG!" (lihat `design.md`).
- Simpan progres sesi (`set`, `rep`) ke repository setiap set selesai agar aman jika aplikasi tertutup.
- Istirahat default 60–120 detik (dari `istirahat_antar_set`); bisa diubah pengguna.

## Resep E — Cuaca dan lokasi
Lihat `INTEGRATIONS.md`. Ringkas: koordinat perkiraan (coarse) → `WeatherProvider` → cache 1–3 jam → saran (mis. hujan di hari lari → tawarkan alternatif indoor dari data workout). Selalu ada state "tanpa cuaca".

## Resep F — Chat AI
Lihat `AI_CHAT.md`. Ringkas: klien tidak memegang key; konteks dibangun dari JSON hari ini; guardrail wajib; ada fallback offline/kuota habis; riwayat dipangkas.

## Resep G — Menerapkan gaya manga-neubrutalism
1. Ambil token dari `design.md` (CSS variables + `tailwind.config`).
2. Bangun dari komponen dasar: `Panel`, `Caption`, `Balloon`, `SfxStamp`, `ToneArea`, `SpeedLines`, `InkButton`.
3. Satu layar = satu titik fokus. Maksimal 1–2 area screentone.
4. Area teks panjang selalu latar putih/hitam polos.
5. **Sebelum menandai layar selesai**, jalankan checklist komposisi `design.md` bagian 11.6 (bukan cuma cek token warna). Kalau gagal 2+ poin, layar masih terasa AI slop — revisi tata letak/ikon/ilustrasi, bukan sekadar warnanya.
6. Tes grayscale dan tes "tutup logo" (apakah masih terlihat seperti aplikasi ini?).

## Resep G2 — Elemen 3D bergaya tinta (three.js, opsional)
Hanya kerjakan bila diminta eksplisit di task. Baca `design.md` bagian 12 dan ikuti resep lengkap di `THREE_JS.md` (instalasi, lazy-load, material toon + outline, kontrol render loop, fallback 2D wajib). Jangan menambah three.js untuk dekorasi tanpa fungsi.

## Resep H — Build dan sinkron Android
```bash
npm run build && npx cap sync android
npx cap run android          # atau: npx cap open android (Android Studio)
```
- Setelah menambah/menghapus plugin: `npx cap sync android`.
- Ikon, splash, status bar, dan safe area harus dicek di perangkat nyata.
- Rilis: keystore disimpan di luar repo; jangan commit.

## Anti-pattern (jangan lakukan)
- Membaca JSON langsung di komponen tanpa parser/validator.
- `setInterval` sebagai satu-satunya sumber kebenaran timer.
- Menaruh API key di `NEXT_PUBLIC_*` untuk layanan berbayar tanpa proteksi.
- Menambah gradasi/blur/emoji-ikon "karena terlihat modern".
- Menampilkan kalori sebagai target harian atau skor.
- Menambah fitur di luar `TASKS.md` fase aktif.

## Checklist sebelum menutup tugas
- [ ] Parser dan fase hari punya unit test
- [ ] Ada state kosong/error/offline
- [ ] Notifikasi diuji setelah restart perangkat (jika disentuh)
- [ ] Sesuai token dan aturan `design.md`
- [ ] Copy lolos audit wellbeing
- [ ] Laporan akhir memuat Keputusan, Saran, dan hal belum diverifikasi

## Resep I — Substitusi jadwal (rule-based, tanpa AI)
1. Data alasan dan tabel substitusi **hanya** dari `src/lib/schedule/substitutions.ts` (lihat `DATA_SCHEMA.md` 7.1–7.2). Jangan membangun logika pengganti di komponen UI atau mengarangnya di tempat lain.
2. Tombol cepat (di layar Hari Ini, dekat panel "sekarang"): 🦵 Kaki/lutut sakit, 💪 Tangan/bahu sakit, 😴 Capek/kurang tidur, 🤒 Sakit/demam. Tap → panggil `buildReplacement(hariIni, reason)` → tampilkan **kartu usulan** → user Terima/Tolak → baru tulis `ScheduleOverride`.
3. `cuaca_hujan` dipicu otomatis dari `WeatherProvider` (lihat Resep E) hanya sebagai **saran**, tetap butuh konfirmasi manual — jangan auto-ganti walau probabilitas hujan tinggi.
4. `getEffectiveDay(dateISO)` (lihat `DATA_SCHEMA.md` 7.3) dipakai di **semua** tempat yang menampilkan workout hari ini (Hari Ini, Mode Workout, Minggu) — jangan ada dua sumber kebenaran.
5. Override yang `expiresAfterDate: false` (mis. cedera 3 hari) perlu UI "masih berlaku?" harian sederhana agar tidak menggantung selamanya secara diam-diam.
6. Riwayat override ditampilkan di tab Progres (lihat Resep K) sebagai sinyal pola, bukan penilaian.

## Resep J — Substitusi lewat chat AI (tetap lewat tabel yang sama)
AI **tidak pernah mengarang latihan pengganti bebas**. Alurnya:
1. Chat AI mendeteksi maksud pengguna terkait cedera/capek/sakit/cuaca dari teks bebas, lalu memetakannya ke salah satu `SubstituteReason` di 7.1 (function-calling/tool-call pattern, bukan generative text untuk kontennya).
2. Jika terpetakan ke alasan dengan `severity: 'ringan'` atau kasus kaki/tangan yang jelas: panggil `buildReplacement` yang sama dengan Resep I, tampilkan **kartu usulan yang sama persis** di dalam thread chat (komponen `Panel` biasa, bukan teks bebas berisi daftar latihan karangan AI).
3. Jika terdeteksi **cedera akut** (kepeleset, jatuh, nyeri tajam, bengkak) atau AI tidak yakin cedera vs pegal biasa: **jangan tawarkan substitusi apa pun**. Balas dengan istirahat total + saran bicara ke tenaga kesehatan bila berat/tidak reda. Lihat guardrail lengkap `AI_CHAT.md` bagian 8.
4. Jika maksud pengguna tidak cocok kategori manapun (`'lainnya'`, atau minta latihan spesifik di luar tabel, mis. "ganti jadi 100 push-up"): AI menjelaskan bahwa ia hanya bisa memilih dari opsi yang sudah disiapkan aplikasi, tawarkan `capek_kurang_tidur` (versi ringan) atau Full Rest sebagai default aman, jangan menyusun latihan baru sendiri.
5. Kartu usulan dari chat tetap butuh tombol Terima/Tolak eksplisit sebelum `ScheduleOverride` ditulis — sama seperti Resep I, tidak ada jalur pintas dari chat.

## Resep K — Fitur tab lanjutan (Makan, Progres, Pengaturan, Chat)
Rujukan singkat saat mengerjakan `TASKS.md` Fase 9; detail kriteria ada di file itu.
- **Makan**: checklist per slot, alternatif menu per slot (dari kelompok bahan sama), daftar belanja mingguan (agregasi `pola_makan` 7 hari per kategori bahan), pelacak air minum (tally, bukan angka presisi), log cepat "kalau lapar" tanpa penilaian.
- **Progres**: grafik berat + catatan mingguan opsional, tes kemampuan 4 mingguan dengan riwayat, grid stempel riwayat latihan (gaya kalender kontribusi tapi kotak dicap tinta, bukan gradasi warna), milestone sebagai stempel (bukan lencana emoji), skor tidur mingguan netral, riwayat override (pola alasan, bukan penilaian), ekspor ringkasan mingguan.
- **Chat**: starter prompts di state kosong, jawaban penjelasan gerakan ditampilkan sebagai kartu `Latihan` (komponen sama dengan Mode Workout, bukan teks polos), rangkum minggu menarik data dari Progres.
- **Pengaturan**: jam tiap pengingat (on/off + waktu per jenis), tema, edit profil (`kemampuan_saat_ini`, tinggi/berat) yang menimpa `profil` versi lokal tanpa mengubah file JSON asal, edit jam PKL, kontrol lokasi, status kuota chat AI harian, panduan izin notifikasi/baterai + tombol kirim notifikasi contoh, ekspor/impor data, tentang aplikasi + disclaimer.
- **Jadwal (tambahan)**: hitung mundur ke jam pulang PKL, swipe antar hari, tombol substitusi cepat (Resep I) ditaruh dekat panel "sekarang".

## Resep L — Rating energi pasca-workout
`WorkoutLog.energyRating` (1–5) sudah ada di skema tapi belum ada UI. Tambahkan pertanyaan singkat setelah sesi workout selesai: 5 titik tinta (bukan emoji/bintang), opsional (boleh dilewati). Dipakai di tab Progres untuk pola energi mingguan, tidak untuk penilaian.
