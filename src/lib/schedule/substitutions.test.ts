/**
 * Unit test Fase 7 — T7.1: tabel substitusi rule-based.
 *
 * Prinsip yang diuji:
 *  1. Setiap alasan menghasilkan Workout valid (punya latihan/bagian).
 *  2. Sakit kaki → tidak ada latihan kaki sama sekali.
 *  3. Sakit tangan → tidak ada latihan tangan/bahu.
 *  4. Capek/kurang tidur → versi lebih ringan, durasi turun atau sama.
 *  5. Hari libur (Minggu) tidak diubah — aturan hanya untuk hari workout.
 *  6. jadwal_mingguan.json TIDAK PERNAH dimodifikasi.
 */
import { describe, it, expect } from 'vitest';
import rawData from '@/data/jadwal_mingguan.json';
import {
  buildReplacement,
  WorkoutSchema,
  isRestWorkout,
  hasSubstitutionRule,
  QUICK_BUTTONS,
  type SubstituteReason,
  type DayInput,
} from '@/lib/schedule/substitutions';

// Snapshot JSON sebelum tes — harus tetap identik sampai akhir.
const JSON_SEBELUM = JSON.stringify(rawData);

const KAKI = /squat|lunge|leg|kaki|lutut|calf|paha|betis/i;
const TANGAN = /push|press|bicep|tricep|curl|dips|tangan|bahu|shoulder|plank|row|pull/i;

function dayInput(namaHari: string): DayInput {
  const hari = (rawData.hari as any[]).find((h) => h.hari === namaHari)!;
  return {
    hari: hari.hari,
    tipe: hari.tipe_hari ?? hari.tipe ?? 'PKL',
    pkl: hari.pkl ?? '',
    workout: hari.workout ?? null,
  };
}

const ALASAN: Exclude<SubstituteReason, 'lainnya'>[] = [
  'sakit_kaki_lutut',
  'sakit_tangan_bahu',
  'capek_kurang_tidur',
  'sakit_demam',
  'cuaca_hujan',
];

describe('T7.1 — buildReplacement', () => {
  // AC T7.1: tiap SubstituteReason × tiap hari kerja (Senin–Jumat, Sabtu)
  // harus menghasilkan Workout valid.
  const HARI_KERJA = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  it('setiap alasan × setiap hari kerja menghasilkan Workout valid (lolos Zod)', () => {
    for (const alasan of ALASAN) {
      for (const hari of HARI_KERJA) {
        const hasil = buildReplacement(alasan, dayInput(hari));
        const valid = WorkoutSchema.safeParse(hasil);
        expect(valid.success, `${alasan} × ${hari} harus valid`).toBe(true);
        expect(hasil.nama.length).toBeGreaterThan(0);
      }
    }
  });

  it('selalu menghasilkan Workout yang lulus schema Zod', () => {
    for (const alasan of ALASAN) {
      const hasil = buildReplacement(alasan, dayInput('Senin'));
      const valid = WorkoutSchema.safeParse(hasil);
      expect(valid.success, `alasan ${alasan} harus valid`).toBe(true);
    }
  });

  it('sakit_kaki_lutut menghapus SEMUA latihan kaki', () => {
    const hasil = buildReplacement('sakit_kaki_lutut', dayInput('Rabu')); // Rabu = Legs
    expect(hasil.nama).not.toMatch(/leg/i);

    // Cek hanya NAMA latihan — instruksi gerakan wajar menyebut kata
    // "kaki"/"lutut" (mis. "lutut ditekuk 90°"), itu bukan latihan kaki.
    const namaLatihan = (hasil.latihan ?? []).map((e) => String(e.latihan ?? '')).join('|');
    expect(namaLatihan).not.toMatch(KAKI);
  });

  it('sakit_tangan_bahu menghapus SEMUA latihan tangan/bahu', () => {
    const hasil = buildReplacement('sakit_tangan_bahu', dayInput('Senin')); // Senin = Push + Core
    const namaLatihan = (hasil.latihan ?? []).map((e) => String(e.latihan ?? '')).join('|');
    expect(namaLatihan).not.toMatch(TANGAN);
  });

  it('capek_kurang_tidur menghasilkan sesi lebih ringan dari aslinya', () => {
    const asli = dayInput('Senin').workout!;
    const hasil = buildReplacement('capek_kurang_tidur', dayInput('Senin'));

    // Jumlah latihan tidak boleh bertambah.
    const jumlahAsli = (asli.latihan ?? []).length;
    const jumlahHasil = (hasil.latihan ?? []).length;
    expect(jumlahHasil).toBeLessThanOrEqual(jumlahAsli);
    expect(hasil.nama).toMatch(/ringan|mudah|recovery|gerak/i);
  });

  it('TIDAK mengubah jadwal_mingguan.json', () => {
    for (const alasan of ALASAN) {
      buildReplacement(alasan, dayInput('Senin'));
    }
    expect(JSON.stringify(rawData)).toBe(JSON_SEBELUM);
  });

  it('hari libur (Minggu) tidak diganti dengan latihan baru', () => {
    const hasil = buildReplacement('sakit_kaki_lutut', dayInput('Minggu')); // Full Rest
    expect(isRestWorkout(hasil)).toBe(true);
  });

  it('setiap alasan punya rule', () => {
    for (const alasan of ALASAN) {
      expect(hasSubstitutionRule(alasan)).toBe(true);
    }
    expect(hasSubstitutionRule('lainnya')).toBe(false);
  });

  it('QUICK_BUTTONS hanya berisi alasan dengan rule', () => {
    for (const b of QUICK_BUTTONS) {
      expect(hasSubstitutionRule(b.reason)).toBe(true);
    }
  });
});
