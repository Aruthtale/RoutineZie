import { describe, it, expect } from 'vitest';
import { compareSemver, formatBytes, APP_VERSION, pickApkAsset } from './updater';

describe('compareSemver', () => {
  it('membandingkan versi dengan prefiks v', () => {
    expect(compareSemver('1.0.0', 'v1.0.1')).toBe(-1);
    expect(compareSemver('v1.2.0', '1.1.9')).toBe(1);
    expect(compareSemver('v1.3.0', 'v1.3.0')).toBe(0);
  });

  it('membandingkan patch vs minor', () => {
    expect(compareSemver('1.3.9', '1.4.0')).toBe(-1);
    expect(compareSemver('1.10.0', '1.9.0')).toBe(1);
  });

  it('versi pendek dilengkapi nol', () => {
    expect(compareSemver('1.3', '1.3.0')).toBe(0);
    expect(compareSemver('1.3', '1.3.1')).toBe(-1);
  });

  it('bagian non-angka jatuh ke 0', () => {
    expect(compareSemver('1.x.0', '1.0.0')).toBe(0);
  });

  it('string kosong diperlakukan 0.0.0', () => {
    expect(compareSemver('', '0.0.1')).toBe(-1);
    expect(compareSemver('', '')).toBe(0);
  });
});

describe('formatBytes', () => {
  it('null/0 menghasilkan string kosong', () => {
    expect(formatBytes(null)).toBe('');
    expect(formatBytes(0)).toBe('');
  });

  it('satuan MB dan KB', () => {
    expect(formatBytes(6_546_279)).toBe('6.2 MB');
    expect(formatBytes(500_000)).toBe('488 KB');
    // Tepat 1 MB (1048576 byte) — bukan 1024 byte.
    expect(formatBytes(1_048_576)).toBe('1.0 MB');
  });
});

describe('APP_VERSION', () => {
  it('berformat semver', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('pickApkAsset (aset + digest SHA-256)', () => {
  it('memilih aset .apk dan mengekstrak digest sha256', () => {
    const sha = 'a'.repeat(64);
    const aset = pickApkAsset([
      { name: 'notes.txt', browser_download_url: 'https://x/notes.txt' },
      { name: 'app-release-v1.8.0.apk', browser_download_url: 'https://x/app.apk', size: 6546279, digest: `sha256:${sha}` },
    ]);
    expect(aset).not.toBeNull();
    expect(aset!.url).toBe('https://x/app.apk');
    expect(aset!.size).toBe(6546279);
    expect(aset!.sha256).toBe(sha);
  });

  it('sha256 null bila digest tidak ada / format salah', () => {
    const a = pickApkAsset([{ name: 'a.apk', browser_download_url: 'https://x/a.apk' }]);
    expect(a!.sha256).toBeNull();
    const b = pickApkAsset([{ name: 'a.apk', browser_download_url: 'https://x/a.apk', digest: 'md5:abc' }]);
    expect(b!.sha256).toBeNull();
    const c = pickApkAsset([{ name: 'a.apk', browser_download_url: 'https://x/a.apk', digest: 'sha256:tooshort' }]);
    expect(c!.sha256).toBeNull();
  });

  it('normalisasi digest ke huruf kecil', () => {
    const shaUpper = 'ABCDEF'.repeat(10) + 'ABCD'; // 64 char
    const a = pickApkAsset([{ name: 'a.apk', browser_download_url: 'https://x/a.apk', digest: `sha256:${shaUpper}` }]);
    expect(a!.sha256).toBe(shaUpper.toLowerCase());
  });

  it('null bila tidak ada aset .apk', () => {
    expect(pickApkAsset([{ name: 'notes.txt', browser_download_url: 'https://x/n.txt' }])).toBeNull();
    expect(pickApkAsset([])).toBeNull();
  });
});
