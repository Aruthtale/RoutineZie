'use client';

import React, { useState } from 'react';
import WeightTracker from './WeightTracker';
import SleepConsistencyTracker from './SleepConsistencyTracker';
import { Scale, Moon } from 'lucide-react';

export default function ProgressView() {
  const [activeTab, setActiveTab] = useState<'weight' | 'sleep'>('weight');

  return (
    <div className="space-y-4">
      {/* Sub tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('weight')}
          className={`neo-btn flex-1 py-2 text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'weight'
              ? 'bg-[#09090b] text-[#ffffff]'
              : 'bg-[#ffffff] text-[#09090b] hover:bg-[#09090b]/5'
          }`}
        >
          <Scale className="w-3.5 h-3.5" /> BERAT BADAN
        </button>
        <button
          onClick={() => setActiveTab('sleep')}
          className={`neo-btn flex-1 py-2 text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'sleep'
              ? 'bg-[#09090b] text-[#ffffff]'
              : 'bg-[#ffffff] text-[#09090b] hover:bg-[#09090b]/5'
          }`}
        >
          <Moon className="w-3.5 h-3.5" /> TIDUR & KONSISTENSI
        </button>
      </div>

      {activeTab === 'weight' ? <WeightTracker /> : <SleepConsistencyTracker />}
    </div>
  );
}
