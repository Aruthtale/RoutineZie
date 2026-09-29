'use client';

import React, { useState, useEffect } from 'react';
import { RoutineRepository } from '@/lib/db/repository';
import { WorkoutLog, Milestone } from '@/lib/db';
import { getWeekDates, getWeekStart, checkMilestones, countWorkoutsPerWeek, computeSleepWeekStats } from '@/lib/progress/weeklyStats';
import { Award, Calendar } from 'lucide-react';

/**
 * T8.2d — Grid stempel riwayat latihan + milestone. Menampilkan:
 * 1. Grid 7 hari untuk minggu yang dipilih (Senin–Minggu), diisi stempel
 *    latihan yang selesai.
 * 2. Daftar milestone yang sudah tercapai (otomatis dari data); yang belum
 *    tercapai tidak ditampilkan (tidak menghukum).
 */
export default function WorkoutStampGrid() {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = minggu ini, -1 = lalu, dst.
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [sleepLogs, setSleepLogs] = useState<{ dateISO: string; sleptBefore22: boolean; qualityRating?: number }[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  const todayISO = new Date().toISOString().split('T')[0];
  // Geser minggu sesuai offset (0 = minggu ini, -1 = minggu lalu, dst.)
  const todayWeekStart = getWeekStart(todayISO);
  const [y, m, d] = todayWeekStart.split('-').map(Number);
  const shifted = new Date(y, m - 1, d + weekOffset * 7);
  const weekStart = getWeekStart(`${shifted.getFullYear()}-${String(
    shifted.getMonth() + 1
  ).padStart(2, '0')}-${String(shifted.getDate()).padStart(2, '0')}`);
  const weekDates = getWeekDates(weekStart);

  const loadData = async () => {
    try {
      const [w, s, ms, weights] = await Promise.all([
        RoutineRepository.getWorkoutLogs(),
        RoutineRepository.getSleepLogs(),
        RoutineRepository.getMilestones(),
        RoutineRepository.getWeightLogs(),
      ]);
      setLogs(w);
      setSleepLogs(s);
      setMilestones(ms);

      // Deteksi milestone untuk minggu yang sedang dilihat.
      const jumlahW = countWorkoutsPerWeek(
        w.map((x) => ({ dateISO: x.dateISO, done: true })),
        weekDates
      );
      const sleepWeek = computeSleepWeekStats(s, weekDates);
      const cek = checkMilestones({
        sleepWeek,
        jumlahWorkoutMinggu: jumlahW,
        beratAwal: weights[0]?.kg,
        beratTerbaru: weights[weights.length - 1]?.kg,
      });
      for (const c of cek) {
        if (c.tercapai) {
          await RoutineRepository.awardMilestone(c.kode, c.label, todayISO);
        }
      }
      const msAfter = await RoutineRepository.getMilestones();
      setMilestones(msAfter);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  // Latihan dianggap selesai bila ada log hari itu (sets terisi).
  const doneSet = new Set(logs.map((l) => l.dateISO));

  const gridHari = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b-2 border-[#09090b] pb-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-[#09090b] flex items-center gap-1.5">
          <Calendar className="w-4 h-4" /> STAMEL LATIHAN
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWeekOffset((v) => v - 1)}
            className="neo-btn bg-[#ffffff] text-[#09090b] px-2 py-1 text-[11px] font-black"
          >
            ←
          </button>
          <span className="text-[10px] font-mono font-black uppercase text-[#09090b]/60">
            {weekOffset === 0 ? 'MINGGU INI' : `${weekOffset} MGG LALU`}
          </span>
          <button
            onClick={() => setWeekOffset((v) => Math.min(0, v + 1))}
            className="neo-btn bg-[#ffffff] text-[#09090b] px-2 py-1 text-[11px] font-black"
            disabled={weekOffset >= 0}
          >
            →
          </button>
        </div>
      </div>

      {/* Grid 7 hari */}
      <div className="grid grid-cols-7 gap-1.5">
        {gridHari.map((hari, i) => {
          const iso = weekDates[i];
          const selesai = doneSet.has(iso);
          return (
            <div
              key={hari}
              className={`neo-box-sm p-1.5 flex flex-col items-center gap-1 ${
                selesai ? 'bg-[#09090b]' : 'bg-[#ffffff]'
              }`}
            >
              <span className={`text-[9px] font-black uppercase ${selesai ? 'text-[#ffffff]/70' : 'text-[#09090b]/50'}`}>
                {hari.slice(0, 3)}
              </span>
              <span className={`font-mono font-black text-sm ${selesai ? 'text-[#ffffff]' : 'text-[#09090b]/30'}`}>
                {iso.split('-')[2]}
              </span>
              <span className={`text-[9px] font-black ${selesai ? 'text-[#ffffff]' : 'text-transparent'}`}>✓</span>
            </div>
          );
        })}
      </div>

      {/* Milestone */}
      <div className="space-y-2">
        <span className="text-[11px] font-black uppercase text-[#09090b]/60 block tracking-wider flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5" /> MILESTONE TERCAPAI
        </span>
        {loading ? (
          <p className="text-[11px] text-[#09090b]/50">Memuat…</p>
        ) : milestones.length === 0 ? (
          <p className="text-[11px] text-[#09090b]/50 italic">
            Belum ada milestone. Stempel muncul otomatis saat kondisi terpenuhi (mis. tidur ≤ 22.00 selama 5 hari).
          </p>
        ) : (
          <div className="space-y-1.5">
            {milestones.map((m) => (
              <div
                key={m.id}
                className="neo-box-sm p-2 flex items-center gap-2 bg-[#ffffff]"
              >
                <span className="text-base">🏅</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#09090b] leading-tight">{m.label}</p>
                  <p className="text-[10px] font-mono text-[#09090b]/50">{m.achievedAt}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
