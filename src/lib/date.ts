/**
 * T14 — Util tanggal LOKAL (bukan UTC).
 *
 * Bug lama: banyak komponen memakai `new Date().toISOString().split('T')[0]`.
 * Itu tanggal UTC. Di WIB (UTC+7) pukul 05.00 (jam bangun) = 22.00 UTC hari
 * SEBELUMNYA → log pagi tercatat di tanggal yang salah. Karena app ini justru
 * dirancang untuk dipakai subuh, ini bukan kasus tepi, tapi kejadian harian.
 *
 * Semua kode harus memakai fungsi di sini, bukan toISOString().
 */

/** Tanggal lokal YYYY-MM-DD untuk sebuah Date (default: sekarang). */
export function localDateISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Tanggal lokal hari ini, YYYY-MM-DD. */
export function todayISO(): string {
  return localDateISO(new Date());
}

/** Tambah/kurangi hari pada string YYYY-MM-DD, tetap lokal. */
export function addDaysISO(dateISO: string, delta: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  base.setDate(base.getDate() + delta);
  return localDateISO(base);
}

/** Selisih hari (b - a) antara dua string YYYY-MM-DD. */
export function diffDaysISO(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = new Date(ay, am - 1, ad).getTime();
  const db = new Date(by, bm - 1, bd).getTime();
  return Math.round((db - da) / 86400000);
}

/** Nama hari Indonesia untuk string YYYY-MM-DD. */
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export function dayNameForISO(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  if (!y || !m || !d) return 'Senin';
  return HARI[new Date(y, m - 1, d).getDay()];
}
