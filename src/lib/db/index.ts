import Dexie, { Table } from 'dexie';
import { indexedDB as fakeIndexedDB, IDBKeyRange as fakeIDBKeyRange } from 'fake-indexeddb';

export interface SetLog {
  reps?: number;
  seconds?: number;
  target?: string;
  actualDone?: string | number;
  done: boolean;
}

export interface WorkoutLog {
  id: string;
  dateISO: string;
  hari: string;
  workoutNama: string;
  exercises: {
    latihan: string;
    tipe: 'reps' | 'durasi';
    sets: SetLog[];
  }[];
  energyRating?: 1 | 2 | 3 | 4 | 5;
  note?: string;
  schemaVersion: 1;
}

export interface WeightLog {
  id: string;
  dateISO: string;
  kg: number;
  note?: string;
  schemaVersion: 1;
}

export interface SleepLog {
  id: string;
  dateISO: string;
  sleptAt?: string;
  wokeAt?: string;
  sleptBefore22: boolean;
  qualityRating?: 1 | 2 | 3 | 4 | 5;
  schemaVersion: 1;
}

export interface MealCheck {
  id: string;
  dateISO: string;
  waktu: string;
  menu: string;
  done: boolean;
  schemaVersion: 1;
}

/** T8.1 — Tally air minum (bilangan gelas, bukan angka presisi). */
export interface WaterLog {
  id: string; // "water_<dateISO>"
  dateISO: string;
  glasses: number;
  schemaVersion: 1;
}

/** T8.1 — Log cepat "kalau lapar" tanpa penilaian. */
export interface HungerLog {
  id: string;
  dateISO: string;
  timestamp: string;
  note: string;
  schemaVersion: 1;
}

/**
 * T8.2 — Tes kemampuan berkala (mis. tiap 4 minggu). Pengguna melakukan
 * beberapa latihan benchmark (push-up, plank, lari 12 menit, dll) dan
 * mencatat hasilnya; tren antar tes jadi laporan kemajuan tanpa penilaian.
 */
export interface AbilityTest {
  id: string; // "ability_<dateISO>_<sha>"
  dateISO: string;
  /** "4-week" | "8-week" — sesuai rencana tes di skill.md. */
  cycle: '4-week' | '8-week';
  /** Hasil per latihan benchmark: nama → nilai + satuan. */
  results: {
    nama: string;
    /** Angka bebas: repetisi, detik, meter, menit. */
    nilai: number;
    /** Satuan untuk tampilan ("kali", "detik", "menit"). */
    satuan: string;
  }[];
  /** Catatan bebas pengguna (opsional). */
  note?: string;
  schemaVersion: 1;
}

/**
 * T8.2 — Catatan mingguan pada grafik berat badan: bukan hanya angka, tapi
 * konteks (mis. "minggu ujian, tidur kurang") untuk interpretasi naik/turun.
 */
export interface WeeklyNote {
  id: string; // "wnote_<dateISO>"
  /** Tanggal pertama minggu (Senin). */
  weekStartISO: string;
  note: string;
  schemaVersion: 1;
}

/**
 * T8.2 — Milestone: stempel pencapaian spesifik (mis. "Tidur ≤22.00 selama
 * 5 hari" atau "Berat turun 2kg sejak awal"). Diberikan otomatis saat
 * kondisi terpenuhi; tidak menghukum yang belum tercapai.
 */
export interface Milestone {
  id: string;
  /** Kode milestone untuk dedup (mis. "sleep_5x_before22"). */
  kode: string;
  /** Label tampilan. */
  label: string;
  /** Kapan tercapai. */
  achievedAt: string;
  schemaVersion: 1;
}

export interface AppSettings {
  id: 'current_settings';
  theme: 'auto' | 'light' | 'dark';
  reminders: Record<string, { enabled: boolean; time?: string }>;
  location?: { lat: number; lon: number; precision: 'coarse' };
  aiEnabled: boolean;
  /**
   * T8.3 — Override profil lokal. Menimpa nilai JSON asal TANPA mengubah file
   * sumber, agar pengguna bisa update tinggi/berat/kemampuan sendiri.
   */
  profileOverride?: {
    tinggi_cm?: number;
    berat_kg?: number;
    kemampuan_saat_ini?: Record<string, number | string>;
  };
  /** T8.3 — Override jam PKL (mis. "08.00-16.00"). */
  pklOverride?: string;
  schemaVersion: 1;
}

