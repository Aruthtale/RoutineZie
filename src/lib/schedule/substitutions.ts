/**
 * T7.1 — Tabel substitusi jadwal (rule-based, tanpa AI)
 *
 * Sumber kebenaran tunggal untuk semua substitusi latihan.
 * DATA_SCHEMA.md 7.1–7.2. Jangan bangun logika pengganti di komponen UI
 * atau di tempat lain — semua lewat sini.
 *
 * `jadwal_mingguan.json` TIDAK PERNAH ditulis ulang oleh modul ini.
 * Hasil `buildReplacement` disimpan utuh sebagai `ScheduleOverride`.
 */

import { z } from 'zod';
import rawData from '@/data/jadwal_mingguan.json';
// Bentuk tampilan latihan dipakai bersama — parser adalah pemiliknya, jadi
// modul ini hanya mere-ekspor agar tidak ada dua definisi yang bisa
// perlahan berbeda.
import type {
  NormalizedWorkout,
  NormalizedExercise,
  NormalizedSet,
} from '@/lib/schedule/parser';
export type { NormalizedWorkout, NormalizedExercise, NormalizedSet };

// ---------------------------------------------------------------------------
// 7.1 Alasan substitusi (tertutup, bukan teks bebas)
// ---------------------------------------------------------------------------

export const SubstituteReasonSchema = z.enum([
  'sakit_kaki_lutut',
  'sakit_tangan_bahu',
  'capek_kurang_tidur',
  'sakit_demam',
  'cuaca_hujan',
  'lainnya',
]);
export type SubstituteReason = z.infer<typeof SubstituteReasonSchema>;

// ---------------------------------------------------------------------------
// Bentuk Workout yang dipakai di seluruh modul ini.
// Disebut `Workout` di DATA_SCHEMA.md 7.2. Data mentah di JSON memakai
// `latihan`/`nama` (bukan `gerakan`/`nama_sesi`), jadi schema ini disusun
// mengikuti data nyata, bukan schema lama di schema.ts yang tidak pernah
// dipakai untuk memvalidasi file ini.
// ---------------------------------------------------------------------------

export const SetSchema = z.object({
  latihan: z.string().optional(),
  set: z.number().nullable().optional(),
  repetisi_atau_waktu: z.string().nullable().optional(),
  catatan: z.string().nullable().optional(),
  otot_target: z.string().nullable().optional(),
  cara_melakukan: z.array(z.string()).nullable().optional(),
  tips_form: z.string().nullable().optional(),
  kesalahan_umum: z.string().nullable().optional(),
  versi_lebih_mudah: z.string().nullable().optional(),
  versi_lebih_sulit: z.string().nullable().optional(),
});
export type Set = z.infer<typeof SetSchema>;

export const BagianSchema = z.object({
  bagian: z.string(),
  latihan: z.array(SetSchema),
});
export type Bagian = z.infer<typeof BagianSchema>;

// Workout boleh berbentuk `latihan` (Senin–Jumat) atau `bagian` (Sabtu).
export const WorkoutSchema = z
  .object({
    nama: z.string(),
    durasi: z.string().nullable().optional(),
    pemanasan: z.string().nullable().optional(),
    istirahat_antar_set: z.string().nullable().optional(),
    latihan: z.array(SetSchema).optional(),
    bagian: z.array(BagianSchema).optional(),
    catatan: z.string().nullable().optional(),
    intensitas: z.string().nullable().optional(),
    otot_utama: z.string().nullable().optional(),
    tujuan: z.string().nullable().optional(),
    target_progres: z.string().nullable().optional(),
    tanda_berhenti: z.string().nullable().optional(),
    alat: z.string().nullable().optional(),
  })
  .refine((w) => Array.isArray(w.latihan) || Array.isArray(w.bagian), {
    message: 'Workout harus punya `latihan` atau `bagian`',
  });
export type Workout = z.infer<typeof WorkoutSchema>;

// ---------------------------------------------------------------------------
// 7.2 Tabel substitusi
// ---------------------------------------------------------------------------

