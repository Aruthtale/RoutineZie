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
 * FirebaseAIProvider - menggunakan Firebase AI Logic (Gemini API)
 * Pastikan @google/generative-ai terinstall di package.json
 */
export class FirebaseAIProvider implements ChatProvider {
  private client: any; // Will be initialized in constructor

  constructor() {
    // In real implementation, initialize Firebase SDK
    // This is a stub for now
    this.client = null;
  }

  async send(input: { messages: ChatMsg[]; context: ChatContext; signal?: AbortSignal }): Promise<string> {
    // Check if Firebase is available
    if (!this.client) {
      return 'Chat AI belum aktif. Hubungi administrator untuk aktivasi.';
    }

    try {
      // Convert context to the expected format for Firebase
      const contextPayload = {
        ...input.context,
        // Add any additional required fields for Firebase
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      return 'Ini adalah respons dari asisten AI. Aku akan membantu dengan hal-hal yang kamu butuhkan.';
    } catch (error) {
      console.error('Firebase AI call failed:', error);
      return 'Maaf, terjadi error saat mengakses layanan AI. Coba lagi atau gunakan mode offline.';
    }
  }

  async getQuota(): Promise<ChatQuota | null> {
    // In real implementation, this would fetch quota from Firebase
    // For now, return a mock quota
    return {
      remaining: 95,
      limit: 100,
      resetAt: '2026-09-29T00:00:00Z',
    };
  }
}