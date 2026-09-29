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

---

## 11. Diagnosis: kenapa masih terasa "AI slop" walau token sudah benar

Token warna hitam-putih dan larangan elemen (bagian 2) **tidak cukup**. Slop paling sering muncul dari **komposisi**, bukan warna. Periksa lima hal ini di tiap layar:

### 11.1 Simetri berlebihan
AI cenderung menaruh semua elemen di tengah, ukuran seragam, jarak rata. Manga sungguhan hampir tidak pernah begitu.
- **Perbaikan**: panel tidak harus sejajar grid sempurna. Boleh sedikit miring (`rotate: -1deg` sampai `2deg`) pada panel aksen (mis. `SfxStamp`, `Caption` catatan khusus). Ukuran panel bervariasi dengan sengaja — panel "sekarang" jauh lebih besar dari yang lain, bukan sekadar skala 1.2x.
- **Aturan**: minimal satu elemen per layar yang **full-bleed** (menyentuh/melewati tepi layar), seperti panel manga yang keluar dari batas grid.

### 11.2 Ikon dari library umum
Lucide/Feather/Material dipakai apa adanya adalah salah satu penanda AI slop paling gampang dikenali, karena semua aplikasi AI memakainya dengan cara yang sama.
- **Perbaikan**: gambar ulang 6–8 ikon inti (lari, push-up, makan, tidur, timer, cuaca, api/energi, centang) sebagai **guratan tinta tebal 3 px**, sudut tajam, sedikit tidak presisi (bukan vektor sempurna). Simpan sebagai SVG di `src/components/icons/`. Boleh mulai dari bentuk dasar Lucide sebagai kerangka, tapi gambar ulang garisnya, jangan pakai langsung.
- Ikon sekunder (pengaturan, panah, silang) boleh tetap dari library minimalis asal ketebalan garisnya diseragamkan ke 2–3 px dan sudutnya dibuat tajam (`strokeLinecap: butt`, bukan `round`).

### 11.3 Kartu seragam tanpa hierarki nyata
Kalau semua `Panel` punya padding, bayangan, dan ukuran yang sama, halamannya terasa seperti daftar template, walau garisnya tebal.
- **Perbaikan**: tetapkan 3 tingkat ukuran panel yang beda jauh, bukan mirip: `hero` (dominan, ~60% tinggi layar di atas fold), `wide` (satu baris penuh), `small` (kartu ringkas, bisa 2 kolom). Satu layar memakai maksimal satu `hero`.
- Variasikan **orientasi teks**: judul besar boleh vertikal di sisi panel (gaya judul bab manga) untuk elemen non-esensial, bukan semua horizontal rata kiri.

### 11.4 Ilustrasi geometris kosong
Bentuk lingkaran/kotak polos sebagai "ilustrasi" adalah ciri khas AI slop generik, entah berwarna atau hitam-putih.
- **Perbaikan**: kalau butuh elemen ilustratif (mis. layar kosong, onboarding), gambar linework sederhana bertema nyata (siluet orang push-up, siluet mangkuk nasi, siluet bantal) dengan guratan tangan, bukan bentuk geometris abstrak. Satu ilustrasi per konteks sudah cukup; jangan menghiasi tiap kartu kecil dengan ilustrasi.

### 11.5 Copy dan micro-interaction generik
"Selamat datang kembali!", checklist dengan centang hijau standar, transisi fade generik — ini pola default framework UI, bukan keputusan desain.
- **Perbaikan**: ikuti suara di bagian 8. Centang jadi `Stamp` tinta (bukan ikon centang bulat). Transisi antar layar: potong tegas (cut, seperti pergantian panel), bukan fade lembut; durasi ≤ 150 ms.

### 11.6 Checklist audit cepat (jalankan tiap layar)
- [ ] Ada minimal 1 elemen full-bleed atau miring sengaja?
- [ ] Ukuran panel bervariasi jelas (bukan grid seragam)?
- [ ] Ikon inti buatan sendiri, bukan library mentah?
- [ ] Tidak ada ilustrasi lingkaran/kotak kosong sebagai pengisi?
- [ ] Copy spesifik ke konteks, bukan sapaan umum?
- [ ] Kalau screenshot ditutup logonya, masih terlihat khas aplikasi ini (bukan generik)?

Kalau sebuah layar gagal di 2+ poin checklist ini, layar itu masih slop meski token warna sudah benar.

## 12. Elemen 3D (three.js) — opsional, sangat terbatas

Three.js **mudah menjadi slop 3D**: bola/torus berputar mengambang, partikel bertebaran, gradient mesh — ini versi lain dari template AI, hanya dalam 3D. Elemen 3D di aplikasi ini **hanya boleh dipakai kalau ikut gaya tinta yang sama**, bukan render realistis atau dekorasi mengambang.

### 12.1 Prinsip
1. **Toon/outline shader hitam-putih**, bukan PBR/material realistis. Objek 3D harus terlihat seperti gambar tinta beranimasi, konsisten dengan `Panel`, `SfxStamp`, dsb.
2. **Satu fitur 3D saja untuk MVP**, di satu layar. Jangan menambah 3D ke banyak tempat sekaligus.
3. **Fungsional, bukan dekoratif**: elemen 3D harus menjelaskan atau memperkuat sesuatu (progres, hitungan, transisi), bukan sekadar "terlihat keren".
4. Selalu ada **fallback 2D statis** untuk perangkat lemah, mode hemat baterai, dan `prefers-reduced-motion`.

