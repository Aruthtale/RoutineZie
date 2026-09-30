/**
 * updater.ts — Pemeriksa pembaruan aplikasi (Metode B: GitHub Releases API).
 *
 * Mengambil rilis terbaru dari GitHub, membandingkan dengan versi aplikasi
 * sekarang, dan mengembalikan metadata unduhan APK.
 *
 * Cadangan rate-limit: API GitHub tak terautentikasi dibatasi ~60 permintaan/jam
 * per IP. Saat gagal (403 atau error jaringan), beralih ke raw package.json di
 * raw.githubusercontent.com (CDN, tanpa batas).
 */

/** Identitas repo tempat rilis dipublikasikan. */
export const UPDATE_REPO = {
  owner: 'Aruthtale',
  repo: 'RoutineZie',
} as const;

/** Versi aplikasi sekarang — satu-satunya sumber kebenaran di sisi klien. */
export const APP_VERSION = '1.6.0';

/** Bentuk metadata pembaruan yang dikembalikan checkForUpdate(). */
export interface UpdateInfo {
  /** true saat ada rilis lebih baru dari APP_VERSION. */
  hasUpdate: boolean;
  /** Tag rilis terbaru, mis. "v1.4.0" (atau "1.4.0" dari cadangan CDN). */
  latestVersion: string;
  /** Versi yang terpasang sekarang. */
  currentVersion: string;
  /** URL unduh APK rilis terbaru. */
  downloadUrl: string;
  /** Catatan rilis (Markdown mentah dari GitHub). */
  releaseNotes: string;
  /** Ukuran APK dalam byte bila diketahui. */
  apkSize: number | null;
  /** true saat data berasal dari cadangan raw package.json (catatan tak tersedia). */
  fallbackCDN: boolean;
}

const NO_UPDATE = (latest: string, fallbackCDN: boolean): UpdateInfo => ({
  hasUpdate: false,
  latestVersion: latest,
  currentVersion: APP_VERSION,
  downloadUrl: '',
  releaseNotes: '',
  apkSize: null,
  fallbackCDN,
});

/**
 * Bandingkan dua versi semver (boleh dengan/ tanpa prefiks "v").
 * @returns  1 bila v1 lebih baru, -1 bila v2 lebih baru, 0 bila sama.
 */
export function compareSemver(v1: string, v2: string): number {
  const clean1 = (v1 || '').replace(/^v/, '').trim();
  const clean2 = (v2 || '').replace(/^v/, '').trim();
  const parts1 = clean1.split('.').map((n) => parseInt(n, 10) || 0);
  const parts2 = clean2.split('.').map((n) => parseInt(n, 10) || 0);
  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/** Ambil aset APK pertama dari daftar aset rilis, atau null bila tidak ada. */
function pickApkAsset(assets: Array<{ name?: string; browser_download_url?: string; size?: number }>) {
  const apk = (assets || []).find((a) => (a.name || '').toLowerCase().endsWith('.apk'));
  if (!apk || !apk.browser_download_url) return null;
  return { url: apk.browser_download_url, size: typeof apk.size === 'number' ? apk.size : null };
}

/**
 * Jalur utama: GET /repos/:owner/:repo/releases/latest.
 * Melempar error agar pemanggil dapat beralih ke cadangan CDN.
 */
async function fetchLatestRelease(): Promise<UpdateInfo> {
  const res = await fetch(`https://api.github.com/repos/${UPDATE_REPO.owner}/${UPDATE_REPO.repo}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}`);
  }
  const data = await res.json();
  const tag = String(data.tag_name || '');
  const asset = pickApkAsset(data.assets);
  const latest = tag.replace(/^v/, '');
  if (compareSemver(APP_VERSION, latest) >= 0) {
    return NO_UPDATE(tag, false);
  }
  if (!asset) {
    // Rilis ada tapi asetnya belum diunggah — arahkan ke halaman rilis.
    return {
      hasUpdate: true,
      latestVersion: tag,
      currentVersion: APP_VERSION,
      downloadUrl: `https://github.com/${UPDATE_REPO.owner}/${UPDATE_REPO.repo}/releases/latest`,
      releaseNotes: String(data.body || ''),
      apkSize: null,
      fallbackCDN: false,
    };
  }
  return {
    hasUpdate: true,
    latestVersion: tag,
    currentVersion: APP_VERSION,
    downloadUrl: asset.url,
    releaseNotes: String(data.body || ''),
    apkSize: asset.size,
    fallbackCDN: false,
  };
}

/**
 * Jalur cadangan: baca package.json dari cabang utama via raw.githubusercontent.com.
 * Tidak ada batas permintaan, tapi catatan rilis tak tersedia.
 */
async function fetchViaCDN(): Promise<UpdateInfo> {
  const res = await fetch(
    `https://raw.githubusercontent.com/${UPDATE_REPO.owner}/${UPDATE_REPO.repo}/main/package.json`,
    { cache: 'no-store' },
  );
  if (!res.ok) {
    throw new Error(`CDN ${res.status}`);
  }
  const data = await res.json();
  const latest = String(data.version || '').trim();
  if (!latest) throw new Error('versi tidak terbaca');
  if (compareSemver(APP_VERSION, latest) >= 0) {
    return NO_UPDATE(latest, true);
  }
  return {
    hasUpdate: true,
    latestVersion: `v${latest}`,
    currentVersion: APP_VERSION,
    // Pola unduh langsung rilis terbaru; nama aset mengikuti konvensi "app-release.apk".
    downloadUrl: `https://github.com/${UPDATE_REPO.owner}/${UPDATE_REPO.repo}/releases/latest/download/app-release.apk`,
    releaseNotes: '',
    apkSize: null,
    fallbackCDN: true,
  };
}

/**
 * Cek pembaruan dari GitHub. Jalur utama dipakai lebih dulu; bila terkena
 * batas permintaan atau gagal jaringan, jatuh ke cadangan CDN.
 */
export async function checkForUpdate(): Promise<UpdateInfo> {
  try {
    return await fetchLatestRelease();
  } catch (mainError) {
    try {
      return await fetchViaCDN();
    } catch (cdnError) {
      throw new Error(
        `Gagal mengecek pembaruan (GitHub: ${(mainError as Error).message}; CDN: ${(cdnError as Error).message})`,
      );
    }
  }
}

/** true bila aplikasi berjalan sebagai aplikasi native Capacitor. */
export function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/** Ukuran byte jadi "6.2 MB" untuk ditampilkan di UI. */
export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${Math.round(kb)} KB`;
}
