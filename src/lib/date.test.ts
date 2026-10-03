import { describe, it, expect } from 'vitest';
import { localDateISO, todayISO, addDaysISO, diffDaysISO, dayNameForISO } from './date';

describe('date util — tanggal LOKAL (T14)', () => {
  it('localDateISO memakai komponen waktu LOKAL, bukan UTC', () => {
    // 3 Okt 2026 05.00 pagi (waktu lokal perangkat).
    const d = new Date(2026, 9, 3, 5, 0, 0);
    expect(localDateISO(d)).toBe('2026-10-03');
  });

  it('BUG SUBUH: di WIB (UTC+7), 05.00 pagi harus tetap tanggal HARI ITU, bukan kemarin', () => {
    // Di WIB 3 Okt 05.00 = 2 Okt 22.00 UTC. `toISOString()` akan memberi
    // "2026-10-02" (kemarin!) sementara localDateISO harus "2026-10-03".
    // Test ini hanya bermakna bila TZ=Asia/Jakarta; verifikasi TZ nyata
    // dijalankan terpisah (lihat skrip CI / terminal).
    const d = new Date(2026, 9, 3, 5, 0, 0); // 3 Okt 05.00 waktu perangkat
    expect(localDateISO(d)).toBe('2026-10-03');
    // Demonstrasi bedanya (hanya bila offset lokal bukan UTC):
    const utcDate = d.toISOString().split('T')[0];
    const offsetMin = d.getTimezoneOffset();
    if (offsetMin < 0) {
      // Zona timur UTC (mis. WIB, offset -420 menit) → tanggal UTC bisa kemarin
      expect(utcDate <= '2026-10-03').toBe(true);
    }
  });

  it('addDaysISO melintasi batas bulan & tahun', () => {
    expect(addDaysISO('2026-10-03', 1)).toBe('2026-10-04');
    expect(addDaysISO('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysISO('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('diffDaysISO menghitung selisih hari', () => {
    expect(diffDaysISO('2026-10-01', '2026-10-03')).toBe(2);
    expect(diffDaysISO('2026-10-03', '2026-10-01')).toBe(-2);
    expect(diffDaysISO('2026-10-03', '2026-10-03')).toBe(0);
  });

  it('dayNameForISO memberi nama hari Indonesia yang benar', () => {
    // 3 Okt 2026 = Sabtu
    expect(dayNameForISO('2026-10-03')).toBe('Sabtu');
    // 5 Okt 2026 = Senin
    expect(dayNameForISO('2026-10-05')).toBe('Senin');
    // 4 Okt 2026 = Minggu
    expect(dayNameForISO('2026-10-04')).toBe('Minggu');
  });

  it('todayISO mengembalikan format YYYY-MM-DD', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
