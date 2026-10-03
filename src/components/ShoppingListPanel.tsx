'use client';

import React, { useState, useMemo } from 'react';
import { ShoppingCart, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { buildShoppingList, getMealSlot, ALTERNATIF_MENU, type MealSlot } from '@/lib/meals/shoppingList';

interface ShoppingListPanelProps {
  polaMakanMingguan: { waktu: string; menu: string }[];
}

/**
 * T8.1 — Daftar belanja mingguan: agregasi bahan dari pola makan 7 hari,
 * dikelompokkan per kategori. Bisa dicentang manual (state lokal saja).
 */
export default function ShoppingListPanel({ polaMakanMingguan }: ShoppingListPanelProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState(false);

  const items = useMemo(() => buildShoppingList(polaMakanMingguan), [polaMakanMingguan]);

  if (items.length === 0) return null;

  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const arr = acc[item.kategori] ?? [];
    arr.push(item);
    acc[item.kategori] = arr;
    return acc;
  }, {});

  const selesaiCount = items.filter((i) => checked[`${i.kategori}-${i.bahan}`]).length;

  return (
    <div className="neo-box p-3.5 bg-paper space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
          <ShoppingCart className="w-4 h-4 text-ink" /> BELANJA MINGGUAN
        </h4>
        <span className="text-[10px] font-mono font-black text-ink/60">
          {selesaiCount}/{items.length} tercentang
        </span>
      </div>

      <p className="text-[11px] font-medium text-ink/60 leading-relaxed">
        Gabungan bahan dari pola makan 7 hari. Angka = berapa kali muncul sepekan.
      </p>

      <div className="space-y-2">
        {Object.entries(grouped).map(([kategori, list]) => (
          <div key={kategori} className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-ink/70 block">
              {kategori}
            </span>
            {list.map((item) => {
              const key = `${item.kategori}-${item.bahan}`;
              const isDone = !!checked[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setChecked((prev) => ({ ...prev, [key]: !prev[key] }))}
                  aria-pressed={isDone}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 border-2 transition-colors text-left ${
                    isDone
                      ? 'bg-ink/5 border-ink/20'
                      : 'bg-paper border-ink/30 hover:bg-ink/5'
                  }`}
                >
                  <span
                    className={`w-4 h-4 border-2 border-ink flex items-center justify-center shrink-0 text-[10px] font-black ${
                      isDone ? 'bg-ink text-paper' : 'bg-paper'
                    }`}
                    aria-hidden
                  >
                    {isDone ? '✓' : ''}
                  </span>
                  <span
                    className={`flex-1 text-[11px] font-bold capitalize ${
                      isDone ? 'line-through text-ink/50' : 'text-ink'
                    }`}
                  >
                    {item.bahan}
                  </span>
                  <span className="text-[10px] font-mono font-black text-ink/50 shrink-0">
                    {item.jumlahHari}×
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {selesaiCount === items.length && items.length > 0 && (
        <p className="text-[11px] font-black uppercase text-ink text-center pt-1">
          Semua terbelanja ✓
        </p>
      )}
    </div>
  );
}

/**
 * T8.1 — Panel alternatif menu per slot. Muncul sebagai section terpisah.
 */
export function AlternatifMenuPanel({
  polaMakanHari,
}: {
  polaMakanHari: { waktu: string; menu: string }[];
}) {
  const [open, setOpen] = useState(false);

  const slots = useMemo(() => {
    const map = new Map<MealSlot, { waktu: string; menu: string }[]>();
    for (const m of polaMakanHari) {
      const slot = getMealSlot(m.waktu);
      const arr = map.get(slot) ?? [];
      arr.push(m);
      map.set(slot, arr);
    }
    return map;
  }, [polaMakanHari]);

  if (slots.size === 0) return null;

  return (
    <div className="neo-box p-3.5 bg-paper space-y-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between"
        aria-expanded={open}
      >
        <h4 className="text-xs font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4 text-ink" /> ALTERNATIF MENU
        </h4>
        {open ? (
          <ChevronUp className="w-4 h-4 text-ink" />
        ) : (
          <ChevronDown className="w-4 h-4 text-ink" />
        )}
      </button>

      {open && (
        <div className="space-y-2.5">
          <p className="text-[11px] font-medium text-ink/60 leading-relaxed">
            Variasi per slot dengan kelompok bahan serupa — belanja tetap sama.
          </p>
          {Array.from(slots.entries()).map(([slot, meals]) => (
            <div key={slot} className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-ink/70 block">
                {slot.replace('_', ' ')} ({meals[0].waktu})
              </span>
              <div className="flex flex-col gap-1">
                {ALTERNATIF_MENU[slot].map((alt, i) => (
                  <p
                    key={i}
                    className="text-[11px] font-bold text-ink bg-ink/5 px-2 py-1 border border-ink/20"
                  >
                    {alt}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
