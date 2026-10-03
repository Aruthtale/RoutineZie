'use client';

import React, { useState, useEffect } from 'react';
import { RoutineRepository } from '@/lib/db/repository';
import { Utensils, CheckSquare, Square, Info } from 'lucide-react';

interface MealItem {
  waktu: string;
  menu: string;
  tujuan: string;
  rincian_porsi: string;
  estimasi_kalori_kkal?: { min: number; maks: number };
  estimasi_protein_g?: { min: number; maks: number };
}

interface MealChecklistProps {
  dateISO: string;
  polaMakan: MealItem[];
}

export default function MealChecklist({ dateISO, polaMakan }: MealChecklistProps) {
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadChecks() {
      try {
        const list = await RoutineRepository.getMealChecksByDate(dateISO);
        const map: Record<string, boolean> = {};
        list.forEach((item) => {
          map[item.waktu] = item.done;
        });
        if (isMounted) {
          setCheckedMap(map);
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    }
    loadChecks();
    return () => {
      isMounted = false;
    };
  }, [dateISO]);

  const handleToggle = async (meal: MealItem) => {
    // Optimistic UI update
    const current = !!checkedMap[meal.waktu];
    setCheckedMap((prev) => ({ ...prev, [meal.waktu]: !current }));

    try {
      await RoutineRepository.toggleMealCheck(dateISO, meal.waktu, meal.menu);
    } catch {
      // Revert if error
      setCheckedMap((prev) => ({ ...prev, [meal.waktu]: current }));
    }
  };

  if (!polaMakan || polaMakan.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
          <Utensils className="w-4 h-4 text-ink" /> POLA MAKAN HARI INI
        </h3>
        <span className="text-[11px] font-black uppercase text-ink/60 bg-ink/5 px-2 py-0.5 neo-box-sm">
          INFO ESTIMASI
        </span>
      </div>

      <div className="space-y-2.5">
        {polaMakan.map((meal, idx) => {
          const isDone = !!checkedMap[meal.waktu];
          return (
            <div
              key={idx}
              onClick={() => handleToggle(meal)}
              className={`neo-box p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                isDone ? 'bg-ink/5 border-ink' : 'bg-paper hover:bg-ink/5'
              }`}
            >
              <div className="mt-0.5 shrink-0 text-ink">
                {isDone ? (
                  <CheckSquare className="w-5 h-5 text-ink" />
                ) : (
                  <Square className="w-5 h-5 text-ink" />
                )}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="neo-box-sm bg-ink text-paper px-2 py-0.5 text-[11px] font-mono font-black">
                    {meal.waktu}
                  </span>
                  <span className="text-[11px] font-bold text-ink/60 uppercase">
                    {meal.tujuan}
                  </span>
                </div>

                <h4
                  className={`text-sm font-black uppercase text-ink leading-tight ${
                    isDone ? 'line-through text-ink/60' : ''
                  }`}
                >
                  {meal.menu}
                </h4>

                {meal.rincian_porsi && (
                  <p className="text-xs text-ink/80 font-medium leading-relaxed">
                    {meal.rincian_porsi}
                  </p>
                )}

                {(meal.estimasi_kalori_kkal || meal.estimasi_protein_g) && (
                  <div className="pt-1 flex flex-wrap gap-2 text-[11px] font-bold text-ink/70">
                    {meal.estimasi_kalori_kkal && (
                      <span className="bg-ink/5 px-1.5 py-0.5 border border-ink/30">
                        ± {meal.estimasi_kalori_kkal.min} - {meal.estimasi_kalori_kkal.maks} kkal
                      </span>
                    )}
                    {meal.estimasi_protein_g && (
                      <span className="bg-ink/5 px-1.5 py-0.5 border border-ink/30">
                        Protein: {meal.estimasi_protein_g.min} - {meal.estimasi_protein_g.maks}g
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
