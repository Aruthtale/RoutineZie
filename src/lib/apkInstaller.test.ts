import { describe, it, expect } from 'vitest';
import { arrayBufferToBase64, isApkPayload } from './apkInstaller';

/**
 * Regresi v1.6.2: unduhan APK di dalam aplikasi gagal dengan
 * "Failed to execute 'readAsDataURL' on 'FileReader': parameter 1 is not of
 * type 'Blob'." Penyebabnya CapacitorHttp tidak pernah mengembalikan Blob,
 * sehingga jalur FileReader dihapus dan diganti konversi ArrayBuffer → base64.
 * Tes ini mengunci konversi tersebut agar tetap benar.
 */
describe('arrayBufferToBase64', () => {
  /** Referensi b64 dari Buffer Node, agar tidak ikut salah kalau kode berubah. */
  const ref = (buf: Uint8Array) => Buffer.from(buf).toString('base64');

  it('mengubah byte ASCII sederhana dengan benar', () => {
    const bytes = new TextEncoder().encode('RoutineZie');
    expect(arrayBufferToBase64(bytes.buffer as ArrayBuffer)).toBe(ref(bytes));
  });

  it('menangani panjang kelipatan 3 (tanpa padding)', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    expect(arrayBufferToBase64(bytes.buffer as ArrayBuffer)).toBe(ref(bytes));
    expect(arrayBufferToBase64(bytes.buffer as ArrayBuffer)).not.toContain('=');
  });

  it('menangani sisa 1 byte (padding ==)', () => {
    const bytes = new Uint8Array([0xff]);
    const hasil = arrayBufferToBase64(bytes.buffer as ArrayBuffer);
    expect(hasil).toBe(ref(bytes));
    expect(hasil.endsWith('==')).toBe(true);
  });

  it('menangani sisa 2 byte (padding =)', () => {
    const bytes = new Uint8Array([0xde, 0xad]);
    const hasil = arrayBufferToBase64(bytes.buffer as ArrayBuffer);
    expect(hasil).toBe(ref(bytes));
    expect(hasil.endsWith('=')).toBe(true);
    expect(hasil.endsWith('==')).toBe(false);
  });

  it('mengembalikan string kosong untuk buffer kosong', () => {
    expect(arrayBufferToBase64(new ArrayBuffer(0))).toBe('');
  });

  it('menangani semua nilai byte 0..255 (bukan hanya ASCII)', () => {
    const bytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) bytes[i] = i;
    expect(arrayBufferToBase64(bytes.buffer as ArrayBuffer)).toBe(ref(bytes));
  });

  it('tidak melempar untuk payload sebesar APK (6 MB)', { timeout: 30_000 }, () => {
    // Regresi kelas berbeda: btoa(String.fromCharCode(...bytes)) melampaui
    // batas argumen dan melempar RangeError untuk payload besar.
    const size = 6 * 1024 * 1024 + 7; // ganjil, memaksa ada padding
    const bytes = new Uint8Array(size);
    for (let i = 0; i < size; i++) bytes[i] = (i * 31) & 0xff;

    const hasil = arrayBufferToBase64(bytes.buffer as ArrayBuffer);
    expect(hasil.length).toBe(Math.ceil(size / 3) * 4);
    expect(hasil).toBe(ref(bytes));
  });

  it('menghasilkan alfabet base64 standar saja', () => {
    const bytes = new Uint8Array(300).fill(0xab);
    const hasil = arrayBufferToBase64(bytes.buffer as ArrayBuffer);
    expect(hasil).toMatch(/^[A-Za-z0-9+/]*={0,2}$/);
  });
});

describe('isApkPayload (magic byte validation)', () => {
  it('menerima payload APK/ZIP asli (PK\\x03\\x04)', () => {
    const buf = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]).buffer;
    expect(isApkPayload(buf)).toBe(true);
  });

  it('menolak halaman HTML error', () => {
    const html = new TextEncoder().encode('<!DOCTYPE html><html>404</html>').buffer;
    expect(isApkPayload(html)).toBe(false);
  });

  it('menolak payload kosong atau terlalu pendek', () => {
    expect(isApkPayload(new ArrayBuffer(0))).toBe(false);
    expect(isApkPayload(new Uint8Array([0x50, 0x4b]).buffer)).toBe(false);
  });

  it('menolak ZIP dengan signature lain (mis. file acak)', () => {
    const random = new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer;
    expect(isApkPayload(random)).toBe(false);
  });
});
