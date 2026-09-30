import { describe, it, expect } from 'vitest';
import { compareSemver, formatBytes, APP_VERSION } from './updater';

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
