export type ChatRole = 'user' | 'assistant';

/**
 * T8.4 — Lampiran kartu latihan. Bila asisten membahas sebuah gerakan dari
 * jadwal, kartu interaktif ditampilkan alih-alih teks polos.
 */
export interface ChatExerciseAttachment {
  /** Nama gerakan yang cocok dengan `NormalizedExercise.nama` di jadwal. */
  exerciseName: string;
}

export interface ChatMsg {
  role: ChatRole;
  text: string;
  timestamp?: string;
  attachment?: ChatExerciseAttachment;
}

export interface ChatContext {
  hariIni: {
    hari: string;
    tipe_hari: string;
    fokus: string;
    jadwalSingkat: { waktu: string; kegiatan: string }[];
    workout: { nama: string; latihan: { latihan: string; set: number | null; repetisi_atau_waktu: string }[] };
    pola_makan: { waktu: string; menu: string }[];
  };
  aturanTidur: { bangun: string; target: string; batas: string };
  usia: number;
  waktuSekarang: string;
}

export interface ChatQuota {
  remaining: number;
  limit: number;
  resetAt: string;
}

export interface ChatHistoryEntry {
  id: string; // e.g. "chat_2026-09-28T20:45:00"
  dateISO: string;
  messages: ChatMsg[];
  contextUsed: ChatContext;
  modelUsed: string;
  createdAt: string;
  schemaVersion: 1;
}

export interface ChatProvider {
  send(input: { messages: ChatMsg[]; context: ChatContext; signal?: AbortSignal }): AsyncIterable<string> | Promise<string>;
  getQuota?(): Promise<ChatQuota | null>;
}