export type Severity = 'ringan' | 'perlu_istirahat_total';

export interface SubstitutionRule {
  reason: Exclude<SubstituteReason, 'lainnya'>;
  label: string; // tombol cepat / tampilan singkat
  emoji: string;
  deskripsi: string; // dipakai di kartu usulan
  appliesToWorkoutDays: true; // tidak berlaku untuk hari yang sudah libur
  requiresConfirmation: true; // selalu true — tidak pernah auto-apply
  severity: Severity;
  buildReplacement: (originalDay: DayInput) => Workout;
}

export interface DayInput {
  hari: string; // "Senin", "Selasa", ...
  tipe: string; // "PKL" | "Libur PKL"
  pkl: string;
  workout: Workout | null;
}

// ---------------------------------------------------------------------------
// Util: ambil daftar gerakan pipih dari `latihan` atau `bagian`.
// ---------------------------------------------------------------------------

type FlatItem = Set & { __bagian?: string };

function flattenWorkout(w: Workout | null): FlatItem[] {
  if (!w) return [];
  if (Array.isArray(w.latihan) && w.latihan.length > 0) return w.latihan.map((x) => ({ ...x }));
  if (Array.isArray(w.bagian)) {
    return w.bagian.flatMap((b) => b.latihan.map((x) => ({ ...x, __bagian: b.bagian })));
  }
  return [];
}

function toFlatWorkout(items: FlatItem[], meta: { nama: string; otot_utama?: string | null }): Workout {
  return {
    nama: meta.nama,
    durasi: null,
    pemanasan: null,
    istirahat_antar_set: null,
    latihan: items.map(({ __bagian, ...rest }) => rest),
    catatan: null,
    intensitas: 'Disesuaikan',
    otot_utama: meta.otot_utama ?? 'Disesuaikan',
    tujuan: null,
    target_progres: null,
    tanda_berhenti: null,
    alat: null,
  };
}

/** Salin seluruh gerakan dari hari lain sebagai bahan substitusi. */
function copyExercisesFrom(sourceDay: string): FlatItem[] {
  const src = (rawData as any).hari.find((h: any) => h.hari === sourceDay);
  if (!src) return [];
  return flattenWorkout(src.workout ?? null);
}

// ---------------------------------------------------------------------------
// Filter gerakan berdasarkan area tubuh.
// Identitas gerakan dibanding case-insensitive + trim.
// ---------------------------------------------------------------------------

const LOWER_BODY_PAT = /(kaki|paha|bokong|betis|lutut|pergelangan kaki|jogging|jalan|lari|run|squat|lunge|calf)/i;
const UPPER_BODY_PAT = /(tangan|bahu|dada|triceps|trisep|bisep|punggung|push|plank|pike|pull|barbel)/i;

function isLowerBody(it: FlatItem): boolean {
  const hay = [it.otot_target, it.latihan].filter(Boolean).join(' ');
  return LOWER_BODY_PAT.test(hay);
}
function isUpperBody(it: FlatItem): boolean {
  const hay = [it.otot_target, it.latihan].filter(Boolean).join(' ');
  return UPPER_BODY_PAT.test(hay);
}

// ---------------------------------------------------------------------------
// Pengganti siap pakai (dari Senin / Rabu / Minggu) — bahan untuk aturan.
// ---------------------------------------------------------------------------

// Ambil satu gerakan utuh dari hari lain (dengan detail cara_melakukan,
// tips, dll). Kembali ke bentuk minimal bila tidak ditemukan.
function exerciseFrom(sourceDay: string, nama: string, fallbackOtot: string): FlatItem {
  const src = copyExercisesFrom(sourceDay).find((x) => (x.latihan || '').toLowerCase() === nama.toLowerCase());
  if (src) return src;
  return {
    latihan: nama,
    set: 2,
    repetisi_atau_waktu: '8-12',
    catatan: 'Disesuaikan dari cadangan.',
    otot_target: fallbackOtot,
    cara_melakukan: [],
  } as FlatItem;
}

