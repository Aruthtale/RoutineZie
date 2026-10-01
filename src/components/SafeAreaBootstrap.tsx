'use client';

import { useEffect } from 'react';

/**
 * SafeAreaBootstrap — setup status bar yang andal di Android 15 (targetSdk 35,
 * edge-to-edge dipaksa oleh OS) dan iOS.
 *
 * Pelajaran penting (v1.6.3):
 *  - Android 15 memaksa edge-to-edge. `StatusBar.setOverlaysWebView(false)` dan
 *    `StatusBar.setBackgroundColor()` diabaikan/di-deprecate di sana — WebView
 *    tetap menggambar sampai ke bawah status bar, dan warna status bar tidak
 *    bisa diubah dari app.
 *  - Karena itu ikon jam/baterai bisa "hilang": ikon terang di atas latar putih.
 *    Satu-satunya kendali yang masih berfungsi adalah ICON STYLE. Kita paksa
 *    Style.Dark (ikon gelap) supaya terbaca di atas latar putih aplikasi.
 *  - Tinggi status bar diambil dari insets native dan dipasang sebagai
 *    --safe-top, agar header dapat memberi ruang kosong di bawah status bar.
 *
 * Strategi aman: coba `setOverlaysWebView(false)` (berguna di Android < 15 /
 * iOS), lalu SELALU paksa Style.Dark sebagai jaring pengaman.
 */
export function SafeAreaBootstrap() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');

        // 1. Coba matikan overlay. Di Android 15 ini no-op, tapi berhasil di
        //    versi lebih lama dan di iOS — jadi tetap dicoba.
        try {
          await StatusBar.setOverlaysWebView({ overlay: false });
        } catch {
          /* versi plugin tanpa API ini — abaikan */
        }

        // 2. KUNCI: paksa ikon status bar jadi gelap. Ini satu-satunya hal yang
        //    masih berpengaruh di Android 15 edge-to-edge — tanpa ini ikon
        //    terang menghilang di atas latar putih.
        try {
          await StatusBar.setStyle({ style: Style.Dark });
        } catch {
          /* abaikan */
        }

        // 3. Warna background status bar: hanya berlaku di Android < 15.
        //    Di Android 15 diabaikan OS — jangan bergantung padanya.
        try {
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
        } catch {
          /* di-deprecate di Android 15 — abaikan */
        }

        // 4. Tentukan --safe-top secara andal.
        //    Prioritas: tinggi dari plugin > env() yang sudah dihitung CSS > fallback.
        let topPx = 0;
        try {
          const info = await StatusBar.getInfo();
          if (info && typeof info.height === 'number' && info.height > 0) {
            topPx = info.height; // piksel CSS di Capacitor 7
          }
        } catch {
          /* getInfo tidak tersedia — lanjut ke fallback */
        }

        if (!topPx) {
          // Baca nilai env() aktual yang sudah dihitung browser.
          const probe = getComputedStyle(document.documentElement)
            .getPropertyValue('--safe-top')
            .trim();
          const parsed = parseFloat(probe);
          if (!isNaN(parsed) && parsed > 0) topPx = parsed;
        }

        if (!isNaN(topPx) && topPx > 0 && !cancelled) {
          document.documentElement.style.setProperty('--safe-top', `${topPx}px`);
        } else if (!cancelled) {
          // Jaring pengaman terakhir: Android edge-to-edge pasti punya status
          // bar >= 24 px. Tanpa ini header menabrak jam/baterai.
          document.documentElement.style.setProperty('--safe-top', '24px');
        }
      } catch {
        /* web / plugin tak tersedia — env() CSS sudah cukup untuk iOS */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
