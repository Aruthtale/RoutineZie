'use client';

import React, { useEffect, useState } from 'react';
import { Bell, BellOff, CheckCircle2, AlertTriangle, Battery, Clock } from 'lucide-react';
import { NotificationService, buildReminderItems, DEFAULT_SETTINGS, type NotificationSettings } from '@/lib/notifications';
import jadwalRaw from '@/data/jadwal_mingguan.json';

type Status = 'idle' | 'loading' | 'ok' | 'error';

export default function NotificationSettingsSection() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string>('');
  const [scheduledCount, setScheduledCount] = useState<number>(0);
  const [showItems, setShowItems] = useState<boolean>(false);

  const hariList = (jadwalRaw as any)?.hari ?? [];

  // Muat preferensi & status saat komponen pertama dibuka
  useEffect(() => {
    (async () => {
      const s = await NotificationService.getSettings();
      setSettings(s);
      if (s.enabled) {
        const count = await NotificationService.getPendingCount();
        setScheduledCount(count);
      }
    })();
  }, []);

  const toggle = async (next: boolean) => {
    setStatus('loading');
    setMessage('');

    try {
      if (next) {
        // Minta izin dulu (contextual, sesuai TASKS T1.5)
        const granted = await NotificationService.requestPermission();
        if (!granted) {
          setStatus('error');
          setMessage('Izin notifikasi ditolak. Aktifkan manual di pengaturan aplikasi perangkat Anda.');
          return;
        }
      }

      const saved = await NotificationService.saveSettings({ enabled: next });
      setSettings(saved);

      if (next) {
        const result = await NotificationService.reschedule(hariList, saved);
        setScheduledCount(result.scheduled);
        setStatus('ok');
        setMessage(`${result.scheduled} pengingat terjadwal.`);
      } else {
        setScheduledCount(0);
        setStatus('ok');
        setMessage('Semua pengingat dimatikan.');
      }
    } catch (e) {
      setStatus('error');
      setMessage('Gagal memperbarui pengaturan notifikasi.');
    }
  };

  const setOffset = async (minutes: number) => {
    setStatus('loading');
    const saved = await NotificationService.saveSettings({ offsetMinutes: minutes });
    setSettings(saved);
    if (saved.enabled) {
      const result = await NotificationService.reschedule(hariList, saved);
      setScheduledCount(result.scheduled);
    }
    setStatus('ok');
  };

  const toggleItem = async (id: number) => {
    const set = new Set(settings.itemIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    const itemIds = Array.from(set);
    setStatus('loading');
    const saved = await NotificationService.saveSettings({ itemIds });
    setSettings(saved);
    if (saved.enabled) {
      const result = await NotificationService.reschedule(hariList, saved);
      setScheduledCount(result.scheduled);
    }
    setStatus('ok');
  };

  // Bangun daftar item hari ini untuk pilihan cepat
  const itemsHariIni = buildReminderItems(hariList, {
    fromDayIndex: new Date().getDay(),
    maxDays: 1,
  }).slice(0, 8);

  return (
    <section className="neo-box p-3.5 bg-[#ffffff] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wider block text-[#09090b] flex items-center gap-1.5">
          {settings.enabled ? (
            <Bell className="w-4 h-4 text-[#09090b]" />
          ) : (
            <BellOff className="w-4 h-4 text-[#09090b]/60" />
          )}
          PENGINGAT JADWAL
        </span>
        {settings.enabled && (
          <span className="text-[11px] font-mono font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 neo-box-sm">
            {scheduledCount} AKTIF
          </span>
        )}
      </div>

      {/* Tombol on/off utama */}
      <button
        type="button"
        onClick={() => toggle(!settings.enabled)}
        disabled={status === 'loading'}
        aria-pressed={settings.enabled}
        className={`w-full text-left p-2.5 neo-box-sm transition-colors ${
          settings.enabled ? 'bg-emerald-50' : 'bg-[#09090b]/5'
        } ${status === 'loading' ? 'opacity-60' : ''}`}
      >
        <span className="text-sm font-black text-[#09090b]">
          {status === 'loading' ? 'MEMPROSES…' : settings.enabled ? 'NOTIFIKASI AKTIF' : 'AKTIFKAN NOTIFIKASI'}
        </span>
        <span className="text-[11px] text-[#09090b]/70 block mt-0.5 font-medium">
          Pengingat muncul tepat waktu walaupun aplikasi tertutup.
        </span>
      </button>

      {/* Offset menit (muncul saat aktif) */}
      {settings.enabled && (
        <>
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-[#09090b]/60 flex items-center gap-1">
              <Clock className="w-3 h-3" /> MUNCUL SEBELUM JADWAL
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {[0, 5, 10, 15, 30].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setOffset(m)}
                  aria-pressed={settings.offsetMinutes === m}
                  className={`text-[11px] font-mono font-black px-2.5 py-1 neo-box-sm transition-colors ${
                    settings.offsetMinutes === m
                      ? 'bg-[#09090b] text-white'
                      : 'bg-white text-[#09090b] hover:bg-[#09090b]/5'
                  }`}
                >
                  {m === 0 ? 'TEPAT' : `${m}M`}
                </button>
              ))}
            </div>
          </div>

          {/* Pilihan per-item */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setShowItems(!showItems)}
              className="text-[11px] font-bold text-[#09090b]/60 underline"
            >
              {showItems ? 'SEMBUNYIKAN' : 'PILIH'} PENGINGAT HARI INI ({itemsHariIni.length})
            </button>
            {showItems && (
              <div className="space-y-1 max-h-44 overflow-y-auto">
                {itemsHariIni.map((item) => {
                  const on =
                    settings.itemIds.length === 0 || settings.itemIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      aria-pressed={on}
                      className={`w-full flex items-center gap-2 text-left p-1.5 neo-box-sm ${
                        on ? 'bg-emerald-50' : 'bg-white'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 flex-shrink-0 flex items-center justify-center border-2 border-[#09090b] ${
                          on ? 'bg-emerald-400' : 'bg-white'
                        }`}
                      >
                        {on && <CheckCircle2 className="w-3 h-3 text-[#09090b]" />}
                      </span>
                      <span className="text-[11px] font-mono font-black text-[#09090b] w-12 flex-shrink-0">
                        {item.waktu.split('-')[0]}
                      </span>
                      <span className="text-[11px] font-medium text-[#09090b] truncate">
                        {item.kegiatan}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {settings.itemIds.length > 0 && (
              <span className="text-[11px] text-[#09090b]/60 font-medium block">
                Hanya {settings.itemIds.length} pengingat terpilih yang dijadwalkan.
              </span>
            )}
          </div>

          {/* Panduan baterai (AC T1.5) */}
          <div className="bg-amber-50 border-2 border-amber-300 p-2 space-y-1">
            <span className="text-[11px] font-black text-amber-900 flex items-center gap-1">
              <Battery className="w-3 h-3" /> OPTIMASI BATERAI
            </span>
            <p className="text-[11px] text-amber-900/90 leading-relaxed font-medium">
              Beberapa ponsel membatasi aplikasi agar tidak jalan di latar belakang. Agar pengingat selalu muncul,
              buka Pengaturan &gt; Aplikasi &gt; RoutineZie &gt; Baterai, lalu pilih &quot;Tidak terbatas&quot; atau
              &quot;Tanpa batasan&quot;.
            </p>
          </div>
        </>
      )}

      {/* Pesan status */}
      {message && (
        <div
          className={`flex items-start gap-1.5 text-[11px] font-medium p-1.5 ${
            status === 'error' ? 'bg-red-50 text-red-900' : 'bg-emerald-50 text-emerald-900'
          }`}
          role={status === 'error' ? 'alert' : 'status'}
        >
          {status === 'error' ? (
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          )}
          <span>{message}</span>
        </div>
      )}
    </section>
  );
}
