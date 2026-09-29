# ARCHITECTURE.md

## 1. Gambaran

```
[Next.js static export (out/)] ──cap sync──▶ [Capacitor Android WebView]
        │                                         │
   UI (React, Tailwind)                    Plugin native:
   Zustand store                           LocalNotifications, Geolocation,
   src/lib/schedule (Zod + parser)         Haptics, Share, Preferences, StatusBar
        │
   Repository (log)  ──▶ Dexie/IndexedDB (dapat diganti SQLite)
        │
   Layanan opsional: WeatherProvider, ChatProvider  ──▶ proxy terpisah (opsional)
```

## 2. Batasan penting (static export)
- `next.config.ts`:
  ```ts
  const nextConfig = { output: 'export', images: { unoptimized: true }, trailingSlash: true };
  export default nextConfig;
  ```
- Tanpa API routes, SSR, middleware, server actions, `next/image` optimasi server, atau rute dinamis tanpa `generateStaticParams`.
- Semua data dinamis dimuat di klien (client components).

## 3. Konfigurasi Capacitor
```ts
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'id.zenn.routine',   // GANTI sesuai domain milik pengguna
  appName: 'Zenn Routine',
  webDir: 'out',
};
export default config;
```
Izin Android (di `AndroidManifest.xml`, verifikasi kebijakan Play Store terkini): notifikasi (Android 13+), alarm tepat (Android 12+), lokasi perkiraan (coarse). Minta izin secara kontekstual, bukan sekaligus di awal.

## 4. Struktur folder
```
/
├─ agent.md  skill.md  design.md  PRD.md  ARCHITECTURE.md  DATA_SCHEMA.md ...
├─ data/jadwal_mingguan.json
├─ public/fonts?            (font di-bundel via next/font, bukan CDN)
├─ src/
│  ├─ app/                  (rute: page.tsx per layar; layout.tsx)
│  │   ├─ page.tsx          (Hari Ini)
│  │   ├─ week/  workout/  meals/  progress/  chat/  settings/
│  ├─ components/           (Panel, Caption, Balloon, SfxStamp, ToneArea, InkButton, ...)
│  ├─ features/
│  │   ├─ today/  workout/  progress/  notifications/  weather/  chat/
│  ├─ lib/
│  │   ├─ schedule/         (schema.ts, time.ts, phase.ts, selectors.ts)
│  │   ├─ storage/          (prefs.ts, repository.ts, dexie.ts)
│  │   ├─ native/           (notifications.ts, geolocation.ts, haptics.ts)
│  │   └─ providers/        (weather/, chat/)
│  ├─ store/                (zustand)
│  └─ styles/               (tokens.css, tone.css)
├─ tests/                   (unit test parser, fase, next-block, timer)
├─ android/                 (dihasilkan Capacitor)
└─ capacitor.config.ts, next.config.ts, tailwind.config.ts
```

## 5. Modul dan tanggung jawab
- `lib/schedule`: memuat JSON, validasi Zod, parser waktu, fase hari, `getNowAndNext`. **Satu-satunya pintu masuk data jadwal.**
- `lib/storage`: Preferences untuk pengaturan; `repository` untuk log (workout, berat, tidur, centang makan). UI hanya memanggil antarmuka repository.
- `lib/native`: pembungkus plugin Capacitor agar mudah di-mock di test dan di web (dev).
- `lib/providers`: antarmuka `WeatherProvider` dan `ChatProvider` dengan implementasi dapat diganti (lihat `INTEGRATIONS.md`, `AI_CHAT.md`).
- `features/notifications`: membangun daftar pengingat dari jadwal + pengaturan; menjadwalkan ulang saat perlu.
- `store`: state UI/sesi (mis. sesi workout aktif, tema).

## 6. Data flow inti (Hari Ini)
1. Muat & validasi JSON → `schedule` (memori).
2. Tentukan hari lokal → `getNowAndNext` → fase → tema.
3. Ticker 30 detik + event foreground memperbarui tampilan.
4. Tindakan pengguna (centang makan, selesai set) → repository.

## 7. Penyimpanan dan migrasi
- Setiap entitas log punya `id`, `createdAt` (ISO), dan `schemaVersion`.
- Migrasi versi ditulis eksplisit dan diuji.
- Ekspor/impor: satu file JSON berisi jadwal + log (tanpa data sensitif tambahan).

## 8. Lingkungan dan rahasia
- Variabel `NEXT_PUBLIC_*` bersifat publik. Jangan menaruh key berbayar tanpa proteksi.
- Layanan yang butuh key (cuaca Google, chat AI) lewat proxy terpisah atau mekanisme proteksi (lihat `INTEGRATIONS.md`).
- `.env.local` tidak di-commit; sediakan `.env.example`.

## 9. Kinerja
- Target: waktu muat awal < 2 detik di perangkat menengah; tidak ada blocking network saat start.
- Pola visual via CSS/SVG statis; hindari blur/filter berat.
- Code-split layar yang jarang dipakai (chat, progres).

## 10. Rilis
- Debug: `npm run build && npx cap sync android && npx cap run android`.
- Rilis: build AAB/APK bertanda tangan lewat Android Studio; keystore di luar repo; catat versi di `CHANGELOG.md`.
