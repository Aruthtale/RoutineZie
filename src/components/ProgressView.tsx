'use client';

import React, { useState } from 'react';
import WeightTracker from './WeightTracker';
import SleepConsistencyTracker from './SleepConsistencyTracker';
import AbilityTestPanel from './AbilityTestPanel';
import WorkoutStampGrid from './WorkoutStampGrid';
import InsightsPanel from './InsightsPanel';
import { Scale, Moon, Dumbbell, Calendar, Lightbulb } from 'lucide-react';

type TabKey = 'weight' | 'sleep' | 'ability' | 'stamps' | 'insights';

const TABS: { key: TabKey; label: string; icon: typeof Scale }[] = [
  { key: 'weight', label: 'BERAT', icon: Scale },
  { key: 'sleep', label: 'TIDUR', icon: Moon },
  { key: 'ability', label: 'TES', icon: Dumbbell },
  { key: 'stamps', label: 'STEMPEL', icon: Calendar },
  { key: 'insights', label: 'WAWASAN', icon: Lightbulb },
];

export default function ProgressView() {
  const [activeTab, setActiveTab] = useState<TabKey>('weight');

  return (
    <div className="space-y-4">
      {/* Sub tabs */}
      <div className="flex gap-1.5">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`neo-btn flex-1 py-2 text-[10px] font-black uppercase flex items-center justify-center gap-1 transition-colors ${
              activeTab === key
                ? 'bg-[#09090b] text-[#ffffff]'
                : 'bg-[#ffffff] text-[#09090b] hover:bg-[#09090b]/5'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'weight' && <WeightTracker />}
      {activeTab === 'sleep' && <SleepConsistencyTracker />}
      {activeTab === 'ability' && <AbilityTestPanel />}
      {activeTab === 'stamps' && <WorkoutStampGrid />}
      {activeTab === 'insights' && <InsightsPanel />}
    </div>
  );
}
