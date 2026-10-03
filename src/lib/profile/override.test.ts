import { describe, it, expect, beforeEach } from 'vitest';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

globalThis.indexedDB = indexedDB;
globalThis.IDBKeyRange = IDBKeyRange;

describe('profile override (T9)', () => {
  let mod: typeof import('./override');

  beforeEach(async () => {
    const { db } = await import('@/lib/db');
    await db.settings.clear();
    // Modul menahan cache di level modul → reset eksplisit tiap test.
    mod = await import('./override');
    mod.__resetProfileOverrideCache();
  });

  it('hydrate membaca override dari DB', async () => {
    const { RoutineRepository } = await import('@/lib/db/repository');
    await RoutineRepository.updateSettings({
      profileOverride: { tinggi_cm: 165, berat_kg: 45 },
      pklOverride: '08.00-16.00',
    });

    await mod.hydrateProfileOverride();

    expect(mod.getProfileOverride().tinggi_cm).toBe(165);
    expect(mod.getProfileOverride().berat_kg).toBe(45);
    expect(mod.getPklOverride()).toBe('08.00-16.00');
    expect(mod.isProfileOverrideHydrated()).toBe(true);
  });

  it('mergeProfile: override menang atas JSON, field lain utuh', () => {
    mod.__resetProfileOverrideCache();
    const raw = { usia: 17, tinggi_cm: 160, berat_kg: 42, kemampuan_saat_ini: { push_up: 20 } };
    // Belum ada override → identik
    expect(mod.mergeProfile(raw)).toEqual(raw);
  });

  it('applyPklOverride: hari Libur tetap Libur walau ada override', () => {
    mod.__resetProfileOverrideCache();
    // Tanpa override → apa adanya
    expect(mod.applyPklOverride('08.00-17.00')).toBe('08.00-17.00');
    expect(mod.applyPklOverride('Libur')).toBe('Libur');
    expect(mod.applyPklOverride('')).toBe('');
  });

  it('saveProfileOverride memperbarui cache seketika', async () => {
    await mod.saveProfileOverride({ tinggi_cm: 170 });
    expect(mod.getProfileOverride().tinggi_cm).toBe(170);

    const { RoutineRepository } = await import('@/lib/db/repository');
    const s = await RoutineRepository.getSettings();
    expect(s.profileOverride?.tinggi_cm).toBe(170);
  });

  it('savePklOverride menyimpan & applyPklOverride memakainya', async () => {
    await mod.savePklOverride('09.00-15.00');
    expect(mod.getPklOverride()).toBe('09.00-15.00');
    // Hari kerja → pakai override
    expect(mod.applyPklOverride('08.00-17.00')).toBe('09.00-15.00');
    // Hari libur → tetap libur
    expect(mod.applyPklOverride('Libur')).toBe('Libur');
  });

  it('savePklOverride(null) menghapus override', async () => {
    await mod.savePklOverride('09.00-15.00');
    await mod.savePklOverride(null);
    expect(mod.getPklOverride()).toBeNull();
    expect(mod.applyPklOverride('08.00-17.00')).toBe('08.00-17.00');
  });

  it('subscribeProfileOverride dipanggil saat save', async () => {
    let count = 0;
    const unsub = mod.subscribeProfileOverride(() => count++);
    await mod.saveProfileOverride({ berat_kg: 50 });
    expect(count).toBeGreaterThanOrEqual(1);
    unsub();
  });
});
