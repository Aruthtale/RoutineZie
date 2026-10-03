'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getScheduleForDay, getNowAndNext, parseWaktu, getPulangMinutes, formatJam, formatSisaWaktu, findMentionedExercise, type NormalizedWorkout } from '@/lib/schedule/parser';
import { ChevronRight, Info, X, Play, Settings as SettingsIcon, Send } from 'lucide-react';
import WorkoutModeModal from '@/components/WorkoutModeModal';
import MealChecklist from '@/components/MealChecklist';
import WaterTracker from '@/components/WaterTracker';
import HungerLogger from '@/components/HungerLogger';
import ShoppingListPanel, { AlternatifMenuPanel } from '@/components/ShoppingListPanel';
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
} from '@/lib/schedule/substitutions';
import { useDaySwipe } from '@/hooks/useDaySwipe';
import { useBackHandler, registerBackHandler } from '@/hooks/useBackHandler';
import { useDayPhase } from '@/hooks/useDayPhase';
import { RoutineRepository } from '@/lib/db/repository';
import {
  InkSchedule,
  InkMeal,
  InkProgress,
  InkChat,
  InkRun,
  InkAssistant,
} from '@/components/icons/InkIcons';
import { dateToISO, DAY_NAMES, getEffectiveDay, applyOverride, clearOverride, getActiveNonExpiringOverrides } from '@/lib/schedule/effectiveDay';
import { setWidgetState, buildWidgetState } from '@/lib/widget';
import { SubstitutionPanel, SubstitutionQuickButtons, AcuteInjuryNotice } from '@/components/SubstitutionPanel';
import {
  classifySubstitutionIntentWithHistory,
  extractSubstitutionTag,
  hasAcuteInjuryTag,
  stripSubstitutionTag,
} from '@/lib/ai/substitutionIntent';

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
  // T9.3 — usulan dari tab Chat (sumber: 'ai_chat'). Terpisah dari usulan
  // tombol cepat di tab Hari Ini (sumber: 'quick_button') agar tidak saling
  // timpang; keduanya memakai tabel substitutions.ts yang sama.
  const [chatProposal, setChatProposal] = useState<{
    reason: Exclude<SubstituteReason, 'lainnya'>;
    replacement: Workout;
  } | null>(null);
  const [chatAcuteInjury, setChatAcuteInjury] = useState<boolean>(false);
  const [overrideApplied, setOverrideApplied] = useState<string | null>(null); // dateISO
  const [showExitToast, setShowExitToast] = useState<boolean>(false);

  // Tema fase hari (design.md §5): wind-down (20.30–04.00) menginversi UI jadi
  // gelap otomatis. Pengguna dapat memaksa terang/gelap lewat Pengaturan.
  const [themePref, setThemePref] = useState<'auto' | 'light' | 'dark'>('auto');
  useEffect(() => {
    let cancelled = false;
    RoutineRepository.getSettings()
      .then((s) => {
        if (!cancelled) setThemePref(s.theme ?? 'auto');
      })
      .catch(() => {});
    // Dengarkan perubahan tema dari tab Pengaturan agar langsung terasa.
    const onThemeChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'auto' || detail === 'light' || detail === 'dark') {
        setThemePref(detail);
      }
    };
    window.addEventListener('rz-theme-change', onThemeChange);
    return () => {
      cancelled = true;
      window.removeEventListener('rz-theme-change', onThemeChange);
    };
  }, []);
  const dayPhase = useDayPhase(themePref);

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

  // Hierarki tombol Back Android: modal dulu → tab home → tekan 2x untuk keluar.
  // Ref mencegah listener lama memakai state/`activeTab` yang basi.
  const activeTabRef = useRef<Tab>(activeTab);
  activeTabRef.current = activeTab;

  // Tier-1: modal yang sedang terbuka mendaftar handler penutupannya sendiri.
  // Stack LIFO berarti modal yang paling belakang dibuka ditutup paling dulu.
  useEffect(() => {
    if (!selectedItemDetail) return;
    return registerBackHandler(() => {
      setSelectedItemDetail(null);
      return true;
    });
  }, [selectedItemDetail]);

  useEffect(() => {
    if (!isWorkoutModeOpen) return;
    return registerBackHandler(() => {
      setIsWorkoutModeOpen(false);
      return true;
    });
  }, [isWorkoutModeOpen]);

  useBackHandler({
    getActiveTab: () => activeTabRef.current,
    goHome: () => setActiveTab('schedule'),
    onExitPrompt: () => {
      setShowExitToast(true);
      window.setTimeout(() => setShowExitToast(false), 2000);
    },
  });

  // T8.5 — Navigasi hari via swipe gesture horizontal
  const handlePrevDay = () => {
    const curIdx = DAYS.indexOf(selectedDay);
    const prevIdx = (curIdx - 1 + DAYS.length) % DAYS.length;
    setSelectedDay(DAYS[prevIdx]);
  };

  const handleNextDay = () => {
    const curIdx = DAYS.indexOf(selectedDay);
    const nextIdx = (curIdx + 1) % DAYS.length;
    setSelectedDay(DAYS[nextIdx]);
  };

  const daySwipe = useDaySwipe({
    onSwipeLeft: handleNextDay,
    onSwipeRight: handlePrevDay,
  });

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

  // T8.1 — agregasi pola makan 7 hari untuk daftar belanja mingguan.
  const polaMakanMingguan = useMemo(() => {
    const all = (jadwalRaw as any)?.hari ?? [];
    return all.flatMap((h: any) => (Array.isArray(h.pola_makan) ? h.pola_makan : []));
  }, [jadwalRaw]);

  const pklStatus =
    dayData?.pkl === 'Libur'
      ? 'LIBUR PKL'
      : `PKL ${dayData?.pkl || '08.00-17.00'}`;
  const isPKL = dayData?.pkl !== 'Libur';

  // T8.5 — hitung mundur ke jam pulang PKL (hanya untuk hari PKL).
  const pulangMinutes = getPulangMinutes(dayData?.pkl);
  const isWorkDay = isToday && pulangMinutes !== null;
  const sisaMenitPulang = isWorkDay ? pulangMinutes! - currentTimeMinutes : null;

  // Sprint #4 — hitung mundur ke kegiatan berikutnya (hero "SEKARANG").
  // Hanya untuk HARI INI; hari lain tidak relevan.
  const nextStartMinutes = useMemo(() => {
    if (!nextItem?.waktu) return null;
    const parsed = parseWaktu(nextItem.waktu);
    return parsed ? parsed.startMinutes : null;
  }, [nextItem]);
  const sisaMenitNext =
    isToday && nextStartMinutes !== null ? nextStartMinutes - currentTimeMinutes : null;

  // Sinkronkan widget layar utama (Android) dengan jadwal hari ini.
  // Hanya untuk HARI INI — hari lain tidak relevan bagi widget. Dipanggil ulang
  // setiap kali jadwal/override/waktu berubah.
  useEffect(() => {
    if (!isToday) return;
    const now = new Date();

    // Bila hari ini disubstitusi, widget menampilkan nama latihan pengganti
    // (bukan kegiatan berikutnya dari jadwal asli) agar konsisten dengan app.
    const overrideTitle = activeOverride
      ? effectiveWorkout?.nama
        ? `${effectiveWorkout.nama} (diganti)`
        : 'Latihan diganti'
      : null;

    const state = buildWidgetState({
      nextTitle: overrideTitle ?? nextItem?.kegiatan ?? null,
      nextTime: activeOverride ? null : nextItem?.waktu ?? null,
      pkl: dayData?.pkl ?? null,
      sisaMenitPulang,
      nowTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      dateISO: todayISO,
      updatedAt: now.getTime(),
    });
    void setWidgetState(state);
  }, [isToday, nextItem, dayData?.pkl, sisaMenitPulang, todayISO, activeOverride, effectiveWorkout?.nama]);

  const handleChatSend = async (text: string) => {
    setChatLoading(true);
    // Bersihkan usulan/peringkat dari jawaban sebelumnya — yang lama tidak
    // lagi relevan untuk pertanyaan baru (design.md 13.1).
    setChatProposal(null);
    setChatAcuteInjury(false);
    
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

      // T9.2/T9.3 — proses tag [[SUBSTITUTE:<alasan>]] dari AI.
      // Tag tidak dikenal/nilai 'lainnya' → null, lalu jatuh ke klasifikasi
      // sisi-klien dari teks pengguna (termasuk riwayat percakapan).
      // 'acute_injury' adalah nilai tag khusus (bukan SubstituteReason) —
      // tidak pernah memunculkan substitusi.
      let tagReason: Exclude<SubstituteReason, 'lainnya'> | 'acute_injury' | null = null;
      if (hasAcuteInjuryTag(response)) {
        tagReason = 'acute_injury';
      } else {
        tagReason = extractSubstitutionTag(response);
        if (!tagReason) {
          const intent = classifySubstitutionIntentWithHistory([
            ...prevMessages.filter((m) => m.role === 'user').map((m) => m.text),
            text,
          ]);
          if (intent.kind === 'acute_injury') tagReason = 'acute_injury';
          else if (intent.kind === 'proposal') tagReason = intent.reason;
        }
      }

      // Cedera akut → tampilkan kartu peringatan, JANGAN usulkan substitusi.
      if (tagReason === 'acute_injury') {
        setChatProposal(null);
        setChatAcuteInjury(true);
      } else if (tagReason) {
        // Usulan tetap dari tabel substitutions.ts — AI tidak mengarang.
        const rawDay = (jadwalRaw as any)?.hari?.find((h: any) => h.hari === selectedDay) ?? null;
        setChatAcuteInjury(false);
        setChatProposal({
          reason: tagReason,
          replacement: buildReplacement(tagReason, {
            hari: selectedDay,
            tipe: dayData?.tipe ?? 'biasa',
            pkl: rawDay?.pkl ?? '',
            workout: rawDay?.workout ?? null,
          }),
        });
      }

      const assistantMsg: ChatMsg = {
        role: 'assistant',
        // Tag tidak untuk dilihat pengguna — buang sebelum masuk thread.
        text: stripSubstitutionTag(response),
      };

      // T8.4 — bila jawaban membahas gerakan dari jadwal hari ini, lampirkan
      // kartu latihan (bukan teks polos).
      const mentioned = findMentionedExercise(response, effectiveWorkout?.latihan ?? []);
      if (mentioned) {
        assistantMsg.attachment = { exerciseName: mentioned };
      }

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
    <div className="h-[100dvh] bg-canvas flex justify-center text-ink font-sans antialiased overflow-hidden">
      {/* Mobile Shell Wrapper */}
      <div className="w-full max-w-md bg-paper h-full flex flex-col shadow-2xl border-x-2 border-ink relative">
        
        {/* App Bar / Header — sticky di bawah status bar (safe-area) */}
        <header className="shrink-0 bg-paper border-b-[3px] border-ink z-20">
          {/* Safe-area padding atas (status bar) — andal di Android 15 + iOS */}
          <div className="pt-[var(--safe-top)]" />
          <div className="px-4 pb-3 pt-2 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl leading-none tracking-tight uppercase text-ink">
                RoutineZie
              </h1>
              <p className="text-[11px] font-bold text-ink/70 mt-1 truncate">
                {selectedDay} · Fase:{' '}
                <span className="uppercase font-black underline text-ink">
                  {currentPhase}
                </span>
              </p>
            </div>
            <span
              aria-label={pklStatus}
              className={`shrink-0 neo-box-sm px-2.5 py-1 text-xs font-mono font-black tracking-wide ${
                isPKL
                  ? 'bg-ink text-paper'
                  : 'bg-paper text-ink'
              }`}
            >
              {pklStatus}
            </span>
          </div>
        </header>

        <main className="p-4 space-y-5 flex-1 min-h-0 overflow-y-auto overscroll-contain pb-[calc(1.5rem+var(--safe-bottom))]">
          {/* ====================== TAB: JADWAL ====================== */}
          {activeTab === 'schedule' && (
            <div {...daySwipe} className="space-y-5">
              {/* T7.5 — override "berlaku terus" yang belum dikonfirmasi hari ini */}
              {staleNonExpiring && (
                <section className="neo-box bg-paper p-3.5 space-y-2 border-[3px]">
                  <span className="text-[11px] font-black uppercase tracking-wider text-ink">
                    ⏰ MASIH BERLAKU?
                  </span>
                  <p className="text-xs font-medium text-ink/80 leading-relaxed">
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
                      className="flex-1 bg-ink text-paper py-2 text-[11px] font-black uppercase border-[3px] border-ink active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                      Kembali Normal
                    </button>
                    <button
                      onClick={() => setStaleNonExpiring(null)}
                      className="flex-1 neo-box bg-paper text-ink py-2 text-[11px] font-black uppercase active:translate-x-0.5 active:translate-y-0.5 transition-all"
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
                          ? 'bg-ink text-paper'
                          : 'bg-paper text-ink hover:bg-ink/5'
                      }`}
                    >
                      {day}
                      {isOverridden && (
                        <span
                          aria-label="Hari ini diganti"
                          className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-[#ff5c00] border-2 border-paper"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {nowItem ? (
                <section className="neo-box-thick bg-ink text-paper p-5 relative overflow-hidden space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="bg-paper text-ink px-2.5 py-1 text-[11px] font-black uppercase tracking-widest">
                      SEKARANG
                    </span>
                    <span className="text-xs font-mono font-black text-paper/70">
                      {nowItem.waktu}
                    </span>
                  </div>
                  {/* Hero: kegiatan sekarang pakai font display besar */}
                  <h2
                    className="text-3xl sm:text-4xl font-black uppercase leading-[1.05] tracking-tight"
                    style={{ fontFamily: 'var(--font-anton), sans-serif' }}
                  >
                    {nowItem.kegiatan}
                  </h2>
                  {nowItem.detail && (
                    <p className="text-xs text-paper/70 font-medium leading-relaxed border-l-2 border-paper/30 pl-3">
                      {nowItem.detail}
                    </p>
                  )}
                  {/* Hitung mundur ke kegiatan berikutnya */}
                  {sisaMenitNext !== null && sisaMenitNext > 0 && nextItem && (
                    <div className="flex items-center gap-2 pt-1 border-t border-paper/20">
                      <span className="text-[10px] font-black uppercase tracking-wider text-paper/50">
                        {formatSisaWaktu(sisaMenitNext)} lagi
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-paper/80 truncate">
                        → {nextItem.kegiatan}
                      </span>
                    </div>
                  )}
                </section>
              ) : (
                <section className="neo-box-thick bg-paper p-5 text-center space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-ink/50">SEKARANG</span>
                  <p
                    className="text-2xl font-black uppercase text-ink leading-tight"
                    style={{ fontFamily: 'var(--font-anton), sans-serif' }}
                  >
                    Waktu Bebas
                  </p>
                  <p className="text-xs text-ink/60 font-medium">Diluar jadwal utama</p>
                  {sisaMenitNext !== null && sisaMenitNext > 0 && nextItem && (
                    <p className="text-[11px] font-bold uppercase text-ink/70 pt-1 border-t border-ink/10">
                      {formatSisaWaktu(sisaMenitNext)} lagi → {nextItem.kegiatan}
                    </p>
                  )}
                </section>
              )}

              {nextItem && (
                <section className="neo-box bg-paper p-3.5 border-dashed space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-ink/70 uppercase font-black tracking-wider">BERIKUTNYA (NEXT)</span>
                    <span className="font-mono text-ink font-black">{nextItem.waktu}</span>
                  </div>
                  <p className="text-sm font-extrabold uppercase text-ink">{nextItem.kegiatan}</p>
                </section>
              )}

              {/* T8.5 — hitung mundur ke jam pulang PKL (pendukung, bukan hero) */}
              {sisaMenitPulang !== null && (
                <section className="neo-box bg-paper p-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-black uppercase tracking-wider text-ink/60">
                      {sisaMenitPulang > 0 ? 'PULANG PKL DALAM' : 'JAM PKL SUDAH LEWAT'}
                    </span>
                    <span className="font-mono font-black text-ink/60">
                      {formatJam(pulangMinutes!)}
                    </span>
                  </div>
                  {sisaMenitPulang > 0 ? (
                    <p className="text-lg font-black font-mono tracking-tight text-ink">
                      {Math.floor(sisaMenitPulang / 60)}j {sisaMenitPulang % 60}m
                    </p>
                  ) : (
                    <p className="text-xs font-black uppercase text-ink/70">
                      Waktunya istirahat hari ini 🎉
                    </p>
                  )}
                </section>
              )}

              {effectiveWorkout && (
                <section className="neo-box bg-paper p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="neo-box p-2 bg-ink text-paper">
                        <InkRun className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-ink/60 block">
                          LATIHAN HARI INI
                        </span>
                        <h3 className="text-base font-black uppercase text-ink">
                          {effectiveWorkout.nama}
                        </h3>
                      </div>
                    </div>
                    {effectiveWorkout.durasi && (
                      <span className="neo-box-sm bg-paper text-xs font-mono font-black text-ink px-2 py-1">
                        {effectiveWorkout.durasi}
                      </span>
                    )}
                  </div>

                  {/* T7.4 — indikator pengganti */}
                  {activeOverride && (
                    <div className="border-2 border-ink bg-ink/5 p-2.5 space-y-1.5">
                      <span className="text-[11px] font-black uppercase text-ink">
                        ⚡ DIGANTI ({activeOverride.reason.replace(/_/g, ' ')})
                      </span>
                      <p className="text-[11px] font-medium text-ink/70">
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
                        className="neo-box-sm bg-paper text-ink px-2.5 py-1 text-[11px] font-black uppercase hover:bg-ink/10 active:translate-x-0.5 active:translate-y-0.5 transition-all"
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
                    <div className="p-2.5 bg-ink/5 border-2 border-dashed border-ink text-center">
                      <p className="text-xs font-bold text-ink">Hari Istirahat Penuh (Full Rest) — Nikmati waktu santai!</p>
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
                <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
                  <InkSchedule className="w-4 h-4 text-ink" /> AGENDA {selectedDay.toUpperCase()}
                </h3>
                <div className="space-y-2.5">
                  {dayData?.jadwal?.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedItemDetail(item)}
                      className="neo-box bg-paper p-3.5 flex items-start justify-between cursor-pointer hover:bg-ink/5 active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                      <div className="space-y-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="neo-box-sm bg-ink text-paper px-2 py-0.5 text-[11px] font-mono font-black">
                            {item.waktu}
                          </span>
                          {item.opsional && (
                            <span className="text-[11px] font-extrabold border-2 border-ink px-1.5 py-0.5 text-ink uppercase bg-paper">
                              OPSIONAL
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-black uppercase text-ink leading-tight">{item.kegiatan}</h4>
                        {item.detail && (
                          <p className="text-xs text-ink/75 font-medium line-clamp-1">{item.detail}</p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-ink shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ====================== TAB: MAKAN ====================== */}
          {activeTab === 'meals' && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
                  <InkMeal className="w-4 h-4 text-ink" /> POLA MAKAN {selectedDay.toUpperCase()}
                </h3>
                <span className="text-[11px] font-black uppercase text-ink/60 bg-ink/5 px-2 py-0.5 neo-box-sm">
                  {profil?.usia ? `${profil.usia} TAHUN` : 'INFO NUTRISI'}
                </span>
              </div>
              <MealChecklist dateISO={todayISO} polaMakan={polaMakan} />
              <WaterTracker dateISO={todayISO} targetGelas={profil?.info_kalori_dan_nutrisi?.air_minum_ml ? undefined : 8} />
              <HungerLogger dateISO={todayISO} />
              <AlternatifMenuPanel polaMakanHari={polaMakan} />
              <ShoppingListPanel polaMakanMingguan={polaMakanMingguan} />
            </section>
          )}

          {/* ====================== TAB: PROGRES ====================== */}
          {activeTab === 'progress' && (
            <section className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
                <InkProgress className="w-4 h-4 text-ink" /> LOG & PROGRES MINGGUAN
              </h3>
              <ProgressView />
            </section>
          )}

          {/* ====================== TAB: CHAT ====================== */}
          {activeTab === 'chat' && (
            <section className="space-y-3">
              {/* Chat Header */}
              <div className="neo-box p-4 bg-ink text-paper space-y-2">
                <div className="flex items-center gap-2">
                  <InkAssistant className="w-5 h-5 text-paper" />
                  <div>
                    <h3 className="text-sm font-black uppercase">Zenn Assistant</h3>
                    <p className="text-[11px] font-mono text-paper/60">
                      {getChatProviderInfo().active
                        ? `AI • ${getChatProviderInfo().name === 'gemini' ? 'Gemini' : 'Proxy'} • Asisten Rutinitasmu`
                        : 'Mode Offline • Contoh Jawaban'}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] font-medium text-paper/70 leading-relaxed">
                  Bantuan untuk latihan, makan, tidur, dan motivasi. Berdasarkan konteks jadwal harianmu.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="neo-box p-3 bg-paper space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-ink/60 block">Pertanyaan Cepat</span>
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIONS.map((qa, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickAction(qa.action)}
                      className="neo-btn-sm bg-paper text-ink border-2 border-ink px-3 py-1.5 text-[11px] font-black uppercase hover:bg-ink hover:text-paper transition-colors"
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
                exercises={effectiveWorkout?.latihan}
                onOpenExercise={() => {
                  // T8.4 — dari kartu di chat, buka Mode Workout langsung.
                  setActiveTab('schedule');
                  setIsWorkoutModeOpen(true);
                }}
              />

              {/* T9.3 — Usulan dari chat (sumber: 'ai_chat') */}
              {chatAcuteInjury && <AcuteInjuryNotice />}
              {chatProposal && (
                <SubstitutionPanel
                  proposal={{
                    reason: chatProposal.reason,
                    original: effectiveWorkout ?? null,
                    replacement: chatProposal.replacement,
                  }}
                  onAccept={async () => {
                    // Override hanya ditulis setelah "Terima" (design.md 13.1).
                    await applyOverride({
                      dateISO: todayISO,
                      reason: chatProposal.reason,
                      source: 'ai_chat',
                      // Berlaku hanya hari ini; besok kembali normal
                      // (DATA_SCHEMA.md 7.3).
                      expiresAfterDate: true,
                      replacementWorkout: chatProposal.replacement,
                    });
                    setChatProposal(null);
                    setOverrideApplied(todayISO);
                    getEffectiveDay(todayISO).then((d) => setActiveOverride(d.override));
                  }}
                  onReject={() => {
                    // Tidak ada aksi yang menghakimi — tutup, tetap jadwal asli.
                    setChatProposal(null);
                  }}
                />
              )}

              {/*
                Info system prompt disembunyikan: menampilkan prompt mentah ke
                pengguna adalah kebocoran internal. Gunakan guardrails.ts /
                DevTools bila perlu inspeksi.
              */}
            </section>
          )}

          {/* ====================== TAB: PENGATURAN ====================== */}
          {activeTab === 'settings' && (
            <section className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
                <SettingsIcon className="w-4 h-4 text-ink" /> PENGATURAN
              </h3>
              <SettingsView />
              <NotificationSettingsSection />
            </section>
          )}
        </main>

        {/* Bottom Tab Navigation — border atas 3px (sama dengan header) */}
        <nav
          aria-label="Navigasi utama"
          className="shrink-0 bg-paper border-t-[3px] border-ink flex z-30"
        >
          <div className="flex w-full pb-[var(--safe-bottom)]">
          {([
            { key: 'schedule', icon: InkSchedule, label: 'Jadwal' },
            { key: 'meals', icon: InkMeal, label: 'Makan' },
            { key: 'progress', icon: InkProgress, label: 'Progres' },
            { key: 'chat', icon: InkChat, label: 'Chat' },
            { key: 'settings', icon: SettingsIcon, label: 'Pengaturan' },
          ] as { key: Tab; icon: any; label: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                // Reset scroll: tanpa ini posisi scroll tab sebelumnya
                // dipertahankan, membuat header sticky menutupi konten atas.
                window.scrollTo(0, 0);
              }}
              aria-current={activeTab === tab.key ? 'page' : undefined}
              aria-pressed={activeTab === tab.key}
              className={`flex-1 min-h-[52px] neo-btn-sm flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-black uppercase transition-colors ${
                activeTab === tab.key
                  ? 'bg-ink text-paper'
                  : 'bg-paper text-ink/70 hover:bg-ink/5'
              }`}
            >
              <tab.icon className="w-5 h-5" aria-hidden="true" /> {tab.label}
            </button>
          ))}
          </div>
        </nav>

        {/* Item Detail Modal */}
        {selectedItemDetail && (
          <div className="fixed inset-0 bg-ink/75 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="neo-box-thick bg-paper text-ink w-full max-w-md p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b-2 border-ink pb-3">
                <span className="neo-box-sm bg-ink text-paper px-2.5 py-1 text-xs font-mono font-black">
                  {selectedItemDetail.waktu}
                </span>
                <button
                  onClick={() => setSelectedItemDetail(null)}
                  className="neo-btn bg-paper hover:bg-ink/5 text-ink p-1 text-xs font-black flex items-center justify-center"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black uppercase text-ink">{selectedItemDetail.kegiatan}</h3>
                {selectedItemDetail.detail && (
                  <p className="text-xs font-medium text-ink leading-relaxed border-l-2 border-ink pl-3 py-1 bg-ink/5">
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

        {/* Toast verifikasi keluar (tier-3 back button) */}
        {showExitToast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
          >
            <div className="neo-box bg-ink text-paper px-4 py-2.5 shadow-2xl">
              <span className="text-xs font-black uppercase tracking-wide">
                Tekan sekali lagi untuk keluar
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}