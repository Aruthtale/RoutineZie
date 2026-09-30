'use client';

import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';

/**
 * useBackHandler — hierarki 3-tier tombol/gestur Back Android (LIFO):
 *
 *   1. Modal/overlay terbuka? → tutup modal teratas, event di-consume.
 *   2. Bukan di tab 'home'?  → kembali ke 'home'.
 *   3. Sudah di 'home'?      → tekan 2x dalam 2000ms untuk benar-benar keluar;
 *                               tekanan pertama memunculkan toast verifikasi.
 *
 * Stack modal memakai register/unregister global agar modal yang render
 * kondisional (WorkoutModeModal, ItemDetail, dll.) bisa mendaftar handler
 * penutupannya sendiri tanpa page.tsx tahu detailnya.
 */

export type BackHandler = () => boolean | void;

const backHandlers: BackHandler[] = [];

/**
 * Daftarkan handler modal. Return true dari handler = event ter-consume
 * (modal tertutup), return false = modal menyerahkan event ke tier berikutnya.
 */
export function registerBackHandler(handler: BackHandler): () => void {
  backHandlers.push(handler);
  return () => {
    const idx = backHandlers.indexOf(handler);
    if (idx !== -1) backHandlers.splice(idx, 1);
  };
}

function dispatchBackEvent(): boolean {
  if (backHandlers.length === 0) return false;
  const top = backHandlers[backHandlers.length - 1];
  return top() !== false;
}

type UseBackHandlerOptions = {
  /** Tab/home saat ini, dipakai tier-2. */
  getActiveTab: () => string;
  /** Pindah ke tab home. */
  goHome: () => void;
  /** Munculkan toast verifikasi (tekan sekali lagi untuk keluar). */
  onExitPrompt: () => void;
  /** Window double-tap dalam ms. */
  exitWindowMs?: number;
};

export function useBackHandler({
  getActiveTab,
  goHome,
  onExitPrompt,
  exitWindowMs = 2000,
}: UseBackHandlerOptions): void {
  const lastBackPressRef = useRef<number>(0);

  useEffect(() => {
    let handle: { remove: () => void } | null = null;
    let cancelled = false;

    const attach = async () => {
      // Di web listener tidak ada → skip diam-diam (bukan error).
      const listener = await App.addListener('backButton', () => {
        // 1. Modal/overlay teratas
        if (dispatchBackEvent()) return;

        // 2. Kembali ke home dari sub-tab
        if (getActiveTab() !== 'schedule') {
          goHome();
          return;
        }

        // 3. Konfirmasi keluar: tekan 2x dalam window
        const now = Date.now();
        if (now - lastBackPressRef.current < exitWindowMs) {
          lastBackPressRef.current = 0;
          App.exitApp();
        } else {
          lastBackPressRef.current = now;
          onExitPrompt();
        }
      });

      if (cancelled) {
        listener.remove();
      } else {
        handle = listener;
      }
    };

    attach().catch(() => {
      /* @capacitor/app tidak tersedia (web) — abaikan */
    });

    return () => {
      cancelled = true;
      handle?.remove();
    };
    // getActiveTab/goHome/onExitPrompt harus stabil (useCallback); dependencies
    // sengaja kosong agar listener tidak dipasang ulang setiap render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Helper untuk komponen modal: daftarkan handler onClose selama `active` true.
 *
 *   useBackHandlerModal(isOpen, () => { setIsOpen(false); return true; });
 */
export function useBackHandlerModal(active: boolean, onClose: BackHandler): void {
  useEffect(() => {
    if (!active) return;
    return registerBackHandler(onClose);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
