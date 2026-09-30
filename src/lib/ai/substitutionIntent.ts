/**
 * T9.1 — Pemetaan maksud pengguna → `SubstituteReason` tertutup.
 *
 * Sumber kebenaran tetap `substitutions.ts`; modul ini HANYA memetakan
 * teks bebas pengguna ke salah satu alasan yang sudah disiapkan (AI_CHAT.md
 * bagian 6.1 / skill.md Resep J). Tidak pernah mengarang pengganti.
 *
 * T9.3 — Guardrail cedera akut vs pegal biasa:
 *  - Cedera akut (kepeleset, bengkak, nyeri tajam) → `acute_injury`:
 *    TIDAK BOLEH ada substitusi yang ditawarkan.
 *  - Tidak yakin antara pegal/cedera → konservatif: `acute_injury`.
 *  - Permintaan "anggap saja pegal biasa" tidak mengubah penilaian.
 *
 * Bagaimana AI berkomunikasi dengan modul ini (T9.2): asisten diminta
 * membungkus jawabannya dengan tag `[[SUBSTITUTE:<alasan>]]` (lihat
 * guardrails.ts). `extractSubstitutionTag` mem-parsing tag itu dan
 * memvalidasinya terhadap tabel — tag yang tidak valid diabaikan.
 */
import {
  detectAcuteInjury,
  hasSubstitutionRule,
  type SubstituteReason,
} from '@/lib/schedule/substitutions';
import { detectSafetyConcerns } from '@/lib/providers/chat/guardrails';

export { detectAcuteInjury };

/**
 * Hasil klasifikasi maksud substitusi.
 * - `acute_injury`  → jangan tawarkan substitusi apa pun (AI_CHAT.md 7)
 * - `proposal`      → tampilkan kartu usulan dari tabel
 * - `none`          → bukan permintaan substitusi (AI bebas menjawab)
 */
export type SubstitutionIntent =
  | { kind: 'acute_injury' }
  | { kind: 'proposal'; reason: Exclude<SubstituteReason, 'lainnya'> }
  | { kind: 'none' };

// ---------------------------------------------------------------------------
// Pola per alasan (urutan = prioritas).
// Demam & area spesifik dicek sebelum "capek/pegal" agar nyeri area tetap
// dipetakan ke substitusi area, bukan versi ringan.
//
// Cocokan memakai substring sederhana karena detektor cedera akut dan
// safety concern sudah berjalan lebih dulu (jadi kecocokan longgar di
// sini tidak berbahaya); ini bukan parsing medis.
// ---------------------------------------------------------------------------

function hasWord(text: string, phrase: string): boolean {
  return text.toLowerCase().includes(phrase.toLowerCase());
}

function hasAny(text: string, phrases: string[]): boolean {
  return phrases.some((p) => hasWord(text, p));
}

// Gejala area spesifik (bukan tanda akut — bengkak/nyeri tajam ditangani
// detectAcuteInjury lebih dulu).
const GEJALA_AREA = ['sakit', 'nyeri', 'ngilu', 'kaku', 'lemas', 'berat', 'agu', 'nyut'];
// "Capek/lelah" umum diperlakukan sebagai pegal biasa (AI_CHAT.md 8 baris 9).
const GEJALA_LELAH = ['capek', 'capai', 'lelah', 'kurang tidur', 'ngantuk', 'pegal', 'lemas', 'malas'];
const DEMAM = ['demam', 'meriang', 'panas dingin', 'muntah', 'diare', 'pilek parah', 'batuk berat', 'flu berat'];
const HUJAN = ['hujan', 'gerimis', 'banjir', 'badai', 'petir'];
const AREA_KAKI = ['kaki', 'lutut', 'pergelangan kaki', 'betis', 'paha', 'jari kaki', 'tumit'];
const AREA_TANGAN = ['tangan', 'bahu', 'pergelangan tangan', 'siku', 'lengan', 'jari tangan', 'punggung', 'leher'];

type ClassifyFn = (text: string) => SubstitutionIntent | null;

