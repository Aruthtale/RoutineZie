'use client';

import React, { useState, type SVGProps } from 'react';
import WeightTracker from './WeightTracker';
import SleepConsistencyTracker from './SleepConsistencyTracker';
import AbilityTestPanel from './AbilityTestPanel';
import WorkoutStampGrid from './WorkoutStampGrid';
import InsightsPanel from './InsightsPanel';
import { Scale } from 'lucide-react';
import { InkSleep, InkRun, InkSchedule, InkFlame } from './icons/InkIcons';

type TabKey = 'weight' | 'sleep' | 'ability' | 'stamps' | 'insights';

type IconCmp = (props: SVGProps<SVGSVGElement>) => React.JSX.Element;

const TABS: { key: TabKey; label: string; icon: IconCmp }[] = [
  { key: 'weight', label: 'BERAT', icon: Scale as IconCmp },
  { key: 'sleep', label: 'TIDUR', icon: InkSleep },
  { key: 'ability', label: 'TES', icon: InkRun },
  { key: 'stamps', label: 'STEMPEL', icon: InkSchedule },
  { key: 'insights', label: 'WAWASAN', icon: InkFlame },
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
                ? 'bg-ink text-paper'
                : 'bg-paper text-ink hover:bg-ink/5'
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
