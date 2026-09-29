/**
 * T8.2 — Utilitas progres: minggu (Senin), skor tidur, dan deteksi
 * milestone. Semua fungsi murni agar mudah diuji (TESTING.md).
 */

import { DAY_NAMES, dateToISO } from '@/lib/schedule/effectiveDay';

/**
 * Tanggal Senin dari minggu yang memuat dateISO (zona perangkat).
 */
export function getWeekStart(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  if (!y || !m || !d) return dateISO;
  const date = new Date(y, m - 1, d);
  const idx = date.getDay(); // 0=Minggu
  // Geser ke Senin: Minggu(0) mundur 6, lainnya mundur idx-1.
  const offset = idx === 0 ? -6 : -(idx - 1);
  date.setDate(date.getDate() + offset);
  return dateToISO(date);
}

/**
 * Kumpulan tanggal minggu (Senin–Minggu) yang memuat dateISO.
 */
export function getWeekDates(weekStartISO: string): string[] {
  const [y, m, d] = weekStartISO.split('-').map(Number);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(y, m - 1, d + i);
    out.push(dateToISO(date));
  }
  return out;
}

/** Label minggu untuk tampilan: "Senin 29 Sep 2026". */
export function getWeekLabel(weekStartISO: string): string {
  const date = new Date(weekStartISO);
  return `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${date.toLocaleString(
    'id-ID',
    { month: 'short', year: 'numeric' }
  )}`;
}

// ---------------------------------------------------------------------------
// Skor tidur mingguan (T8.2e)
// ---------------------------------------------------------------------------

export interface SleepWeekStats {
  jumlahHari: number;
  hariSebelum22: number;
  /** Persentase 0–100, dibulatkan. 0 jika tidak ada data. */
  persenSebelum22: number;
  /** Rata-rata kualitas (1–5), 0 jika tidak ada data. */
  rataKualitas: number;
  /** Skor tidur mingguan 0–100 (gabungan). */
  skor: number;
}

/**
 * Hitung statistik tidur satu minggu dari daftar log. Fungsi murni.
 * Tidak ada penilaian: skor hanya cerminan data, bukan label "baik/buruk".
 */
export function computeSleepWeekStats(
  logs: { dateISO: string; sleptBefore22: boolean; qualityRating?: number }[],
  weekDates: string[]
): SleepWeekStats {
  const set = new Set(weekDates);
  const minggu = logs.filter((l) => set.has(l.dateISO));

  const jumlahHari = minggu.length;
  if (jumlahHari === 0) {
    return {
      jumlahHari: 0,
      hariSebelum22: 0,
      persenSebelum22: 0,
      rataKualitas: 0,
      skor: 0,
    };
  }

  const hariSebelum22 = minggu.filter((l) => l.sleptBefore22).length;
  const persenSebelum22 = Math.round((hariSebelum22 / jumlahHari) * 100);

  const berkualitas = minggu.filter((l) => typeof l.qualityRating === 'number');
  const rataKualitas =
    berkualitas.length > 0
      ? Math.round(
          (berkualitas.reduce((a, l) => a + (l.qualityRating as number), 0) /
            berkualitas.length) *
            10
        ) / 10
      : 0;

  // Skor: 70% ketepatan tidur ≤ 22.00 + 30% kualitas rata-rata (skala 100).
  const kualitasSkor = rataKualitas > 0 ? (rataKualitas / 5) * 100 : persenSebelum22;
  const skor = Math.round(persenSebelum22 * 0.7 + kualitasSkor * 0.3);

  return { jumlahHari, hariSebelum22, persenSebelum22, rataKualitas, skor };
}

// ---------------------------------------------------------------------------
// Deteksi milestone (T8.2d)
// ---------------------------------------------------------------------------

export interface MilestoneCheck {
  kode: string;
  label: string;
  /** Kondisi terpenuhi? */
  tercapai: boolean;
}

/**
 * Cek semua kemungkinan milestone dari data minggu ini. Pengguna tidak
 * melihat yang belum tercapai — hanya stempel untuk yang sudah.
 */
export function checkMilestones(args: {
  sleepWeek: SleepWeekStats;
  jumlahWorkoutMinggu: number;
  /** Berat terbaru, atau undefined. */
  beratTerbaru?: number;
  /** Berat saat pertama kali mencatat. */
  beratAwal?: number;
}): MilestoneCheck[] {
  const out: MilestoneCheck[] = [];

  if (args.sleepWeek.hariSebelum22 >= 5) {
    out.push({
      kode: 'sleep_5x_before22',
      label: 'Tidur ≤ 22.00 selama 5 hari dalam seminggu',
      tercapai: true,
    });
  }
  if (args.jumlahWorkoutMinggu >= 5) {
    out.push({
      kode: 'workout_5x_week',
      label: 'Selesai 5 latihan dalam seminggu',
      tercapai: true,
    });
  }
  if (args.beratAwal && args.beratTerbaru && args.beratAwal - args.beratTerbaru >= 2) {
    out.push({
      kode: 'weight_down_2kg',
      label: 'Turun 2 kg sejak pencatatan pertama',
      tercapai: true,
    });
  }
  return out;
}

/**
 * Hitung jumlah hari unik dengan workout selesai dalam seminggu (fungsi
 * murni). Beberapa log di hari yang sama tetap dihitung 1 hari.
 */
export function countWorkoutsPerWeek(
  logs: { dateISO: string; done: boolean }[],
  weekDates: string[]
): number {
  const set = new Set(weekDates);
  const unik = new Set<string>();
  for (const l of logs) {
    if (set.has(l.dateISO) && l.done) unik.add(l.dateISO);
  }
  return unik.size;
}
