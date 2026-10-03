'use client';

import React from 'react';
import { Play, ChevronDown, ChevronUp } from 'lucide-react';
import type { NormalizedExercise } from '@/lib/schedule/parser';

interface ExerciseCardProps {
  exercise: NormalizedExercise;
  /** Tombol mulai Mode Workout. Opsional: sembunyikan saat latihan sudah selesai. */
  onStart?: () => void;
  /** Kompak = untuk chat (tidak menampilkan semua detail sekaligus). */
  compact?: boolean;
}

/**
 * T8.4 — Kartu latihan gaya manga-neubrutalism. Dipakai di chat AI alih-alih
 * teks polos, dan bisa dipakai ulang di tempat lain.
 */
export default function ExerciseCard({ exercise, onStart, compact = true }: ExerciseCardProps) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="neo-box bg-paper text-ink p-3 space-y-2 text-left w-full">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-ink/60 block">
            KARTU LATIHAN
          </span>
          <h4 className="text-sm font-black uppercase text-ink truncate">
            {exercise.nama}
          </h4>
        </div>
        {exercise.peralatan && (
          <span className="neo-box-sm bg-ink/5 text-ink px-1.5 py-0.5 text-[9px] font-black uppercase whitespace-nowrap">
            {exercise.peralatan}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="neo-box-sm bg-ink text-paper px-2 py-0.5 text-[10px] font-black font-mono">
          {exercise.tipe === 'durasi'
            ? `${exercise.durasiMinutes ?? ''} MENIT`
            : `${exercise.setCount} SET`}
        </span>
        {exercise.ototTarget && (
          <span className="neo-box-sm bg-ink/5 text-ink px-2 py-0.5 text-[10px] font-black uppercase">
            {exercise.ototTarget}
          </span>
        )}
      </div>

      {/* Cara singkat — selalu tampil, dikecualikan hanya baris pertama saat compact */}
      {exercise.cara.length > 0 && (
        <div className="space-y-1">
          {exercise.cara.slice(0, expanded ? undefined : 1).map((langkah, i) => (
            <p key={i} className="text-[11px] font-medium text-ink/80 leading-relaxed">
              <span className="font-black font-mono mr-1">{i + 1}.</span>
              {langkah}
            </p>
          ))}
          {compact && exercise.cara.length > 1 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-[10px] font-black uppercase text-ink/60 hover:text-ink"
            >
              {expanded ? (
                <>Tutup <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>{exercise.cara.length - 1} langkah lagi <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          )}
        </div>
      )}

      {expanded && (
        <div className="space-y-1.5 border-t-2 border-ink/15 pt-2">
          {exercise.tipsForm && (
            <p className="text-[11px] font-medium text-ink/80">
              <span className="font-black">Form:</span> {exercise.tipsForm}
            </p>
          )}
          {exercise.kesalahanUmum && (
            <p className="text-[11px] font-medium text-ink/80">
              <span className="font-black">Hindari:</span> {exercise.kesalahanUmum}
            </p>
          )}
          {exercise.versiMudah && (
            <p className="text-[11px] font-medium text-ink/80">
              <span className="font-black">Mudah:</span> {exercise.versiMudah}
            </p>
          )}
          {exercise.versiSulit && (
            <p className="text-[11px] font-medium text-ink/80">
              <span className="font-black">Sulit:</span> {exercise.versiSulit}
            </p>
          )}
        </div>
      )}

      {onStart && (
        <button
          type="button"
          onClick={onStart}
          className="neo-btn-black w-full py-2 text-[11px] font-black uppercase flex items-center justify-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5" /> Mulai Gerakan Ini
        </button>
      )}
    </div>
  );
}
