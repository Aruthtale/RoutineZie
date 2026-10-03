'use client';

import React, { useEffect, useState } from 'react';
import ExportImportManager from './ExportImportManager';
import UpdateChecker from './UpdateChecker';
import { Settings, Shield, Moon, Sun, Monitor } from 'lucide-react';
import { RoutineRepository } from '@/lib/db/repository';
import jadwalRaw from '@/data/jadwal_mingguan.json';

type ThemePref = 'auto' | 'light' | 'dark';

export default function SettingsView() {
  const profil = (jadwalRaw as any)?.profil;
  const aturanTidur = (jadwalRaw as any)?.aturan_tidur;
  const nutrisi = (jadwalRaw as any)?.info_kalori_dan_nutrisi;

  const [theme, setTheme] = useState<ThemePref>('auto');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    RoutineRepository.getSettings()
      .then((s) => setTheme(s.theme ?? 'auto'))
      .catch(() => {});
  }, []);

  const applyTheme = async (next: ThemePref) => {
    setTheme(next);
    setSaving(true);
    try {
      await RoutineRepository.updateSettings({ theme: next });
      // Terapkan segera tanpa menunggu reload (useDayPhase membaca data-theme).
      const root = document.documentElement;
      const shouldBeDark =
        next === 'dark' ||
        (next === 'auto' && root.getAttribute('data-phase') === 'winddown');
      root.setAttribute('data-theme', shouldBeDark ? 'dark' : 'light');
      // Beri tahu halaman utama agar hook useDayPhase memakai preferensi baru.
      window.dispatchEvent(new CustomEvent('rz-theme-change', { detail: next }));
    } catch (e) {
      console.warn('Gagal menyimpan tema:', e);
    } finally {
      setSaving(false);
    }
  };

  const THEME_OPTIONS: { value: ThemePref; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: 'auto', label: 'OTOMATIS', icon: <Monitor className="w-4 h-4" />, desc: 'Ikut fase hari — gelap saat wind-down (20.30–04.00)' },
    { value: 'light', label: 'TERANG', icon: <Sun className="w-4 h-4" />, desc: 'Selalu terang, apa pun jamnya' },
    { value: 'dark', label: 'GELAP', icon: <Moon className="w-4 h-4" />, desc: 'Selalu gelap (inversi total)' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-ink pb-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
          <Settings className="w-4 h-4 text-ink" /> PENGATURAN & INFORMASI
        </h3>
        <span className="text-[11px] font-black uppercase text-ink/60 bg-ink/5 px-2 py-0.5 neo-box-sm">
          SISTEM
        </span>
      </div>

      {/* Tema */}
      <section className="neo-box p-3.5 bg-paper space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider block text-ink">
            TEMA TAMPILAN
          </span>
          {saving && <span className="text-[10px] font-mono text-ink/50">menyimpan…</span>}
        </div>
        <div className="space-y-1.5">
          {THEME_OPTIONS.map((opt) => {
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => applyTheme(opt.value)}
                className={`w-full text-left p-2.5 flex items-start gap-2.5 neo-box-sm transition-colors ${
                  active ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-ink/5'
                }`}
                aria-pressed={active}
              >
                <span className="mt-0.5 shrink-0">{opt.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-black uppercase tracking-wide">{opt.label}</span>
                  <span className={`block text-[10px] font-medium leading-snug ${active ? 'text-paper/70' : 'text-ink/60'}`}>
                    {opt.desc}
                  </span>
                </span>
                {active && <span className="text-[10px] font-black shrink-0">✓</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Profil & Target Nutrisi */}
      {profil && nutrisi && (
        <section className="neo-box p-3.5 bg-paper space-y-2.5">
          <span className="text-xs font-black uppercase tracking-wider block text-ink">
            PROFIL & SASARAN ENERGI
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-ink">
            <div className="bg-ink/5 p-2 neo-box-sm">
              <span className="text-[11px] block font-sans font-bold text-ink/60">ESTIMASI BMR</span>
              <span className="font-black text-sm">{nutrisi.estimasi_bmr_kkal} kkal</span>
            </div>
            <div className="bg-ink/5 p-2 neo-box-sm">
              <span className="text-[11px] block font-sans font-bold text-ink/60">TARGET SURPLUS</span>
              <span className="font-black text-sm">
                {nutrisi.target_menambah_berat_kkal?.min}-{nutrisi.target_menambah_berat_kkal?.maks} kkal
              </span>
            </div>
            <div className="bg-ink/5 p-2 neo-box-sm">
              <span className="text-[11px] block font-sans font-bold text-ink/60">TARGET PROTEIN</span>
              <span className="font-black text-sm">
                {nutrisi.target_protein_g?.min}-{nutrisi.target_protein_g?.maks} g/hari
              </span>
            </div>
            <div className="bg-ink/5 p-2 neo-box-sm">
              <span className="text-[11px] block font-sans font-bold text-ink/60">AIR MINUM</span>
              <span className="font-black text-sm">
                {nutrisi.air_minum_liter?.min}-{nutrisi.air_minum_liter?.maks} L/hari
              </span>
            </div>
          </div>
          <p className="text-[11px] text-ink/70 font-medium leading-relaxed">
            *Angka nutrisi dan kalori adalah estimasi kasar sebagai panduan dasar, bukan target kaku.
          </p>
        </section>
      )}

      {/* Sleep Rule Guidelines */}
      {aturanTidur && (
        <section className="neo-box p-3.5 bg-paper space-y-2">
          <span className="text-xs font-black uppercase tracking-wider block text-ink">
            ATURAN TIDUR & PEMULIHAN
          </span>
          <div className="space-y-1.5 text-xs text-ink">
            <div className="flex justify-between py-1 border-b border-ink/10">
              <span className="font-bold text-ink/70">Mulai Wind-down:</span>
              <span className="font-mono font-black">{aturanTidur.mulai_wind_down}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-ink/10">
              <span className="font-bold text-ink/70">Target Masuk Tidur:</span>
              <span className="font-mono font-black">{aturanTidur.target_tidur}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-ink/10">
              <span className="font-bold text-ink/70">Batas Maksimal:</span>
              <span className="font-mono font-black">{aturanTidur.batas_maksimal_tidur}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-bold text-ink/70">Bangun Pagi:</span>
              <span className="font-mono font-black">{aturanTidur.bangun}</span>
            </div>
          </div>
        </section>
      )}

      {/* Update Checker */}
      <UpdateChecker />

      {/* Export / Import Manager */}
      <ExportImportManager />

      {/* Privacy and Offline Notice */}
      <section className="neo-box p-3 bg-ink/5 space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase text-ink">
          <Shield className="w-4 h-4 text-ink" /> PRIVASI & OFFLINE-FIRST
        </div>
        <p className="text-[11px] text-ink/80 leading-relaxed font-medium">
          Aplikasi ini beroperasi 100% offline secara bawaan. Data log fisik Anda tidak pernah dikirim ke peladen eksternal mana pun tanpa instruksi eksplisit Anda.
        </p>
      </section>
    </div>
  );
}
