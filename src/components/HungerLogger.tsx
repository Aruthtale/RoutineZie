'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sandwich, Send, X } from 'lucide-react';
import { RoutineRepository, HungerLog } from '@/lib/db/repository';

interface HungerLoggerProps {
  dateISO: string;
}

/**
 * T8.1 — Log cepat "kalau lapar". Tanpa penilaian: tidak ada angka kalori,
 * tidak ada peringatan. Hanya catatan apa yang dimakan + jamnya.
 */
export default function HungerLogger({ dateISO }: HungerLoggerProps) {
  const [logs, setLogs] = useState<HungerLog[]>([]);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const list = await RoutineRepository.getHungerLogsByDate(dateISO);
      setLogs(list);
    } catch (e) {
      console.warn('Gagal memuat log lapar:', e);
    } finally {
      setLoading(false);
    }
  }, [dateISO]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    await RoutineRepository.addHungerLog(dateISO, text);
    await load();
  };

  return (
    <div className="neo-box p-3.5 bg-[#ffffff] space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase tracking-wider text-[#09090b] flex items-center gap-1.5">
          <Sandwich className="w-4 h-4 text-[#09090b]" /> LOG CEPAT
        </h4>
        <span className="text-[10px] font-bold uppercase text-[#09090b]/60">
          Kalau lapar
        </span>
      </div>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="neo-btn-sm w-full bg-[#09090b]/5 border-dashed text-[#09090b] py-2.5 text-[11px] font-black uppercase hover:bg-[#09090b]/10"
        >
          + Catat Yang Dimakan
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Mis. roti + telur rebus"
            className="flex-1 neo-box-sm px-3 py-2 text-xs font-medium bg-[#ffffff] focus:outline-none focus:border-[#09090b]"
            autoFocus
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="neo-btn-black px-4 py-2 text-[11px] font-black uppercase disabled:opacity-50 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setInput('');
            }}
            aria-label="Tutup"
            className="neo-btn-sm bg-[#ffffff] text-[#09090b] px-2 py-2 disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {logs.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t-2 border-[#09090b]/15">
          {logs.map((log) => (
            <div key={log.id} className="flex items-baseline gap-2 text-[11px]">
              <span className="font-mono font-black text-[#09090b]/60 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="font-medium text-[#09090b]/80">{log.note}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
