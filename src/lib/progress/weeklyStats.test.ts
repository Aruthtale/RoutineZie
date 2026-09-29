import { describe, it, expect } from 'vitest';
import {
  getWeekStart,
  getWeekDates,
  computeSleepWeekStats,
  countWorkoutsPerWeek,
  checkMilestones,
} from './weeklyStats';

describe('getWeekStart', () => {
  it('mengembalikan Senin untuk tanggal di tengah minggu', () => {
    // 2026-09-29 adalah Selasa → Senin 2026-09-28
    expect(getWeekStart('2026-09-29')).toBe('2026-09-28');
  });

  it('mengembalikan Senin untuk hari Minggu (mundur 6 hari)', () => {
    // 2026-10-04 adalah Minggu → Senin 2026-09-28
    expect(getWeekStart('2026-10-04')).toBe('2026-09-28');
  });

  it('mengembalikan dirinya sendiri jika sudah Senin', () => {
    expect(getWeekStart('2026-09-28')).toBe('2026-09-28');
  });
});

describe('getWeekDates', () => {
  it('menghasilkan 7 tanggal berurutan mulai Senin', () => {
    const dates = getWeekDates('2026-09-28');
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe('2026-09-28');
    expect(dates[6]).toBe('2026-10-04');
  });
});

describe('computeSleepWeekStats', () => {
  it('mengembalikan nol jika tidak ada log', () => {
    const stats = computeSleepWeekStats([], getWeekDates('2026-09-28'));
    expect(stats.jumlahHari).toBe(0);
    expect(stats.skor).toBe(0);
  });

  it('menghitung persen tidur ≤ 22.00 dengan benar', () => {
    const logs = [
      { dateISO: '2026-09-28', sleptBefore22: true },
      { dateISO: '2026-09-29', sleptBefore22: false },
    ];
    const stats = computeSleepWeekStats(logs, getWeekDates('2026-09-28'));
    expect(stats.jumlahHari).toBe(2);
    expect(stats.hariSebelum22).toBe(1);
    expect(stats.persenSebelum22).toBe(50);
  });

  it('mengabaikan log di luar minggu yang diminta', () => {
    const logs = [
      { dateISO: '2026-09-28', sleptBefore22: true },
      { dateISO: '2026-09-20', sleptBefore22: false }, // minggu sebelumnya
    ];
    const stats = computeSleepWeekStats(logs, getWeekDates('2026-09-28'));
    expect(stats.jumlahHari).toBe(1);
    expect(stats.hariSebelum22).toBe(1);
    expect(stats.persenSebelum22).toBe(100);
  });

  it('menghitung rata-rata kualitas saat ada', () => {
    const logs = [
      { dateISO: '2026-09-28', sleptBefore22: true, qualityRating: 4 },
      { dateISO: '2026-09-29', sleptBefore22: true, qualityRating: 5 },
    ];
    const stats = computeSleepWeekStats(logs, getWeekDates('2026-09-28'));
    expect(stats.rataKualitas).toBe(4.5);
    // skor = 100*0.7 + 90*0.3 = 97
    expect(stats.skor).toBe(97);
  });
});

describe('countWorkoutsPerWeek', () => {
  it('menghitung jumlah hari unik di dalam minggu', () => {
    const logs = [
      { dateISO: '2026-09-28', done: true },
      { dateISO: '2026-09-28', done: true }, // hari yang sama
      { dateISO: '2026-09-30', done: true },
      { dateISO: '2026-09-20', done: true }, // luar minggu
    ];
    expect(countWorkoutsPerWeek(logs, getWeekDates('2026-09-28'))).toBe(2);
  });
});

describe('checkMilestones', () => {
  it('mendeteksi milestone tidur 5x ≤ 22.00', () => {
    const cek = checkMilestones({
      sleepWeek: { jumlahHari: 7, hariSebelum22: 5, persenSebelum22: 71, rataKualitas: 0, skor: 50 },
      jumlahWorkoutMinggu: 2,
    });
    expect(cek.map((c) => c.kode)).toContain('sleep_5x_before22');
  });

  it('tidak mendeteksi milestone tidur jika belum 5 hari', () => {
    const cek = checkMilestones({
      sleepWeek: { jumlahHari: 7, hariSebelum22: 4, persenSebelum22: 57, rataKualitas: 0, skor: 40 },
      jumlahWorkoutMinggu: 2,
    });
    expect(cek.map((c) => c.kode)).not.toContain('sleep_5x_before22');
  });

  it('mendeteksi milestone workout 5x seminggu', () => {
    const cek = checkMilestones({
      sleepWeek: { jumlahHari: 0, hariSebelum22: 0, persenSebelum22: 0, rataKualitas: 0, skor: 0 },
      jumlahWorkoutMinggu: 5,
    });
    expect(cek.map((c) => c.kode)).toContain('workout_5x_week');
  });

  it('mendeteksi milestone turun 2 kg', () => {
    const cek = checkMilestones({
      sleepWeek: { jumlahHari: 0, hariSebelum22: 0, persenSebelum22: 0, rataKualitas: 0, skor: 0 },
      jumlahWorkoutMinggu: 0,
      beratAwal: 45,
      beratTerbaru: 43,
    });
    expect(cek.map((c) => c.kode)).toContain('weight_down_2kg');
  });
});
