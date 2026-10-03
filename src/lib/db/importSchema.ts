import { z } from 'zod';

/**
 * T10 — Validasi ketat saat impor backup.
 *
 * Sebelum ini `importData` hanya mengecek `r.id != null`; baris dengan bentuk
 * salah (mis. `glasses: "banyak"`, `dateISO: null`, atau objek tak dikenal)
 * tetap masuk ke Dexie dan merusak perhitungan turunan (grafik, streak, BMR).
 *
 * Di sini tiap tabel punya skema Zod ringan: field inti divalidasi, field
 * ekstra dibiarkan lolos (`.passthrough()`) agar backup dari versi lebih baru
 * tidak ditolak hanya karena punya kolom tambahan. Baris yang gagal di-skip
 * dan dilaporkan jumlahnya — impor tidak dibatalkan total.
 */

const base = { schemaVersion: z.number().optional() };

// Prinsip: WAJIB id + dateISO (kunci DB & urutan grafik). Field deskriptif
// (nama, catatan) boleh hilang agar backup versi lama tetap bisa dipulihkan.
// Field NILAI (kg, glasses, rating, dst.) divalidasi ketat saat ada — inilah
// yang mencegah angka rusak seperti `glasses: "banyak"` merusak perhitungan.
const WorkoutLogSchema = z.object({
  id: z.string().min(1),
  dateISO: z.string().min(1),
  hari: z.string().optional().default(''),
  workoutNama: z.string().optional().default(''),
  exercises: z.array(
    z.object({
      latihan: z.string(),
      tipe: z.enum(['reps', 'durasi']),
      sets: z.array(z.any()),
    }).passthrough(),
  ).optional().default([]),
  energyRating: z.number().int().min(1).max(5).optional(),
  note: z.string().optional(),
  ...base,
}).passthrough();

const WeightLogSchema = z.object({
  id: z.string().min(1),
  dateISO: z.string().min(1),
  kg: z.number().finite(),
  note: z.string().optional(),
  ...base,
}).passthrough();

const SleepLogSchema = z.object({
  id: z.string().min(1),
  dateISO: z.string().min(1),
  sleptAt: z.string().optional(),
  wokeAt: z.string().optional(),
  sleptBefore22: z.boolean().optional().default(false),
  qualityRating: z.number().int().min(1).max(5).optional(),
  ...base,
}).passthrough();

const MealCheckSchema = z.object({
  id: z.string().min(1),
  dateISO: z.string().min(1),
  waktu: z.string().optional().default(''),
  menu: z.string().optional().default(''),
  done: z.boolean().optional().default(false),
  ...base,
}).passthrough();

const WaterLogSchema = z.object({
  id: z.string().min(1),
  dateISO: z.string().min(1),
  glasses: z.number().int().min(0),
  ...base,
}).passthrough();

const HungerLogSchema = z.object({
  id: z.string().min(1),
  dateISO: z.string().min(1),
  timestamp: z.string().optional().default(''),
  note: z.string().optional().default(''),
  ...base,
}).passthrough();

const AbilityTestSchema = z.object({
  id: z.string().min(1),
  dateISO: z.string().min(1),
  cycle: z.enum(['4-week', '8-week']),
  results: z.array(
    z.object({ nama: z.string(), nilai: z.number().finite(), satuan: z.string() }).passthrough(),
  ).optional().default([]),
  note: z.string().optional(),
  ...base,
}).passthrough();

const WeeklyNoteSchema = z.object({
  id: z.string().min(1),
  weekStartISO: z.string().min(1),
  note: z.string().optional().default(''),
  ...base,
}).passthrough();

const MilestoneSchema = z.object({
  id: z.string().min(1),
  kode: z.string(),
  label: z.string(),
  achievedAt: z.string(),
  ...base,
}).passthrough();

const SettingsSchema = z.object({
  id: z.literal('current_settings'),
  theme: z.enum(['auto', 'light', 'dark']).optional(),
  reminders: z.record(z.string(), z.object({ enabled: z.boolean(), time: z.string().optional() })).optional(),
  aiEnabled: z.boolean().optional(),
  ...base,
}).passthrough();

// ChatHistory: skema paling longgar — bentuknya berubah antar versi (pesan
// tunggal `role`/`text` vs array `messages`). Cukup wajib `id` agar tak ada
// baris tanpa kunci yang membuat bulkPut gagal.
const ChatHistorySchema = z.object({
  id: z.string().min(1),
  ...base,
}).passthrough();

// scheduleOverrides: bentuknya dinamis (override per tanggal); cukup id.
const ScheduleOverrideSchema = z.object({
  id: z.string().min(1),
  ...base,
}).passthrough();

export const TABLE_SCHEMAS = {
  workouts: WorkoutLogSchema,
  weights: WeightLogSchema,
  sleeps: SleepLogSchema,
  meals: MealCheckSchema,
  settings: SettingsSchema,
  chatHistory: ChatHistorySchema,
  scheduleOverrides: ScheduleOverrideSchema,
  water: WaterLogSchema,
  hunger: HungerLogSchema,
  abilityTests: AbilityTestSchema,
  weeklyNotes: WeeklyNoteSchema,
  milestones: MilestoneSchema,
} as const;

export type TableKey = keyof typeof TABLE_SCHEMAS;

/**
 * Validasi satu array baris untuk sebuah tabel.
 * @returns `{ valid, skipped }` — baris yang lolos dan jumlah yang di-skip.
 */
export function validateRows<T = any>(key: TableKey, rows: unknown[]): { valid: T[]; skipped: number } {
  const schema = TABLE_SCHEMAS[key];
  const valid: T[] = [];
  let skipped = 0;
  for (const row of rows) {
    const res = schema.safeParse(row);
    if (res.success) {
      valid.push(res.data as T);
    } else {
      skipped++;
    }
  }
  return { valid, skipped };
}
