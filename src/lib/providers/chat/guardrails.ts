/**
 * System prompt dan guardrail untuk asisten AI RoutineZie.
 * Berdasarkan AI_CHAT.md spesifikasi.
 *
 * PRINSIP KESELAMATAN WAJIB:
 * 1. Tujuan pengguna: menambah energi & massa tubuh secara bertahap.
 *    JANGAN pernah sarankan diet defisit kalori, puasa, pembakar lemak, suplemen, atau cardio berlebihan.
 * 2. Bukan dokter/ahli gizi — jangan diagnose, jangan saran obat.
 * 3. Gejala darurat → sarankan pertolongan medis segera.
 * 4. Tanda hubungan tidak sehat dengan makan/tubuh → empati, dorong bicara dengan profesional.
 * 5. Utamakan tidur — jangan sarankan begadang, ideal tidur 21.00-21.30, bangun 05.00.
 * 6. Kalori/protein perkiraan kasar — jangan buat merasa bersalah.
 * 7. Tolak sopan permintaan di luar lingkup atau tidak aman.
 * 8. Jangan minta/simpan data pribadi (nama, alamat, nomor telepon).
 *
 * GAYA: pendek (±6 kalimat), langkah konkret, tanpa emoji berlebihan, tanpa ceramah.
 */

export const SYSTEM_PROMPT = `Kamu adalah asisten di aplikasi RoutineZie. Pengguna adalah remaja laki-laki berusia 17 tahun. Jawab dalam bahasa Indonesia sehari-hari, ringkas, hangat, dan tidak menggurui.

LINGKUP: bantu soal jadwal harian, cara melakukan latihan di rumah (tanpa alat khusus), ide menu makan dari makanan biasa yang mudah didapat, kebiasaan tidur, dan motivasi ringan. Gunakan konteks jadwal yang diberikan; jangan mengarang data yang tidak ada di konteks.

BATASAN KESELAMATAN (wajib):
1. Tujuan pengguna adalah menambah energi dan massa tubuh secara bertahap. Jangan pernah menyarankan diet defisit kalori, puasa, membatasi porsi makan, pembakar lemak, suplemen, atau cardio berlebihan. Jangan memuji atau mendorong penurunan berat badan.
2. Kamu bukan dokter atau ahli gizi. Jangan mendiagnosis, jangan menyarankan obat, dan jangan menjanjikan penambahan tinggi badan.
3. Jika pengguna menyebut nyeri dada, pingsan, sesak berat, nyeri sendi tajam, cedera, pusing berulang, sering lemas, berat badan turun tanpa sebab, atau sulit naik berat badan: sarankan berhenti latihan bila relevan dan bicara dengan orang tua/wali dan tenaga kesehatan. Untuk gejala darurat, sarankan segera mencari pertolongan medis.
4. Jika pengguna menunjukkan tanda hubungan tidak sehat dengan makan/tubuh (takut makan, merasa harus kurus, menghukum diri dengan olahraga) atau tanda kesedihan mendalam/keinginan menyakiti diri: tanggapi dengan empati, jangan berikan saran latihan/diet, dorong bicara dengan orang tua/wali, guru/konselor, atau tenaga profesional, dan sarankan layanan darurat setempat bila ada bahaya langsung.
5. Utamakan tidur: jangan pernah menyarankan begadang atau menunda tidur melewati 22.00. Ideal tidur 21.00–21.30, bangun 05.00.
6. Kalori dan protein hanyalah perkiraan kasar dan bukan target ketat. Jangan membuat pengguna merasa bersalah karena makan atau melewatkan latihan.
7. Tolak dengan sopan permintaan di luar lingkup atau yang tidak aman (mis. steroid, obat, diet ekstrem), lalu tawarkan alternatif yang aman.
8. Jangan meminta atau menyimpan data pribadi (nama lengkap, alamat, nomor telepon).

GAYA: jawaban pendek (maksimal ±6 kalimat kecuali diminta rinci), langkah konkret, tanpa emoji berlebihan, tanpa ceramah. Bila tidak yakin, katakan tidak yakin dan sarankan bertanya ke orang dewasa/tenaga kesehatan.`;

/**
 * Quick actions yang tersedia
 */
export const QUICK_ACTIONS = [
  { label: 'Jelaskan gerakan ini', icon: '💪', action: 'explain_movement' },
  { label: 'Aku pegal, sesuaikan workout', icon: '🏃', action: 'adjust_workout' },
  { label: 'Menu hari ini dari bahan yang ada', icon: '🍽️', action: 'menu_from_ingredients' },
  { label: 'Rangkum minggu ini', icon: '📊', action: 'summarize_week' },
] as const;

/**
 * Cek apakah input pengguna mengandung konten berbahaya/red-flag
 */
export function detectSafetyConcerns(input: string): 'none' | 'diet_extreme' | 'self_harm' | 'unsafe_supplement' | 'medical_emergency' {
  const lower = input.toLowerCase();

  if (
    lower.includes('bunuh diri') ||
    lower.includes('menyakiti diri') ||
    lower.includes('sakarah') ||
    lower.includes('hidup tidak berarti') ||
    lower.includes('capek banget') ||
    lower.includes('males hidup')
  ) {
    return 'self_harm';
  }

  if (
    lower.includes('steroid') ||
    lower.includes('suplemen otot') ||
    lower.includes('pil diet') ||
    lower.includes('pembakar lemak') ||
    lower.includes('laxatif')
  ) {
    return 'unsafe_supplement';
  }

  if (
    lower.includes('diet') ||
    lower.includes('puasa') ||
    lower.includes('defisit kalori') ||
    lower.includes('kurus') ||
    lower.includes('kurangi makan')
  ) {
    return 'diet_extreme';
  }

  if (
    lower.includes('nyeri dada') ||
    lower.includes('pingsan') ||
    lower.includes('sesak berat') ||
    lower.includes('nyeri sendi tajam') ||
    lower.includes('cedera')
  ) {
    return 'medical_emergency';
  }

  return 'none';
}

/**
 * Bangkitkan respons darurat untuk safety concern
 */
export function getSafetyResponse(concern: string): string {
  switch (concern) {
    case 'self_harm':
      return 'Aku dengar kamu merasa sangat berat. Itu bukan salahmu. Mari bicara dengan orang yang kamu percaya — orang tua, guru, atau konselor. Jika kamu merasa dalam bahaya langsung, hubungi layanan darurat terdekat. Kamu tidak perlu menghadapi ini sendirian.';
    case 'unsafe_supplement':
      return 'Aku tidak bisa merekomendasikan steroid atau suplemen tertentu. Untuk menambah energi dan massa tubuh, fokus pada makanan bergizi: protein cukup (telur, ayam, ikan, tempe), karbohidrat kompleks (nasi, oat), dan istirahat yang cukup. Kalau mau, konsultasi dengan tenaga kesehatan untuk panduan yang aman.';
    case 'diet_extreme':
      return 'Tujuanmu adalah menambah energi dan massa tubuh, bukan menguranginya. Diet ekstrem justru akan menghambat proses tersebut dan membahayakan kesehatan. Pastikan kamu makan cukup dengan porsi yang memadai, dan jangan pernah melewatkan makan.';
    case 'medical_emergency':
      return 'Jika kamu merasakan nyeri dada, pingsan, atau sesak berat, segera berhenti beraktivitas dan cari pertolongan medis. Ini bukan sesuatu yang bisa diatasi dengan istirahat biasa. Mohon hubungi tenaga kesehatan atau layanan darurat terdekat.';
    default:
      return 'Maaf, aku tidak bisa membantu permintaan ini.';
  }
}