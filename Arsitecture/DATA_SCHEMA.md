# DATA_SCHEMA.md — Struktur Data dan Aturan Parsing

Sumber utama: `data/jadwal_mingguan.json`. Angka kalori/protein adalah **perkiraan kasar**.

## 1. Struktur tingkat atas
```
{
  judul, sumber, catatan_penyusunan,
  profil { usia, jenis_kelamin, tinggi_cm, berat_kg, kemampuan_saat_ini{...}, peralatan, pkl{hari[], jam, libur[]}, target_tidur{...}, target_utama },
  aturan_tidur { bangun, mulai_wind_down, target_tidur, batas_maksimal_tidur, catatan, aturan },
  catatan_latihan[], catatan_nutrisi_pertumbuhan[],
  ringkasan_mingguan[ {hari, workout, pkl} ],
  hari[ ...7 objek Hari... ],
  info_kalori_dan_nutrisi { catatan, estimasi_bmr_kkal, dasar_hitung, estimasi_kebutuhan_mempertahankan_berat_kkal{min,maks},
     target_menambah_berat_kkal{min,maks}, target_protein_g{min,maks}, catatan_protein, air_minum_liter{min,maks},
     status_bmi, pemantauan[], peringatan }
}
```
> File saat ini **tidak memiliki** `schemaVersion`. Saat impor, tambahkan `schemaVersion: 1` di memori.

## 2. Objek Hari
```
{
  hari: "Senin".."Minggu",
  tipe_hari: "PKL" | "Libur PKL",
  fokus: string,
  pkl: "08.00-17.00" | "Libur",
  jadwal: [ { waktu: string, kegiatan: string, detail: string } ],
  workout: Workout,
  pola_makan: [ Makan ],
  ringkasan_energi: { total_makan_utama_kkal{min,maks}, total_protein_g{min,maks}, kalori_olahraga_kkal{min,maks}, catatan },
  catatan_khusus: string[],
  catatan: string | null
}
```

### Workout
```
{
  nama, durasi: string | null,        // Minggu: null
  pemanasan: string | null, istirahat_antar_set: string | null,
  latihan?: [ Latihan ],              // Senin-Jumat, Minggu (Minggu = [])
  bagian?: [ { bagian: string, latihan: [ Latihan ] } ],   // Sabtu (2 bagian)
  catatan?: string,                   // ada di Sabtu/Minggu
  intensitas, otot_utama, tujuan, target_progres, tanda_berhenti, alat,
  estimasi_kalori_terbakar_kkal { min, maks },
  catatan_kalori_olahraga
}
```
### Latihan
```
{
  latihan: string,
  set: number | null,                  // null untuk latihan berbasis waktu (jalan, jogging, stretching)
  repetisi_atau_waktu: string,         // "8-12", "30-45 detik", "20-25 menit", "8-10 / sisi", "Ringan"
  catatan: string | null,
  otot_target?, cara_melakukan?: string[], tips_form?, kesalahan_umum?,
  versi_lebih_mudah?, versi_lebih_sulit?
}
```
### Makan
```
{ waktu: string, menu, tujuan, rincian_porsi, estimasi_kalori_kkal {min,maks}, estimasi_protein_g {min,maks} }
```

