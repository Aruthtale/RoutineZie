import { z } from 'zod';

export const ItemJadwalSchema = z.object({
  id: z.string(),
  waktu: z.string(),
  kegiatan: z.string(),
  opsional: z.boolean().optional().default(false),
  detail: z.string().optional(),
  pola_makan: z.string().optional(),
  tipe: z.enum(['workout', 'makan', 'istirahat', 'rutinitas', 'fleksibel']).optional(),
});

export const SetWorkoutSchema = z.object({
  target: z.string(),
  tipe: z.string().optional(),
  tempo: z.string().optional(),
  rest_detik: z.number().optional(),
  opsional: z.boolean().optional(),
  pilihan_variasi: z.array(z.string()).optional(),
  durasi: z.string().optional(),
  catatan: z.string().optional(),
});

export const GerakanWorkoutSchema = z.object({
  nama: z.string(),
  peralatan: z.string().optional(),
  set: z.array(SetWorkoutSchema),
  cara: z.string().optional(),
});

export const WorkoutDetailSchema = z.object({
  nama_sesi: z.string(),
  estimasi_menit: z.number(),
  target_otot: z.array(z.string()),
  gerakan: z.array(GerakanWorkoutSchema),
});

export const PolaMakanSchema = z.object({
  sarapan: z.string().optional(),
  makan_siang: z.string().optional(),
  makan_malam: z.string().optional(),
  snack: z.array(z.string()).optional(),
});

export const RingkasanEnergiSchema = z.object({
  estimasi_intake_kalori: z.number().optional(),
  fokus_nutrisi: z.string().optional(),
  catatan: z.string().optional(),
});

export const HariSchema = z.object({
  jadwal: z.array(ItemJadwalSchema),
  workout: WorkoutDetailSchema.nullable().optional(),
  pola_makan: PolaMakanSchema.optional(),
  ringkasan_energi: RingkasanEnergiSchema.optional(),
  catatan_khusus: z.string().optional(),
});

export const MasterJadwalSchema = z.record(z.string(), HariSchema);

export type ItemJadwal = z.infer<typeof ItemJadwalSchema>;
export type WorkoutDetail = z.infer<typeof WorkoutDetailSchema>;
export type GerakanWorkout = z.infer<typeof GerakanWorkoutSchema>;
export type SetWorkout = z.infer<typeof SetWorkoutSchema>;
export type Hari = z.infer<typeof HariSchema>;
export type MasterJadwal = z.infer<typeof MasterJadwalSchema>;
