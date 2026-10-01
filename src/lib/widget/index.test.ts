import { describe, it, expect } from 'vitest';
import { buildWidgetState, formatSisa, WIDGET_STATE_KEY } from './index';

describe('formatSisa', () => {
  it('memformat jam + menit', () => {
    expect(formatSisa(135)).toBe('2j 15m');
  });
  it('memformat hanya menit bila < 60', () => {
    expect(formatSisa(45)).toBe('45m');
  });
  it('memformat hanya jam bila menit habis dibagi 60', () => {
    expect(formatSisa(120)).toBe('2j');
  });
  it('menangani nilai nol/negatif sebagai "sebentar"', () => {
    expect(formatSisa(0)).toBe('sebentar');
    expect(formatSisa(-5)).toBe('sebentar');
  });
});

describe('buildWidgetState', () => {
  const base = {
    nextTitle: 'Push Day — Dada',
    nextTime: '16:30',
    pkl: '08.00-17.00',
    sisaMenitPulang: 135,
    nowTime: '14:15',
    dateISO: '2026-10-01',
    updatedAt: 1234567890,
  };

  it('menyusun state lengkap dengan PKL + sisa pulang', () => {
    const s = buildWidgetState(base);
    expect(s.label).toBe('BERIKUTNYA');
    expect(s.title).toBe('Push Day — Dada');
    expect(s.subtitle).toBe('PKL 08.00-17.00 · pulang 2j 15m');
    expect(s.time).toBe('16:30');
  });

  it('memakai label SEKARANG & jam sekarang bila tidak ada kegiatan berikutnya', () => {
    const s = buildWidgetState({ ...base, nextTitle: null, nextTime: null });
    expect(s.label).toBe('SEKARANG');
    expect(s.title).toBe('Tidak ada agenda berikutnya');
    expect(s.time).toBe('14:15');
  });

  it('menampilkan "Libur PKL" dan menyembunyikan sisa pulang bila libur', () => {
    const s = buildWidgetState({ ...base, pkl: 'Libur', sisaMenitPulang: null });
    expect(s.subtitle).toBe('Libur PKL');
  });

  it('tidak menampilkan sisa pulang bila sudah lewat (≤ 0)', () => {
    const s = buildWidgetState({ ...base, sisaMenitPulang: -10 });
    expect(s.subtitle).toBe('PKL 08.00-17.00');
  });

  it('meneruskan dateISO & updatedAt untuk deteksi basi', () => {
    const s = buildWidgetState(base);
    expect(s.dateISO).toBe('2026-10-01');
    expect(s.updatedAt).toBe(1234567890);
  });
});

describe('WIDGET_STATE_KEY', () => {
  it('harus sama dengan kunci native RoutineZieWidget.KEY_STATE', () => {
    // Kontrak lintas-bahasa: bila ini diubah, ubah juga di RoutineZieWidget.java.
    expect(WIDGET_STATE_KEY).toBe('widget_state');
  });
});
