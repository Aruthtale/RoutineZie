'use client';

import React, { useState, useEffect } from 'react';
import { RoutineRepository } from '@/lib/db/repository';
import { AbilityTest } from '@/lib/db';
import { InkRun, InkStamp } from './icons/InkIcons';
import { Plus, History, TrendingUp, X } from 'lucide-react';
import { localDateISO } from '@/lib/date';

/**
 * T8.2c — Tes kemampuan berkala. Benchmark default diambil dari
 * kemampuan_saat_ini di jadwal_mingguan.json; pengguna bisa tambah baris
 * kustom. Hasil disimpan per tanggal, lalu dibandingkan dengan tes
 * sebelumnya untuk menampilkan tren (naik/turun/sama) tanpa penilaian.
 */

const DEFAULT_BENCHMARKS = [
  { nama: 'Push-up', satuan: 'kali' },
  { nama: 'Sit-up', satuan: 'kali' },
  { nama: 'Squat', satuan: 'kali' },
  { nama: 'Plank', satuan: 'detik' },
];

interface BarisInput {
  nama: string;
  nilai: string;
  satuan: string;
}

export default function AbilityTestPanel() {
  const [tests, setTests] = useState<AbilityTest[]>([]);
  const [inputDate, setInputDate] = useState(() => localDateISO());
  const [cycle, setCycle] = useState<'4-week' | '8-week'>('4-week');
  const [baris, setBaris] = useState<BarisInput[]>(
    DEFAULT_BENCHMARKS.map((b) => ({ ...b, nilai: '' }))
  );
  const [note, setNote] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await RoutineRepository.getAbilityTests(12);
      setTests(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const results = baris
      .filter((b) => b.nama.trim() && b.nilai.trim() !== '')
      .map((b) => {
        const nilai = parseFloat(b.nilai.replace(',', '.'));
        return { nama: b.nama.trim(), nilai: isNaN(nilai) ? 0 : nilai, satuan: b.satuan.trim() || 'kali' };
      })
      .filter((r) => r.nilai > 0);

    if (results.length === 0) return;

    await RoutineRepository.saveAbilityTest(inputDate, cycle, results, note.trim() || undefined);
    setBaris(DEFAULT_BENCHMARKS.map((b) => ({ ...b, nilai: '' })));
    setNote('');
    setShowForm(false);
    await loadData();
  };

  const tambahBaris = () => {
    setBaris((prev) => [...prev, { nama: '', nilai: '', satuan: 'kali' }]);
  };

  const hapusBaris = (idx: number) => {
    setBaris((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateBaris = (idx: number, field: keyof BarisInput, value: string) => {
    setBaris((prev) => prev.map((b, i) => (i === idx ? { ...b, [field]: value } : b)));
  };

  // Bandingkan tes terbaru dengan tes sebelumnya: tren per benchmark.
  const latest = tests[0];
  const prev = tests[1];
  const trenList = latest && prev ? bandingkanTests(prev, latest) : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b-2 border-ink pb-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
          <InkRun className="w-4 h-4" /> TES KEMAMPUAN
        </h3>
        <div className="flex gap-1.5">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="neo-btn bg-paper text-ink px-2.5 py-1 text-[10px] font-black uppercase flex items-center gap-1"
          >
            <History className="w-3 h-3" /> RIWAYAT
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="neo-btn bg-ink text-paper px-2.5 py-1 text-[10px] font-black uppercase flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> CATAT TES
          </button>
        </div>
      </div>

      {/* Ringkasan tren tes terakhir */}
      {!loading && tests.length === 0 && (
        <div className="neo-box p-3 bg-ink/5">
          <p className="text-xs font-medium text-ink/70 leading-relaxed">
            Belum ada tes tercatat. Lakukan tes pertama (push-up, sit-up, squat, plank) lalu
            catat hasilnya — tes berikutnya tiap 4 minggu untuk lihat perubahannya.
          </p>
        </div>
      )}

      {trenList.length > 0 && (
        <div className="neo-box p-3 bg-paper space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-ink/70 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> PERBANDINGAN TES TERAKHIR
          </span>
          <div className="space-y-1.5">
            {trenList.map((t, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="font-bold text-ink">{t.nama}</span>
                <span className="font-mono font-black text-ink">
                  {t.dari} → {t.ke} {t.satuan}{' '}
                  <span className={t.selisih > 0 ? 'text-green-700' : t.selisih < 0 ? 'text-red-600' : 'text-ink/50'}>
                    ({t.selisih > 0 ? '+' : ''}{t.selisih})
                  </span>
                </span>
              </div>
            ))}
          </div>
          {latest?.note && (
            <p className="text-[11px] text-ink/60 italic">“{latest.note}”</p>
          )}
        </div>
      )}

      {/* Form catat tes */}
      {showForm && (
        <form onSubmit={handleSave} className="neo-box p-3.5 bg-paper space-y-3">
          <span className="text-xs font-black uppercase tracking-wider block text-ink">
            CATAT HASIL TES
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-ink/70 block mb-1">TANGGAL</label>
              <input
                type="date"
                value={inputDate}
                onChange={(e) => setInputDate(e.target.value)}
                className="neo-box-sm w-full p-2 text-xs font-mono font-bold bg-paper text-ink"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-ink/70 block mb-1">SIKLUS</label>
              <select
                value={cycle}
                onChange={(e) => setCycle(e.target.value as '4-week' | '8-week')}
                className="neo-box-sm w-full p-2 text-xs font-bold bg-paper text-ink"
              >
                <option value="4-week">4 minggu</option>
                <option value="8-week">8 minggu</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            {baris.map((b, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Latihan"
                  value={b.nama}
                  onChange={(e) => updateBaris(idx, 'nama', e.target.value)}
                  className="neo-box-sm flex-1 p-1.5 text-xs font-bold bg-paper text-ink"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={b.nilai}
                  onChange={(e) => updateBaris(idx, 'nilai', e.target.value)}
                  className="neo-box-sm w-16 p-1.5 text-xs font-mono font-black bg-paper text-ink"
                />
                <input
                  type="text"
                  placeholder="satuan"
                  value={b.satuan}
                  onChange={(e) => updateBaris(idx, 'satuan', e.target.value)}
                  className="neo-box-sm w-20 p-1.5 text-[10px] font-medium bg-paper text-ink"
                />
                <button
                  type="button"
                  onClick={() => hapusBaris(idx)}
                  className="text-ink/40 hover:text-red-600 shrink-0 p-1"
                  aria-label="Hapus baris"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={tambahBaris}
            className="text-[11px] font-black uppercase text-ink/60 hover:text-ink flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> TAMBAH LATIHAN
          </button>

          <input
            type="text"
            placeholder="Catatan (opsional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="neo-box-sm w-full p-2 text-xs font-medium bg-paper text-ink"
          />

          <button
            type="submit"
            className="neo-btn w-full bg-ink text-paper py-2 text-xs font-black uppercase flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> SIMPAN HASIL TES
          </button>
        </form>
      )}

      {/* Riwayat tes */}
      {showHistory && tests.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-black uppercase text-ink/60 block tracking-wider">
            RIWAYAT TES ({tests.length})
          </span>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {tests.map((t) => (
              <div key={t.id} className="neo-box-sm p-2 bg-paper">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-black text-xs text-ink">{t.dateISO}</span>
                  <span className="text-[10px] font-black uppercase text-ink/50 bg-ink/5 px-1.5 py-0.5">
                    {t.cycle === '4-week' ? '4 MGG' : '8 MGG'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {t.results.map((r, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-bold font-mono text-ink bg-ink/5 px-1.5 py-0.5"
                    >
                      {r.nama}: {r.nilai} {r.satuan}
                    </span>
                  ))}
                </div>
                {t.note && (
                  <p className="text-[10px] text-ink/60 italic mt-1">“{t.note}”</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function bandingkanTests(
  a: AbilityTest,
  b: AbilityTest
): { nama: string; dari: number; ke: number; selisih: number; satuan: string }[] {
  const map = new Map(a.results.map((r) => [r.nama, r]));
  const out: { nama: string; dari: number; ke: number; selisih: number; satuan: string }[] = [];
  for (const rb of b.results) {
    const ra = map.get(rb.nama);
    if (!ra) continue;
    out.push({
      nama: rb.nama,
      dari: ra.nilai,
      ke: rb.nilai,
      selisih: parseFloat((rb.nilai - ra.nilai).toFixed(1)),
      satuan: rb.satuan,
    });
  }
  return out;
}
