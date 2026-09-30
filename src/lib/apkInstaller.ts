/**
 * apkInstaller.ts — jembatan JS ke plugin native ApkInstaller (hanya Android).
 *
 * Di luar Android, downloadAndInstallApk() membuka URL di browser dan
 * mengembalikan { installerOpened: false }, sehingga pemanggil dapat
 * memberi tahu pengguna bahwa unduhan diserahkan ke browser.
 *
 * Catatan penting (v1.6.2): CapacitorHttp BUKAN fetch. Plugin ini memakai
 * jembatan native dan hanya mengembalikan tipe JS hasil deserialisasi
 * (json → object, text → string, arraybuffer → ArrayBuffer). Ia TIDAK PERNAH
 * mengembalikan objek Blob, meskipun responseType: 'blob' diminta —
 * permintaan 'blob' diteruskan ke native lalu hasilnya bukan Blob. Karena itu
 * pemakaian FileReader.readAsDataURL(hasil) dulu melempar:
 *   "Failed to execute 'readAsDataURL' on 'FileReader':
 *    parameter 1 is not of type 'Blob'."
 * Fix: minta 'arraybuffer', konversi byte → base64 secara manual.
 */
import { registerPlugin, CapacitorHttp } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { isNative } from './updater';

interface ApkInstallerPlugin {
  installApk(options: { path: string }): Promise<{ opened?: boolean; openedSettings?: boolean }>;
}

const ApkInstaller = registerPlugin<ApkInstallerPlugin>('ApkInstaller');

export interface DownloadApkResult {
  /** true saat installer Android berhasil dibuka. */
  installerOpened: boolean;
  /** true saat pengguna perlu mengaktifkan izin "sumber tak dikenal" dahulu. */
  installerNeedsPermission: boolean;
  /** Path absolut APK di penyimpanan (untuk fallback membuka manual). */
  path: string | null;
}

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Ubah ArrayBuffer biner jadi string base64 (tanpa prefix data URL).
 *
 * Sengaja tidak memakai `btoa(String.fromCharCode(...bytes))`: untuk APK
 * 6 MB, spread ke argumen `fromCharCode` melampaui batas stack/argumen
 * (RangeError: Maximum call stack size exceeded). Implementasi manual ini
 * berjalan dalam O(n) tanpa argumen variadik besar.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const len = bytes.length;
  // Setiap 3 byte → 4 karakter base64. Tambah padding '=' bila perlu.
  const extra = len % 3;
  const chunks: string[] = [];
  // Potongan 24 KB agar penggabungan string tidak terlalu sering.
  const CHUNK = 0x6000;
  let out = '';

  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    out += B64_ALPHABET[b0 >> 2];
    out += B64_ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)];
    out += i + 1 < len ? B64_ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < len ? B64_ALPHABET[b2 & 0x3f] : '=';
    if (out.length >= CHUNK) {
      chunks.push(out);
      out = '';
    }
  }
  if (out) chunks.push(out);
  if (extra === 0 && chunks.length === 0) return '';
  return chunks.join('');
}

/** Normalisasi payload unduhan apa pun (ArrayBuffer/string base64) → base64. */
function toBase64(data: unknown): string {
  if (data instanceof ArrayBuffer) return arrayBufferToBase64(data);
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    return arrayBufferToBase64(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer);
  }
  if (typeof data === 'string') {
    // CapacitorHttp kadang membungkus binary sebagai string base64.
    const comma = data.indexOf(',');
    return data.startsWith('data:') && comma >= 0 ? data.slice(comma + 1) : data;
  }
  throw new Error('Tipe data unduhan tidak dikenal');
}

/**
 * Unduh APK dan buka installer Android. Di luar Android, serahkan ke browser.
 */
export async function downloadAndInstallApk(downloadUrl: string): Promise<DownloadApkResult> {
  if (!isNative()) {
    // Cadangan web: serahkan ke browser pengguna.
    window.open(downloadUrl, '_blank');
    return { installerOpened: false, installerNeedsPermission: false, path: null };
  }

  // Tahap 1: unduh APK sebagai arraybuffer biner (mengikuti redirect GitHub).
  const response = await CapacitorHttp.get({
    url: downloadUrl,
    responseType: 'arraybuffer',
  });

  if (response.status && response.status >= 400) {
    throw new Error(`Unduhan gagal (HTTP ${response.status})`);
  }

  const base64 = toBase64(response.data);
  if (!base64 || base64.length < 4) {
    throw new Error('APK kosong / gagal diunduh');
  }

  // Tahap 2: tulis ke Directory.Cache — selalu dapat ditulis di semua versi
  // Android tanpa izin penyimpanan, dan sudah tercakup oleh <cache-path> di
  // file_paths.xml sehingga FileProvider bisa menyajikannya ke installer.
  const fileName = `RoutineZie-${Date.now()}.apk`;
  const writeFileResult = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Cache,
  });

  // Tahap 3: minta plugin native membuka installer paket.
  const uri = writeFileResult.uri;
  try {
    const installResult = await ApkInstaller.installApk({ path: uri });
    return {
      installerOpened: Boolean(installResult.opened),
      installerNeedsPermission: Boolean(installResult.openedSettings),
      path: uri,
    };
  } catch (err) {
    // Installer gagal dibuka — unduhan tetap berhasil, kasih tahu path manual.
    console.warn('installApk gagal:', err);
    return { installerOpened: false, installerNeedsPermission: false, path: uri };
  }
}

/** Hapus APK lama di Directory.Cache agar tidak menumpuk. Best-effort. */
export async function cleanupCachedApks(): Promise<void> {
  if (!isNative()) return;
  try {
    const listing = await Filesystem.readdir({ path: '', directory: Directory.Cache });
    await Promise.all(
      (listing.files || [])
        .filter((f) => typeof f.name === 'string' && f.name.endsWith('.apk'))
        .map((f) => Filesystem.deleteFile({ path: f.name, directory: Directory.Cache }).catch(() => {})),
    );
  } catch {
    // Tidak fatal — pembersihan hanyalah kerapian.
  }
}
