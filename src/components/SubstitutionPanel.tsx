'use client';

/**
 * T7.3 — Kartu usulan substitusi jadwal + tombol cepat.
 *
 * design.md 13.1:
 * - Panel biasa (garis 3px, bayangan keras), BUKAN modal melayang dengan blur.
 * - Tombol "TERIMA" solid hitam, "TOLAK" outline — sama besar, tidak menekan
 *   pengguna ke satu pilihan.
 * - Tidak ada auto-apply. ScheduleOverride hanya ditulis setelah "Terima".
 * - Kasus cedera akut: kartu INI tidak muncul (lihat AcuteInjuryNotice).
 */

import React from 'react';
import { X } from 'lucide-react';
import { QUICK_BUTTONS, SUBSTITUTION_RULES, type SubstituteReason, type Workout } from '@/lib/schedule/substitutions';

interface Proposal {
  reason: Exclude<SubstituteReason, 'lainnya'>;
  original: Workout | null;
  replacement: Workout;
}

interface SubstitutionPanelProps {
  proposal: Proposal | null;
  onAccept: () => void;
  onReject: () => void;
}

export function SubstitutionPanel({ proposal, onAccept, onReject }: SubstitutionPanelProps) {
  if (!proposal) return null;
  const rule = SUBSTITUTION_RULES[proposal.reason];
  const origNama = proposal.original?.nama ?? 'Istirahat';
  const newNama = proposal.replacement?.nama ?? 'Full Rest';

  return (
    <section
      className="neo-box bg-paper p-4 space-y-3 border-[3px]"
      role="dialog"
      aria-label="Usulan ganti jadwal"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wider text-ink">
          {rule.emoji} USUL GANTI
        </span>
        <button
          onClick={onReject}
          aria-label="Tutup usulan"
          className="neo-box-sm bg-paper p-1 hover:bg-ink/10 active:translate-x-0.5 active:translate-y-0.5 transition-all"
        >
          <X className="w-4 h-4 text-ink" />
        </button>
      </div>

      <p className="text-xs font-bold text-ink/80 leading-relaxed">
        Alasan: {rule.label} — {rule.deskripsi}
      </p>

      <div className="flex items-center gap-2 text-center">
        <div className="flex-1 border-2 border-dashed border-ink/40 p-2.5">
          <span className="text-[10px] font-black uppercase text-ink/60 block">ASLI</span>
          <span className="text-sm font-black text-ink/60 line-through">{origNama}</span>
        </div>
        <span className="text-lg font-black text-ink">→</span>
        <div className="flex-1 border-2 border-ink bg-ink/5 p-2.5">
          <span className="text-[10px] font-black uppercase text-ink block">PENGGANTI</span>
          <span className="text-sm font-black text-ink">{newNama}</span>
        </div>
      </div>

      {proposal.replacement?.latihan && proposal.replacement.latihan.length > 0 && (
        <ul className="text-[11px] font-bold text-ink/80 space-y-0.5 pl-3">
          {proposal.replacement.latihan.slice(0, 5).map((it, i) => (
            <li key={i} className="list-disc">{it.latihan}</li>
          ))}
        </ul>
      )}

      <div className="flex gap-2.5">
        <button
          onClick={onReject}
          className="flex-1 neo-box bg-paper text-ink py-2.5 text-xs font-black uppercase tracking-wide hover:bg-ink/5 active:translate-x-0.5 active:translate-y-0.5 transition-all"
        >
          TOLAK
        </button>
        <button
          onClick={onAccept}
          className="flex-1 bg-ink text-paper py-2.5 text-xs font-black uppercase tracking-wide border-[3px] border-ink active:translate-x-0.5 active:translate-y-0.5 transition-all"
        >
          TERIMA
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tombol cepat (di layar Hari Ini, dekat panel "sekarang")
// ---------------------------------------------------------------------------

interface QuickButtonsProps {
  /** Sembunyikan jika hari libur / tidak ada workout. */
  hidden?: boolean;
  onSelect: (reason: SubstituteReason) => void;
}

export function SubstitutionQuickButtons({ hidden, onSelect }: QuickButtonsProps) {
  if (hidden) return null;
  return (
    <section className="space-y-2" aria-label="Ganti latihan hari ini">
      <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
        Tidak bisa latihan hari ini?
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_BUTTONS.map((b) => (
          <button
            key={b.reason}
            onClick={() => onSelect(b.reason)}
            className="neo-box bg-paper p-2.5 text-left active:translate-x-0.5 active:translate-y-0.5 transition-all hover:bg-ink/5"
          >
            <span className="text-base block leading-none mb-0.5">{b.emoji}</span>
            <span className="text-[11px] font-black uppercase text-ink">{b.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Kasus cedera akut — kartu usulan TIDAK muncul (DATA_SCHEMA.md 7.5)
// ---------------------------------------------------------------------------

export function AcuteInjuryNotice() {
  return (
    <section className="neo-box bg-paper p-4 space-y-2 border-[3px]">
      <span className="text-xs font-black uppercase tracking-wider text-ink">🩹 TERLIHAT SERIUS</span>
      <p className="text-xs font-bold text-ink/80 leading-relaxed">
        Gejalanya terdengar seperti cedera akut, bukan pegal biasa. Aplikasi tidak
        akan menawarkan pengganti latihan apa pun sekarang.
      </p>
      <p className="text-xs font-bold text-ink">
        Istirahat total untuk bagian tubuh itu. Bila nyeri tidak reda, bengkak,
        atau tidak bisa ditumpangi — bicaralah dengan ortu/wali dan periksa ke
        tenaga kesehatan. Jangan ditunda.
      </p>
    </section>
  );
}
