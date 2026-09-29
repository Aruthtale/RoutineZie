# Aset & Lisensi

Semua aset visual RoutineZie adalah **karya asli** yang dibuat langsung untuk proyek ini,
kecuali font dan library yang lisensinya terbuka.

## Aplikasi (dibuat untuk RoutineZie)

| Aset | Sumber file | Keterangan |
|---|---|---|
| Ikon aplikasi | `assets/icon.svg` | Jam manga + petir + speed lines; hitam-putih, siluet tebal. Terbaca di ukuran kecil. |
| Splash screen | `assets/splash.svg` | Logo pusat + wordmark "ROUTINEZIE" + tagline. Kertas putih, tinta hitam. |
| Pola screentone | `src/app/globals.css` | CSS murni (dot/hatch/speed-lines) — tidak memakai gambar. |
| Ikon UI | `lucide-react` | Satu keluarga garis 2–3 px, sudut tajam (lihat `design.md` §4). |

## Font (Google Fonts, lisensi terbuka)

Dimuat lewat `next/font/google` (di-bundel saat build, tanpa request runtime):

| Peran | Font | Lisensi |
|---|---|---|
| Display | [Anton](https://fonts.google.com/specimen/Anton) | OFL 1.1 |
| Angka/jam | [Space Mono](https://fonts.google.com/specimen/Space+Mono) | OFL 1.1 |
| Teks | [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans) | OFL 1.1 |

## Library pihak ketiga

Lihat `package.json`. Semua lisensi terbuka (MIT, Apache-2.0, OFL).
Data cuaca: [Open-Meteo](https://open-meteo.com/) (lisensi CC BY 4.0 — attribution tanpa API key).

## Tidak ada

- Tidak ada aset berbayar.
- Tidak ada gambar/emoji berlisensi tertutup.
- Tidak ada API key/credential di repositori (lihat `.gitignore`).
- Tidak ada emoji sebagai ikon UI (sesuai `design.md` §4).
