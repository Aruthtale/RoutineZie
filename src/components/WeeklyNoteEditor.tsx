'use client';

import React, { useState, useEffect } from 'react';
import { RoutineRepository } from '@/lib/db/repository';
import { getWeekStart, getWeekLabel } from '@/lib/progress/weeklyStats';
import { NotebookPen } from 'lucide-react';
import { InkStamp } from './icons/InkIcons';

/**
 * T8.2b — Catatan mingguan untuk konteks grafik berat. Editor inline:
 * ketik → simpan; kosongkan → hapus. Tidak ada penilaian, hanya konteks.
 */
export default function WeeklyNoteEditor({ dateISO }: { dateISO: string }) {
  const weekStart = getWeekStart(dateISO);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    RoutineRepository.getWeeklyNote(weekStart).then((wn) => {
      if (!active) return;
      setNote(wn?.note ?? '');
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [weekStart]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await RoutineRepository.setWeeklyNote(weekStart, note);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (!loaded) return null;

  return (
    <form onSubmit={handleSave} className="neo-box p-3 bg-[#ffffff] space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-wider text-[#09090b]/70 flex items-center gap-1.5">
          <NotebookPen className="w-3.5 h-3.5" /> CATATAN MINGGUAN
        </span>
        <span className="text-[10px] font-mono font-bold text-[#09090b]/50 uppercase">
          {getWeekLabel(weekStart)}
        </span>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Contoh: minggu ujian, tidur kurang; atau habis banyak latihan…"
        rows={2}
        className="neo-box-sm w-full p-2 text-xs font-medium bg-[#ffffff] text-[#09090b] resize-none"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-[#09090b]/50 font-medium">
          Konteks untuk grafik — bukan penilaian.
        </span>
        <button
          type="submit"
          className="neo-btn bg-[#09090b] text-[#ffffff] px-3 py-1.5 text-[11px] font-black uppercase flex items-center gap-1.5"
        >
          {saved ? (
            <>
              <InkStamp className="w-3 h-3" /> TERSIMPAN
            </>
          ) : (
            'SIMPAN'
          )}
        </button>
      </div>
    </form>
  );
}
