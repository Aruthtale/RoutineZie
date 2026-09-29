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
    <div className="neo-box p-3.5 bg-[#ffffff] space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase tracking-wider text-[#09090b] flex items-center gap-1.5">
          <ShoppingCart className="w-4 h-4 text-[#09090b]" /> BELANJA MINGGUAN
        </h4>
        <span className="text-[10px] font-mono font-black text-[#09090b]/60">
          {selesaiCount}/{items.length} tercentang
        </span>
      </div>

      <p className="text-[11px] font-medium text-[#09090b]/60 leading-relaxed">
        Gabungan bahan dari pola makan 7 hari. Angka = berapa kali muncul sepekan.
      </p>

      <div className="space-y-2">
        {Object.entries(grouped).map(([kategori, list]) => (
          <div key={kategori} className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#09090b]/70 block">
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
                      ? 'bg-[#09090b]/5 border-[#09090b]/20'
                      : 'bg-[#ffffff] border-[#09090b]/30 hover:bg-[#09090b]/5'
                  }`}
                >
                  <span
                    className={`w-4 h-4 border-2 border-[#09090b] flex items-center justify-center shrink-0 text-[10px] font-black ${
                      isDone ? 'bg-[#09090b] text-[#ffffff]' : 'bg-[#ffffff]'
                    }`}
                    aria-hidden
                  >
                    {isDone ? '✓' : ''}
                  </span>
                  <span
                    className={`flex-1 text-[11px] font-bold capitalize ${
                      isDone ? 'line-through text-[#09090b]/50' : 'text-[#09090b]'
                    }`}
                  >
                    {item.bahan}
                  </span>
                  <span className="text-[10px] font-mono font-black text-[#09090b]/50 shrink-0">
                    {item.jumlahHari}×
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {selesaiCount === items.length && items.length > 0 && (
        <p className="text-[11px] font-black uppercase text-[#09090b] text-center pt-1">
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
    <div className="neo-box p-3.5 bg-[#ffffff] space-y-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between"
        aria-expanded={open}
      >
        <h4 className="text-xs font-black uppercase tracking-wider text-[#09090b] flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4 text-[#09090b]" /> ALTERNATIF MENU
        </h4>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[#09090b]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#09090b]" />
        )}
      </button>

      {open && (
        <div className="space-y-2.5">
          <p className="text-[11px] font-medium text-[#09090b]/60 leading-relaxed">
            Variasi per slot dengan kelompok bahan serupa — belanja tetap sama.
          </p>
          {Array.from(slots.entries()).map(([slot, meals]) => (
            <div key={slot} className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#09090b]/70 block">
                {slot.replace('_', ' ')} ({meals[0].waktu})
              </span>
              <div className="flex flex-col gap-1">
                {ALTERNATIF_MENU[slot].map((alt, i) => (
                  <p
                    key={i}
                    className="text-[11px] font-bold text-[#09090b] bg-[#09090b]/5 px-2 py-1 border border-[#09090b]/20"
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
