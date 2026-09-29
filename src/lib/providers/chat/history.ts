import { ChatHistoryEntry } from '@/lib/providers/chat/types';
import { db } from '@/lib/db/index';

const CHAT_HISTORY_TABLE = 'chat_history';

/**
 * ChatHistoryManager - mengelola riwayat chat lokal dengan Dexie
 * 
 * Fitur:
 * - Simpan riwayat chat lengkap dengan konteks
 * - Kuota chat (dapat dihitung berdasarkan jumlah pesan)
 * - Mode offline (menggunakan data lokal)
 * - Hapus riwayat dengan konfirmasi
 * 
 * Struktur data:
 * - id: unique ID (UUID)
 * - dateISO: tanggal waktu chat
 * - messages: array of ChatMsg
 *   contextUsed: ChatContext yang digunakan
 *   modelUsed: model AI yang dipakai
 *   createdAt: timestamp
 *   schemaVersion: untuk migrasi masa depan
 */
export class ChatHistoryManager {
  private collection: any;

  constructor() {
    this.collection = db.table('chat_history');
  }

  async save(entry: ChatHistoryEntry): Promise<void> {
    await this.collection.add(entry);
  }

  async getHistory(): Promise<ChatHistoryEntry[]> {
    return this.collection.getAll();
  }

  async getHistoryByDate(date: string): Promise<ChatHistoryEntry[]> {
    return this.collection.where('dateISO').equals(date).toArray();
  }

  async getTotalMessages(): Promise<number> {
    const entries = await this.getHistory();
    let total = 0;
    for (const entry of entries) {
      total += entry.messages.length;
    }
    return total;
  }

  async clearHistory(): Promise<void> {
    await this.collection.clear();
  }
}