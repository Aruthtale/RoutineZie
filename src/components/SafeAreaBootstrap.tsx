'use client';

import { useEffect } from 'react';

/**
 * SafeAreaBootstrap — setup safe-area + status bar yang andal di Android 15
 * (targetSdk 35, edge-to-edge dipaksa) dan iOS.
 *
 * strategi:
 * 1. Capacitor StatusBar: set overlaysWebView(false) supaya status bar tidak
 *    menutupi WebView. setStyle(DARK) = teks gelap di atas background terang.
 * 2. Jika env(safe-area-inset-top) bernilai 0 (sering terjadi di Android
 *    WebView), inject CSS variable fallback berdasarkan tinggi status bar
 *    yang dilaporkan plugin StatusBar.
 * 3. Dengarkan perubahan tema (light/dark) untuk update warna status bar.
 */
export function SafeAreaBootstrap() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');

        // overlaysWebView: false = status bar ambil ruangnya sendiri,
        // WebView mulai di bawahnya. Ini cara paling andal di Android.
        try {
          await StatusBar.setOverlaysWebView({ overlay: false });
        } catch {
          /* sebagian versi plugin tidak punya API ini — abaikan */
        }

        // Style: DARK = ikon status bar gelap (background kita terang).
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#ffffff' });

        // Ambil tinggi status bar untuk fallback CSS.
        const info = await StatusBar.getInfo();
        if (!cancelled && info && typeof info.height === 'number' && info.height > 0) {
          // info.height sudah dalam piksel CSS (bukan dp) di Capacitor 7.
          document.documentElement.style.setProperty('--safe-top', `${info.height}px`);
        }
      } catch {
        /* web atau plugin tidak tersedia — env() CSS sudah cukup untuk iOS */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}