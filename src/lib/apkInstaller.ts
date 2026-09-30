/**
 * apkInstaller.ts — jembatan JS ke plugin native ApkInstaller (hanya Android).
 *
 * Di luar Android, openApkInstaller() mengembalikan { available: false } dan
 * pemanggil harus mengembalikan ke fallback membuka URL di browser.
 */
import { registerPlugin } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

interface ApkInstallerPlugin {
  installApk(options: { path: string }): Promise<{ opened?: boolean; openedSettings?: boolean }>;
}

const ApkInstaller = registerPlugin<ApkInstallerPlugin>('ApkInstaller');
import { isNative } from './updater';

export interface DownloadApkResult {
  /** true saat installer Android berhasil dibuka. */
  installerOpened: boolean;
  /** true saat pengguna perlu mengaktifkan izin "sumber tak dikenal" dahulu. */
  installerNeedsPermission: boolean;
  /** Path absolut APK di penyimpanan (untuk fallback membuka manual). */
  path: string | null;
}

/** Ubah Blob jadi string base64 tanpa padding untuk Filesystem.writeFile. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Pola: "data:application/vnd.android.package-archive;base64,...."
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Unduh APK dan buka installer Android. Di luar Android, lempar agar
 * pemanggil menangani via browser.
 */
export async function downloadAndInstallApk(downloadUrl: string): Promise<DownloadApkResult> {
  if (!isNative()) {
    // Cadangan web: serahkan ke browser pengguna.
    window.open(downloadUrl, '_blank');
    return { installerOpened: false, installerNeedsPermission: false, path: null };
  }

  // Tahap 1: unduh APK via jembatan HTTP Capacitor (mengikuti redirect GitHub).
  const response = await CapacitorHttp.get({
    url: downloadUrl,
    responseType: 'blob',
  });
  const blob = response.data as Blob;
  if (!blob || blob.size <= 0) {
    throw new Error('APK kosong / gagal diunduh');
  }
  const base64 = await blobToBase64(blob);

  // Tahap 2: tulis ke penyimpanan eksternal publik (terlihat FileProvider).
  const fileName = `RoutineZie-${Date.now()}.apk`;
  const dirName = 'RoutineZie';
  await Filesystem.mkdir({ path: dirName, directory: Directory.ExternalStorage, recursive: true }).catch(() => {});
  const writeFileResult = await Filesystem.writeFile({
    path: `${dirName}/${fileName}`,
    data: base64,
    directory: Directory.ExternalStorage,
  });

  // Tahap 3: minta plugin native membuka installer paket.
  const path = writeFileResult.uri || `${dirName}/${fileName}`;
  try {
    const installResult = await ApkInstaller.installApk({ path });
    return {
      installerOpened: Boolean(installResult.opened),
      installerNeedsPermission: Boolean(installResult.openedSettings),
      path,
    };
  } catch (err) {
    // Installer gagal dibuka — unduhan tetap berhasil, kasih tahu path manual.
    console.warn('installApk gagal:', err);
    return { installerOpened: false, installerNeedsPermission: false, path };
  }
}
