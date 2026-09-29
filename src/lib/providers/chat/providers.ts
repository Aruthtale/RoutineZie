import { ChatProvider, ChatMsg, ChatContext, ChatQuota, ChatHistoryEntry } from './types';
import { SYSTEM_PROMPT } from './guardrails';

/**
 * MockChatProvider - untuk pengujian dan offline mode
 * Mengembalikan respons canned berdasarkan input
 */
export class MockChatProvider implements ChatProvider {
  async send(input: { messages: ChatMsg[]; context: ChatContext; signal?: AbortSignal }): Promise<string> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Analyze context to generate appropriate response
    const { messages, context } = input;
    let response = '';

    // Safe access to context properties
    const currentDay = context?.hariIni?.hari || 'Senin';
    const isWorkoutDay = ['Selasa', 'Sabtu'].includes(currentDay);
    // Check if workout info exists in hariIni
    const hasWorkout = context?.hariIni?.workout !== undefined;

    if (messages.length === 0) {
      response = 'Halo! Aku si Zenn, asisten kamu di aplikasi Zenn Routine. Ada yang bisa aku bantu hari ini?';
    } else if (messages[0].text.includes('latihan')) {
      response = 'Berikut cara melakukan latihan yang sesuai dengan jadwal hari ini:\n\n1. Persiapkan perlengkapan minimal (matras, botol air)\n2. Lakukan pemanasan 5 menit dengan gerakan ringan\n3. Ikuti urutan latihan sesuai jadwal yang ditampilkan\n4. Istirahat 30 detik antar set\n5. Selesaikan dengan pendinginan 5 menit';
    } else if (messages[0].text.includes('makan')) {
      response = 'Berikut menu makan yang cocok untuk hari ini:\n\nPagi: Oatmeal dengan susu dan buah\nSiang: Nasi goreng dengan telur dan sayuran\nMalam: Mie instant dengan campuran sayur dan telur\n\nIngin resep lengkap?';
    } else if (messages[0].text.includes('tidur')) {
      response = 'Ide bagus untuk tidur malam: matikan layar 30 menit sebelum tidur, hindari minuman berkafien setelah 20.00, dan pastikan ruangan tidak terlalu panas. Tidur 7-8 jam sangat direkomendasikan.';
    } else {
      response = 'Ada yang bisa aku bantu? Kamu bisa tanya tentang latihan, makan, tidur, atau hal lain dari jadwal harianmu.';
    }

    return response;
  }
}

/**
 * ProxyChatProvider - memakai proxy untuk menghubungkan ke backend
 * (untuk produksi, ini akan memanggil Cloud Function/Cloud Run)
 * 
 * NOTE: Pada mode static export (output: 'export'), ini tidak bisa memanggil API route lokal.
 * Untuk produksi, ini akan memanggil URL ke server backend yang menyimpan API key.
 */
export class ProxyChatProvider implements ChatProvider {
  private endpoint: string;
  private quota: ChatQuota | null = null;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async send(input: { messages: ChatMsg[]; context: ChatContext; signal?: AbortSignal }): Promise<string> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      // Handle network errors, show offline mode
      const day = input.context?.hariIni?.hari;
      if (day === 'Selasa' || day === 'Sabtu') {
        return 'Cuaca sedang hujan, namun aku akan tetap membantu!';
      }
      return 'Maaf, terjadi kegagalan koneksi. Silakan coba lagi nanti.';
    }
  }

  async getQuota(): Promise<ChatQuota | null> {
    // In real implementation, this would fetch quota from backend
    // For mock, return a fixed quota
    return {
      remaining: 95,
      limit: 100,
      resetAt: '2026-09-29T00:00:00Z',
    };
  }
}

/**
 * GeminiChatProvider - memanggil Google Gemini API langsung (REST, tanpa SDK)
 *
 * Dipakai jika NEXT_PUBLIC_GEMINI_API_KEY tersedia di environment.
 * Catatan: pada mode static export, key ini terbawa di bundle klien.
 * Untuk produksi publik, gunakan ProxyChatProvider agar key aman di server.
 *
 * Catatan autentikasi: API key jenis ini hanya diterima via header
 * `x-goog-api-key`, BUKAN query parameter `?key=` (mengembalikan 400).
 */
