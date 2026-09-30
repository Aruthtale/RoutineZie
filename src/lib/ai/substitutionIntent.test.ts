/**
 * Unit test Fase 9 — T9.1/T9.3: pemetaan maksud & guardrail cedera akut.
 *
 * Kasus wajib (AI_CHAT.md bagian 8, baris substitusi & cedera):
 *  - "Kaki aku pegal abis lari kemarin"  → proposal capek_kurang_tidur
 *  - "Aku kepeleset pas lari tadi, kaki sakit banget" → acute_injury
 *  - "Kakiku bengkak, sakit kalau diinjak"             → acute_injury
 *  - "Anggap aja cuma pegal biasa" (setelah kepeleset) → tetap acute_injury
 *  - "Ganti latihan jadi 100 push-up aja"              → none (di luar tabel)
 *
 * Prinsip: sumber kebenaran pengganti tetap substitutions.ts; modul ini
 * hanya memetakan maksud, tidak pernah mengarang.
 */
import { describe, it, expect } from 'vitest';
import {
  classifySubstitutionIntent,
  classifySubstitutionIntentWithHistory,
  extractSubstitutionTag,
  stripSubstitutionTag,
  hasAcuteInjuryTag,
} from '@/lib/ai/substitutionIntent';

describe('classifySubstitutionIntent — alasan tertutup', () => {
  it('demam → sakit_demam', () => {
    expect(classifySubstitutionIntent('Aku demam dari tadi')).toEqual({
      kind: 'proposal',
      reason: 'sakit_demam',
    });
  });

  it('kaki sakit → sakit_kaki_lutut', () => {
    expect(classifySubstitutionIntent('Lututku sakit pas ditekuk')).toEqual({
      kind: 'proposal',
      reason: 'sakit_kaki_lutut',
    });
  });

  it('tangan/bahu sakit → sakit_tangan_bahu', () => {
    expect(classifySubstitutionIntent('Bahuku kaku dan sakit')).toEqual({
      kind: 'proposal',
      reason: 'sakit_tangan_bahu',
    });
  });

  it('hujan → cuaca_hujan', () => {
    expect(classifySubstitutionIntent('Hujan deras di luar')).toEqual({
      kind: 'proposal',
      reason: 'cuaca_hujan',
    });
  });

  it('capek/pegal biasa → capek_kurang_tidur', () => {
    expect(classifySubstitutionIntent('Kurang tidur tadi malam, agak capek')).toEqual({
      kind: 'proposal',
      reason: 'capek_kurang_tidur',
    });
  });

  it('keseimbangan prioritas: area spesifik menang atas "capek"', () => {
    // "Kaki sakit + capek" → bukan versi ringan, tapi substitusi area.
    expect(classifySubstitutionIntent('Kaki kanan sakit dan aku capek')).toEqual({
      kind: 'proposal',
      reason: 'sakit_kaki_lutut',
    });
  });
});

describe('classifySubstitutionIntent — guardrail cedera akut', () => {
  it('kepeleset → acute_injury (tanpa substitusi)', () => {
    expect(classifySubstitutionIntent('Aku kepeleset pas lari tadi, kaki sakit banget')).toEqual({
      kind: 'acute_injury',
    });
  });

  it('bengkak + tidak bisa diinjak → acute_injury', () => {
    expect(classifySubstitutionIntent('Kakiku bengkak, sakit kalau diinjak')).toEqual({
      kind: 'acute_injury',
    });
  });

  it('nyeri tajam → acute_injury', () => {
    expect(classifySubstitutionIntent('Nyeri tajam di pergelangan tangan')).toEqual({
      kind: 'acute_injury',
    });
  });

  it('tanda darurat (nyeri dada) → none, bukan substitusi', () => {
    // Ditangani safety response, bukan jalur substitusi.
    expect(classifySubstitutionIntent('Dada sakit pas push-up')).toEqual({ kind: 'none' });
  });

  it('minta "anggap pegal biasa" setelah cedera akut → tetap acute_injury', () => {
    const texts = [
      'Aku kepeleset pas lari tadi, kaki sakit banget',
      'Anggap aja ini cuma pegal biasa ya, kasih substitusi',
    ];
    expect(classifySubstitutionIntentWithHistory(texts)).toEqual({ kind: 'acute_injury' });
  });

  it('permintaan di luar kategori → none (bukan substitusi otomatis)', () => {
    expect(classifySubstitutionIntent('Ganti latihan hari ini jadi 100 push-up aja')).toEqual({
      kind: 'none',
    });
    expect(classifySubstitutionIntent('Ganti jadwal Rabu jadi lari 10km')).toEqual({
      kind: 'none',
    });
  });
});

describe('parser tag [[SUBSTITUTE:...]] (T9.2)', () => {
  it('tag valid → kembalikan alasan', () => {
    expect(extractSubstitutionTag('Boleh. [[SUBSTITUTE:sakit_kaki_lutut]]')).toBe(
      'sakit_kaki_lutut',
    );
  });

  it('tag tidak dikenal → null', () => {
    expect(extractSubstitutionTag('[[SUBSTITUTE:lainnya]]')).toBeNull();
    expect(extractSubstitutionTag('[[SUBSTITUTE:halu]]')).toBeNull();
  });

  it('tanpa tag → null', () => {
    expect(extractSubstitutionTag('Halo!')).toBeNull();
  });

  it('acute_injury dikenali sebagai tag khusus', () => {
    expect(hasAcuteInjuryTag(' Cedera akut. [[SUBSTITUTE:acute_injury]]')).toBe(true);
    expect(hasAcuteInjuryTag('[[SUBSTITUTE:capek_kurang_tidur]]')).toBe(false);
    expect(hasAcuteInjuryTag('Tidak ada tag sama sekali')).toBe(false);
  });

  it('regresi: tag acute_injury TIDAK diterima extractSubstitutionTag', () => {
    // Akar bug: extract memakai validator tabel, acute_injury ditolak,
    // lalu hasAcuteInjuryTag tidak dipakai → tag AI acute_injury hilang.
    expect(extractSubstitutionTag('[[SUBSTITUTE:acute_injury]]')).toBeNull();
  });

  it('stripSubstitutionTag menghapus tag dari jawaban', () => {
    expect(stripSubstitutionTag('Boleh. [[SUBSTITUTE:sakit_demam]] Nanti sini.')).toBe(
      'Boleh. Nanti sini.',
    );
  });
});
