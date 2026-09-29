/**
 * T8.1 — Utilitas makan: alternatif menu per slot (kelompok bahan sama) dan
 * agregasi daftar belanja mingguan dari `pola_makan` 7 hari.
 *
 * PRINSIP (agent.md): bukan penilaian. Daftar belanja hanya kumpulan bahan
 * yang muncul sepanjang minggu; alternatif ditampilkan tanpa memaksakan.
 */

export type MealSlot = 'sarapan' | 'makan_siang' | 'makan_malam' | 'selingan';

/**
 * Alternatif per slot, dikelompokkan menurut bahan inti yang sama dengan menu
 * default. Dipakai saat pengguna ingin variasi tanpa mengubah belanja.
 */
export const ALTERNATIF_MENU: Record<MealSlot, string[]> = {
  sarapan: [
    'Nasi + telur dadar + sayur',
    'Oat + susu + pisang',
    'Roti + selai kacang + telur rebus',
  ],
  makan_siang: [
    'Nasi + ayam/sapi + sayur + tempe',
    'Mie kuah + telur + sayur',
    'Kentang rebus + ikan + sayur',
  ],
  makan_malam: [
    'Nasi + ikan + sayur hijau',
    'Tempe/tahu + sayur + nasi',
    'Sup ayam + nasi + wortel',
  ],
  selingan: [
    'Susu + pisang',
    'Roti + telur rebus',
    'Yogurt + buah potong',
  ],
};

/**
 * Petakan jam makan ke slot. Input berupa string "HH.MM" atau label bebas.
 */
export function getMealSlot(waktu: string): MealSlot {
  const jam = parseInt(waktu.split('.')[0] ?? '0', 10);
  if (jam < 10) return 'sarapan';
  if (jam < 15) return 'makan_siang';
  if (jam < 18) return 'selingan';
  return 'makan_malam';
}

/**
 * Kelompok bahan utama yang dikenali dari teks menu. Dipakai agregasi belanja.
 * Kunci = nama kategori untuk tampilan, nilai = kata kunci pencarian.
 */
const KATEGORI_BAHAN: { nama: string; kunci: string[] }[] = [
  { nama: 'Karbohidrat', kunci: ['nasi', 'roti', 'mie', 'kentang', 'oat', 'bihun'] },
  { nama: 'Protein Hewani', kunci: ['telur', 'ayam', 'sapi', 'ikan', 'daging'] },
  { nama: 'Protein Nabati', kunci: ['tempe', 'tahu', 'kacang', 'susu', 'yogurt'] },
  { nama: 'Sayur', kunci: ['sayur', 'bayam', 'wortel', 'kangkung', 'tomat', 'timun'] },
  { nama: 'Buah', kunci: ['pisang', 'jeruk', 'apel', 'mangga', 'pepaya', 'buah'] },
];

export interface ShoppingItem {
  kategori: string;
  /** Bahan mentah yang ditemukan di menu. */
  bahan: string;
  /** Jumlah hari sepanjang minggu yang memuat bahan ini. */
  jumlahHari: number;
}

/**
 * T8.1 — Agregasi daftar belanja mingguan dari pola makan 7 hari.
 * Hanya bahan eksplisit di menu yang dihitung; tidak ada angka presisi.
 */
export function buildShoppingList(
  polaMakanMingguan: { waktu: string; menu: string }[]
): ShoppingItem[] {
  const counter = new Map<string, Map<string, Set<string>>>(); // kategori -> bahan -> set tanggal

  for (const meal of polaMakanMingguan) {
    const menuLower = meal.menu.toLowerCase();
    for (const kategori of KATEGORI_BAHAN) {
      for (const kunci of kategori.kunci) {
        if (menuLower.includes(kunci)) {
          if (!counter.has(kategori.nama)) counter.set(kategori.nama, new Map());
          const bahanMap = counter.get(kategori.nama)!;
          if (!bahanMap.has(kunci)) bahanMap.set(kunci, new Set());
          bahanMap.get(kunci)!.add(meal.waktu);
        }
      }
    }
  }

  const items: ShoppingItem[] = [];
  for (const [kategori, bahanMap] of counter) {
    for (const [bahan, waktuSet] of bahanMap) {
      items.push({ kategori, bahan, jumlahHari: waktuSet.size });
    }
  }

  // Urutkan: kategori, lalu yang paling sering muncul duluan.
  items.sort((a, b) => {
    if (a.kategori !== b.kategori) return a.kategori.localeCompare(b.kategori);
    return b.jumlahHari - a.jumlahHari;
  });
  return items;
}