export class GeminiChatProvider implements ChatProvider {
  private apiKey: string;
  private models: string[];      // urutan fallback: model utama dulu
  private endpoint = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string, model = 'gemini-3.8-flash') {
    this.apiKey = apiKey;
    // Model utama + cadangan jika model utama overload (503) / tidak tersedia
    this.models = [model];
    for (const fallback of ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest']) {
      if (!this.models.includes(fallback)) this.models.push(fallback);
    }
  }

  private buildContextText(context: ChatContext): string {
    const c = context || ({} as ChatContext);
    const hari = c.hariIni;
    const lines: string[] = [];
    if (hari) {
      lines.push(`Hari: ${hari.hari ?? '-'} | tipe: ${hari.tipe_hari ?? '-'} | waktu sekarang: ${c.waktuSekarang ?? '-'}`);
      if (Array.isArray(hari.jadwalSingkat) && hari.jadwalSingkat.length) {
        lines.push('Jadwal singkat: ' + hari.jadwalSingkat.map(j => `${j.waktu} ${j.kegiatan}`).join('; '));
      }
      if (hari.workout?.latihan?.length) {
        lines.push('Workout hari ini: ' + hari.workout.latihan
          .map(l => `${l.latihan}${l.set ? ` ${l.set}x` : ''} ${l.repetisi_atau_waktu ?? ''}`.trim())
          .join('; '));
      }
      if (Array.isArray(hari.pola_makan) && hari.pola_makan.length) {
        lines.push('Pola makan: ' + hari.pola_makan.map(m => `${m.waktu}: ${m.menu}`).join('; '));
      }
    }
    if (c.aturanTidur) {
      lines.push(`Aturan tidur: bangun ${c.aturanTidur.bangun}, target ${c.aturanTidur.target}, batas ${c.aturanTidur.batas}`);
    }
    if (c.usia) lines.push(`Usia pengguna: ${c.usia}`);
    return lines.join('\n');
  }

  async send(input: { messages: ChatMsg[]; context: ChatContext; signal?: AbortSignal }): Promise<string> {
    // Pangkas riwayat ke 10 pesan terakhir (batas teknis)
    const history = (input.messages || []).slice(-10);

    const contents = history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    const systemText = `${SYSTEM_PROMPT}\n\nKONTEKS PENGGUNA (jangan mengarang data di luar ini):\n${this.buildContextText(input.context)}`;

    const body = {
      systemInstruction: { parts: [{ text: systemText }] },
      contents,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
        topP: 0.95,
      },
    };

    let lastErr: Error | null = null;
    for (const model of this.models) {
      try {
        const res = await fetch(
          `${this.endpoint}/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // WAJIB pakai header; query param ?key= ditolak (400) untuk key jenis ini
              'x-goog-api-key': this.apiKey,
            },
            body: JSON.stringify(body),
            signal: input.signal,
          }
        );

        if (res.status === 429 || res.status === 503) {
          // overload / rate limit → coba model cadangan
          lastErr = new Error(`Gemini API ${res.status} (${model})`);
          continue;
        }

        if (!res.ok) {
          let detail = '';
          try {
            const err = await res.json();
            detail = err?.error?.message || '';
          } catch { /* abaikan */ }
          throw new Error(`Gemini API ${res.status}: ${detail || res.statusText}`);
        }

        const data = await res.json();
        const parts = data?.candidates?.[0]?.content?.parts;
        if (!parts || !parts.length) {
          const blocked = data?.promptFeedback?.blockReason;
          throw new Error(blocked ? `Diblokir: ${blocked}` : 'Respons kosong dari model');
        }

        return parts.map((p: any) => p.text || '').join('').trim() || 'Maaf, aku tidak bisa membalas sekarang.';
      } catch (e) {
        // Abort dari user jangan ditelan
        if (e instanceof Error && e.name === 'AbortError') throw e;
        lastErr = e instanceof Error ? e : new Error(String(e));
        // lanjut ke model cadangan berikutnya
      }
    }

    throw lastErr ?? new Error('Semua model Gemini gagal');
  }
}

/**
 * Factory: pilih provider otomatis berdasarkan environment.
 * Prioritas:
 *   1. ProxyChatProvider  (NEXT_PUBLIC_CHAT_PROXY_ENDPOINT) — paling aman, key di server
 *   2. GeminiChatProvider (NEXT_PUBLIC_GEMINI_API_KEY)       — langsung ke Gemini
 *   3. MockChatProvider   (fallback)                         — offline / canned
 */
export function createChatProvider(): ChatProvider {
  if (typeof window === 'undefined') return new MockChatProvider();

  const proxy = process.env.NEXT_PUBLIC_CHAT_PROXY_ENDPOINT;
  const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const geminiModel = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-3.8-flash';

  if (proxy) return new ProxyChatProvider(proxy);
  if (geminiKey) return new GeminiChatProvider(geminiKey, geminiModel);
  return new MockChatProvider();
}

export function getChatProviderInfo(): { name: string; active: boolean } {
  if (typeof window === 'undefined') return { name: 'mock', active: false };
  const proxy = process.env.NEXT_PUBLIC_CHAT_PROXY_ENDPOINT;
  const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (proxy) return { name: 'proxy', active: true };
  if (geminiKey) return { name: 'gemini', active: true };
  return { name: 'mock', active: false };
}