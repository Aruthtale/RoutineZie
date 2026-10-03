'use client';

import React, { useState } from 'react';
import { RoutineRepository } from '@/lib/db/repository';
import { Download, Upload, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

export default function ExportImportManager() {
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle Export
  const handleExport = async () => {
    try {
      setIsLoading(true);
      const jsonString = await RoutineRepository.exportAllData();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `cloverz-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage({ text: 'Data cadangan berhasil diunduh!', isError: false });
    } catch (e: any) {
      setStatusMessage({ text: `Gagal ekspor data: ${e.message}`, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle File Selection for Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.data) {
          setStatusMessage({ text: 'File cadangan tidak valid (format data tidak sesuai).', isError: true });
          setImportPreview(null);
          return;
        }

        setImportJsonText(text);
        setImportPreview({
          workouts: parsed.data.workouts?.length || 0,
          weights: parsed.data.weights?.length || 0,
          sleeps: parsed.data.sleeps?.length || 0,
          meals: parsed.data.meals?.length || 0,
          date: parsed.exportedAt || 'Tidak diketahui',
        });
        setStatusMessage(null);
      } catch (err: any) {
        setStatusMessage({ text: `Gagal membaca file JSON: ${err.message}`, isError: true });
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    if (!importJsonText) return;

    try {
      setIsLoading(true);
      const res = await RoutineRepository.importData(importJsonText);
      if (res.success) {
        setStatusMessage({ text: res.message, isError: false });
        setImportPreview(null);
        setImportJsonText('');
      } else {
        setStatusMessage({ text: res.message, isError: true });
      }
    } catch (e: any) {
      setStatusMessage({ text: `Gagal impor: ${e.message}`, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b-2 border-ink pb-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-ink" /> CADANGAN DATA (OFFLINE-FIRST)
        </h3>
        <span className="text-[11px] font-black uppercase text-ink/60 bg-ink/5 px-2 py-0.5 neo-box-sm">
          JSON SYNC
        </span>
      </div>

      <p className="text-xs text-ink/80 leading-relaxed font-medium">
        Seluruh data Anda disimpan secara lokal di perangkat. Gunakan ekspor secara berkala untuk mencadangkan catatan latihan, berat badan, tidur, dan makanan Anda.
      </p>

      {/* Export Section */}
      <div className="neo-box p-3.5 bg-paper space-y-2">
        <span className="text-xs font-black uppercase tracking-wider block text-ink">
          EKSPOR CADANGAN
        </span>
        <button
          onClick={handleExport}
          disabled={isLoading}
          className="neo-btn-black w-full py-2.5 text-xs uppercase font-black flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" /> UNDUH FILE CADANGAN (JSON)
        </button>
      </div>

      {/* Import Section */}
      <div className="neo-box p-3.5 bg-paper space-y-3">
        <span className="text-xs font-black uppercase tracking-wider block text-ink">
          PULIHKAN DATA (IMPOR)
        </span>

        <div>
          <label className="neo-btn bg-paper hover:bg-ink/5 text-ink w-full py-2.5 text-xs font-black uppercase flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" /> PILIH FILE BACKUP (.JSON)
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Import Preview */}
        {importPreview && (
          <div className="neo-box-sm p-3 bg-ink/5 space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider block text-ink">
              PRATINJAU DATA YANG AKAN DIPULIHKAN:
            </span>
            <ul className="text-xs font-mono text-ink space-y-1">
              <li>• Log Latihan: {importPreview.workouts} sesi</li>
              <li>• Log Berat Badan: {importPreview.weights} entri</li>
              <li>• Log Tidur: {importPreview.sleeps} entri</li>
              <li>• Checklist Makanan: {importPreview.meals} entri</li>
              <li>• Tanggal Ekspor: {importPreview.date}</li>
            </ul>

            <button
              onClick={handleConfirmImport}
              disabled={isLoading}
              className="neo-btn-black w-full py-2 text-xs uppercase font-black flex items-center justify-center gap-2 mt-2"
            >
              <CheckCircle2 className="w-4 h-4" /> KONFIRMASI DAN TIMPA DATA
            </button>
          </div>
        )}
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div
          className={`neo-box p-3 flex items-start gap-2 ${
            statusMessage.isError ? 'bg-ink text-paper' : 'bg-paper text-ink'
          }`}
        >
          {statusMessage.isError ? (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-ink" />
          )}
          <p className="text-xs font-bold leading-relaxed">{statusMessage.text}</p>
        </div>
      )}
    </div>
  );
}
