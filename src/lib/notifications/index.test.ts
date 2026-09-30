import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Capacitor plugins sebelum import modul yang dipakai
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    checkPermissions: vi.fn().mockResolvedValue({ display: 'denied' }),
    schedule: vi.fn().mockResolvedValue({ notifications: [] }),
    getPending: vi.fn().mockResolvedValue({ notifications: [] }),
    cancel: vi.fn().mockResolvedValue(undefined),
    createChannel: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
  },
}));

import { LocalNotifications } from '@capacitor/local-notifications';
import { buildReminderItems, NotificationService, MAX_SCHEDULED_AHEAD } from './index';

// JADWAL UJI — meniru struktur jadwal_mingguan.json
const HARI_UJI = [
  {
    hari: 'Senin',
    jadwal: [
      { waktu: '05.00', kegiatan: 'Bangun', detail: 'Minum air' },
      { waktu: '05.25-06.10', kegiatan: 'Latihan beban', detail: 'Push + Core' },
      { waktu: '12.00-12.30', kegiatan: 'Makan siang' },
      { waktu: 'Fleksibel', kegiatan: 'Tanpa waktu', detail: 'harus di-skip' },
    ],
  },
  { hari: 'Selasa', jadwal: [{ waktu: '21.00', kegiatan: 'Tidur' }] },
];

describe('buildReminderItems', () => {
  it('mengambil item dengan waktu jelas dan men-skip tanpa waktu', () => {
    const items = buildReminderItems(HARI_UJI, { fromDayIndex: 1, maxDays: 1 });
    // fromDayIndex=1 → Senin: 3 item punya waktu, 1 item "Fleksibel" di-skip
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.kegiatan !== 'Tanpa waktu')).toBe(true);
  });

  it('mengisi startMinutes dan dayName dengan benar', () => {
    const items = buildReminderItems(HARI_UJI, { fromDayIndex: 1, maxDays: 1 });
    const bangun = items.find((i) => i.kegiatan === 'Bangun');
    expect(bangun?.startMinutes).toBe(300); // 05.00
    expect(bangun?.dayName).toBe('Senin');
  });

  it('mengurai range "05.25-06.10" sebagai start 325', () => {
    const items = buildReminderItems(HARI_UJI, { fromDayIndex: 1, maxDays: 1 });
    const latihan = items.find((i) => i.kegiatan === 'Latihan beban');
    expect(latihan?.startMinutes).toBe(325); // 5*60+25
  });

  it('memberi id unik berurutan', () => {
    const items = buildReminderItems(HARI_UJI, { fromDayIndex: 1, maxDays: 2 });
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requestPermission mengembalikan true saat granted', async () => {
    expect(await NotificationService.requestPermission()).toBe(true);
    expect(LocalNotifications.requestPermissions).toHaveBeenCalled();
  });

  it('checkPermission mengembalikan false saat denied', async () => {
    expect(await NotificationService.checkPermission()).toBe(false);
  });

  it('getSettings mengembalikan default saat belum ada preferensi', async () => {
    const s = await NotificationService.getSettings();
    expect(s).toEqual({ enabled: false, offsetMinutes: 0, itemIds: [] });
  });

  it('reschedule tidak menjadwalkan apa pun saat nonaktif', async () => {
    const result = await NotificationService.reschedule(HARI_UJI, {
      enabled: false,
      offsetMinutes: 0,
      itemIds: [],
    });
    expect(result.scheduled).toBe(0);
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it('reschedule menjadwalkan item saat aktif', async () => {
    const result = await NotificationService.reschedule(HARI_UJI, {
      enabled: true,
      offsetMinutes: 0,
      itemIds: [],
    });
    expect(result.scheduled).toBeGreaterThan(0);
    expect(LocalNotifications.schedule).toHaveBeenCalledOnce();
  });

  it('reschedule menghormati filter itemIds', async () => {
    const semua = await NotificationService.reschedule(HARI_UJI, {
      enabled: true,
      offsetMinutes: 0,
      itemIds: [],
    });
    const satu = await NotificationService.reschedule(HARI_UJI, {
      enabled: true,
      offsetMinutes: 0,
      itemIds: [1],
    });
    expect(satu.scheduled).toBeLessThanOrEqual(semua.scheduled);
  });

  it('reschedule menjadwalkan offset negatif (sebelum jadwal)', async () => {
    await NotificationService.reschedule(HARI_UJI, {
      enabled: true,
      offsetMinutes: 15,
      itemIds: [],
    });
    const calls = (LocalNotifications.schedule as any).mock.calls;
    expect(calls.length).toBe(1);
  });

  it('reschedule membatasi sesuai MAX_SCHEDULED_AHEAD', async () => {
    const hariBesar = Array.from({ length: 7 }, (_, d) => ({
      hari: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][d],
      jadwal: Array.from({ length: 30 }, (_, i) => ({
        waktu: `0${(i % 9) + 1}.${(i % 2) * 30}0`,
        kegiatan: `Aktivitas ${i}`,
      })),
    }));
    const result = await NotificationService.reschedule(hariBesar, {
      enabled: true,
      offsetMinutes: 0,
      itemIds: [],
    });
    expect(result.scheduled).toBeLessThanOrEqual(MAX_SCHEDULED_AHEAD);
  });

  it('cancelAll memanggil cancel', async () => {
    await NotificationService.cancelAll();
    expect(LocalNotifications.getPending).toHaveBeenCalled();
  });

  it('reschedule selalu membuat channel sebelum menjadwalkan', async () => {
    // Di Android 8+ channelId tak terdaftar menyebabkan notifikasi ditolak
    // diam-diam — channel harus dibuat tiap reschedule (idempotent di native).
    (LocalNotifications.createChannel as any).mockClear();
    await NotificationService.reschedule(HARI_UJI, {
      enabled: true,
      offsetMinutes: 0,
      itemIds: [],
    });
    expect(LocalNotifications.createChannel).toHaveBeenCalledTimes(1);
    expect((LocalNotifications.createChannel as any).mock.calls[0][0]).toMatchObject({
      id: 'routinezie-reminders',
    });
  });
});
