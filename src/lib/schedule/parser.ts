import rawData from '@/data/jadwal_mingguan.json';

export interface TimeSlot {
  startMinutes: number; // e.g. 05.00 -> 5*60 + 0 = 300
  endMinutes: number;   // e.g. 05.20 -> 5*60 + 20 = 320
  rawWaktu: string;
}

/**
 * Parses time string like "05.00-05.20" or "05.00" or "Bagian 1: Pagi (06.30-08.00)"
 */
export function parseWaktu(waktuStr: string): TimeSlot | null {
  if (!waktuStr) return null;

  // Extract pattern like 05.00-05.20 or 05:00-05:20
  const matchRange = waktuStr.match(/(\d{1,2})[\.:](\d{2})\s*[-–—]\s*(\d{1,2})[\.:](\d{2})/);
  if (matchRange) {
    const startH = parseInt(matchRange[1], 10);
    const startM = parseInt(matchRange[2], 10);
    const endH = parseInt(matchRange[3], 10);
    const endM = parseInt(matchRange[4], 10);

    return {
      startMinutes: startH * 60 + startM,
      endMinutes: endH * 60 + endM,
      rawWaktu: waktuStr,
    };
  }

  // Single time point e.g. "05.00"
  const matchSingle = waktuStr.match(/(\d{1,2})[\.:](\d{2})/);
  if (matchSingle) {
    const h = parseInt(matchSingle[1], 10);
    const m = parseInt(matchSingle[2], 10);
    const mins = h * 60 + m;
    return {
      startMinutes: mins,
      endMinutes: mins + 30, // Default duration 30m if single point
      rawWaktu: waktuStr,
    };
  }

  return null;
}

/**
 * Determines daily phase from current time in minutes:
 * Pagi (05:00 - 11:59), Siang (12:00 - 16:59), Sore (17:00 - 19:59), Malam (20:00 - 04:59)
 */
export function getPhaseFromTime(timeInMinutes: number): 'pagi' | 'siang' | 'sore' | 'malam' {
  if (timeInMinutes >= 300 && timeInMinutes < 720) return 'pagi';
  if (timeInMinutes >= 720 && timeInMinutes < 1020) return 'siang';
  if (timeInMinutes >= 1020 && timeInMinutes < 1200) return 'sore';
  return 'malam';
}

export interface NowAndNextResult {
  nowItem: any | null;
  nextItem: any | null;
  currentPhase: 'pagi' | 'siang' | 'sore' | 'malam';
}

/**
 * T8.5 — Ambil jam pulang PKL dari string seperti "08.00-17.00".
 * Mengembalikan jumlah menit sejak tengah malam (mis. 17.00 → 1020), atau
 * null jika tidak ada jam (mis. "Libur" atau format tak dikenal).
 */
export function getPulangMinutes(pkl: string | undefined): number | null {
  if (!pkl || /libur/i.test(pkl)) return null;
  const jam = pkl.split('-')[1]?.trim() ?? '';
  const m = jam.match(/(\d{1,2})[.:](\d{2})/);
  if (!m) return null;
  const jamNum = parseInt(m[1], 10);
  const menitNum = parseInt(m[2], 10);
  return jamNum * 60 + menitNum;
}

/** Format menit menjadi "HH.MM" (mis. 1020 → "17.00"). */
export function formatJam(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
}

/**
 * T8.4 — Cari gerakan yang disebut dalam teks jawaban AI. Cocokkan nama gerakan
 * (case-insensitive) terhadap daftar latihan hari ini. Mengembalikan nama asli
 * dari data, atau null bila tidak ada yang cocok.
 */
export function findMentionedExercise(
  text: string,
  exercises: { nama: string }[]
): string | null {
  const lower = text.toLowerCase();
  // Urutkan dari nama terpanjang agar "push up" tidak kalah oleh "up".
  const sorted = [...exercises].sort((a, b) => b.nama.length - a.nama.length);
  for (const ex of sorted) {
    const nama = ex.nama.trim().toLowerCase();
    if (nama.length >= 4 && lower.includes(nama)) {
      return ex.nama;
    }
  }
  return null;
}

export function getNowAndNext(jadwalList: any[], timeInMinutes: number): NowAndNextResult {
  const currentPhase = getPhaseFromTime(timeInMinutes);
  let nowItem: any | null = null;
  let nextItem: any | null = null;

  for (let i = 0; i < jadwalList.length; i++) {
    const item = jadwalList[i];
    const parsed = parseWaktu(item.waktu);
    if (!parsed) continue;

    if (timeInMinutes >= parsed.startMinutes && timeInMinutes < parsed.endMinutes) {
      nowItem = item;
      nextItem = jadwalList[i + 1] || null;
      break;
    } else if (timeInMinutes < parsed.startMinutes) {
      if (!nowItem) {
        // We are before this slot
        nextItem = item;
        break;
      }
    }
  }

  return { nowItem, nextItem, currentPhase };
}