## 3. Zod (acuan; letakkan di `src/lib/schedule/schema.ts`)
```ts
import { z } from 'zod';

const Range = z.object({ min: z.number(), maks: z.number() });

export const Latihan = z.object({
  latihan: z.string(),
  set: z.number().nullable(),
  repetisi_atau_waktu: z.string(),
  catatan: z.string().nullable().optional(),
  otot_target: z.string().optional(),
  cara_melakukan: z.array(z.string()).optional(),
  tips_form: z.string().optional(),
  kesalahan_umum: z.string().optional(),
  versi_lebih_mudah: z.string().optional(),
  versi_lebih_sulit: z.string().optional(),
}).passthrough();

export const Workout = z.object({
  nama: z.string(),
  durasi: z.string().nullable(),
  pemanasan: z.string().nullable().optional(),
  istirahat_antar_set: z.string().nullable().optional(),
  latihan: z.array(Latihan).optional(),
  bagian: z.array(z.object({ bagian: z.string(), latihan: z.array(Latihan) })).optional(),
  catatan: z.string().optional(),
  intensitas: z.string(), otot_utama: z.string(), tujuan: z.string(),
  target_progres: z.string(), tanda_berhenti: z.string(), alat: z.string(),
  estimasi_kalori_terbakar_kkal: Range,
  catatan_kalori_olahraga: z.string(),
}).passthrough();

export const Blok = z.object({ waktu: z.string(), kegiatan: z.string(), detail: z.string() });

export const Makan = z.object({
  waktu: z.string(), menu: z.string(), tujuan: z.string(), rincian_porsi: z.string(),
  estimasi_kalori_kkal: Range, estimasi_protein_g: Range,
});

export const Hari = z.object({
  hari: z.enum(['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu']),
  tipe_hari: z.enum(['PKL','Libur PKL']),
  fokus: z.string(), pkl: z.string(),
  jadwal: z.array(Blok), workout: Workout, pola_makan: z.array(Makan),
  ringkasan_energi: z.object({
    total_makan_utama_kkal: Range, total_protein_g: Range, kalori_olahraga_kkal: Range, catatan: z.string(),
  }),
  catatan_khusus: z.array(z.string()), catatan: z.string().nullable().optional(),
}).passthrough();

export const Jadwal = z.object({
  judul: z.string(),
  hari: z.array(Hari).length(7),
  // bagian lain (profil, aturan_tidur, info_kalori_dan_nutrisi, ...) divalidasi longgar dengan passthrough
}).passthrough();
export type Jadwal = z.infer<typeof Jadwal>;
```

## 4. Aturan parsing dan kasus tepi
1. **Format waktu**: titik sebagai pemisah jam-menit (`05.25`). Terima juga `:`. Lihat `parseWaktu` di `skill.md`.
2. **Blok longgar (flexible)**: `waktu` tanpa jam pasti (`"Siang-sore"`, `"Setelah workout"`, `"Malam"`, `"Jika lapar"`) → tampil berurutan, tanpa hitung mundur/notifikasi otomatis.
3. **Waktu campuran**: `"06.30-07.30 (setelah workout)"`, `"Pagi (07.00-08.00)"`: ambil rentang jam pertama yang ditemukan; sisa teks jadi label.
4. **Sabtu memakai `bagian`**, hari lain memakai `latihan`. Antarmuka pembaca harus menormalkan menjadi daftar latihan berurutan dengan penanda bagian.
5. **Minggu**: `workout.latihan = []`, `durasi = null`. Tampilkan sebagai hari istirahat, jangan error.
6. **`set: null`**: latihan berbasis waktu; timer memakai `repetisi_atau_waktu` (mis. "20-25 menit").
7. **Rentang repetisi** ("8-12", "8-10 / sisi", "30-45 detik"): parser menghasilkan `{ min, max, unit, perSide }`; tampilkan teks asli, gunakan angka untuk log/target.
8. **Angka `min/maks`** hanya untuk tampilan kisaran; tidak dipakai sebagai target/penilaian.
9. **Data tak dikenal**: `passthrough` agar bidang baru tidak merusak; bidang wajib hilang → tampilkan layar galat impor yang ramah dengan lokasi kesalahan.
10. **Versi**: tambah `schemaVersion` pada ekspor. Perubahan besar → tulis migrasi + test.

## 5. Entitas log (disimpan di repository)
```ts
type SetLog = { reps?: number; seconds?: number; done: boolean };
type WorkoutLog = { id: string; dateISO: string; hari: string; workoutNama: string;
  exercises: { latihan: string; sets: SetLog[] }[]; energyRating?: 1|2|3|4|5; note?: string; schemaVersion: 1 };
type WeightLog  = { id: string; dateISO: string; kg: number; schemaVersion: 1 };      // maks 1x/minggu ditampilkan
type SleepLog   = { id: string; dateISO: string; sleptAt?: string; wokeAt?: string; schemaVersion: 1 };
type MealCheck  = { id: string; dateISO: string; waktu: string; done: boolean; schemaVersion: 1 };
type Settings   = { theme: 'auto'|'light'|'dark'; reminders: Record<string, {enabled: boolean; time?: string}>;
  location?: { lat: number; lon: number; precision: 'coarse' }; aiEnabled: boolean; schemaVersion: 1 };
```
Waktu disimpan sebagai ISO dengan offset lokal; tampilan memakai zona waktu perangkat.

## 6. Ekspor/impor
- Ekspor: satu file JSON `{ schemaVersion, jadwal, logs, settings }` lewat Share.
- Impor: validasi Zod → pratinjau perubahan → konfirmasi → tulis. Jangan menimpa log tanpa konfirmasi.
