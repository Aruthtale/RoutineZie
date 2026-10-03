/**
 * T7.2 — Sumber kebenaran tunggal untuk "apa workout hari ini?"
 *
 *   getEffectiveDay(dateISO) = override(dateISO) ?? defaultDay(hariDalamMinggu)
 *
 * `jadwal_mingguan.json` TIDAK PERNAH ditulis ulang (DATA_SCHEMA.md 7).
 * Semua perubahan tersimpan terpisah sebagai `ScheduleOverride`.
 */

import rawData from '@/data/jadwal_mingguan.json';
import { getScheduleForDay } from './parser';
import { buildScheduleOverride, type ScheduleOverride, type SubstituteReason, type Workout } from './substitutions';
import { applyPklOverride } from '@/lib/profile/override';

export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/**
 * Tanggal lokal YYYY-MM-DD (zona perangkat). Dipakai sebagai kunci override.
 */
export function dateToISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dayNameForISO(dateISO: string): string {
  // Parsing manual untuk menghindari UTC-shift bug (new Date('YYYY-MM-DD')
  // diinterpretasikan sebagai UTC di beberapa engine).
  const [y, m, d] = dateISO.split('-').map(Number);
  if (!y || !m || !d) return 'Senin';
  const idx = new Date(y, m - 1, d).getDay();
  return DAY_NAMES[idx];
}

/** Bentuk DayInput untuk buildReplacement. */
export function getDefaultDayInput(dateISO: string) {
  const hari = dayNameForISO(dateISO);
  const d = getScheduleForDay(hari);
  const raw = (rawData as any).hari.find((h: any) => h.hari === hari) ?? null;
  return {
    hari,
    tipe: d?.tipe ?? 'biasa',
    pkl: applyPklOverride(raw?.pkl),
    workout: (d?.workout ?? null) as Workout | null,
  };
}

// ---------------------------------------------------------------------------
// Override storage (di-inject; default: repository Dexie).
// ---------------------------------------------------------------------------

export interface OverrideStorage {
  get(dateISO: string): Promise<ScheduleOverride | undefined>;
  save(override: ScheduleOverride): Promise<void>;
  remove(dateISO: string): Promise<void>;
  list(): Promise<ScheduleOverride[]>;
}

/** Default storage: Dexie via RoutineRepository. */
let storage: OverrideStorage | null = null;

export function setOverrideStorage(s: OverrideStorage | null) {
  storage = s;
}

const dexieStorage: OverrideStorage = {
  async get(dateISO) {
    const { RoutineRepository } = await import('@/lib/db/repository');
    return RoutineRepository.getOverrideForDate(dateISO);
  },
  async save(override) {
    const { RoutineRepository } = await import('@/lib/db/repository');
    await RoutineRepository.saveOverride(override);
  },
  async remove(dateISO) {
    const { RoutineRepository } = await import('@/lib/db/repository');
    await RoutineRepository.removeOverride(dateISO);
  },
  async list() {
    const { RoutineRepository } = await import('@/lib/db/repository');
    return RoutineRepository.listOverrides();
  },
};

async function getStorage(): Promise<OverrideStorage> {
  return storage ?? dexieStorage;
}

// ---------------------------------------------------------------------------
// API publik
// ---------------------------------------------------------------------------

export interface EffectiveDay {
  dateISO: string;
  hari: string;
  tipe: string;
  pkl: string;
  workout: Workout | null;
  /** Ada override untuk hari ini? */
  overridden: boolean;
  override: ScheduleOverride | null;
}

/**
 * Hari efektif: override dulu, baru default JSON.
 * Dipakai di SEMUA layar yang menampilkan workout (Hari Ini, Mode Workout,
 * Minggu) — jangan ada sumber kebenaran kedua.
 */
export async function getEffectiveDay(dateISO: string): Promise<EffectiveDay> {
  const store = await getStorage();
  const override = (await store.get(dateISO)) ?? null;
  const base = getDefaultDayInput(dateISO);

  if (override) {
    return {
      dateISO,
      hari: base.hari,
      tipe: base.tipe,
      pkl: base.pkl,
      workout: override.replacementWorkout,
      overridden: true,
      override,
    };
  }

  return {
    dateISO,
    hari: base.hari,
    tipe: base.tipe,
    pkl: base.pkl,
    workout: base.workout,
    overridden: false,
    override: null,
  };
}

/**
 * Versi sinkron dari hari default (tanpa override). Dipakai untuk layar
 * Minggu yang menampilkan 7 hari sekaligus — override tetap dibaca async
 * per tanggal oleh pemanggil.
 */
export function getDefaultDay(dateISO: string) {
  return getDefaultDayInput(dateISO);
}

/**
 * Tulis override SETELAH konfirmasi pengguna (DATA_SCHEMA.md 7.4).
 * `expiresAfterDate: true` → hanya berlaku tanggal itu; keesokan harinya
 * otomatis kembali ke default tanpa aksi manual.
 */
export async function applyOverride(args: {
  dateISO: string;
  reason: SubstituteReason;
  source: 'quick_button' | 'ai_chat';
  expiresAfterDate: boolean;
  note?: string;
  replacementWorkout: Workout;
}): Promise<ScheduleOverride> {
  const store = await getStorage();
  const base = getDefaultDayInput(args.dateISO);
  const override = buildScheduleOverride({
    dateISO: args.dateISO,
    originalHari: base.hari,
    reason: args.reason,
    source: args.source,
    expiresAfterDate: args.expiresAfterDate,
    note: args.note,
    replacementWorkout: args.replacementWorkout,
  });
  await store.save(override);
  return override;
}

/**
 * Batalkan override untuk tanggal ini — kembali ke jadwal asli (T7.4).
 */
export async function clearOverride(dateISO: string): Promise<void> {
  const store = await getStorage();
  await store.remove(dateISO);
}

/**
 * T7.5 — daftar override yang TIDAK kedaluwarsa otomatis. Butuh konfirmasi
 * harian "masih berlaku?" agar tidak menggantung diam-diam.
 */
export async function getActiveNonExpiringOverrides(): Promise<ScheduleOverride[]> {
  const store = await getStorage();
  const all = await store.list();
  return all.filter((o) => !o.expiresAfterDate);
}

/**
 * Tandai override non-expiring sebagai selesai (dari prompt harian).
 */
export async function endNonExpiringOverride(id: string): Promise<void> {
  const store = await getStorage();
  const all = await store.list();
  const target = all.find((o) => o.id === id && !o.expiresAfterDate);
  if (target) await store.remove(target.dateISO);
}
