# design.md — Sistem Desain: Manga-Neubrutalism Hitam-Putih

## 1. Konsep

Neubrutalism (garis tebal, sudut tajam, bayangan keras) dipadukan dengan **kosakata manga**: panel, screentone (titik halftone), garis kecepatan, onomatopoeia, inversi hitam-putih. Bukan meniru karya tertentu; hanya memakai bahasa visualnya.

Ide utama: **jadwal harian = halaman manga**. Kegiatan sekarang adalah panel besar; yang berikutnya panel kecil. Warna tidak dipakai untuk dekorasi; struktur, pola, dan tipografi yang bekerja.

### Tes kualitas
- **Tes grayscale**: harus terbaca sempurna tanpa warna.
- **Tes tutup logo**: tanpa logo dan teks merek, apakah layar masih jelas milik aplikasi ini?
- **Tes 05.00 pagi**: terbaca cepat oleh mata setengah mengantuk.
- **Tes kurangi satu**: hapus satu elemen; jika layar tetap berfungsi, elemen itu tidak perlu.

## 2. Yang dilarang (anti-slop)

- Gradasi (kecuali pola CSS screentone), glassmorphism, blur dekoratif
- Warna ungu-biru bawaan AI, palet pastel
- Emoji sebagai ikon/dekorasi UI; ikon ✨ untuk AI
- `rounded-2xl` + bayangan lembut, kartu identik berderet tanpa hierarki
- Font komik generik (Bangers, Comic Neue) dipakai di semua tempat
- Efek kilau, mata besar, telinga kucing, maskot chibi generik
- Menyalin karakter, panel, atau aset dari manga/komik nyata
- Screentone di seluruh layar, atau di belakang teks kecil
- Sapaan generik ("Selamat datang kembali!"), bahasa motivator berlebihan

## 3. Token

### 3.1 Warna (hitam-putih murni)
```css
:root {
  --ink: #0b0b0b;
  --paper: #fafaf7;
  --ink-soft: #3a3a3a;      /* teks sekunder, min kontras 7:1 di atas paper */
  --paper-dim: #ecebe6;     /* latar area sekunder */
  --line: 3px;              /* garis struktur */
  --line-thin: 1px;         /* garis detail */
  --shadow: 4px 4px 0 var(--ink);
  --shadow-press: 1px 1px 0 var(--ink);
  --radius: 0;
  --space: 8px;             /* grid dasar; kelipatan 4/8/12/16/24/32 */
}
:root[data-theme="dark"] {  /* inversi total, bukan "tema tambahan" */
  --ink: #fafaf7;
  --paper: #0b0b0b;
  --ink-soft: #c9c9c4;
  --paper-dim: #1a1a1a;
}
```
- Opsional (fase lanjut, default MATI): **satu aksen** (`--accent`) hanya untuk status "SEKARANG". Desain harus tetap terbaca tanpa aksen.
- Tema mengikuti fase hari; lihat bagian 5.

### 3.2 Tipografi (di-bundel via `next/font`, dengan fallback)
| Peran | Font | Fallback | Pemakaian |
|---|---|---|---|
| Display | Anton (atau Archivo Black) | `Impact, sans-serif` | Judul, kegiatan sekarang, onomatopoeia |
| Angka/jam | Space Mono | `ui-monospace, monospace` | Jam, hitung mundur, set/rep; `font-variant-numeric: tabular-nums` |
| Teks | IBM Plex Sans | `system-ui, sans-serif` | Detail, langkah latihan, catatan |

Skala (px/line-height): 12/16, 14/20, 16/24, 20/28, 28/32, 40/40, 64/60 (hitung mundur). Judul display huruf besar, tracking sedikit rapat. Teks panjang tidak boleh huruf besar semua.

### 3.3 Garis, bayangan, sudut
- Hanya **dua ketebalan garis**: 3 px (struktur), 1 px (detail).
- Hanya **satu bayangan**: offset keras `4px 4px 0`, selalu arah kanan-bawah. Saat ditekan: `1px 1px` + translasi 3 px.
- Radius 0 di mana-mana. Pengecualian tunggal: bentuk balon dialog boleh membulat.

