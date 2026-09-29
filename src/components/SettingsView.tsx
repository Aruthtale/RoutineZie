'use client';

import React from 'react';
import ExportImportManager from './ExportImportManager';
import { Settings, Shield, Bell, Moon, Sun, Monitor } from 'lucide-react';
import jadwalRaw from '@/data/jadwal_mingguan.json';

export default function SettingsView() {
  const profil = (jadwalRaw as any)?.profil;
  const aturanTidur = (jadwalRaw as any)?.aturan_tidur;
  const nutrisi = (jadwalRaw as any)?.info_kalori_dan_nutrisi;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[#09090b] pb-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-[#09090b] flex items-center gap-1.5">
          <Settings className="w-4 h-4 text-[#09090b]" /> PENGATURAN & INFORMASI
        </h3>
        <span className="text-[11px] font-black uppercase text-[#09090b]/60 bg-[#09090b]/5 px-2 py-0.5 neo-box-sm">
          SISTEM
        </span>
      </div>

      {/* Profil & Target Nutrisi */}
      {profil && nutrisi && (
        <section className="neo-box p-3.5 bg-[#ffffff] space-y-2.5">
          <span className="text-xs font-black uppercase tracking-wider block text-[#09090b]">
            PROFIL & SASARAN ENERGI
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#09090b]">
            <div className="bg-[#09090b]/5 p-2 neo-box-sm">
              <span className="text-[11px] block font-sans font-bold text-[#09090b]/60">ESTIMASI BMR</span>
              <span className="font-black text-sm">{nutrisi.estimasi_bmr_kkal} kkal</span>
            </div>
            <div className="bg-[#09090b]/5 p-2 neo-box-sm">
              <span className="text-[11px] block font-sans font-bold text-[#09090b]/60">TARGET SURPLUS</span>
              <span className="font-black text-sm">
                {nutrisi.target_menambah_berat_kkal?.min}-{nutrisi.target_menambah_berat_kkal?.maks} kkal
              </span>
            </div>
            <div className="bg-[#09090b]/5 p-2 neo-box-sm">
              <span className="text-[11px] block font-sans font-bold text-[#09090b]/60">TARGET PROTEIN</span>
              <span className="font-black text-sm">
                {nutrisi.target_protein_g?.min}-{nutrisi.target_protein_g?.maks} g/hari
              </span>
            </div>
            <div className="bg-[#09090b]/5 p-2 neo-box-sm">
              <span className="text-[11px] block font-sans font-bold text-[#09090b]/60">AIR MINUM</span>
              <span className="font-black text-sm">
                {nutrisi.air_minum_liter?.min}-{nutrisi.air_minum_liter?.maks} L/hari
              </span>
            </div>
          </div>
          <p className="text-[11px] text-[#09090b]/70 font-medium leading-relaxed">
            *Angka nutrisi dan kalori adalah estimasi kasar sebagai panduan dasar, bukan target kaku.
          </p>
        </section>
      )}

      {/* Sleep Rule Guidelines */}
      {aturanTidur && (
        <section className="neo-box p-3.5 bg-[#ffffff] space-y-2">
          <span className="text-xs font-black uppercase tracking-wider block text-[#09090b]">
            ATURAN TIDUR & PEMULIHAN
          </span>
          <div className="space-y-1.5 text-xs text-[#09090b]">
            <div className="flex justify-between py-1 border-b border-[#09090b]/10">
              <span className="font-bold text-[#09090b]/70">Mulai Wind-down:</span>
              <span className="font-mono font-black">{aturanTidur.mulai_wind_down}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#09090b]/10">
              <span className="font-bold text-[#09090b]/70">Target Masuk Tidur:</span>
              <span className="font-mono font-black">{aturanTidur.target_tidur}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#09090b]/10">
              <span className="font-bold text-[#09090b]/70">Batas Maksimal:</span>
              <span className="font-mono font-black">{aturanTidur.batas_maksimal_tidur}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-bold text-[#09090b]/70">Bangun Pagi:</span>
              <span className="font-mono font-black">{aturanTidur.bangun}</span>
            </div>
          </div>
        </section>
      )}

      {/* Export / Import Manager */}
      <ExportImportManager />

      {/* Privacy and Offline Notice */}
      <section className="neo-box p-3 bg-[#09090b]/5 space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase text-[#09090b]">
          <Shield className="w-4 h-4 text-[#09090b]" /> PRIVASI & OFFLINE-FIRST
        </div>
        <p className="text-[11px] text-[#09090b]/80 leading-relaxed font-medium">
          Aplikasi ini beroperasi 100% offline secara bawaan. Data log fisik Anda tidak pernah dikirim ke peladen eksternal mana pun tanpa instruksi eksplisit Anda.
        </p>
      </section>
    </div>
  );
}