export interface NormalizedSet {
  setIndex: number;
  target: string;
  tipeTarget: 'reps' | 'durasi';
  restSec: number;
}

export interface NormalizedExercise {
  nama: string;
  tipe: 'reps' | 'durasi';
  setCount: number;
  sets: NormalizedSet[];
  durasiMinutes?: number;
  ototTarget?: string;
  peralatan?: string;
  catatan?: string | null;
  cara: string[];
  tipsForm?: string | null;
  kesalahanUmum?: string | null;
  versiMudah?: string | null;
  versiSulit?: string | null;
}

export interface NormalizedWorkout {
  nama: string;
  durasi?: string;
  intensitas?: string;
  latihan: NormalizedExercise[];
  pemanasan?: string | null;
  istirahatAntarSet?: string | null;
  ototUtama?: string;
}

export function normalizeWorkoutData(workoutRaw: any): NormalizedWorkout | null {
  if (!workoutRaw) return null;

  let rawList: any[] = [];
  if (Array.isArray(workoutRaw.latihan)) {
    rawList = workoutRaw.latihan;
  } else if (Array.isArray(workoutRaw.bagian)) {
    // Flatten bagian array (e.g. Sabtu: Bagian 1 Running + Bagian 2 Calisthenics)
    workoutRaw.bagian.forEach((b: any) => {
      if (Array.isArray(b.latihan)) {
        rawList.push(...b.latihan);
      }
    });
  }

  const normalizedList: NormalizedExercise[] = rawList.map((ex: any) => {
    const exerciseName = ex.latihan || ex.nama || 'Latihan';
    const repOrTimeStr = ex.repetisi_atau_waktu || ex.target || '';
    
    // Check if exercise is duration based (e.g., "5 menit", "20-25 menit", "1 menit 30 detik")
    const isDuration = /menit|detik|min|sec/i.test(repOrTimeStr) || ex.set === null;
    
    // Parse duration minutes if available
    let durasiMins = 0;
    const durMatch = repOrTimeStr.match(/(\d+)(?:-(\d+))?\s*menit/i);
    if (durMatch) {
      durasiMins = parseInt(durMatch[2] || durMatch[1], 10);
    }

    // Determine set count and sets array
    let sets: { setIndex: number; target: string; tipeTarget: 'reps' | 'durasi'; restSec: number }[] = [];
    if (isDuration) {
      sets = [{
        setIndex: 0,
        target: repOrTimeStr || 'Durasi',
        tipeTarget: 'durasi',
        restSec: 0
      }];
    } else {
      const setCount = typeof ex.set === 'number' ? ex.set : (Array.isArray(ex.set) ? ex.set.length : 3);
      for (let i = 0; i < setCount; i++) {
        sets.push({
          setIndex: i,
          target: repOrTimeStr || '8-12',
          tipeTarget: 'reps',
          restSec: 60
        });
      }
    }

    // Convert cara_melakukan array or string
    let caraArray: string[] = [];
    if (Array.isArray(ex.cara_melakukan)) {
      caraArray = ex.cara_melakukan;
    } else if (typeof ex.cara_melakukan === 'string') {
      caraArray = [ex.cara_melakukan];
    } else if (typeof ex.cara === 'string') {
      caraArray = [ex.cara];
    }

    return {
      nama: exerciseName,
      tipe: isDuration ? 'durasi' : 'reps',
      setCount: sets.length,
      sets,
      durasiMinutes: durasiMins,
      ototTarget: ex.otot_target || ex.ototTarget,
      peralatan: ex.peralatan || ex.alat || (isDuration ? 'SEPATU / BOTOL AIR' : 'TANPA ALAT'),
      catatan: ex.catatan,
      cara: caraArray,
      tipsForm: ex.tips_form || ex.tipsForm,
      kesalahanUmum: ex.kesalahan_umum || ex.kesalahanUmum,
      versiMudah: ex.versi_lebih_mudah || ex.versiMudah,
      versiSulit: ex.versi_lebih_sulit || ex.versiSulit,
    };
  });

  return {
    nama: workoutRaw.nama || 'Workout',
    durasi: workoutRaw.durasi,
    intensitas: workoutRaw.intensitas,
    pemanasan: workoutRaw.pemanasan,
    istirahatAntarSet: workoutRaw.istirahat_antar_set,
    ototUtama: workoutRaw.otot_utama,
    latihan: normalizedList,
  };
}

export function getScheduleForDay(dayName: string) {
  const normalizedDay = dayName.trim().toLowerCase();
  const dayObj = (rawData.hari as any[]).find(
    (h) => h.hari && h.hari.trim().toLowerCase() === normalizedDay
  );

  if (!dayObj) return null;

  return {
    ...dayObj,
    normalizedWorkout: normalizeWorkoutData(dayObj.workout),
  };
}
