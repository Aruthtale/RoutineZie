'use client';

import { useRef, useCallback } from 'react';

/**
 * T8.5 — Hook swipe horizontal untuk pindah antar hari di layar Jadwal.
 *
 * Memakai ambang 50px & batas vertikal 45 derajat supaya scroll
 * vertikal daftar agenda tidak ikut memicu ganti hari. Mengecualikan
 * elemen interaktif (tombol, link, input) agar aksi ketuk tidak geser.
 *
 * Penggunaan:
 *   const swipeHandlers = useDaySwipe({
 *     onSwipeLeft: () => nextDay(),
 *     onSwipeRight: () => prevDay(),
 *   });
 *   <div {...swipeHandlers}>...</div>
 */
type SwipeHandlers = {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
};

type UseDaySwipeOptions = {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  /** Ambang jarak horizontal minimum (px). */
  threshold?: number;
};

const DEFAULT_THRESHOLD = 50;

export function useDaySwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = DEFAULT_THRESHOLD,
}: UseDaySwipeOptions): SwipeHandlers {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Abaikan jika sentuhan dimulai dari elemen interaktif.
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, [role="button"]')) {
      startX.current = null;
      startY.current = null;
      return;
    }
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (startX.current === null || startY.current === null) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX.current;
      const deltaY = touch.clientY - startY.current;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      startX.current = null;
      startY.current = null;

      // Harus dominan horizontal & melewati ambang.
      if (absX < threshold || absX < absY * 1.4) return;

      if (deltaX < 0) {
        onSwipeLeft();
      } else {
        onSwipeRight();
      }
    },
    [onSwipeLeft, onSwipeRight, threshold]
  );

  return { onTouchStart, onTouchEnd };
}
