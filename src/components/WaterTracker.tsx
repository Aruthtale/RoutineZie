'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Droplets, Plus, Minus } from 'lucide-react';
import { RoutineRepository } from '@/lib/db/repository';

interface WaterTrackerProps {
  dateISO: string;
  /** Target gelas per hari (dari info nutrisi). Default 8. */
  targetGelas?: number;
}

/**
 * T8.1 — Pelacak air minum. Tally gelas, bukan angka presisi (agent.md:
 * tidak ada ml presisi yang membuat pengguna merasa gagal).
 */
export default function WaterTracker({ dateISO, targetGelas = 8 }: WaterTrackerProps) {
  const [glasses, setGlasses] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const log = await RoutineRepository.getWaterLog(dateISO);
      setGlasses(log?.glasses ?? 0);
    } catch (e) {
      console.warn('Gagal memuat tally air:', e);
    } finally {
      setLoading(false);
    }
  }, [dateISO]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const handleAdd = async (delta: number) => {
    const next = Math.max(0, glasses + delta);
    setGlasses(next);
    try {
      await RoutineRepository.setWaterGlasses(dateISO, next);
    } catch (e) {
      console.warn('Gagal menyimpan tally air:', e);
      setGlasses(glasses);
    }
  };

  const persen = Math.min(100, Math.round((glasses / targetGelas) * 100));

  if (loading) {
    return (
      <div className="neo-box p-3.5 bg-[#ffffff]">
        <p className="text-xs font-bold text-[#09090b]/60">Memuat tally air…</p>
      </div>
    );
  }

  return (
    <div className="neo-box p-3.5 bg-[#ffffff] space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase tracking-wider text-[#09090b] flex items-center gap-1.5">
          <Droplets className="w-4 h-4 text-[#09090b]" /> AIR HARI INI
        </h4>
        <span className="font-mono text-sm font-black text-[#09090b]">
          {glasses} / {targetGelas} gelas
        </span>
      </div>

      {/* Tally kotak gaya tinta */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tally gelas air">
        {Array.from({ length: targetGelas }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleAdd(i < glasses ? -(glasses - i) : i - glasses + 1)}
            aria-label={`Tandai ${i + 1} gelas`}
            aria-pressed={i < glasses}
            className={`w-9 h-9 neo-box-sm flex items-center justify-center text-xs font-black transition-colors ${
              i < glasses
                ? 'bg-[#09090b] text-[#ffffff]'
                : 'bg-[#ffffff] text-[#09090b]/40 hover:bg-[#09090b]/5'
            }`}
          >
            {i < glasses ? '✓' : ''}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-2.5 bg-[#09090b]/10 border border-[#09090b]/30 overflow-hidden">
          <div
            className="h-full bg-[#09090b] transition-all"
            style={{ width: `${persen}%` }}
            aria-hidden
          />
        </div>
        <span className="text-[10px] font-mono font-black text-[#09090b]/70 w-9 text-right">
          {persen}%
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleAdd(-1)}
          disabled={glasses === 0}
          className="neo-btn-sm flex-1 bg-[#ffffff] text-[#09090b] py-2 text-[11px] font-black uppercase flex items-center justify-center gap-1.5 disabled:opacity-40"
        >
          <Minus className="w-3.5 h-3.5" /> 1 Gelas
        </button>
        <button
          type="button"
          onClick={() => handleAdd(1)}
          className="neo-btn-black flex-1 py-2 text-[11px] font-black uppercase flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> 1 Gelas
        </button>
      </div>
    </div>
  );
}
