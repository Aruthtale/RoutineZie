'use client';

import React, { useState, useEffect } from 'react';
import { getScheduleForDay, getNowAndNext, parseWaktu, type NormalizedWorkout } from '@/lib/schedule/parser';
import { Clock, Calendar, ChevronRight, Info, Dumbbell, X, Play, Utensils, ChartBar, Settings as SettingsIcon, Activity, MessageCircle, Send, Bot } from 'lucide-react';
import WorkoutModeModal from '@/components/WorkoutModeModal';
import MealChecklist from '@/components/MealChecklist';
import ProgressView from '@/components/ProgressView';
import SettingsView from '@/components/SettingsView';
import NotificationSettingsSection from '@/components/NotificationSettingsSection';
import WeatherWidget from '@/components/WeatherWidget';
import Balloon from '@/components/Balloon';
import { createChatProvider, getChatProviderInfo } from '@/lib/providers/chat/providers';
import { NotificationService } from '@/lib/notifications';
import { ChatMsg } from '@/lib/providers/chat/types';
import jadwalRaw from '@/data/jadwal_mingguan.json';
import {
  type SubstituteReason,
  type ScheduleOverride,
  type Workout,
  normalizeReplacement,
  buildReplacement,
  SUBSTITUTION_RULES,
} from '@/lib/schedule/substitutions';
import { dateToISO, DAY_NAMES, getEffectiveDay, applyOverride, clearOverride, getActiveNonExpiringOverrides } from '@/lib/schedule/effectiveDay';
import { SubstitutionPanel, SubstitutionQuickButtons } from '@/components/SubstitutionPanel';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

type Tab = 'schedule' | 'meals' | 'progress' | 'settings' | 'chat';

