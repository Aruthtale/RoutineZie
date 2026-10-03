/**
 * T9 — Override profil lokal (hidupkan jalur yang tadinya mati).
 *
 * Sebelumnya `AppSettings.profileOverride` dan `pklOverride` dideklarasikan di
 * DB tapi TIDAK ADA kode yang membacanya — pengguna tak bisa mengubah
 * tinggi/berat/kemampuan maupun jam PKL dari dalam app.
 *
 * Modul ini menutup celah itu dengan cache SINKRON: nilai dibaca sekali dari
 * Dexie saat boot (hydrate), lalu dibaca sinkron oleh fungsi yang memang
 * sinkron (`getDefaultDayInput`). Setiap kali pengguna menyimpan perubahan,
 * cache diperbarui seketika sehingga UI langsung konsisten tanpa reload.
 *
 * Prinsip: JSON asal TIDAK PERNAH ditulis ulang (DATA_SCHEMA.md 7) — override
 * hanya menimpa nilai saat dibaca.
 */

import type { AppSettings } from '@/lib/db';

export interface ProfileOverride {
  tinggi_cm?: number;
  berat_kg?: number;
  kemampuan_saat_ini?: Record<string, number | string>;
}

type Listener = () => void;

let cache: { profile: ProfileOverride; pkl: string | null } = {
  profile: {},
  pkl: null,
};

let hydrated = false;
const listeners = new Set<Listener>();

/** Beri tahu komponen agar re-render setelah override berubah. */
export function subscribeProfileOverride(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn();
}

/**
 * Muat override dari DB ke cache. Panggil sekali saat app boot.
 * Idempoten — aman dipanggil berulang.
 */
export async function hydrateProfileOverride(): Promise<void> {
  try {
    const { RoutineRepository } = await import('@/lib/db/repository');
    const s = await RoutineRepository.getSettings();
    cache = {
      profile: s.profileOverride ?? {},
      pkl: s.pklOverride ?? null,
    };
  } catch {
    // Gagal baca (mis. DB belum siap) → biarkan default kosong.
    cache = { profile: {}, pkl: null };
  }
  hydrated = true;
  emit();
}

/** Simpan override ke DB + perbarui cache sinkron. */
export async function saveProfileOverride(next: ProfileOverride): Promise<void> {
  const { RoutineRepository } = await import('@/lib/db/repository');
  await RoutineRepository.updateSettings({ profileOverride: next });
  cache = { ...cache, profile: next };
  emit();
}

/** Simpan override jam PKL (mis. "08.00-16.00" atau "Libur"). null = hapus.
 *
 * CATATAN CAKUPAN: override ini mengganti label PKL + hitung mundur pulang.
 * Blok jam di dalam array `jadwal` (mis. item bertuliskan "13.00-17.00 PKL")
 * adalah teks yang ditulis tangan dan TIDAK ikut diubah otomatis — mengubahnya
 * berisiko salah menebak item mana yang "PKL". */
export async function savePklOverride(pkl: string | null): Promise<void> {
  const { RoutineRepository } = await import('@/lib/db/repository');
  await RoutineRepository.updateSettings({ pklOverride: pkl ?? undefined });
  cache = { ...cache, pkl };
  emit();
}

/** Baca override profil yang aktif (sinkron). */
export function getProfileOverride(): ProfileOverride {
  return cache.profile;
}

/** Jam PKL override, atau null bila tidak ada. */
export function getPklOverride(): string | null {
  return cache.pkl;
}

export function isProfileOverrideHydrated(): boolean {
  return hydrated;
}

/**
 * Terapkan override PKL pada nilai mentah dari JSON.
 * Hari "Libur" SELALU tetap libur — override hanya mengganti jam kerja,
 * bukan mengubah hari libur menjadi hari kerja.
 */
export function applyPklOverride(rawPkl: string | undefined | null): string {
  const raw = rawPkl ?? '';
  if (/libur/i.test(raw)) return raw || 'Libur';
  if (cache.pkl != null && cache.pkl !== '') return cache.pkl;
  return raw;
}

/**
 * Gabungkan profil JSON dengan override lokal.
 * Field override menang hanya bila diisi (bukan undefined).
 */
export function mergeProfile<T extends Record<string, any>>(rawProfil: T): T {
  const o = cache.profile;
  const out: any = { ...rawProfil };
  if (o.tinggi_cm != null) out.tinggi_cm = o.tinggi_cm;
  if (o.berat_kg != null) out.berat_kg = o.berat_kg;
  if (o.kemampuan_saat_ini && Object.keys(o.kemampuan_saat_ini).length > 0) {
    out.kemampuan_saat_ini = { ...(rawProfil?.kemampuan_saat_ini ?? {}), ...o.kemampuan_saat_ini };
  }
  return out as T;
}

/** Reset cache (dipakai test). */
export function __resetProfileOverrideCache() {
  cache = { profile: {}, pkl: null };
  hydrated = false;
  listeners.clear();
}