const UPPER_CORE_POOL: FlatItem[] = [
  exerciseFrom('Senin', 'Push-up', 'Dada, bahu, triceps, core'),
  exerciseFrom('Senin', 'Pike push-up', 'Bahu, triceps'),
  exerciseFrom('Senin', 'Dead bug', 'Core'),
  exerciseFrom('Senin', 'Plank', 'Core'),
];

// Khusus sakit tangan/bahu: tanpa gerakan bertumpu tangan (push-up, plank).
const LEGS_POOL: FlatItem[] = [
  exerciseFrom('Rabu', 'Squat', 'Paha, bokong, betis'),
  exerciseFrom('Rabu', 'Reverse lunge', 'Paha, bokong'),
  exerciseFrom('Rabu', 'Calf raise', 'Betis'),
  exerciseFrom('Senin', 'Dead bug', 'Core (tanpa tumpuan tangan)'),
];

// ---------------------------------------------------------------------------
// 7.2 buildReplacement per alasan — fungsi murni.
// ---------------------------------------------------------------------------

function sakitKakiLutut(day: DayInput): Workout {
  const fallback = toFlatWorkout(UPPER_CORE_POOL, { nama: 'Upper Body + Core (Kaki Istirahat)', otot_utama: 'Tangan, bahu, core' });
  if (!day.workout) return fallback;
  const safe = flattenWorkout(day.workout).filter((it) => !isLowerBody(it));
  if (safe.length === 0) return fallback;
  return toFlatWorkout(safe, { nama: `${day.workout.nama} — Versi Tanpa Kaki`, otot_utama: 'Tangan, bahu, core' });
}

function sakitTanganBahu(day: DayInput): Workout {
  const fallback = toFlatWorkout(LEGS_POOL, { nama: 'Legs + Core (Tangan Istirahat)', otot_utama: 'Kaki, core' });
  if (!day.workout) return fallback;
  const safe = flattenWorkout(day.workout).filter((it) => !isUpperBody(it));
  if (safe.length === 0) return fallback;
  return toFlatWorkout(safe, { nama: `${day.workout.nama} — Versi Tanpa Tangan`, otot_utama: 'Kaki, core' });
}

function capekKurangTidur(day: DayInput): Workout {
  if (!day.workout) return restWorkout('Versi Ringan');
  const halved = flattenWorkout(day.workout).map((it) => {
    const setNum = typeof it.set === 'number' && it.set > 1 ? Math.max(1, Math.round(it.set / 2)) : it.set;
    return { ...it, set: setNum, catatan: 'Versi ringan: set dipotong ~50%. Stop sebelum berat.' };
  });
  return toFlatWorkout(halved, { nama: `${day.workout.nama} — Versi Ringan`, otot_utama: day.workout.otot_utama });
}

function cuacaHujan(day: DayInput): Workout {
  const indoorBase = flattenWorkout(day.workout).map((it) => {
    // Jogging/lari outdoor → jalan cepat di tempat 15–20 menit + calisthenics ringan.
    if (/jogging|jalan|lari|run/i.test([it.latihan, it.otot_target].join(' '))) {
      return {
        ...it,
        latihan: 'Jalan cepat di tempat',
        repetisi_atau_waktu: '15-20 menit',
        otot_target: 'Kaki, kardio (indoor)',
        catatan: 'Pengganti outdoor saat hujan: jalan cepat di tempat + calisthenics ringan.',
      };
    }
    // Set dikurangi untuk calisthenics ringan.
    const setNum = typeof it.set === 'number' && it.set > 1 ? Math.max(1, it.set - 1) : it.set;
    return { ...it, set: setNum };
  });
  return toFlatWorkout(indoorBase, { nama: `${day.workout?.nama ?? 'Workout'} — Versi Indoor (Hujan)`, otot_utama: day.workout?.otot_utama });
}