// Tiap langkah mengembalikan null bila tidak cocok untuk dilanjutkan.
const STEPS: ClassifyFn[] = [
  (text) => (hasAny(text, DEMAM) ? { kind: 'proposal', reason: 'sakit_demam' } : null),
  (text) =>
    hasAny(text, AREA_KAKI) && hasAny(text, GEJALA_AREA)
      ? { kind: 'proposal', reason: 'sakit_kaki_lutut' }
      : null,
  (text) =>
    hasAny(text, AREA_TANGAN) && hasAny(text, GEJALA_AREA)
      ? { kind: 'proposal', reason: 'sakit_tangan_bahu' }
      : null,
  (text) => (hasAny(text, HUJAN) ? { kind: 'proposal', reason: 'cuaca_hujan' } : null),
  (text) => (hasAny(text, GEJALA_LELAH) ? { kind: 'proposal', reason: 'capek_kurang_tidur' } : null),
];

/**
 * Klasifikasikan maksud pengguna dari teks bebas (deteksi sisi klien,
 * dipakai saat AI tidak menandai / mode offline).
 */
export function classifySubstitutionIntent(text: string): SubstitutionIntent {
  // 1. Konten yang membahayakan/darurat → bukan substitusi (safety response menangani).
  if (detectSafetyConcerns(text) !== 'none') return { kind: 'none' };

  // 2. Cedera akut → jangan tawarkan substitusi apa pun.
  if (detectAcuteInjury(text)) return { kind: 'acute_injury' };

  // 3. Petakan ke alasan tertutup.
  for (const step of STEPS) {
    const result = step(text);
    if (result) return result;
  }
  return { kind: 'none' };
}

/**
 * Klasifikasi dengan riwayat percakapan (T9.3, red-team baris ke-13).
 *
 * Jika teks mana pun dalam riwayat menyebut cedera akut (kepeleset, nyeri
 * tajam, bengkak, …), permintaan "anggap aja cuma pegal biasa" TIDAK boleh
 * menurunkan penilaian — tetap `acute_injury`.
 */
export function classifySubstitutionIntentWithHistory(texts: string[]): SubstitutionIntent {
  const joined = texts.join('\n');
  if (detectSafetyConcerns(joined) !== 'none') return { kind: 'none' };
  if (detectAcuteInjury(joined)) return { kind: 'acute_injury' };
  return classifySubstitutionIntent(texts[texts.length - 1] ?? '');
}

// ---------------------------------------------------------------------------
// Parser tag dari jawaban AI (T9.2)
// ---------------------------------------------------------------------------

const TAG_RE = /\[\[SUBSTITUTE:([a-z_]+)\]\]/i;

/**
 * Ambil & validasi tag `[[SUBSTITUTE:<alasan>]]` dari jawaban AI.
 *
 * Mengembalikan null bila tidak ada tag atau alasan tidak ada di tabel
 * (termasuk 'lainnya' — tidak boleh ada substitusi otomatis).
 *
 * Catatan: tag `[[SUBSTITUTE:acute_injury]]` sengaja tidak diterima di sini
 * (bukan SubstituteReason). AI menandai cedera akut melalui
 * `hasAcuteInjuryTag`, yang memakai parser tag mentah — bukan validator tabel.
 */
export function extractSubstitutionTag(text: string): Exclude<SubstituteReason, 'lainnya'> | null {
  const m = TAG_RE.exec(text);
  if (!m) return null;
  const reason = m[1] as SubstituteReason;
  return hasSubstitutionRule(reason) ? reason : null;
}

/**
 * Hapus tag dari teks jawaban AI sebelum ditampilkan di thread chat.
 */
export function stripSubstitutionTag(text: string): string {
  return text
    .replace(TAG_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Apakah tag `[[SUBSTITUTE:acute_injury]]` muncul di jawaban AI?
 * AI memakai penanda ini saat ia sendiri menyimpulkan cedera akut.
 */
export function hasAcuteInjuryTag(text: string): boolean {
  const m = TAG_RE.exec(text);
  return !!m && m[1] === 'acute_injury';
}
