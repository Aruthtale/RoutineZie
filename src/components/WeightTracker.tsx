'use client';

import React, { useState, useEffect } from 'react';
import { RoutineRepository } from '@/lib/db/repository';
import { WeightLog } from '@/lib/db';
import InkChart, { InkChartPoint } from './InkChart';
import { Scale, Plus, AlertTriangle, Info, Calendar } from 'lucide-react';

export default function WeightTracker() {
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [inputKg, setInputKg] = useState('');
  const [inputDate, setInputDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [inputNote, setInputNote] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await RoutineRepository.getWeightLogs();
      setLogs(data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const kg = parseFloat(inputKg.replace(',', '.'));
    if (isNaN(kg) || kg <= 0) return;

    await RoutineRepository.saveWeightLog(inputDate, kg, inputNote.trim() || undefined);
    setInputKg('');
    setInputNote('');
    await loadData();
  };

  // Status calculation
  let statusText = '';
  let isAlert = false;

  if (logs.length >= 2) {
    const latest = logs[logs.length - 1];
    const prev = logs[logs.length - 2];
    const diff = parseFloat((latest.kg - prev.kg).toFixed(1));

    if (diff > 0) {
      statusText = `NAIK ${diff.toString().replace('.', ',')} KG minggu ini.`;
    } else if (diff === 0) {
      statusText = 'TETAP. Cek apakah makan cukup.';
    } else {
      // It decreased. Check if decreased 2 times in a row
      if (logs.length >= 3) {
        const beforePrev = logs[logs.length - 3];
        const prevDiff = parseFloat((prev.kg - beforePrev.kg).toFixed(1));
        if (prevDiff < 0) {
          isAlert = true;
          statusText =
            'TURUN 2x berturut-turut. Ini perlu dicek. Bicarakan dengan orang tua/wali atau tenaga kesehatan.';
        } else {
          statusText = `TURUN ${Math.abs(diff).toString().replace('.', ',')} KG minggu ini.`;
        }
      } else {
        statusText = `TURUN ${Math.abs(diff).toString().replace('.', ',')} KG minggu ini.`;
      }
    }
  } else if (logs.length === 1) {
    statusText = 'Belum ada data pembanding. Catat minggu berikutnya.';
  }

  // Format data for InkChart
  const chartData: InkChartPoint[] = logs.map((l) => {
    // Format YYYY-MM-DD to DD/MM
    const parts = l.dateISO.split('-');
    const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : l.dateISO;
    return {
      label,
      value: l.kg,
    };
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[#09090b] pb-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-[#09090b] flex items-center gap-1.5">
          <Scale className="w-4 h-4 text-[#09090b]" /> LOG BERAT BADAN MINGGUAN
        </h3>
        <span className="text-[11px] font-black uppercase text-[#09090b]/60 bg-[#09090b]/5 px-2 py-0.5 neo-box-sm">
          1X / MINGGU
        </span>
      </div>

      {/* InkChart Component */}
      <InkChart data={chartData} unit="kg" height={190} />

      {/* Status Feedback (Design 6.5 netral) */}
      {statusText && (
        <div
          className={`neo-box p-3 ${
            isAlert ? 'bg-[#ffffff] border-[#09090b] shadow-[3px_3px_0px_#09090b]' : 'bg-[#09090b]/5'
          }`}
        >
          <div className="flex items-start gap-2">
            {isAlert ? (
              <AlertTriangle className="w-4 h-4 text-[#09090b] shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-[#09090b] shrink-0 mt-0.5" />
            )}
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider block text-[#09090b]/70">
                STATUS PERKEMBANGAN
              </span>
              <p
                className={`text-xs font-bold leading-relaxed ${
                  isAlert ? 'text-[#09090b] font-black' : 'text-[#09090b]'
                }`}
              >
                {statusText}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSave} className="neo-box p-3.5 bg-[#ffffff] space-y-3">
        <span className="text-xs font-black uppercase tracking-wider block text-[#09090b]">
          CATAT TIMBANGAN BARU
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-bold text-[#09090b]/70 block mb-1">TANGGAL</label>
            <input
              type="date"
              value={inputDate}
              onChange={(e) => setInputDate(e.target.value)}
              className="neo-box-sm w-full p-2 text-xs font-mono font-bold bg-[#ffffff] text-[#09090b]"
              required
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#09090b]/70 block mb-1">BERAT (KG)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Mis. 55.5"
              value={inputKg}
              onChange={(e) => setInputKg(e.target.value)}
              className="neo-box-sm w-full p-2 text-xs font-mono font-black bg-[#ffffff] text-[#09090b]"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-[#09090b]/70 block mb-1">CATATAN (OPSIONAL)</label>
          <input
            type="text"
            placeholder="Kondisi: pagi bangun tidur..."
            value={inputNote}
            onChange={(e) => setInputNote(e.target.value)}
            className="neo-box-sm w-full p-2 text-xs font-medium bg-[#ffffff] text-[#09090b]"
          />
        </div>

        <button
          type="submit"
          className="neo-btn w-full bg-[#09090b] text-[#ffffff] py-2 text-xs font-black uppercase flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> SIMPAN LOG BERAT
        </button>
      </form>

      {/* Recent Logs List */}
      {logs.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-black uppercase text-[#09090b]/60 block tracking-wider">
            RIWAYAT TIMBANGAN
          </span>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {[...logs].reverse().map((log) => (
              <div
                key={log.id}
                className="neo-box-sm p-2 flex items-center justify-between text-xs bg-[#ffffff]"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#09090b]/50" />
                  <span className="font-mono font-bold text-[#09090b]">{log.dateISO}</span>
                  {log.note && (
                    <span className="text-[11px] text-[#09090b]/60 truncate max-w-[120px]">
                      ({log.note})
                    </span>
                  )}
                </div>
                <span className="font-mono font-black text-sm text-[#09090b]">{log.kg} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
