/**
 * Jembatan widget layar utama (Android).
 *
 * Web app menghitung state yang ditampilkan widget, menuliskannya via
 * @capacitor/preferences (SharedPreferences "CapacitorStorage"), lalu memanggil
 * plugin RoutineZieWidget.refresh() agar widget langsung diperbarui.
 *
 * Di web (non-Android) semua fungsi ini no-op — aman dipanggil dari mana saja.
 */

import { Preferences } from '@capacitor/preferences';
import { Capacitor, registerPlugin } from '@capacitor/core';

/** Kunci HARUS sama dengan RoutineZieWidget.KEY_STATE di sisi native. */
export const WIDGET_STATE_KEY = 'widget_state';

interface RoutineZieWidgetPlugin {
  refresh(): Promise<{ refreshed: boolean }>;
}

const WidgetBridge = registerPlugin<RoutineZieWidgetPlugin>('RoutineZieWidget');

export interface WidgetState {
  /** Label kecil di atas (mis. "BERIKUTNYA"). */
  label: string;
  /** Judul utama: kegiatan berikutnya atau nama latihan. */
  title: string;
  /** Baris kecil: info PKL / detail singkat. */
  subtitle: string;
  /** Jam besar di kanan, format "HH:MM". */
  time: string;
  /** Tanggal state dibuat (YYYY-MM-DD) — untuk deteksi basi. */
  dateISO: string;
  /** Epoch ms saat state ditulis. */
  updatedAt: number;
}

function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

/**
 * Tulis state widget & minta refresh. Bila state null, widget menampilkan
 * ajakan membuka aplikasi (lihat RoutineZieWidget.readState → null).
 */
export async function setWidgetState(state: WidgetState | null): Promise<void> {
  if (!isNativeAndroid()) return;
  try {
    if (state === null) {
      await Preferences.remove({ key: WIDGET_STATE_KEY });
    } else {
      await Preferences.set({
        key: WIDGET_STATE_KEY,
        value: JSON.stringify(state),
      });
    }
    await WidgetBridge.refresh();
  } catch (e) {
    // Widget tidak boleh membuat app gagal — cukup catat.
    console.warn('Gagal memperbarui widget:', e);
  }
}

/**
 * Susun state dari data yang sudah ada. Fungsi murni (tanpa I/O) agar mudah
 * diuji — pemanggil menyuplai nilai yang sudah dihitung.
 */
export function buildWidgetState(input: {
  /** Kegiatan/latihan berikutnya menurut jadwal hari ini. */
  nextTitle: string | null;
  /** Jam kegiatan berikutnya, "HH:MM". */
  nextTime: string | null;
  /** Info PKL hari ini (mis. "08.00-17.00" atau "Libur"). */
  pkl: string | null;
  /** Sisa menit ke jam pulang PKL (null bila tidak relevan). */
  sisaMenitPulang: number | null;
  /** Jam sekarang, "HH:MM" — dipakai bila tidak ada kegiatan berikutnya. */
  nowTime: string;
  /** Tanggal lokal YYYY-MM-DD. */
  dateISO: string;
  /** Epoch ms. */
  updatedAt: number;
}): WidgetState {
  const subtitleParts: string[] = [];

  if (input.pkl && input.pkl !== 'Libur') {
    subtitleParts.push(`PKL ${input.pkl}`);
  } else if (input.pkl === 'Libur') {
    subtitleParts.push('Libur PKL');
  }

  if (input.sisaMenitPulang !== null && input.sisaMenitPulang > 0) {
    subtitleParts.push(`pulang ${formatSisa(input.sisaMenitPulang)}`);
  }

  return {
    label: input.nextTitle ? 'BERIKUTNYA' : 'SEKARANG',
    title: input.nextTitle ?? 'Tidak ada agenda berikutnya',
    subtitle: subtitleParts.join(' · '),
    time: input.nextTime ?? input.nowTime,
    dateISO: input.dateISO,
    updatedAt: input.updatedAt,
  };
}

/** 135 → "2j 15m"; 45 → "45m". */
export function formatSisa(menit: number): string {
  if (menit <= 0) return 'sebentar';
  const j = Math.floor(menit / 60);
  const m = menit % 60;
  if (j <= 0) return `${m}m`;
  if (m === 0) return `${j}j`;
  return `${j}j ${m}m`;
}
