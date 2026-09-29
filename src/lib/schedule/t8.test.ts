import { describe, it, expect } from 'vitest';
import { getPulangMinutes, formatJam, findMentionedExercise } from './parser';

describe('T8.5 — getPulangMinutes', () => {
  it('mengembalikan menit dari jam pulang', () => {
    expect(getPulangMinutes('08.00-17.00')).toBe(1020);
    expect(getPulangMinutes('07.30-16.00')).toBe(960);
    expect(getPulangMinutes('09.00-15.30')).toBe(930);
  });

  it('menerima pemisah titik dua', () => {
    expect(getPulangMinutes('08:00-17:30')).toBe(1050);
  });

  it('null untuk Libur atau jam tak dikenal', () => {
    expect(getPulangMinutes('Libur')).toBeNull();
    expect(getPulangMinutes(undefined)).toBeNull();
    expect(getPulangMinutes('')).toBeNull();
  });
});

describe('T8.5 — formatJam', () => {
  it('format HH.MM', () => {
    expect(formatJam(1020)).toBe('17.00');
    expect(formatJam(930)).toBe('15.30');
  });

  it('wrap tengah malam', () => {
    expect(formatJam(1440)).toBe('00.00');
  });
});

describe('T8.4 — findMentionedExercise', () => {
  const exercises = [
    { nama: 'Push Up' },
    { nama: 'Squat' },
    { nama: 'Plank' },
  ];

  it('menemukan gerakan yang disebut', () => {
    expect(findMentionedExercise('Coba lakukan push up 3 set', exercises)).toBe('Push Up');
    expect(findMentionedExercise('PLANK itu penting', exercises)).toBe('Plank');
  });

  it('tidak cocok untuk nama pendek (false-positive)', () => {
    expect(findMentionedExercise('squat', exercises)).toBe('Squat');
    // Nama < 4 karakter diabaikan untuk menghindari false-positive.
    expect(findMentionedExercise('squat', [{ nama: 'Up' }])).toBeNull();
  });

  it('null bila tidak ada yang cocok', () => {
    expect(findMentionedExercise('makan nasi', exercises)).toBeNull();
    expect(findMentionedExercise('', exercises)).toBeNull();
  });

  it('memilih nama terpanjang bila tumpang tindih', () => {
    const list = [{ nama: 'Push Up' }, { nama: 'Wide Push Up' }];
    expect(findMentionedExercise('coba wide push up', list)).toBe('Wide Push Up');
  });
});
