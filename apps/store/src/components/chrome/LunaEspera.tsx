/**
 * Loading moon (§10.1-06, carga): the full eight-phase cycle — quarters
 * included — at 900ms per phase, one lap ≈ 7.2s in harmony with the sweep.
 * Decorative (aria-hidden): the textual status beside it stays the
 * accessible truth. Reduced motion shows a still full moon.
 */

import { useEffect, useState } from 'react';

const R = 9;
const CX = 11;
const TOP = CX - R;
const BOTTOM = CX + R;

/** Lit region for waxing fraction t∈(0..1] (same construction as the
    reading moon): fixed right limb + moving terminator. */
function litPath(t: number): string {
  const rx = Math.max(0.4, Math.abs(R * (1 - 2 * t)));
  const sweep = t < 0.5 ? 0 : 1;
  return `M${CX},${TOP} A${R},${R} 0 1,1 ${CX},${BOTTOM} A${rx},${R} 0 1,${sweep} ${CX},${TOP} Z`;
}

/** Eight phases: new → waxing ×3 → full → waning ×3 (mirrored waxing). */
const PHASES: ReadonlyArray<{ d: string | null; mirror: boolean }> = [
  { d: null, mirror: false },
  { d: litPath(0.25), mirror: false },
  { d: litPath(0.5), mirror: false },
  { d: litPath(0.75), mirror: false },
  { d: litPath(1), mirror: false },
  { d: litPath(0.75), mirror: true },
  { d: litPath(0.5), mirror: true },
  { d: litPath(0.25), mirror: true },
];

export function LunaEspera() {
  const [phase, setPhase] = useState(4); // reduced-motion resting point: full

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setPhase(0);
    const timer = setInterval(() => setPhase((current) => (current + 1) % 8), 900);
    return () => clearInterval(timer);
  }, []);

  const current = PHASES[phase] ?? PHASES[4]!;
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-0.3em' }}
    >
      <circle cx={CX} cy={CX} r={R} fill="none" stroke="currentColor" strokeOpacity="0.35" />
      {current.d && (
        <path
          d={current.d}
          fill="currentColor"
          transform={current.mirror ? `scale(-1,1) translate(${-2 * CX},0)` : undefined}
        />
      )}
    </svg>
  );
}