export default function RoutinePage() {
  const [selectedDay, setSelectedDay] = useState<string>('Senin');
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(0);
  const [selectedItemDetail, setSelectedItemDetail] = useState<any | null>(null);
  const [isWorkoutModeOpen, setIsWorkoutModeOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<Tab>('schedule');
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [substitutionReason, setSubstitutionReason] = useState<SubstituteReason | null>(null);
  const [pendingReplacement, setPendingReplacement] = useState<Workout | null>(null);
  const [overrideApplied, setOverrideApplied] = useState<string | null>(null); // dateISO

  useEffect(() => {
    const dayIndex = new Date().getDay();
    const dayMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    setSelectedDay(dayMap[dayIndex]);

    const updateTime = () => {
      const now = new Date();
      setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes());
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);

    // Segarkan notifikasi terjadwal saat aplikasi dibuka (AC T1.5: bertahan
    // setelah restart perangkat — pending di level OS, jadwal di-replenish di sini)
    (async () => {
      try {
        const s = await NotificationService.getSettings();
        if (s.enabled) {
          await NotificationService.reschedule((jadwalRaw as any)?.hari ?? [], s);
        }
      } catch (e) {
        console.warn('Gagal menyegarkan notifikasi:', e);
      }
    })();

    return () => clearInterval(interval);
  }, []);

  const dayData = getScheduleForDay(selectedDay);
  const { nowItem, nextItem, currentPhase } = getNowAndNext(
    dayData?.jadwal || [],
    currentTimeMinutes
  );

  // T7.2 — hari efektif: override (jika ada) menjelang default JSON.
  const todayISO = dateToISO(new Date());
  const todayName = DAY_NAMES[new Date().getDay()];
  const isToday = selectedDay === todayName;

  const [activeOverride, setActiveOverride] = useState<ScheduleOverride | null>(null);
  const [staleNonExpiring, setStaleNonExpiring] = useState<ScheduleOverride | null>(null);
  useEffect(() => {
    if (!isToday) {
      setActiveOverride(null);
      setStaleNonExpiring(null);
      return;
    }
    let cancelled = false;
    getEffectiveDay(todayISO)
      .then((d) => {
        if (!cancelled) setActiveOverride(d.override);
      })
      .catch((e) => console.warn('Gagal memuat override:', e));

    // T7.5 — setiap pagi, pengguna yang punya override "berlaku terus" perlu
    // ditanya apakah masih relevan. Bukan pengingat, hanya konfirmasi diam-diam
    // saat aplikasi dibuka.
    getActiveNonExpiringOverrides()
      .then((list) => {
        if (!cancelled) {
          const hit = list.find((o) => o.dateISO !== todayISO) ?? null;
          setStaleNonExpiring(hit);
        }
      })
      .catch((e) => console.warn('Gagal memuat override non-expiring:', e));
    return () => {
      cancelled = true;
    };
  }, [isToday, todayISO]);

  // Workout yang ditampilkan di seluruh layar Hari Ini. Jika ada override,
  // inilah satu-satunya sumber kebenaran; jangan pakai dayData.normalizedWorkout
  // untuk hari ini lagi.
  const effectiveWorkout: NormalizedWorkout | null = isToday
    ? activeOverride
      ? normalizeReplacement(activeOverride.replacementWorkout)
      : dayData?.normalizedWorkout ?? null
    : dayData?.normalizedWorkout ?? null;

  const profil = (jadwalRaw as any)?.profil;
  const polaMakan = dayData?.pola_makan || [];

  const pklStatus =
    dayData?.pkl === 'Libur'
      ? 'LIBUR PKL'
      : `PKL ${dayData?.pkl || '08.00-17.00'}`;
  const isPKL = dayData?.pkl !== 'Libur';

  const handleChatSend = async (text: string) => {
    setChatLoading(true);
    
    const userMsg: ChatMsg = { role: 'user', text, timestamp: new Date().toISOString() };
    // Kumpulkan riwayat SEBELUM userMsg agar ikut terkirim (provider pangkas 10 terakhir)
    const prevMessages = chatMessages;
    setChatMessages(prev => [...prev, userMsg]);
    
    try {
      const provider = createChatProvider();
      const raw = await provider.send({
        messages: [...prevMessages, userMsg],
        context: {
          hariIni: {
            hari: selectedDay,
            tipe_hari: dayData?.tipe || 'biasa',
            fokus: 'Latihan',
            jadwalSingkat: dayData?.jadwal?.slice(0, 3)?.map((j: any) => ({ waktu: j.waktu, kegiatan: j.kegiatan })) || [],
            // Catatan: context chat memakai bentuk raw (latihan/set/…), bukan
            // NormalizedWorkout. Override akan ikut di Fase 8/9 saat chat
            // membaca getEffectiveDay() sendiri.
            workout: dayData?.normalizedWorkout || { nama: '', latihan: [] },
            pola_makan: polaMakan,
          },
          aturanTidur: { bangun: '05.00', target: '21.00', batas: '22.00' },
          usia: profil?.usia || 17,
          waktuSekarang: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      });

      // Normalisasi: provider dapat mengembalikan string atau AsyncIterable (stream)
      let response: string;
      if (typeof raw === 'string') {
        response = raw;
      } else {
        const chunks: string[] = [];
        for await (const chunk of raw) chunks.push(chunk);
        response = chunks.join('');
      }
      
      const assistantMsg: ChatMsg = { role: 'assistant', text: response };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      const errText = e instanceof Error ? e.message : 'terjadi kesalahan';
      let text = 'Maaf, terjadi kesalahan. Coba lagi nanti.';
      if (errText.includes('Gemini API 429')) {
        text = 'Kuota harian AI sudah habis sekarang. Coba lagi besok ya — selain itu aplikasi tetap jalan normal.';
      } else if (errText.includes('Gemini API 401') || errText.includes('403')) {
        text = 'API key AI belum valid atau belum diaktifkan. Cek pengaturan atau pakai mode offline.';
      } else if (errText.startsWith('Gemini API')) {
        text = `Layanan AI bermasalah: ${errText}. Coba lagi sebentar lagi.`;
      }
      const errMsg: ChatMsg = { role: 'assistant', text };
      setChatMessages(prev => [...prev, errMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSubstitutionSelect = (reason: SubstituteReason) => {
    const raw = (jadwalRaw as any)?.hari?.find((h: any) => h.hari === selectedDay) ?? null;
    const replacement = buildReplacement(reason, {
      hari: selectedDay,
      tipe: dayData?.tipe ?? 'biasa',
      pkl: raw?.pkl ?? '',
      workout: raw?.workout ?? null,
    });
    setSubstitutionReason(reason);
    setPendingReplacement(replacement);
  };

  const handleAcceptReplacement = async () => {
    if (!pendingReplacement || !substitutionReason) return;
    await applyOverride({
      dateISO: todayISO,
      reason: substitutionReason,
      source: 'quick_button',
      // Setiap override dari tombol cepat hanya berlaku untuk hari ini;
      // besok otomatis kembali normal (DATA_SCHEMA.md 7.3).
      expiresAfterDate: true,
      replacementWorkout: pendingReplacement,
    });
    setPendingReplacement(null);
    setSubstitutionReason(null);
    setOverrideApplied(todayISO);
    getEffectiveDay(todayISO).then((d) => setActiveOverride(d.override));
  };

  const handleRejectReplacement = () => {
    // Tidak ada aksi yang menghakimi — hanya tutup dan tetap pakai jadwal asli.
    setPendingReplacement(null);
    setSubstitutionReason(null);
  };

  const handleCancelOverride = async () => {
    await clearOverride(todayISO);
    setActiveOverride(null);
    setOverrideApplied(null);
  };

  const QUICK_ACTIONS = [
    { label: 'Jelaskan gerakan', action: 'explain' },
    { label: 'Sesuaikan workout', action: 'adjust' },
    { label: 'Menu hari ini', action: 'menu' },
    { label: 'Rangkum minggu', action: 'summary' },
  ];

  const handleQuickAction = (action: string) => {
    if (action === 'adjust') {
      // Fase 7 — penyesuaian latihan sekarang 100% rule-based (bukan AI).
      // Bawa pengguna ke layar Hari Ini yang berisi tombol cepat substitusi.
      setSelectedDay(todayName);
      setActiveTab('schedule');
      return;
    }
    const actionMessages: Record<string, string> = {
      explain: 'Jelaskan gerakan ini untuk hari ini!',
      menu: 'Menu hari ini dari bahan yang ada',
      summary: 'Rangkum minggu ini',
    };
    handleChatSend(actionMessages[action] || 'Halo!');
  };

  return (
    <div className="min-h-screen bg-[#f4f4f5] flex justify-center text-[#09090b] font-sans antialiased">
      {/* Mobile Shell Wrapper */}
      <div className="w-full max-w-md bg-[#ffffff] min-h-screen flex flex-col shadow-2xl border-x-2 border-[#09090b] relative pb-24">
        
        {/* App Bar / Header */}
        <header className="neo-box border-t-0 border-x-0 bg-[#ffffff] p-4 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight uppercase text-[#09090b]">RoutineZie</h1>
            <p className="text-xs font-bold text-[#09090b]/70">
              {selectedDay} • Fase: <span className="uppercase font-black underline text-[#09090b]">{currentPhase}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              aria-label={pklStatus}
              className={`neo-box-sm px-2.5 py-1 text-xs font-mono font-black tracking-wide ${
                isPKL
                  ? 'bg-[#09090b] text-[#ffffff]'
                  : 'bg-[#ffffff] text-[#09090b] border-2 border-[#09090b]'
              }`}
            >
              {pklStatus}
            </span>
          </div>
        </header>

        {/* Bottom Tab Navigation */}
        <nav
          aria-label="Navigasi utama"
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#ffffff] border-t-2 border-[#09090b] flex z-30 pb-[env(safe-area-inset-bottom)]"
        >
          {([
            { key: 'schedule', icon: Clock, label: 'Jadwal' },
            { key: 'meals', icon: Utensils, label: 'Makan' },
            { key: 'progress', icon: ChartBar, label: 'Progres' },
            { key: 'chat', icon: MessageCircle, label: 'Chat' },
            { key: 'settings', icon: SettingsIcon, label: 'Pengaturan' },
          ] as { key: Tab; icon: any; label: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              aria-current={activeTab === tab.key ? 'page' : undefined}
              aria-pressed={activeTab === tab.key}
              className={`flex-1 min-h-[52px] neo-btn-sm flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-black uppercase transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#09090b] text-[#ffffff]'
                  : 'bg-[#ffffff] text-[#09090b]/70 hover:bg-[#09090b]/5'
              }`}
            >
              <tab.icon className="w-5 h-5" aria-hidden="true" /> {tab.label}
            </button>
          ))}
        </nav>

        <main className="p-4 space-y-5 flex-1 pb-12">
          {/* ====================== TAB: JADWAL ====================== */}
          {activeTab === 'schedule' && (
            <>
              {/* T7.5 — override "berlaku terus" yang belum dikonfirmasi hari ini */}
              {staleNonExpiring && (
                <section className="neo-box bg-[#ffffff] p-3.5 space-y-2 border-[3px]">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#09090b]">
                    ⏰ MASIH BERLAKU?
                  </span>
                  <p className="text-xs font-medium text-[#09090b]/80 leading-relaxed">
                    Sejak{' '}
                    <span className="font-mono font-black">{staleNonExpiring.dateISO}</span> latihan kamu
                    diganti ({staleNonExpiring.reason.replace(/_/g, ' ')}). Mau lanjut diganti, atau
                    kembali ke jadwal asli?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        await clearOverride(staleNonExpiring.dateISO);
                        setStaleNonExpiring(null);
                        getEffectiveDay(todayISO).then((d) => setActiveOverride(d.override));
                      }}
                      className="flex-1 bg-[#09090b] text-[#ffffff] py-2 text-[11px] font-black uppercase border-[3px] border-[#09090b] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                      Kembali Normal
                    </button>
                    <button
                      onClick={() => setStaleNonExpiring(null)}
                      className="flex-1 neo-box bg-[#ffffff] text-[#09090b] py-2 text-[11px] font-black uppercase active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                      Lanjut Diganti
                    </button>
                  </div>
                </section>
              )}
              <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar -mx-1 px-1">
                {DAYS.map((day) => {
                  const isSelected = day === selectedDay;
                  // T7.4 — tandai hari ini jika sedang disubstitusi (strip hari
                  // adalah satu-satunya tampilan "mingguan" yang ada saat ini).
                  const isOverridden = day === todayName && !!activeOverride;
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      aria-pressed={isSelected}
                      className={`neo-btn-sm min-h-[40px] text-[11px] px-4 py-2 whitespace-nowrap transition-colors font-black relative ${
                        isSelected
                          ? 'bg-[#09090b] text-[#ffffff]'
                          : 'bg-[#ffffff] text-[#09090b] hover:bg-[#09090b]/5'
                      }`}
                    >
                      {day}
                      {isOverridden && (
                        <span
                          aria-label="Hari ini diganti"
                          className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-[#ff5c00] border-2 border-[#ffffff]"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {nowItem ? (
                <section className="neo-box-thick bg-[#ffffff] p-4 relative overflow-hidden space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="neo-box-sm bg-[#09090b] text-[#ffffff] px-2 py-0.5 text-xs font-black uppercase tracking-wider">
                      SEKARANG (NOW)
                    </span>
                    <span className="text-xs font-mono font-black text-[#09090b] bg-[#09090b]/5 px-2 py-0.5 neo-box-sm">
                      {nowItem.waktu}
                    </span>
                  </div>
                  <h2 className="text-xl font-black uppercase text-[#09090b] leading-snug">{nowItem.kegiatan}</h2>
                  {nowItem.detail && (
                    <p className="text-xs text-[#09090b]/80 font-medium leading-relaxed bg-[#09090b]/5 p-2 neo-box-sm">
                      {nowItem.detail}
                    </p>
                  )}
                </section>
              ) : (
                <section className="neo-box bg-[#ffffff] p-4 border-dashed text-center space-y-1">
                  <span className="text-xs font-black uppercase text-[#09090b]/60">STATUS SEKARANG</span>
                  <p className="text-sm font-black uppercase text-[#09090b]">WAKTU BEBAS / DILUAR JADWAL UTAMA</p>
                </section>
              )}

              {nextItem && (
                <section className="neo-box bg-[#ffffff] p-3.5 border-dashed space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[#09090b]/70 uppercase font-black tracking-wider">BERIKUTNYA (NEXT)</span>
                    <span className="font-mono text-[#09090b] font-black">{nextItem.waktu}</span>
                  </div>
                  <p className="text-sm font-extrabold uppercase text-[#09090b]">{nextItem.kegiatan}</p>
                </section>
              )}

              {effectiveWorkout && (
                <section className="neo-box bg-[#ffffff] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="neo-box p-2 bg-[#09090b] text-[#ffffff]">
                        <Dumbbell className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#09090b]/60 block">
                          LATIHAN HARI INI
                        </span>
                        <h3 className="text-base font-black uppercase text-[#09090b]">
                          {effectiveWorkout.nama}
                        </h3>
                      </div>
                    </div>
                    {effectiveWorkout.durasi && (
                      <span className="neo-box-sm bg-[#ffffff] text-xs font-mono font-black text-[#09090b] px-2 py-1">
                        {effectiveWorkout.durasi}
                      </span>
                    )}
                  </div>

                  {/* T7.4 — indikator pengganti */}
                  {activeOverride && (
                    <div className="border-2 border-[#09090b] bg-[#09090b]/5 p-2.5 space-y-1.5">
                      <span className="text-[11px] font-black uppercase text-[#09090b]">
                        ⚡ DIGANTI ({activeOverride.reason.replace(/_/g, ' ')})
                      </span>
                      <p className="text-[11px] font-medium text-[#09090b]/70">
                        Jadwal asli:{' '}
                        <span className="font-black line-through">
                          {dayData?.normalizedWorkout?.nama ?? 'Istirahat'}
                        </span>
                        {activeOverride.expiresAfterDate
                          ? ' — otomatis kembali besok.'
                          : ' — berlaku terus sampai dibatalkan.'}
                      </p>
                      <button
                        onClick={handleCancelOverride}
                        className="neo-box-sm bg-[#ffffff] text-[#09090b] px-2.5 py-1 text-[11px] font-black uppercase hover:bg-[#09090b]/10 active:translate-x-0.5 active:translate-y-0.5 transition-all"
                      >
                        Batalkan Pengganti
                      </button>
                    </div>
                  )}

                  {effectiveWorkout.latihan.length > 0 ? (
                    <button
                      onClick={() => setIsWorkoutModeOpen(true)}
                      className="neo-btn-black w-full py-3 text-xs uppercase font-black tracking-wide flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" /> MULAI WORKOUT TERPANDU
                    </button>
                  ) : (
                    <div className="p-2.5 bg-[#09090b]/5 border-2 border-dashed border-[#09090b] text-center">
                      <p className="text-xs font-bold text-[#09090b]">Hari Istirahat Penuh (Full Rest) — Nikmati waktu santai!</p>
                    </div>
                  )}

                  {/* T7.3 — tombol cepat & kartu usulan */}
                  {isToday && !activeOverride && !pendingReplacement && effectiveWorkout.latihan.length > 0 && (
                    <SubstitutionQuickButtons onSelect={handleSubstitutionSelect} />
                  )}
                  {pendingReplacement && substitutionReason && (
                    <SubstitutionPanel
                      proposal={{
                        reason: substitutionReason as Exclude<SubstituteReason, 'lainnya'>,
                        original: (jadwalRaw as any)?.hari?.find((h: any) => h.hari === selectedDay)?.workout ?? null,
                        replacement: pendingReplacement,
                      }}
                      onAccept={handleAcceptReplacement}
                      onReject={handleRejectReplacement}
                    />
                  )}
                </section>
              )}
              <WeatherWidget selectedDay={selectedDay} />

              <section className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-[#09090b] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#09090b]" /> AGENDA {selectedDay.toUpperCase()}
                </h3>
                <div className="space-y-2.5">
                  {dayData?.jadwal?.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedItemDetail(item)}
                      className="neo-box bg-[#ffffff] p-3.5 flex items-start justify-between cursor-pointer hover:bg-[#09090b]/5 active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                      <div className="space-y-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="neo-box-sm bg-[#09090b] text-[#ffffff] px-2 py-0.5 text-[11px] font-mono font-black">
                            {item.waktu}
                          </span>
                          {item.opsional && (
                            <span className="text-[11px] font-extrabold border-2 border-[#09090b] px-1.5 py-0.5 text-[#09090b] uppercase bg-[#ffffff]">
                              OPSIONAL
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-black uppercase text-[#09090b] leading-tight">{item.kegiatan}</h4>
                        {item.detail && (
                          <p className="text-xs text-[#09090b]/75 font-medium line-clamp-1">{item.detail}</p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#09090b] shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ====================== TAB: MAKAN ====================== */}
          {activeTab === 'meals' && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-[#09090b] flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-[#09090b]" /> POLA MAKAN {selectedDay.toUpperCase()}
                </h3>
                <span className="text-[11px] font-black uppercase text-[#09090b]/60 bg-[#09090b]/5 px-2 py-0.5 neo-box-sm">
                  {profil?.usia ? `${profil.usia} TAHUN` : 'INFO NUTRISI'}
                </span>
              </div>
              <MealChecklist dateISO={new Date().toISOString().split('T')[0]} polaMakan={polaMakan} />
            </section>
          )}

          {/* ====================== TAB: PROGRES ====================== */}
          {activeTab === 'progress' && (
            <section className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#09090b] flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#09090b]" /> LOG & PROGRES MINGGUAN
              </h3>
              <ProgressView />
            </section>
          )}

          {/* ====================== TAB: CHAT ====================== */}
          {activeTab === 'chat' && (
            <section className="space-y-3">
              {/* Chat Header */}
              <div className="neo-box p-4 bg-[#09090b] text-[#ffffff] space-y-2">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-[#ffffff]" />
                  <div>
                    <h3 className="text-sm font-black uppercase">Zenn Assistant</h3>
                    <p className="text-[11px] font-mono text-[#ffffff]/60">
                      {getChatProviderInfo().active
                        ? `AI • ${getChatProviderInfo().name === 'gemini' ? 'Gemini' : 'Proxy'} • Asisten Rutinitasmu`
                        : 'Mode Offline • Contoh Jawaban'}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] font-medium text-[#ffffff]/70 leading-relaxed">
                  Bantuan untuk latihan, makan, tidur, dan motivasi. Berdasarkan konteks jadwal harianmu.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="neo-box p-3 bg-[#ffffff] space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#09090b]/60 block">Pertanyaan Cepat</span>
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIONS.map((qa, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickAction(qa.action)}
                      className="neo-btn-sm bg-[#ffffff] text-[#09090b] border-2 border-[#09090b] px-3 py-1.5 text-[11px] font-black uppercase hover:bg-[#09090b] hover:text-[#ffffff] transition-colors"
                    >
                      {qa.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Balloon Chat */}
              <Balloon
                messages={chatMessages}
                onSend={handleChatSend}
                isLoading={chatLoading}
              />

              {/* System Prompt Info */}
              <div className="neo-box-sm p-2 bg-[#09090b]/5 text-[11px] font-mono text-[#09090b]/70 leading-relaxed space-y-1">
                <span className="font-black block text-[11px] text-[#09090b] uppercase">System Prompt:</span>
                <span>Kamu adalah asisten di aplikasi RoutineZie. Usia pengguna: 17 tahun. Jawab dalam Bahasa Indonesia, ringkas, hangat.</span>
              </div>
            </section>
          )}

          {/* ====================== TAB: PENGATURAN ====================== */}
          {activeTab === 'settings' && (
            <section className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#09090b] flex items-center gap-1.5">
                <SettingsIcon className="w-4 h-4 text-[#09090b]" /> PENGATURAN
              </h3>
              <SettingsView />
              <NotificationSettingsSection />
            </section>
          )}
        </main>

        {/* Item Detail Modal */}
        {selectedItemDetail && (
          <div className="fixed inset-0 bg-[#09090b]/75 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="neo-box-thick bg-[#ffffff] text-[#09090b] w-full max-w-md p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b-2 border-[#09090b] pb-3">
                <span className="neo-box-sm bg-[#09090b] text-[#ffffff] px-2.5 py-1 text-xs font-mono font-black">
                  {selectedItemDetail.waktu}
                </span>
                <button
                  onClick={() => setSelectedItemDetail(null)}
                  className="neo-btn bg-[#ffffff] hover:bg-[#09090b]/5 text-[#09090b] p-1 text-xs font-black flex items-center justify-center"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black uppercase text-[#09090b]">{selectedItemDetail.kegiatan}</h3>
                {selectedItemDetail.detail && (
                  <p className="text-xs font-medium text-[#09090b] leading-relaxed border-l-2 border-[#09090b] pl-3 py-1 bg-[#09090b]/5">
                    {selectedItemDetail.detail}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Workout Mode Modal */}
        {isWorkoutModeOpen && effectiveWorkout && (
          <WorkoutModeModal
            dayName={selectedDay}
            workoutData={effectiveWorkout}
            onClose={() => setIsWorkoutModeOpen(false)}
          />
        )}
      </div>
    </div>
  );
}