function restWorkout(suffix = 'Full Rest'): Workout {
  const src = (rawData as any).hari.find((h: any) => h.hari === 'Minggu');
  if (src?.workout) {
    return { ...src.workout, nama: `Full Rest${suffix === 'Full Rest' ? '' : ` — ${suffix}`}` };
  }
  return {
    nama: 'Full Rest',
    durasi: null,
    pemanasan: null,
    istirahat_antar_set: null,
    latihan: [],
    catatan: 'Istirahat penuh. Tidak ada kewajiban workout.',
    intensitas: 'Istirahat',
    otot_utama: '-',
    tujuan: 'Pemulihan total.',
    target_progres: '-',
    tanda_berhenti: '-',
    alat: '-',
  };
}

// ---------------------------------------------------------------------------
// Tabel substitusi — sumber kebenaran tunggal.
// 'lainnya' sengaja TIDAK punya entri: tidak ada substitusi otomatis,
// default aman adalah Full Rest (DATA_SCHEMA.md 7.1).
// ---------------------------------------------------------------------------

export const SUBSTITUTION_RULES: Record<
  Exclude<SubstituteReason, 'lainnya'>,
  SubstitutionRule
> = {
  sakit_kaki_lutut: {
    reason: 'sakit_kaki_lutut',
    label: 'Kaki/lutut',
    emoji: '🦵',
    deskripsi: 'Ambil ulang latihan upper-body/core; semua gerakan kaki dihilangkan.',
    appliesToWorkoutDays: true,
    requiresConfirmation: true,
    severity: 'perlu_istirahat_total',
    buildReplacement: sakitKakiLutut,
  },
  sakit_tangan_bahu: {
    reason: 'sakit_tangan_bahu',
    label: 'Tangan/bahu',
    emoji: '💪',
    deskripsi: 'Ambil ulang latihan kaki; semua gerakan tangan/bahu dihilangkan.',
    appliesToWorkoutDays: true,
    requiresConfirmation: true,
    severity: 'perlu_istirahat_total',
    buildReplacement: sakitTanganBahu,
  },
  capek_kurang_tidur: {
    reason: 'capek_kurang_tidur',
    label: 'Capek/kurang tidur',
    emoji: '😴',
    deskripsi: 'Workout hari ini tetap, jumlah set dipotong ~50%, label "versi ringan".',
    appliesToWorkoutDays: true,
    requiresConfirmation: true,
    severity: 'ringan',
    buildReplacement: capekKurangTidur,
  },
  cuaca_hujan: {
    reason: 'cuaca_hujan',
    label: 'Hujan',
    emoji: '🌧️',
    deskripsi: 'Jogging diganti jalan cepat di tempat 15–20 menit + calisthenics ringan (set dikurangi).',
    appliesToWorkoutDays: true,
    requiresConfirmation: true,
    severity: 'ringan',
    buildReplacement: cuacaHujan,
  },
  sakit_demam: {
    reason: 'sakit_demam',
    label: 'Sakit/demam',
    emoji: '🤒',
    deskripsi: 'Selalu Full Rest (workout kosong seperti Minggu), tanpa opsi lain.',
    appliesToWorkoutDays: true,
    requiresConfirmation: true,
    severity: 'perlu_istirahat_total',
    buildReplacement: () => restWorkout('Full Rest'),
  },
};

// ---------------------------------------------------------------------------
// API publik
// ---------------------------------------------------------------------------

/**
 * Apakah alasan ini punya aturan substitusi? 'lainnya' → false.
 */
export function hasSubstitutionRule(reason: SubstituteReason): reason is Exclude<SubstituteReason, 'lainnya'> {
  return reason !== 'lainnya' && Object.prototype.hasOwnProperty.call(SUBSTITUTION_RULES, reason);
}

/**
 * Bangun pengganti untuk `day` berdasarkan `reason`. Murni — tidak menyentuh
 * repository, tidak menulis apa pun.
 *
 * Hari libur (tidak ada workout / sudah rest) tidak disubstitusi; kembalikan
 * workout hari apa adanya agar UI tetap konsisten.
 */