### 3.4 Screentone dan pola (CSS murni, tanpa gambar berat)
```css
.tone-dots     { background-image: radial-gradient(var(--ink) 1px, transparent 1.4px); background-size: 6px 6px; }
.tone-dots-lg  { background-image: radial-gradient(var(--ink) 1.6px, transparent 2px); background-size: 9px 9px; }
.tone-hatch    { background-image: repeating-linear-gradient(45deg, var(--ink) 0 1px, transparent 1px 6px); }
.tone-speed    { background: repeating-conic-gradient(from 0deg at 50% 50%, var(--ink) 0deg 1deg, transparent 1deg 6deg); }
```
Aturan: maksimal **1–2 area screentone per layar**; selalu beri latar polos di bawah teks penting. Pola statis (hindari animasi pola besar).

## 4. Komponen dasar

| Komponen | Deskripsi |
|---|---|
| `Panel` | Kotak garis 3 px + bayangan. Variasi ukuran: `hero`, `wide`, `small`. |
| `Caption` | Kotak keterangan kecil bergaya narasi manga (untuk catatan khusus, info kalori). |
| `Balloon` | Balon dialog (untuk chat AI dan tips). Ekor runcing. |
| `SfxStamp` | Teks onomatopoeia besar dimiringkan: "TENG!", "BERES!", "LANJUT!". Dipakai hanya di momen penting. |
| `ToneArea` | Wadah dengan pola screentone (maks 1–2 per layar). |
| `SpeedLines` | Garis fokus memusat, untuk timer istirahat/momen intens. Hormati reduced-motion. |
| `InkButton` | Tombol garis tebal, bayangan keras, target ≥ 48 dp. Varian: `solid` (hitam), `outline`. |
| `Tag` | Label kecil berbingkai (mis. "SEKARANG", "HARI LIBUR"). |
| `Checkbox/Stamp` | Centang berupa stempel tinta, bukan ikon centang standar. |
| `InkChart` | Grafik garis tebal + arsiran (hatching) sebagai isi area. |

Ikon: satu keluarga garis 2–3 px, sudut tajam; gambar/pilih set konsisten (lari, push-up, makan, tidur, timer, cuaca). Tidak ada emoji.

## 5. Fase hari → pola visual (fungsi, bukan dekorasi)

| Fase | Jam | Pola | Suasana |
|---|---|---|---|
| Fajar | 04.00–06.30 | Titik rapat pada header | Tenang, fokus, Subuh & workout |
| Pagi | 06.30–08.00 | Putih bersih | Bergerak, siap PKL |
| Siang | 08.00–17.00 | Putih + garis tipis | PKL / aktivitas |
| Sore | 17.00–20.30 | Tone ringan di header | Pemulihan, belajar/project |
| Wind-down | 20.30–04.00 | **Inversi hitam**, titik putih | Menurunkan aktivitas, waktunya tidur |

Transisi antar fase: ganti pola/inversi dengan animasi singkat (≤ 200 ms) atau tanpa animasi bila reduced-motion.

## 6. Layar utama

### 6.1 Hari Ini (layar utama)
```
┌────────────────────────────┐
│ SENIN            05.12     │  ← header kecil: hari + jam (mono)
├────────────────────────────┤
│ ╔════════════════════════╗ │
│ ║ SEKARANG   [Tag]       ║ │  ← Panel hero
│ ║ SUBUH + PERSIAPAN      ║ │  ← display besar
│ ║ 05.00–05.25            ║ │
│ ║ ─────────────────────  ║ │
│ ║ Berikutnya 05.25       ║ │
│ ║ PUSH + CORE   00:13    ║ │  ← hitung mundur mono besar
│ ╚════════════════════════╝ │
│ [Caption: catatan khusus]  │
│ ┌──┐┌──┐┌──┐┌──┐          │  ← timeline vertikal ringkas (panel kecil)
│ Makan berikutnya · Cuaca   │
├────────────────────────────┤
│ Hari | Minggu | Log | Chat │  ← navigasi bawah, jangkauan jempol
└────────────────────────────┘
```
Satu titik fokus: kegiatan sekarang. Timeline lengkap dapat di-scroll di bawahnya. Blok fleksibel (tanpa jam pasti) tampil sebagai panel tanpa hitung mundur.

