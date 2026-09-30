'use client';

import React, { useState } from 'react';
import { Download, RefreshCw, Check, AlertTriangle, Info } from 'lucide-react';
import { checkForUpdate, formatBytes, isNative, APP_VERSION, type UpdateInfo } from '@/lib/updater';
import { downloadAndInstallApk } from '@/lib/apkInstaller';

type Status = 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'error';

export default function UpdateChecker() {
  const [status, setStatus] = useState<Status>('idle');
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [pesan, setPesan] = useState('');
  const [perluIzin, setPerluIzin] = useState(false);

  async function handleCek() {
    setStatus('checking');
    setPesan('');
    setPerluIzin(false);
    try {
      const hasil = await checkForUpdate();
      setInfo(hasil);
      setStatus(hasil.hasUpdate ? 'available' : 'up-to-date');
    } catch (err) {
      setPesan(err instanceof Error ? err.message : 'Gagal mengecek pembaruan');
      setStatus('error');
    }
  }

  async function handleUnduh() {
    if (!info) return;
    setStatus('downloading');
    try {
      const hasil = await downloadAndInstallApk(info.downloadUrl);
      if (hasil.installerNeedsPermission) {
        setPerluIzin(true);
        setPesan('Aktifkan "Izinkan dari sumber ini" sekali di pengaturan, lalu ketuk Perbarui lagi.');
        setStatus('available');
      } else if (hasil.installerOpened) {
        setPesan('Layar Install sudah terbuka — ketuk Install.');
        setStatus('idle');
        setInfo(null);
      } else if (!isNative()) {
        setPesan('Browser akan mengunduh APK — buka file setelah selesai.');
        setStatus('idle');
      } else {
        setPesan('Unduhan tersimpan, tapi installer gagal terbuka. Coba buka lagi.');
        setStatus('available');
      }
    } catch (err) {
      setPesan(err instanceof Error ? err.message : 'Gagal mengunduh pembaruan');
      setStatus('error');
    }
  }

  const sedangCek = status === 'checking';
  const sedangUnduh = status === 'downloading';

  return (
    <section className="neo-box p-3.5 bg-[#ffffff] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wider block text-[#09090b] flex items-center gap-1.5">
          <Download className="w-4 h-4 text-[#09090b]" /> PEMBARUAN APLIKASI
        </span>
        <span className="text-[11px] font-mono font-black text-[#09090b]/60 bg-[#09090b]/5 px-2 py-0.5 neo-box-sm">
          v{APP_VERSION}
        </span>
      </div>

      {status === 'idle' && (
        <p className="text-[11px] text-[#09090b]/70 font-medium leading-relaxed">
          Cek apakah ada versi baru dari RoutineZie. Pembaruan diambil dari GitHub dan dipasang langsung dari aplikasi.
        </p>
      )}

      {status === 'checking' && (
        <p className="text-[11px] text-[#09090b] font-bold flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Mengecek rilis terbaru...
        </p>
      )}

      {status === 'up-to-date' && info && (
        <div className="flex items-center gap-2 text-xs font-black text-[#09090b] bg-[#38E54D]/20 border-2 border-[#09090b] px-2.5 py-2 neo-box-sm">
          <Check className="w-4 h-4" /> SUDAH TERBARU — v{info.latestVersion}
        </div>
      )}

      {status === 'available' && info && (
        <div className="space-y-2.5">
          <div className="flex items-start gap-2 bg-[#FFE600]/30 border-2 border-[#09090b] px-2.5 py-2 neo-box-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="text-xs font-bold text-[#09090b]">
              Versi baru tersedia: <span className="font-mono">{info.latestVersion}</span>
              {info.apkSize ? <span className="font-mono"> ({formatBytes(info.apkSize)})</span> : null}
            </div>
          </div>
          {info.releaseNotes ? (
            <div className="text-[11px] text-[#09090b]/80 leading-relaxed max-h-32 overflow-y-auto bg-[#09090b]/5 p-2 border border-[#09090b]/20">
              <pre className="whitespace-pre-wrap font-sans">{info.releaseNotes.slice(0, 600)}{info.releaseNotes.length > 600 ? '...' : ''}</pre>
            </div>
          ) : (
            <p className="text-[11px] text-[#09090b]/60 flex items-center gap-1">
              <Info className="w-3.3 h-3.3" /> {info.fallbackCDN ? 'Catatan rilis lihat di halaman GitHub Releases.' : 'Tanpa catatan rilis.'}
            </p>
          )}
          {perluIzin && (
            <p className="text-[11px] font-bold text-[#09090b] bg-[#FF70A6]/20 border-2 border-[#09090b] px-2.5 py-2 neo-box-sm">
              {pesan}
            </p>
          )}
        </div>
      )}

      {status === 'downloading' && (
        <p className="text-[11px] text-[#09090b] font-bold flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Mengunduh APK... mohon tunggu.
        </p>
      )}

      {status === 'error' && (
        <p className="text-[11px] font-bold text-[#09090b] bg-[#FF70A6]/20 border-2 border-[#09090b] px-2.5 py-2 neo-box-sm">
          {pesan}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleCek}
          disabled={sedangCek}
          className="neo-btn flex-1 text-[11px] font-black uppercase tracking-wider py-2 flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${sedangCek ? 'animate-spin' : ''}`} /> {sedangCek ? 'MENGECEK...' : 'CEK PEMBARUAN'}
        </button>
        {status === 'available' && info && (
          <button
            type="button"
            onClick={handleUnduh}
            disabled={sedangUnduh}
            className="neo-btn flex-1 bg-[#09090b] text-[#ffffff] text-[11px] font-black uppercase tracking-wider py-2 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" /> {sedangUnduh ? 'MENGUNDUH...' : 'PERBARUI SEKARANG'}
          </button>
        )}
      </div>
    </section>
  );
}
