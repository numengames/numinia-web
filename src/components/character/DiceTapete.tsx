'use client';

import { useState, useCallback } from 'react';
import { Dice3D } from './Dice3D';
import { rollDice, getOutcomeColor, getOutcomeBg, type DiceResult } from '@/lib/utils/diceRoller';
import { Dices } from 'lucide-react';

const MAX_VISIBLE_DICE = 10;

interface RollHistoryEntry {
  statName: string;
  outcome: string;
  net: number;
  timestamp: number;
}

export function DiceTapete() {
  const [currentRoll, setCurrentRoll] = useState<DiceResult | null>(null);
  const [rolling, setRolling] = useState(false);
  const [history, setHistory] = useState<RollHistoryEntry[]>([]);

  const triggerRoll = useCallback((pool: number, statName: string) => {
    if (rolling) return;

    const result = rollDice(pool, statName);
    setCurrentRoll(result);
    setRolling(true);

    // After animation completes, add to history
    setTimeout(() => {
      setRolling(false);
      setHistory(prev => [
        { statName, outcome: result.outcome, net: result.net, timestamp: Date.now() },
        ...prev.slice(0, 4), // keep last 5
      ]);
    }, 2200);
  }, [rolling]);

  // Expose triggerRoll via ref pattern — we'll use a global callback
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__numiniaRollDice = triggerRoll;
  }

  const visibleDice = currentRoll ? currentRoll.dice.slice(0, MAX_VISIBLE_DICE) : [];
  const hiddenCount = currentRoll ? Math.max(0, currentRoll.dice.length - MAX_VISIBLE_DICE) : 0;

  return (
    <div className="rounded-xl overflow-hidden print:hidden">
      {/* Tapete surface */}
      <div
        className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-gray-950 border border-gray-700/50 rounded-xl p-5"
        style={{ minHeight: 160 }}
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-5 rounded-xl" style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />

        {/* Content */}
        <div className="relative z-10">
          {!currentRoll ? (
            // Idle state
            <div className="flex flex-col items-center justify-center py-6 text-gray-500">
              <Dices className="h-8 w-8 mb-2 text-gray-600" />
              <p className="text-sm">Click a stat to roll dice</p>
            </div>
          ) : (
            <>
              {/* Stat being rolled */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {currentRoll.statName}
                </span>
                <span className="text-xs text-gray-500">
                  {currentRoll.pool}d6
                </span>
              </div>

              {/* Dice grid */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-4" style={{ minHeight: 60 }}>
                {visibleDice.map((value, i) => (
                  <Dice3D
                    key={`${currentRoll.statName}-${i}-${value}`}
                    value={value}
                    rolling={rolling}
                    delay={i * 80}
                    size={44}
                  />
                ))}
                {hiddenCount > 0 && (
                  <span className="text-xs text-gray-500 ml-1">+{hiddenCount} more</span>
                )}
              </div>

              {/* Result */}
              {!rolling && (
                <div className={`rounded-lg border p-3 text-center ${getOutcomeBg(currentRoll.outcome)}`}>
                  <div className={`text-lg font-bold ${getOutcomeColor(currentRoll.outcome)}`}>
                    {currentRoll.outcome}
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-1 text-xs text-gray-400">
                    <span>Net: {currentRoll.net}</span>
                    <span>6s: {currentRoll.successes}</span>
                    <span>1s: {currentRoll.failures}</span>
                    {currentRoll.freeFailure && <span className="text-amber-400">1st fail free</span>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Roll history */}
        {history.length > 0 && !rolling && (
          <div className="relative z-10 mt-3 flex items-center gap-1.5 overflow-x-auto">
            {history.map((entry, i) => (
              <div
                key={entry.timestamp}
                className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-medium border ${getOutcomeBg(entry.outcome as DiceResult['outcome'])} ${i === 0 ? 'opacity-100' : 'opacity-50'}`}
              >
                <span className="text-gray-400">{entry.statName}:</span>{' '}
                <span className={getOutcomeColor(entry.outcome as DiceResult['outcome'])}>{entry.net}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