export function buildReplacement(reason: SubstituteReason, day: DayInput): Workout {
  if (!hasSubstitutionRule(reason)) return restWorkout('Alasan Tidak Dikenal');
  const rule = SUBSTITUTION_RULES[reason];
  // Hari libur/rest tidak disubstitusi — kembalikan workout hari apa adanya
  // (DATA_SCHEMA.md 7.2: appliesToWorkoutDays).
  if (!day.workout || isRestWorkout(day.workout)) return day.workout ?? restWorkout(rule.label);
  return rule.buildReplacement(day);
}

/**
 * Hari istirahat: tidak ada `latihan` dan tidak ada `bagian`.
 */
export function isRestWorkout(w: Workout | null | undefined): boolean {
  if (!w) return true;
  const hasLatihan = Array.isArray(w.latihan) && w.latihan.length > 0;
  const hasBagian = Array.isArray(w.bagian) && w.bagian.some((b) => b.latihan.length > 0);
  return !hasLatihan && !hasBagian;
}

/**
 * Bentuk utuh ScheduleOverride yang siap disimpan. Hanya dipanggil
 * SETELAH pengguna menekan "Terima" (DATA_SCHEMA.md 7.4).
 */
export function buildScheduleOverride(args: {
  dateISO: string;
  originalHari: string;
  reason: SubstituteReason;
  source: 'quick_button' | 'ai_chat';
  expiresAfterDate: boolean;
  note?: string;
  replacementWorkout: Workout;
}): ScheduleOverride {
  return {
    id: `override_${args.dateISO}_${args.reason}`,
    dateISO: args.dateISO,
    originalHari: args.originalHari,
    reason: args.reason,
    source: args.source,
    replacementWorkout: args.replacementWorkout,
    userConfirmed: true,
    expiresAfterDate: args.expiresAfterDate,
    note: args.note,
    createdAt: new Date().toISOString(),
    schemaVersion: 1,
  };
}

// ---------------------------------------------------------------------------
// 7.3 Bentuk data Override
// ---------------------------------------------------------------------------

export const ScheduleOverrideSchema = z.object({
  id: z.string(),
  dateISO: z.string(),
  originalHari: z.string(),
  reason: SubstituteReasonSchema,
  source: z.enum(['quick_button', 'ai_chat']),
  replacementWorkout: WorkoutSchema,
  userConfirmed: z.literal(true),
  expiresAfterDate: z.boolean(),
  note: z.string().optional(),
  createdAt: z.string(),
  schemaVersion: z.literal(1),
});
export type ScheduleOverride = z.infer<typeof ScheduleOverrideSchema>;

// ---------------------------------------------------------------------------
// Cedera akut (7.5 / AI_CHAT.md bagian 7) — BUKAN substitusi.
// Sistem/AI tidak boleh menawarkan substitusi apa pun jika terdeteksi.
// ---------------------------------------------------------------------------

const ACUTE_INJURY_PATTERNS: RegExp[] = [
  /kepeleset|terseliu|terkilir|keseleo/i,
  /jatuh|terjatuh|tergelincir/i,
  /nyeri tajam|sakit tajam|tusukan|menusuk/i,
  /bengkak|memar|biru[- ]hitam/i,
  /tidak bisa (jalan|diinjak|gerak|menggerakkan)/i,
  /patah|retak|fraktur/i,
  /berdebar|kesemutan|mati rasa/i,
];

/**
 * True jika teks menunjukkan cedera akut (bukan pegal biasa/DOMS).
 * Saat true: jangan tawarkan substitusi — istirahat total + saran tenaga
 * kesehatan.
 */
export function detectAcuteInjury(text: string): boolean {
  return ACUTE_INJURY_PATTERNS.some((re) => re.test(text));
}

/**
 * Tombol cepat di layar Hari Ini (T7.3). Hanya alasan dengan rule.
 */
