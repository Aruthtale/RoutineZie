import { describe, it, expect } from 'vitest';
import { parseWaktu, getPhaseFromTime, getNowAndNext, getScheduleForDay, normalizeWorkoutData, formatSisaWaktu } from './parser';

describe('Schedule Parser Utilities', () => {
  it('should correctly parse range time strings', () => {
    const slot = parseWaktu('05.25-06.10');
    expect(slot).not.toBeNull();
    expect(slot?.startMinutes).toBe(5 * 60 + 25); // 325
    expect(slot?.endMinutes).toBe(6 * 60 + 10);   // 370
  });

  it('should correctly parse time strings with extra text', () => {
    const slot = parseWaktu('Bagian 1: Pagi (06.30-08.00)');
    expect(slot).not.toBeNull();
    expect(slot?.startMinutes).toBe(6 * 60 + 30); // 390
    expect(slot?.endMinutes).toBe(8 * 60 + 0);    // 480
  });

  it('should determine phases correctly', () => {
    expect(getPhaseFromTime(360)).toBe('pagi');   // 06:00
    expect(getPhaseFromTime(780)).toBe('siang');  // 13:00
    expect(getPhaseFromTime(1080)).toBe('sore');  // 18:00
    expect(getPhaseFromTime(1320)).toBe('malam'); // 22:00
  });

  it('should identify now and next items correctly', () => {
    const mockJadwal = [
      { waktu: '05.00-05.20', kegiatan: 'Bangun & Solat' },
      { waktu: '05.25-06.10', kegiatan: 'Workout' },
      { waktu: '06.15-06.45', kegiatan: 'Mandi & Sarapan' },
    ];

    // Time: 05:30 (330 minutes)
    const result = getNowAndNext(mockJadwal, 330);
    expect(result.nowItem?.kegiatan).toBe('Workout');
    expect(result.nextItem?.kegiatan).toBe('Mandi & Sarapan');
  });

  it('picks the next item that has NOT started yet when slots overlap', () => {
    // Regresi: jadwal nyata Sabtu punya titik "05.00" (BANGUN) dan rentang
    // "05.00-05.30" (SUBUH) yang mulai bersamaan. Versi lama memakai
    // jadwalList[i+1] sehingga "next" bisa sudah mulai → countdown negatif.
    const mockJadwal = [
      { waktu: '05.00', kegiatan: 'Bangun' },
      { waktu: '05.00-05.30', kegiatan: 'Subuh + Persiapan' },
      { waktu: '05.30-06.15', kegiatan: 'Workout Utama' },
      { waktu: '06.15', kegiatan: 'Sarapan' },
    ];

    // 05:20 — sekarang di "Bangun" (05.00 titik, durasi default 30m).
    // Next harus "Workout Utama" (05.30), bukan "Subuh" yang sudah mulai.
    const result = getNowAndNext(mockJadwal, 320);
    expect(result.nowItem?.kegiatan).toBe('Bangun');
    expect(result.nextItem?.kegiatan).toBe('Workout Utama');
  });

  it('should load schedule and normalize workout for day correctly', () => {
    const senin = getScheduleForDay('Senin');
    expect(senin).not.toBeNull();
    expect(senin?.hari).toBe('Senin');
    expect(senin?.jadwal.length).toBeGreaterThan(0);
    expect(senin?.normalizedWorkout?.nama).toBe('Push + Core');
    expect(senin?.normalizedWorkout?.latihan[0].tipe).toBe('reps');

    const selasa = getScheduleForDay('Selasa');
    expect(selasa?.normalizedWorkout?.nama).toBe('Easy Run');
    expect(selasa?.normalizedWorkout?.latihan[0].nama).toBe('Jalan');
    expect(selasa?.normalizedWorkout?.latihan[0].tipe).toBe('durasi');

    const sabtu = getScheduleForDay('Sabtu');
    expect(sabtu?.normalizedWorkout?.nama).toBe('Run + Calisthenics');
    expect(sabtu?.normalizedWorkout?.latihan.length).toBeGreaterThan(3); // Flattened Bagian 1 + 2

    const minggu = getScheduleForDay('Minggu');
    expect(minggu).not.toBeNull();
    expect(minggu?.workout.nama).toBe('Full Rest');
  });

  describe('formatSisaWaktu', () => {
    it('formats minutes only', () => {
      expect(formatSisaWaktu(45)).toBe('45 menit');
    });
    it('formats hours only', () => {
      expect(formatSisaWaktu(120)).toBe('2 jam');
    });
    it('formats hours and minutes', () => {
      expect(formatSisaWaktu(90)).toBe('1 jam 30 menit');
    });
    it('returns empty string for zero or negative', () => {
      expect(formatSisaWaktu(0)).toBe('');
      expect(formatSisaWaktu(-5)).toBe('');
    });
  });
});
