import { describe, it, expect } from 'vitest';
import { MockChatProvider, createChatProvider, getChatProviderInfo, GeminiChatProvider } from '../providers';

describe('createChatProvider (factory)', () => {
  it('fallback ke MockChatProvider bila tidak ada env', () => {
    const oldProxy = process.env.NEXT_PUBLIC_CHAT_PROXY_ENDPOINT;
    const oldKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    delete process.env.NEXT_PUBLIC_CHAT_PROXY_ENDPOINT;
    delete process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    const provider = createChatProvider();
    expect(provider).toBeInstanceOf(MockChatProvider);
    expect(getChatProviderInfo()).toEqual({ name: 'mock', active: false });

    if (oldProxy !== undefined) process.env.NEXT_PUBLIC_CHAT_PROXY_ENDPOINT = oldProxy;
    if (oldKey !== undefined) process.env.NEXT_PUBLIC_GEMINI_API_KEY = oldKey;
  });

  it('pakai GeminiChatProvider bila hanya NEXT_PUBLIC_GEMINI_API_KEY yang ada', () => {
    const oldProxy = process.env.NEXT_PUBLIC_CHAT_PROXY_ENDPOINT;
    const oldKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    delete process.env.NEXT_PUBLIC_CHAT_PROXY_ENDPOINT;
    process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'test_key_abc';

    const provider = createChatProvider();
    expect(provider).toBeInstanceOf(GeminiChatProvider);
    expect(getChatProviderInfo()).toEqual({ name: 'gemini', active: true });

    if (oldProxy !== undefined) process.env.NEXT_PUBLIC_CHAT_PROXY_ENDPOINT = oldProxy;
    if (oldKey !== undefined) process.env.NEXT_PUBLIC_GEMINI_API_KEY = oldKey;
    else delete process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  });

  it('proxy diprioritaskan daripada gemini key', () => {
    process.env.NEXT_PUBLIC_CHAT_PROXY_ENDPOINT = 'https://proxy.test/api/chat';
    process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'test_key_abc';

    const info = getChatProviderInfo();
    expect(info).toEqual({ name: 'proxy', active: true });

    delete process.env.NEXT_PUBLIC_CHAT_PROXY_ENDPOINT;
    delete process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  });
});

describe('GeminiChatProvider.buildContextText', () => {
  it('membangun teks konteks dari data jadwal', () => {
    const provider = new GeminiChatProvider('fake_key');
    // Akses method private via casting untuk uji
    const build = (provider as unknown as { buildContextText: (c: unknown) => string }).buildContextText;

    const text = build({
      hariIni: {
        hari: 'Selasa',
        tipe_hari: 'latihan',
        jadwalSingkat: [{ waktu: '16.00', kegiatan: 'Workout' }],
        workout: { nama: 'Upper', latihan: [{ latihan: 'Push-up', set: 3, repetisi_atau_waktu: '12x' }] },
        pola_makan: [{ waktu: 'Pagi', menu: 'Nasi telur' }],
      },
      aturanTidur: { bangun: '05.00', target: '21.00', batas: '22.00' },
      usia: 17,
      waktuSekarang: '16.30',
    });

    expect(text).toContain('Selasa');
    expect(text).toContain('Push-up 3x 12x');
    expect(text).toContain('Nasi telur');
    expect(text).toContain('bangun 05.00');
    expect(text).toContain('Usia pengguna: 17');
  });

  it('aman terhadap konteks kosong', () => {
    const provider = new GeminiChatProvider('fake_key');
    const build = (provider as unknown as { buildContextText: (c: unknown) => string }).buildContextText;
    expect(() => build({})).not.toThrow();
  });
});
