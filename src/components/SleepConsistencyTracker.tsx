'use client';

import React, { useState, useEffect } from 'react';
import { RoutineRepository } from '@/lib/db/repository';
import { SleepLog, WorkoutLog } from '@/lib/db';
import { computeSleepWeekStats, getWeekDates, getWeekStart, getWeekLabel } from '@/lib/progress/weeklyStats';
import { InkSleep, InkStamp, InkSchedule } from './icons/InkIcons';
import { Plus, Clock, CheckCircle2 } from 'lucide-react';
import { localDateISO } from '@/lib/date';

export default function SleepConsistencyTracker() {
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [inputDate, setInputDate] = useState(() => localDateISO());
  const [inputSleepTime, setInputSleepTime] = useState('21:30');
  const [inputWakeTime, setInputWakeTime] = useState('04:45');
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(4);

  const loadData = async () => {
    try {
      const [sLogs, wLogs] = await Promise.all([
        RoutineRepository.getSleepLogs(),
        RoutineRepository.getWorkoutLogs(),
      ]);
      setSleepLogs(sLogs);
      setWorkoutLogs(wLogs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSleep = async (e: React.FormEvent) => {
    e.preventDefault();
    await RoutineRepository.saveSleepLog(inputDate, inputSleepTime, inputWakeTime, rating);
    await loadData();
  };

  // Calculate Sleep Stats (<= 22:00)
  const now = new Date();
  const getDaysAgoISO = (days: number) => {
    const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return localDateISO(d);
  };

  const iso7DaysAgo = getDaysAgoISO(7);
  const iso30DaysAgo = getDaysAgoISO(30);

  const last7Logs = sleepLogs.filter((s) => s.dateISO >= iso7DaysAgo);
  const last30Logs = sleepLogs.filter((s) => s.dateISO >= iso30DaysAgo);

  const passed7 = last7Logs.filter((s) => s.sleptBefore22).length;
  const pct7 = last7Logs.length > 0 ? Math.round((passed7 / last7Logs.length) * 100) : null;

  const passed30 = last30Logs.filter((s) => s.sleptBefore22).length;
  const pct30 = last30Logs.length > 0 ? Math.round((passed30 / last30Logs.length) * 100) : null;

  // Weekly Workout Consistency (Current 7 days)
  const currentWeekWorkouts = workoutLogs.filter((w) => w.dateISO >= iso7DaysAgo);
  const uniqueWorkoutDays = new Set(currentWeekWorkouts.map((w) => w.dateISO)).size;

  // T8.2e — Skor tidur mingguan (Senin–Minggu minggu berjalan).
  const weekStartISO = getWeekStart(inputDate);
  const mingguBerjalan = getWeekDates(weekStartISO);
  const sleepWeek = computeSleepWeekStats(sleepLogs, mingguBerjalan);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-ink pb-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
          <InkSleep className="w-4 h-4 text-ink" /> LOG TIDUR & KONSISTENSI
        </h3>
        <span className="text-[11px] font-black uppercase text-ink/60 bg-ink/5 px-2 py-0.5 neo-box-sm">
          TARGET ≤ 22.00
        </span>
      </div>

      {/* Consistency Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="neo-box p-3 bg-paper space-y-1">
          <span className="text-[11px] font-black uppercase text-ink/60 block tracking-wider">
            TIDUR ≤ 22.00 (7 HARI)
          </span>
          <div className="text-xl font-mono font-black text-ink">
            {pct7 !== null ? `${pct7}%` : '—'}
          </div>
          <p className="text-[11px] font-bold text-ink/70">
            {last7Logs.length > 0 ? `${passed7} dari ${last7Logs.length} malam tercatat` : 'Belum ada data'}
          </p>
        </div>

        <div className="neo-box p-3 bg-paper space-y-1">
          <span className="text-[11px] font-black uppercase text-ink/60 block tracking-wider">
            TIDUR ≤ 22.00 (30 HARI)
          </span>
          <div className="text-xl font-mono font-black text-ink">
            {pct30 !== null ? `${pct30}%` : '—'}
          </div>
          <p className="text-[11px] font-bold text-ink/70">
            {last30Logs.length > 0 ? `${passed30} dari ${last30Logs.length} malam tercatat` : 'Belum ada data'}
          </p>
        </div>
      </div>

      {/* T8.2e — Skor tidur mingguan */}
      <div className="neo-box p-3.5 bg-paper space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-ink/70 flex items-center gap-1">
            <InkSleep className="w-3.5 h-3.5" /> SKOR TIDUR MINGGUAN
          </span>
          <span className="text-[10px] font-mono font-bold text-ink/50 uppercase">
            {getWeekLabel(weekStartISO)}
          </span>
        </div>
        {sleepWeek.jumlahHari === 0 ? (
          <p className="text-[11px] text-ink/60 italic">
            Belum ada catatan tidur minggu ini.
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-black text-ink">
                {sleepWeek.skor}
              </span>
              <span className="text-[11px] font-black text-ink/60">/ 100</span>
            </div>
            <div className="w-full bg-ink/10 h-2 border border-ink overflow-hidden">
              <div
                className="bg-ink h-full transition-all duration-300"
                style={{ width: `${sleepWeek.skor}%` }}
              />
            </div>
            <p className="text-[11px] text-ink/70 font-medium">
              {sleepWeek.hariSebelum22} dari {sleepWeek.jumlahHari} malam tercatat tidur ≤ 22.00
              {sleepWeek.rataKualitas > 0
                ? ` · rata-rata kualitas ${sleepWeek.rataKualitas}/5`
                : ''}
              .
            </p>
          </>
        )}
      </div>

      {/* Weekly Workout Consistency Banner (Neutral, no penalty streak) */}
      <div className="neo-box p-3.5 bg-paper space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-ink/70 flex items-center gap-1">
            <InkStamp className="w-3.5 h-3.5 text-ink" /> KONSISTENSI LATIHAN (7 HARI TERAKHIR)
          </span>
          <span className="text-xs font-mono font-black text-ink">
            {uniqueWorkoutDays} / 6 SESI
          </span>
        </div>
        <div className="w-full bg-ink/10 h-2 border border-ink overflow-hidden">
          <div
            className="bg-ink h-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.round((uniqueWorkoutDays / 6) * 100))}%` }}
          />
        </div>
        <p className="text-[11px] text-ink/70 font-medium">
          {uniqueWorkoutDays} dari 6 target sesi latihan mingguan telah diselesaikan.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSaveSleep} className="neo-box p-3.5 bg-paper space-y-3">
        <span className="text-xs font-black uppercase tracking-wider block text-ink">
          CATAT JADWAL TIDUR
        </span>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[11px] font-bold text-ink/70 block mb-1">TANGGAL</label>
            <input
              type="date"
              value={inputDate}
              onChange={(e) => setInputDate(e.target.value)}
              className="neo-box-sm w-full p-2 text-xs font-mono font-bold bg-paper text-ink"
              required
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-ink/70 block mb-1">JAM TIDUR</label>
            <input
              type="time"
              value={inputSleepTime}
              onChange={(e) => setInputSleepTime(e.target.value)}
              className="neo-box-sm w-full p-2 text-xs font-mono font-bold bg-paper text-ink"
              required
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-ink/70 block mb-1">JAM BANGUN</label>
            <input
              type="time"
              value={inputWakeTime}
              onChange={(e) => setInputWakeTime(e.target.value)}
              className="neo-box-sm w-full p-2 text-xs font-mono font-bold bg-paper text-ink"
              required
            />
          </div>
        </div>

        {/* Quality Rating */}
        <div>
          <label className="text-[11px] font-bold text-ink/70 block mb-1">
            KUALITAS ISTIRAHAT (1-5)
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setRating(val as any)}
                className={`neo-box-sm flex-1 min-h-[44px] py-2 text-xs font-mono font-black ${
                  rating === val
                    ? 'bg-ink text-paper'
                    : 'bg-paper text-ink hover:bg-ink/5'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="neo-btn w-full bg-ink text-paper py-2 text-xs font-black uppercase flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> SIMPAN LOG TIDUR
        </button>
      </form>

      {/* Recent Sleep Logs */}
      {sleepLogs.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-black uppercase text-ink/60 block tracking-wider">
            RIWAYAT TIDUR TERAKHIR
          </span>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {sleepLogs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="neo-box-sm p-2 flex items-center justify-between text-xs bg-paper"
              >
                <div className="flex items-center gap-2">
                  <InkSchedule className="w-3.5 h-3.5 text-ink/50" />
                  <span className="font-mono font-bold text-ink">{log.dateISO}</span>
                  <span className="text-[11px] font-mono text-ink/70">
                    {log.sleptAt} - {log.wokeAt}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {log.sleptBefore22 ? (
                    <span className="neo-box-sm bg-ink text-paper px-1.5 py-0.5 text-[11px] font-mono font-black">
                      ≤ 22.00
                    </span>
                  ) : (
                    <span className="neo-box-sm bg-ink/10 text-ink px-1.5 py-0.5 text-[11px] font-mono font-bold">
                      &gt; 22.00
                    </span>
                  )}
                  {log.qualityRating && (
                    <span className="text-[11px] font-mono font-black text-ink">
                      ★{log.qualityRating}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