### 6.2 Mode Workout ("halaman manga")
- Satu latihan per layar penuh; nama latihan display besar; `set × repetisi` mono besar.
- Tombol besar "SET BERES" → stempel + mulai timer istirahat.
- Timer istirahat: angka mono sangat besar di tengah, `SpeedLines` memusat; selesai → getar + `SfxStamp "TENG!"`.
- Panel "CARA" (dari `cara_melakukan`), `tips_form`, `kesalahan_umum`, dan tombol versi lebih mudah/sulit sebagai `Caption`.
- Catat repetisi sebenarnya per set (stepper besar). Tidak ada penilaian gagal.

### 6.3 Minggu
Tujuh panel manga (Senin–Minggu) dengan fokus dan durasi workout; hari ini diberi `Tag`. Ringkasan konsistensi mingguan: "5 dari 7 hari terpenuhi" sebagai deretan kotak, bukan streak.

### 6.4 Makan
Checklist waktu makan dengan `Caption` kisaran kalori/protein (informasi, bukan target). Tidak ada total merah/hijau atau skor.

### 6.5 Progres
- Berat badan mingguan (grafik `InkChart`), tes kemampuan 4 mingguan (push-up, squat, plank), skor konsistensi tidur (persentase tidur ≤ 22.00, tampilan netral).
- Teks status berat badan:
  - Naik: "NAIK 0,3 KG minggu ini."
  - Tetap: "TETAP. Cek apakah makan cukup."
  - Turun: "TURUN. Ini perlu dicek. Bicarakan dengan orang tua/wali atau tenaga kesehatan."
- Tidak ada target penurunan, tidak ada perbandingan tubuh.

### 6.6 Chat AI
`Balloon` untuk percakapan; input di bawah; label jelas "Asisten AI". Panel disclaimer singkat di awal (pesan diproses layanan pihak ketiga; bukan pengganti dokter). Lihat `AI_CHAT.md`.

### 6.7 Pengaturan
Tema (otomatis/terang/gelap), pengingat, izin, panduan optimasi baterai, ekspor/impor jadwal, lokasi, kuota AI.

## 7. Gerak dan umpan balik
- Hanya animasi fungsional: timer, stempel centang (≤ 150 ms), transisi fase (≤ 200 ms), garis kecepatan saat istirahat.
- Animasikan `transform` dan `opacity` saja. Tanpa filter berat/blur.
- `prefers-reduced-motion`: matikan garis kecepatan bergerak dan transisi; ganti dengan perubahan langsung.
- Haptics: getar pendek saat set selesai, getar dua kali saat istirahat selesai.

## 8. Suara dan copy

Bahasa Indonesia sehari-hari, pendek, spesifik, tenang.

| Situasi | Gunakan | Hindari |
|---|---|---|
| Kegiatan sekarang | "SEKARANG: Subuh + persiapan" | "Waktunya menjadi versi terbaikmu!" |
| Timer istirahat | "ISTIRAHAT 01:12" | "Jangan malas!" |
| Set selesai | "SET 2/3 BERES" | "Hebat sekali!!!" |
| Belum ada data | "Belum ada catatan. Mulai dari hari ini." | "Oops, kosong!" |
| Terlewat | (tidak ditampilkan sebagai kegagalan) | "Kamu melewatkan latihan!" |
| Tidur | "Wind-down. Target tidur 21.00–21.30." | "Kamu belum tidur, produktivitas turun!" |

Onomatopoeia hanya di momen penting (timer selesai, latihan selesai, transisi fase). Bila setiap tombol berteriak, efeknya hilang.

## 9. Aksesibilitas dan performa
- Kontras teks ≥ 7:1 pada `paper`/`ink`. Jangan bergantung pada pola saja; sertakan teks/ikon untuk status.
- Target sentuh ≥ 48 dp; jarak antar target ≥ 8 dp.
- Dukungan font scale sistem hingga 130% tanpa merusak layout.
- Pola/screentone lewat CSS/SVG statis. Hindari canvas besar atau blur.
- Safe area (status bar, gesture bar) diperhatikan; warna status bar mengikuti tema.
- Mode gelap adalah pengguna utama (dipakai jam 05.00 dan malam); uji keduanya.

## 10. Aset
- Ikon dan ilustrasi buatan sendiri atau lisensi terbuka yang jelas (catat sumber di `docs/ASSETS.md`).
- Tidak ada aset dari manga/anime/komik nyata.
- Ikon aplikasi: hitam-putih, siluet tebal, terbaca di ukuran kecil; splash screen berupa satu panel manga sederhana.
