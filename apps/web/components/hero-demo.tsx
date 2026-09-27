'use client';
import { useState } from 'react';
import { Preview } from './preview';
export function HeroDemo() {
  const [scenario, setScenario] = useState<'click' | 'text' | 'drag'>('click');
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="eyebrow">NOT A VIDEO. THE REAL RENDERER.</span>
        <div className="flex gap-1">
          {(['click', 'text', 'drag'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={`rounded-full px-3 py-1.5 text-xs ${scenario === s ? 'bg-ink text-paper' : 'text-muted hover:bg-sage'}`}
            >
              {s === 'text' ? 'Select' : s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <Preview scenario={scenario} compact />
    </div>
  );
}
