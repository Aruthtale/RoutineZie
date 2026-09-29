/**
 * NotificationService — penjadwalan notifikasi lokal penuh.
 *
 * T1.5 Notifikasi Lokal (TASKS.md):
 *   AC: notifikasi muncul tepat waktu; tetap ada setelah restart perangkat;
 *       panduan optimasi baterai tersedia.
 *
 * Mekanisme:
 *  - Jadwal dipasang sebagai "pending notifications" native via @capacitor/
 *    local-notifications. Scheduler OS akan memunculkannya tepat pada waktunya,
 *    TANPA aplikasi harus terbuka.
 *  - Notifikasi terjadwal persist di level OS (selamat dari restart perangkat
 *    hingga batas ~1 tahun / sebelum di-cancel).
 *  - Preferensi pengguna (aktif/tidak, offset menit) disimpan di Preferences
 *    (async storage), bukan di OS scheduler.
 *
 * Catatan penting:
 *  - Pada Android 12+ (API 31+), aplikasi memiliki batas ~berapa ratus
 *    notifikasi terjadwal sekaligus. Karena jadwal harian ~15-20 item, kita
 *    hanya menjadwalkan N item terdekat (lihat MAX_SCHEDULED_AHEAD) untuk
 *    menghindari batas quota. Sisa-nya dijadwalkan ulang saat app dibuka
 *    (replenishment) — per trade-off: setelah restart, hanya item terdekat
 *    yang aktif, sisanya terisi saat pengguna membuka aplikasi.
 *  - Beberapa device agresif mematikan aplikasi background; panduan optimasi
 *    baterai diberikan di UI (SettingsView) agar pengguna membebaskan aplikasi.
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { parseWaktu } from '@/lib/schedule/parser';

const PREF_KEY = 'routinezie_notification_settings';

/**
 * Jumlah maksimum notifikasi yang dijadwalkan sekaligus.
 * Android 12+ membatasi ~quota ratusan; kita ambil aman 40 (~2 hari ke depan).
 */
export const MAX_SCHEDULED_AHEAD = 40;

export interface ReminderItem {
  id: number;
  dayName: string;
  waktu: string;      // string asli dari jadwal, mis. "05.00-05.25"
  kegiatan: string;
  detail?: string;
  startMinutes: number;
  dayOffset: number;  // 0 = hari ini, 1 = besok, dst (relatif terhadap fromDayIndex)
}

export interface NotificationSettings {
  enabled: boolean;
  offsetMinutes: number;   // notifikasi muncul X menit sebelum jadwal
  itemIds: number[];       // daftar item yang pengguna pilih (kosong = semua item)
}

export const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  offsetMinutes: 0,
  itemIds: [],
};

/** Konversi (hari ini + offset hari) + menit ke detik epoch. */
function toEpochSeconds(dayOffset: number, minutes: number, now = new Date()): number {
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000) + minutes * 60;
}

/** Nama hari berdasarkan index JS (0=Minggu). */
const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/**
 * Membangun daftar item pengingat dari raw jadwal mingguan.
 * Hanya item yang memiliki waktu standar ("HH.MM" atau "HH.MM-HH.MM")
 * yang bisa dijadwalkan; item tanpa waktu di-skip.
 */
export function buildReminderItems(
  hariList: any[],
  opts: { fromDayIndex?: number; maxDays?: number } = {}
): ReminderItem[] {
  const fromDayIndex = opts.fromDayIndex ?? new Date().getDay();
  const maxDays = Math.min(opts.maxDays ?? 7, 7);

  const items: (ReminderItem & { dayOffset: number })[] = [];
  let seq = 1;

  for (let step = 0; step < maxDays; step++) {
    const idx = (fromDayIndex + step) % 7;
    const dayName = DAY_NAMES[idx];
    const dayObj = hariList?.find((h: any) => h?.hari === dayName);
    const jadwal = dayObj?.jadwal ?? [];

    for (const item of jadwal) {
      const slot = parseWaktu(item?.waktu);
      if (!slot) continue; // tidak ada waktu jelas → skip

      items.push({
        id: seq++,
        dayName,
        waktu: item.waktu,
        kegiatan: String(item.kegiatan ?? ''),
        detail: item.detail ? String(item.detail) : undefined,
        startMinutes: slot.startMinutes,
        dayOffset: step,
      });
    }
  }

  // Urutkan dari yang paling dekat dengan sekarang
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  items.sort((a, b) => {
    const av = a.dayOffset * 1440 + a.startMinutes;
    const bv = b.dayOffset * 1440 + b.startMinutes;
    const aAdj = a.dayOffset === 0 && av < nowMinutes ? av + 7 * 1440 : av;
    const bAdj = b.dayOffset === 0 && bv < nowMinutes ? bv + 7 * 1440 : bv;
    return aAdj - bAdj;
  });

  return items;
}

