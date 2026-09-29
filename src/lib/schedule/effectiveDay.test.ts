/**
 * Unit test Fase 7 — T7.2: hari efektif & override.
 *
 * Prinsip: `getEffectiveDay = override ?? defaultDay`. JSON default tidak
 * pernah ditulis. Semua tes memakai OverrideStorage palsu agar tidak
 * menyentuh IndexedDB (yang tidak ada di lingkungan happy-dom).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import rawData from '@/data/jadwal_mingguan.json';
import {
  getEffectiveDay,
  applyOverride,
  clearOverride,
  getActiveNonExpiringOverrides,
  endNonExpiringOverride,
  setOverrideStorage,
  dateToISO,
  dayNameForISO,
  type OverrideStorage,
} from '@/lib/schedule/effectiveDay';
import { buildReplacement, type ScheduleOverride } from '@/lib/schedule/substitutions';

function dayInput(namaHari: string) {
  const hari = (rawData.hari as any[]).find((h) => h.hari === namaHari)!;
  return {
    hari: hari.hari,
    tipe: hari.tipe_hari ?? hari.tipe ?? 'PKL',
    pkl: hari.pkl ?? '',
    workout: hari.workout ?? null,
  };
}

function makeStorage(): OverrideStorage & { data: Map<string, ScheduleOverride> } {
  const data = new Map<string, ScheduleOverride>();
  const store: OverrideStorage = {
    async get(dateISO) {
      return data.get(dateISO);
    },
    async save(override) {
      data.set(override.dateISO, override);
    },
    async remove(dateISO) {
      data.delete(dateISO);
    },
    async list() {
      return Array.from(data.values());
    },
  };
  return Object.assign(store, { data });
}

describe('T7.2 — getEffectiveDay', () => {
  beforeEach(() => {
    setOverrideStorage(makeStorage());
  });

  it('tanpa override → kembalikan jadwal default JSON', async () => {
    const senin = dateToISO(new Date('2026-09-28T08:00:00')); // Senin
    const hasil = await getEffectiveDay(senin);

    expect(hasil.overridden).toBe(false);
    expect(hasil.override).toBeNull();
    expect(hasil.workout?.nama).toBe('Push + Core');
  });

  it('dengan override → override menang, workout asli disembunyikan', async () => {
    const iso = dateToISO(new Date('2026-09-28T08:00:00')); // Senin
    const pengganti = buildReplacement('sakit_kaki_lutut', dayInput('Senin'));

    await applyOverride({
      dateISO: iso,
      reason: 'sakit_kaki_lutut',
      source: 'quick_button',
      expiresAfterDate: true,
      replacementWorkout: pengganti,
    });

    const hasil = await getEffectiveDay(iso);
    expect(hasil.overridden).toBe(true);
    expect(hasil.workout?.nama).toBe(pengganti.nama);
    expect(hasil.workout?.nama).not.toBe('Push + Core');
  });

  it('applyOverride menulis override, BUKAN jadwal_mingguan.json', async () => {
    const sebelum = JSON.stringify(rawData);
    const iso = dateToISO(new Date('2026-09-30T08:00:00'));

    await applyOverride({
      dateISO: iso,
      reason: 'sakit_demam',
      source: 'quick_button',
      expiresAfterDate: true,
      replacementWorkout: buildReplacement('sakit_demam', dayInput('Rabu')),
    });

    expect(JSON.stringify(rawData)).toBe(sebelum);
  });

  it('clearOverride mengembalikan jadwal asli', async () => {
    const iso = dateToISO(new Date('2026-09-28T08:00:00'));
    await applyOverride({
      dateISO: iso,
      reason: 'sakit_kaki_lutut',
      source: 'quick_button',
      expiresAfterDate: true,
      replacementWorkout: buildReplacement('sakit_kaki_lutut', dayInput('Senin')),
    });

    expect((await getEffectiveDay(iso)).overridden).toBe(true);
    await clearOverride(iso);
    expect((await getEffectiveDay(iso)).overridden).toBe(false);
  });

  it('getActiveNonExpiringOverrides hanya kembali yang tanpa tanggal kedaluwarsa', async () => {
    const senin = dateToISO(new Date('2026-09-28T08:00:00'));
    const selasa = dateToISO(new Date('2026-09-29T08:00:00'));

    await applyOverride({
      dateISO: senin,
      reason: 'sakit_kaki_lutut',
      source: 'quick_button',
      expiresAfterDate: true, // otomatis kedaluwarsa
      replacementWorkout: buildReplacement('sakit_kaki_lutut', dayInput('Senin')),
    });
    await applyOverride({
      dateISO: selasa,
      reason: 'cuaca_hujan',
      source: 'quick_button',
      expiresAfterDate: false, // berlaku terus
      replacementWorkout: buildReplacement('cuaca_hujan', dayInput('Selasa')),
    });

    const list = await getActiveNonExpiringOverrides();
    expect(list).toHaveLength(1);
    expect(list[0].reason).toBe('cuaca_hujan');
  });

  it('endNonExpiringOverride menghapus hanya target yang benar', async () => {
    const selasa = dateToISO(new Date('2026-09-29T08:00:00'));
    const o = await applyOverride({
      dateISO: selasa,
      reason: 'cuaca_hujan',
      source: 'quick_button',
      expiresAfterDate: false,
      replacementWorkout: buildReplacement('cuaca_hujan', dayInput('Selasa')),
    });

    await endNonExpiringOverride('id-yang-tidak-ada');
    expect((await getActiveNonExpiringOverrides())).toHaveLength(1);

    await endNonExpiringOverride(o.id);
    expect((await getActiveNonExpiringOverrides())).toHaveLength(0);
  });

  it('dateToISO & dayNameForISO konsisten untuk hari Senin', () => {
    const iso = dateToISO(new Date('2026-09-28T08:00:00'));
    expect(dayNameForISO(iso)).toBe('Senin');
  });

  it('hari Minggu (Full Rest) tetap istirahat walau ada override', async () => {
    const minggu = dateToISO(new Date('2026-10-04T08:00:00'));
    const hasil = await getEffectiveDay(minggu);
    expect(hasil.workout?.latihan ?? []).toHaveLength(0);
  });
});
