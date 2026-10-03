'use client';

import React, { useState, useEffect } from 'react';
import { RoutineRepository } from '@/lib/db/repository';
import { ScheduleOverride } from '@/lib/schedule/substitutions';
import { getWeekDates, getWeekStart, getWeekLabel, computeSleepWeekStats } from '@/lib/progress/weeklyStats';
import { Lightbulb, Download, RefreshCw } from 'lucide-react';
import { localDateISO } from '@/lib/date';

/**
 * T8.2f — Pola alasan substitusi (override) + ekspor ringkasan mingguan.
 * Pola alasan membantu pengguna melihat tren (mis. "capek_kurang_tidur
 * muncul 3x minggu ini") tanpa penilaian.
 */

const REASON_LABELS: Record<string, string> = {
  sakit_kaki_lutut: 'Sakit kaki/lutut',
  sakit_tangan_bahu: 'Sakit tangan/bahu',
  capek_kurang_tidur: 'Capek / kurang tidur',
  sakit_demam: 'Sakit / demam',
  cuaca_hujan: 'Cuaca hujan',
  lainnya: 'Lainnya',
};

export default function InsightsPanel() {
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [busy, setBusy] = useState(false);

  const todayISO = localDateISO();
  const todayWeekStart = getWeekStart(todayISO);
  const [y, m, d] = todayWeekStart.split('-').map(Number);
  const shifted = new Date(y, m - 1, d + weekOffset * 7);
  const weekStart = getWeekStart(
    `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}-${String(
      shifted.getDate()
    ).padStart(2, '0')}`
  );
  const weekDates = getWeekDates(weekStart);

  const loadData = async () => {
    setOverrides(await RoutineRepository.listOverrides());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Hitung pola alasan untuk minggu yang dipilih.
  const setMinggu = new Set(weekDates);
  const overrideMinggu = overrides.filter((o) => setMinggu.has(o.dateISO));
  const hitung: Record<string, number> = {};
  for (const o of overrideMinggu) {
    hitung[o.reason] = (hitung[o.reason] ?? 0) + 1;
  }
  const pola = Object.entries(hitung).sort((a, b) => b[1] - a[1]);

  const handleExport = async () => {
    setBusy(true);
    try {
      const ringkasan = await buildWeeklySummary(weekStart, weekDates);
      const blob = new Blob([ringkasan], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ringkasan-mingguan_${weekStart}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b-2 border-ink pb-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4" /> WAWASAN MINGGUAN
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWeekOffset((v) => v - 1)}
            className="neo-btn bg-paper text-ink px-2 py-1 text-[11px] font-black"
          >
            ←
          </button>
          <span className="text-[10px] font-mono font-black uppercase text-ink/60">
            {weekOffset === 0 ? 'MINGGU INI' : `${weekOffset} MGG LALU`}
          </span>
          <button
            onClick={() => setWeekOffset((v) => Math.min(0, v + 1))}
            className="neo-btn bg-paper text-ink px-2 py-1 text-[11px] font-black"
            disabled={weekOffset >= 0}
          >
            →
          </button>
        </div>
      </div>

      <p className="text-[10px] font-mono font-bold text-ink/50 uppercase">
        {getWeekLabel(weekStart)}
      </p>

      {/* Pola alasan substitusi */}
      <div className="neo-box p-3 bg-paper space-y-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-ink/70 block">
          POLA ALASAN SUBSTITUSI
        </span>
        {pola.length === 0 ? (
          <p className="text-[11px] text-ink/60 italic">
            Tidak ada substitusi minggu ini — bagus, semua sesi sesuai jadwal.
          </p>
        ) : (
          <div className="space-y-1.5">
            {pola.map(([reason, jumlah]) => (
              <div key={reason} className="flex items-center justify-between text-xs">
                <span className="font-bold text-ink">
                  {REASON_LABELS[reason] ?? reason}
                </span>
                <span className="font-mono font-black text-ink bg-ink/5 px-1.5 py-0.5">
                  {jumlah}x
                </span>
              </div>
            ))}
          </div>
        )}
        {overrideMinggu.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-ink/10">
            {overrideMinggu.map((o) => (
              <div key={o.id} className="flex items-center gap-2 text-[10px]">
                <span className="font-mono font-bold text-ink/60">{o.dateISO}</span>
                <span className="text-ink/70">
                  {REASON_LABELS[o.reason] ?? o.reason}
                  {o.note ? ` — ${o.note}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ekspor ringkasan mingguan */}
      <button
        onClick={handleExport}
        disabled={busy}
        className="neo-btn w-full bg-ink text-paper py-2.5 text-xs font-black uppercase flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        {busy ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> MENYIAPKAN…
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5" /> EKSPOR RINGKASAN MINGGUAN (.MD)
          </>
        )}
      </button>
    </div>
  );
}

/**
 * Susun ringkasan mingguan sebagai Markdown. Diambil dari semua sumber
 * data yang ada (tidak mengarang jika data kosong).
 */
async function buildWeeklySummary(weekStart: string, weekDates: string[]): Promise<string> {
  const setMinggu = new Set(weekDates);
  const [workouts, sleeps, weights, overrides, notes, tests] = await Promise.all([
    RoutineRepository.getWorkoutLogs(),
    RoutineRepository.getSleepLogs(),
    RoutineRepository.getWeightLogs(),
    RoutineRepository.listOverrides(),
    RoutineRepository.getAllWeeklyNotes(),
    RoutineRepository.getAbilityTests(3),
  ]);

  const wMinggu = workouts.filter((w) => setMinggu.has(w.dateISO));
  const sMinggu = sleeps.filter((s) => setMinggu.has(s.dateISO));
  const bMinggu = weights.filter((w) => setMinggu.has(w.dateISO));
  const oMinggu = overrides.filter((o) => setMinggu.has(o.dateISO));
  const catatan = notes.find((n) => n.weekStartISO === weekStart);
  const sleepWeek = computeSleepWeekStats(sMinggu, weekDates);

  const baris: string[] = [];
  baris.push(`# Ringkasan Mingguan — ${getWeekLabel(weekStart)}`);
  baris.push('');
  baris.push(`Periode: ${weekDates[0]} s/d ${weekDates[6]}`);
  baris.push('');

  baris.push('## Latihan');
  baris.push(`- Sesi tercatat: ${wMinggu.length}`);
  if (wMinggu.length > 0) {
    baris.push('- Hari:');
    for (const w of wMinggu) {
      baris.push(`  - ${w.dateISO}: ${w.workoutNama} (${w.hari})`);
    }
  }
  baris.push('');

  baris.push('## Tidur');
  baris.push(`- Hari tercatat: ${sleepWeek.jumlahHari}`);
  baris.push(`- Tidur ≤ 22.00: ${sleepWeek.hariSebelum22} hari (${sleepWeek.persenSebelum22}%)`);
  if (sleepWeek.rataKualitas > 0) {
    baris.push(`- Rata-rata kualitas: ${sleepWeek.rataKualitas}/5`);
  }
  if (sleepWeek.jumlahHari > 0) {
    baris.push(`- Skor tidur mingguan: ${sleepWeek.skor}/100`);
  }
  baris.push('');

  baris.push('## Berat Badan');
  if (bMinggu.length === 0) {
    baris.push('- Tidak ada timbangan minggu ini.');
  } else {
    for (const b of bMinggu) {
      baris.push(`- ${b.dateISO}: ${b.kg} kg${b.note ? ` (${b.note})` : ''}`);
    }
  }
  baris.push('');

  baris.push('## Substitusi');
  if (oMinggu.length === 0) {
    baris.push('- Tidak ada substitusi.');
  } else {
    for (const o of oMinggu) {
      baris.push(`- ${o.dateISO}: ${o.reason}${o.note ? ` — ${o.note}` : ''}`);
    }
  }
  baris.push('');

  if (catatan) {
    baris.push('## Catatan Mingguan');
    baris.push(catatan.note);
    baris.push('');
  }

  if (tests.length > 0) {
    baris.push('## Tes Kemampuan Terbaru');
    const t = tests[0];
    baris.push(`- ${t.dateISO} (${t.cycle === '4-week' ? 'siklus 4 minggu' : 'siklus 8 minggu'}):`);
    for (const r of t.results) {
      baris.push(`  - ${r.nama}: ${r.nilai} ${r.satuan}`);
    }
    if (t.note) baris.push(`- Catatan: ${t.note}`);
    baris.push('');
  }

  baris.push('---');
  baris.push('Dibuat oleh Cloverz. Data berasal dari catatan kamu sendiri.');
  return baris.join('\n');
}