export const QUICK_BUTTONS: { reason: SubstituteReason; emoji: string; label: string }[] = [
  { reason: 'sakit_kaki_lutut', emoji: SUBSTITUTION_RULES.sakit_kaki_lutut.emoji, label: SUBSTITUTION_RULES.sakit_kaki_lutut.label },
  { reason: 'sakit_tangan_bahu', emoji: SUBSTITUTION_RULES.sakit_tangan_bahu.emoji, label: SUBSTITUTION_RULES.sakit_tangan_bahu.label },
  { reason: 'capek_kurang_tidur', emoji: SUBSTITUTION_RULES.capek_kurang_tidur.emoji, label: SUBSTITUTION_RULES.capek_kurang_tidur.label },
  { reason: 'sakit_demam', emoji: SUBSTITUTION_RULES.sakit_demam.emoji, label: SUBSTITUTION_RULES.sakit_demam.label },
];

// ---------------------------------------------------------------------------
// Normalisasi ke bentuk yang dipakai WorkoutModeModal (parser.ts).
// Workout "Pengganti" selalu disimpan dalam bentuk JSON mentah (latihan/
// bagian); UI perlu NormalizedWorkout, jadi normalisasi terjadi di sini.
// Tipe-tipe Normalized* di-ekspor ulang dari parser.ts di atas file ini.
// ---------------------------------------------------------------------------

function normalizeExercises(items: FlatItem[]): NormalizedExercise[] {
  return items.map((ex) => {
    const repOrTimeStr = ex.repetisi_atau_waktu ?? '';
    const isDuration = /menit|detik|min|sec/i.test(repOrTimeStr) || ex.set == null;
    let durasiMins = 0;
    const m = repOrTimeStr.match(/(\d+)(?:-(\d+))?\s*menit/i);
    if (m) durasiMins = parseInt(m[2] ?? m[1], 10);

    let sets: NormalizedSet[];
    if (isDuration) {
      sets = [{ setIndex: 0, target: repOrTimeStr || 'Durasi', tipeTarget: 'durasi', restSec: 0 }];
    } else {
      const setCount = typeof ex.set === 'number' ? ex.set : 3;
      sets = Array.from({ length: setCount }, (_, i) => ({
        setIndex: i,
        target: repOrTimeStr || '8-12',
        tipeTarget: 'reps' as const,
        restSec: 60,
      }));
    }

    const cara = Array.isArray(ex.cara_melakukan) ? ex.cara_melakukan : ex.cara_melakukan ? [ex.cara_melakukan] : [];

    return {
      nama: ex.latihan || 'Latihan',
      tipe: isDuration ? 'durasi' : 'reps',
      setCount: sets.length,
      sets,
      durasiMinutes: durasiMins,
      ototTarget: ex.otot_target ?? undefined,
      peralatan: isDuration ? 'SEPATU / BOTOL AIR' : 'TANPA ALAT',
      catatan: ex.catatan ?? undefined,
      cara,
      tipsForm: ex.tips_form ?? undefined,
      kesalahanUmum: ex.kesalahan_umum ?? undefined,
      versiMudah: ex.versi_lebih_mudah ?? undefined,
      versiSulit: ex.versi_lebih_sulit ?? undefined,
    };
  });
}

/**
 * Ubah Workout pengganti (bentuk JSON mentah) ke NormalizedWorkout
 * yang siap diberikan ke WorkoutModeModal. Logikanya selaras dengan
 * `normalizeWorkoutData` di parser.ts (mem-flatten `bagian` juga).
 */
export function normalizeReplacement(w: Workout | null): NormalizedWorkout | null {
  if (!w) return null;
  const items = flattenWorkout(w);
  return {
    nama: w.nama,
    durasi: w.durasi ?? undefined,
    intensitas: w.intensitas ?? undefined,
    latihan: normalizeExercises(items),
    pemanasan: w.pemanasan ?? undefined,
    istirahatAntarSet: w.istirahat_antar_set ?? undefined,
    ototUtama: w.otot_utama ?? undefined,
  };
}
