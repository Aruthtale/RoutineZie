'use client';

import { useEffect, useState } from 'react';
import { getDayPhase, type DayPhase } from '@/lib/schedule/parser';

/**
 * useDayPhase — menentukan fase visual hari (design.md §5) dan memasangnya
 * sebagai atribut `data-phase` pada <html>, sehingga CSS dapat mengubah token
 * tema (--color-ink / --color-paper) secara otomatis.
 *
 * Aturan tema (design.md §3.1 & §5):
 *  - winddown (20.30–04.00): inversi total → latar hitam, tinta putih.
 *    Ini isyarat "waktunya tidur", bukan sekadar mode gelap.
 *  - fase lain: tetap terang (paper), hanya pola screentone header yang beda.
 *
 * Preferensi pengguna (AppSettings.theme) mengalahkan fase:
 *  - 'light' → selalu terang, apa pun fasenya.
 *  - 'dark'  → selalu gelap.
 *  - 'auto'  → ikut fase (default).
 *
 * @param themeOverride preferensi tema dari settings; default 'auto'.
 */
export function useDayPhase(themeOverride: 'auto' | 'light' | 'dark' = 'auto'): DayPhase {
  const [phase, setPhase] = useState<DayPhase>('pagi');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const p = getDayPhase(minutes);
      setPhase(p);
    };

    update();
    // Perbarui tiap menit — cukup untuk transisi fase (≤ 200 ms animasi).
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-phase', phase);

    // Terapkan inversi: winddown = gelap, kecuali pengguna memaksa light.
    const shouldBeDark =
      themeOverride === 'dark' || (themeOverride === 'auto' && phase === 'winddown');
    root.setAttribute('data-theme', shouldBeDark ? 'dark' : 'light');
  }, [phase, themeOverride]);

  return phase;
}
