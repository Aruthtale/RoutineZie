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
  }
}

export const db = new RoutineDatabase();