// Chat History - Fase 5
export interface ChatHistoryEntry {
  id: string;
  dateISO: string;
  messages: Array<{ role: 'user' | 'assistant'; text: string; timestamp?: string }>;
  contextUsed: {
    hariIni: { hari: string; tipe_hari: string; fokus: string; jadwalSingkat: { waktu: string; kegiatan: string }[] };
    aturanTidur: { bangun: string; target: string; batas: string };
    usia: number;
    waktuSekarang: string;
  };
  modelUsed: string;
  createdAt: string;
  schemaVersion: 1;
}

// Fase 7 — Override jadwal harian (DATA_SCHEMA.md 7.3).
// Impor tipe dari modul substitusi agar satu sumber kebenaran untuk bentuk
// `Workout` dan `SubstituteReason`.
import type { ScheduleOverride } from '@/lib/schedule/substitutions';
export type { ScheduleOverride };
export type ScheduleOverrideRow = ScheduleOverride;

export class RoutineDatabase extends Dexie {
  workoutLogs!: Table<WorkoutLog, string>;
  weightLogs!: Table<WeightLog, string>;
  sleepLogs!: Table<SleepLog, string>;
  mealChecks!: Table<MealCheck, string>;
  waterLogs!: Table<WaterLog, string>;
  hungerLogs!: Table<HungerLog, string>;
  abilityTests!: Table<AbilityTest, string>;
  weeklyNotes!: Table<WeeklyNote, string>;
  milestones!: Table<Milestone, string>;
  settings!: Table<AppSettings, string>;
  chatHistory!: Table<ChatHistoryEntry, string>;
  scheduleOverrides!: Table<ScheduleOverride, string>;

  constructor() {
    super('CloverzRoutineDB', {
      indexedDB: typeof window !== 'undefined' && window.indexedDB ? window.indexedDB : fakeIndexedDB,
      IDBKeyRange: typeof window !== 'undefined' && window.IDBKeyRange ? window.IDBKeyRange : fakeIDBKeyRange,
    });
    this.version(2).stores({
      workoutLogs: 'id, dateISO, hari, workoutNama',
      weightLogs: 'id, dateISO, kg',
      sleepLogs: 'id, dateISO, sleptBefore22',
      mealChecks: 'id, dateISO, waktu, done',
      settings: 'id',
      chatHistory: 'id, dateISO, createdAt',
    });
    this.version(3).stores({
      workoutLogs: 'id, dateISO, hari, workoutNama',
      weightLogs: 'id, dateISO, kg',
      sleepLogs: 'id, dateISO, sleptBefore22',
      mealChecks: 'id, dateISO, waktu, done',
      settings: 'id',
      chatHistory: 'id, dateISO, createdAt',
      // Fase 7 — override jadwal harian (DATA_SCHEMA.md 7.3)
      scheduleOverrides: 'id, dateISO, reason, expiresAfterDate',
    });
    this.version(4).stores({
      workoutLogs: 'id, dateISO, hari, workoutNama',
      weightLogs: 'id, dateISO, kg',
      sleepLogs: 'id, dateISO, sleptBefore22',
      mealChecks: 'id, dateISO, waktu, done',
      settings: 'id',
      chatHistory: 'id, dateISO, createdAt',
      scheduleOverrides: 'id, dateISO, reason, expiresAfterDate',
      // Fase 8 — pelacak air & log lapar (T8.1)
      waterLogs: 'id, dateISO, glasses',
      hungerLogs: 'id, dateISO, timestamp',
    });
    this.version(5).stores({
      workoutLogs: 'id, dateISO, hari, workoutNama',
      weightLogs: 'id, dateISO, kg',
      sleepLogs: 'id, dateISO, sleptBefore22',
      mealChecks: 'id, dateISO, waktu, done',
      settings: 'id',
      chatHistory: 'id, dateISO, createdAt',
      scheduleOverrides: 'id, dateISO, reason, expiresAfterDate',
      waterLogs: 'id, dateISO, glasses',
      hungerLogs: 'id, dateISO, timestamp',
      // Fase 8 T8.2 — tes kemampuan, catatan mingguan, milestone
      abilityTests: 'id, dateISO, cycle',
      weeklyNotes: 'id, weekStartISO',
      milestones: 'id, kode',
    });
  }
}

export const db = new RoutineDatabase();