### 12.2 Kandidat fitur (pilih satu untuk MVP)
| Fitur | Layar | Kenapa cocok |
|---|---|---|
| **Menara progres mingguan** — kubus/balok tinta bertumpuk tiap sesi selesai, dilihat dari sudut isometrik, garis tebal + outline shader | Progres | Visual "bertumbuh" yang relevan dengan tujuan menambah massa tubuh, tanpa jadi grafik angka semata |
| **Stempel 3D saat set selesai** — objek stempel jatuh dan "menghantam" panel dengan efek tinta menyebar (shader, bukan partikel realistis) | Mode Workout | Memperkuat momen `SfxStamp` yang sudah ada di desain 2D |
| **Transisi halaman antar hari** — panel hari berputar seperti membalik halaman manga (page-flip sederhana) | Minggu → Detail Hari | Mengikuti metafora "jadwal = halaman manga" di bagian 1 |

Rekomendasi urutan: mulai dari **stempel 3D** (paling kecil lingkupnya, dampak jelas), baru pertimbangkan yang lain.

### 12.3 Gaya shader (acuan konsep, bukan kode final)
- **Toon shading** 2 tingkat (terang/gelap) tanpa gradasi halus — meniru cel-shading manga.
- **Outline hitam tebal** di tepi siluet (teknik "backface expansion" atau outline shader pass), konsisten dengan `--line: 3px` di 2D.
- Latar tetap `--paper` (atau `--ink` saat wind-down); jangan ada langit/gradient/lighting realistis di belakang objek.
- Tidak ada tekstur foto atau material metalik/kaca.

### 12.4 Batasan teknis (wajib)
- **Lazy-load** three.js hanya di layar yang memakainya (`dynamic import`, `ssr: false`); jangan masuk bundle utama.
- Ini proyek Next.js biasa (bukan artifact web), jadi `three` diinstal normal lewat npm dan di-bundle Next.js, **bukan** lewat CDN.
- Batasi `devicePixelRatio` ke maksimal 2, geometri low-poly, dan matikan render loop (`cancelAnimationFrame`) saat layar tidak terlihat (`visibilitychange`/navigasi).
- Uji di **perangkat Android menengah-bawah** sungguhan, bukan cuma emulator/desktop — WebGL di webview Capacitor bisa jauh lebih lambat.
- `prefers-reduced-motion` atau performa rendah terdeteksi → tampilkan versi 2D statis (`SfxStamp`/`InkChart` biasa) sebagai pengganti, bukan memaksakan 3D.
- Elemen 3D tidak boleh memblokir interaksi utama (tombol tetap responsif walau render 3D belum selesai dimuat).

### 12.5 Yang dilarang untuk 3D
- Objek mengambang/berputar tanpa arti (bola, torus, kubus dekoratif) sebagai pengisi layar kosong.
- Material realistis, refleksi kaca, pencahayaan berwarna, partikel bertebaran generik.
- 3D di splash screen atau di banyak layar sekaligus "supaya modern" — ini justru pola slop yang sama, hanya dalam tiga dimensi.

## 13. Pola UI tambahan

### 13.1 Kartu usulan substitusi jadwal
Muncul dari tombol cepat (Hari Ini) atau dari chat AI — tampilan harus **identik** di kedua tempat.
```
┌────────────────────────────────┐
│ USUL GANTI          [x Tutup]  │
│ ────────────────────────────── │
│ Alasan: Kaki/lutut sakit       │
│                                 │
│ ASLI          →   PENGGANTI    │
│ Easy Run          Push + Core  │
│ (kaki)             (upper body)│
│                                 │
│ [ TOLAK ]      [ TERIMA ]      │  ← InkButton outline / solid
└────────────────────────────────┘
```
- `Panel` biasa (garis 3px, bayangan keras), bukan modal melayang dengan blur.
- Tombol "TERIMA" solid hitam, "TOLAK" outline — hierarki jelas tapi keduanya sama besar (tidak menekan pengguna ke satu pilihan).
- Setelah diterima: `Tag` "DIGANTI · [alasan singkat]" muncul menempel di panel workout hari itu, dengan tautan kecil "pakai jadwal asli" untuk membatalkan.
- Untuk kasus cedera akut (lihat `AI_CHAT.md` bagian 7): kartu ini **tidak muncul**; tampilkan `Caption` pesan istirahat + saran tenaga kesehatan sebagai gantinya, bukan pilihan Terima/Tolak.

### 13.2 Grid stempel riwayat (Progres)
Pengganti "kalender kontribusi" hijau-gradasi yang generik: grid kotak 3px per hari, diisi **stempel tinta solid** bila sesi selesai, kotak kosong bila tidak, dan pola `tone-dots` tipis bila hari itu override/istirahat (bukan dianggap "gagal"). Tanpa gradasi intensitas — biner sengaja, karena ini bukan tentang seberapa keras, tapi konsistensi.

### 13.3 Rating energi (titik tinta)
5 titik sejajar, kosong/terisi penuh (bukan bintang/emoji, bukan gradasi warna hijau-merah). Opsional, boleh dilewati tanpa ada penalti visual atas pilihan "lewati".

### 13.4 Starter prompts (Chat, state kosong)
Baris `InkButton` outline kecil di atas input, 3–4 pilihan (mis. "Jelaskan gerakan ini", "Aku pegal, sesuaikan latihan"), hilang otomatis setelah pesan pertama dikirim — bukan menu permanen yang memenuhi layar.