export class NotificationService {
  /** Minta izin notifikasi (contextual: panggil saat user mengaktifkan). */
  static async requestPermission(): Promise<boolean> {
    try {
      const { display } = await LocalNotifications.requestPermissions();
      return display === 'granted';
    } catch (e) {
      console.warn('requestPermissions gagal:', e);
      return false;
    }
  }

  /** Cek status izin tanpa meminta popup. */
  static async checkPermission(): Promise<boolean> {
    try {
      const { display } = await LocalNotifications.checkPermissions();
      return display === 'granted';
    } catch {
      return false;
    }
  }

  /** Ambil preferensi pengguna dari Preferences. */
  static async getSettings(): Promise<NotificationSettings> {
    try {
      const { value } = await Preferences.get({ key: PREF_KEY });
      if (!value) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(value);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  /** Simpan preferensi pengguna. */
  static async saveSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const merged = { ...(await this.getSettings()), ...settings };
    await Preferences.set({ key: PREF_KEY, value: JSON.stringify(merged) });
    return merged;
  }

  /**
   * Jadwalkan ulang semua notifikasi sesuai preferensi.
   * @returns ringkasan: jumlah terjadwal, total, daftar id.
   */
  static async reschedule(
    hariList: any[],
    settings: NotificationSettings
  ): Promise<{ scheduled: number; total: number; ids: number[] }> {
    // Selalu bersihkan dulu agar tidak duplikat
    await this.cancelAll();

    if (!settings.enabled) return { scheduled: 0, total: 0, ids: [] };

    let allItems = buildReminderItems(hariList, { maxDays: 7 });

    // Filter: jika itemIds non-kosong, hanya item terpilih
    if (settings.itemIds.length) {
      allItems = allItems.filter((i) => settings.itemIds.includes(i.id));
    }

    // Batasi jumlah agar tidak tembus quota Android
    const subset = allItems.slice(0, MAX_SCHEDULED_AHEAD);

    const requests = subset
      .map((item) => {
        const fireAt = toEpochSeconds(item.dayOffset, item.startMinutes) - settings.offsetMinutes * 60;
        if (fireAt <= Math.floor(Date.now() / 1000)) return null; // sudah lewat → skip

        return {
          id: item.id,
          title: `${item.waktu} · ${item.dayName}`,
          body: item.kegiatan + (item.detail ? `\n${item.detail}` : ''),
          schedule: { at: new Date(fireAt * 1000) },
          smallIcon: 'ic_stat_icon',
          largeIcon: 'ic_stat_icon',
          channelId: 'routinezie-reminders',
          extra: { dayName: item.dayName, waktu: item.waktu },
        } as any;
      })
      .filter(Boolean) as any[];

    if (requests.length) {
      try {
        await LocalNotifications.schedule({ notifications: requests });
      } catch (e) {
        console.warn('schedule gagal:', e);
      }
    }

    return { scheduled: requests.length, total: allItems.length, ids: requests.map((r) => r.id) };
  }

  /** Hapus semua notifikasi terjadwal. */
  static async cancelAll(): Promise<void> {
    try {
      const pending = await LocalNotifications.getPending();
      const ids = (pending?.notifications ?? []).map((n) => n.id);
      if (ids.length) await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
    } catch (e) {
      console.warn('cancelAll gagal:', e);
    }
  }

  /** Cek notifikasi pending saat ini (untuk debugging / status UI). */
  static async getPendingCount(): Promise<number> {
    try {
      const { notifications } = await LocalNotifications.getPending();
      return notifications?.length ?? 0;
    } catch {
      return 0;
    }
  }
}
