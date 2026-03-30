'use client';

import { useEffect, useState } from 'react';

interface Dice3DProps {
  value: number;    // 1-6 final value
  rolling: boolean;
  delay: number;    // stagger delay in ms
  size?: number;    // px, default 44
}

// Rotation to show each face on top
const FACE_ROTATIONS: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: 180 },
};

// Pip positions for each face (relative %, like real dice)
const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

function DiceFace({ faceValue, size }: { faceValue: number; size: number }) {
  const pips = PIPS[faceValue] || [];
  const pipSize = Math.max(size * 0.14, 4);

  return (
    <div className="absolute inset-0 rounded-lg border border-gray-300/50 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-gray-700 dark:to-gray-800 shadow-inner flex items-center justify-center">
      {pips.map(([x, y], i) => (
        <div
          key={i}
          className="absolute rounded-full bg-gray-800 dark:bg-gray-200"
          style={{
            width: pipSize,
            height: pipSize,
            left: `${x}%`,
            top: `${y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
}

export function Dice3D({ value, rolling, delay, size = 44 }: Dice3DProps) {
  const [animating, setAnimating] = useState(false);
  const [settled, setSettled] = useState(true);
  const half = size / 2;

  useEffect(() => {
    if (rolling) {
      setSettled(false);
      const startTimer = setTimeout(() => setAnimating(true), delay);
      const endTimer = setTimeout(() => {
        setAnimating(false);
        setSettled(true);
      }, delay + 1500);
      return () => { clearTimeout(startTimer); clearTimeout(endTimer); };
    }
  }, [rolling, delay]);

  const finalRot = FACE_ROTATIONS[value] || { x: 0, y: 0 };

  // When animating: spin wildly. When settled: show final face.
  const transform = animating
    ? `rotateX(${720 + Math.random() * 360}deg) rotateY(${720 + Math.random() * 360}deg) rotateZ(${360}deg)`
    : `rotateX(${finalRot.x}deg) rotateY(${finalRot.y}deg)`;

  const isSuccess = value === 6;
  const isFailure = value === 1;

  return (
    <div
      className="relative"
      style={{ width: size, height: size, perspective: size * 4 }}
    >
      <div
        className={`absolute inset-0 ${settled && isSuccess ? 'ring-2 ring-green-400 rounded-lg' : ''} ${settled && isFailure ? 'ring-2 ring-red-400 rounded-lg' : ''}`}
        style={{
          transformStyle: 'preserve-3d',
          transform,
          transition: animating
            ? `transform 1.5s cubic-bezier(0.1, 0.8, 0.2, 1)`
            : `transform 0.6s cubic-bezier(0.2, 0.8, 0.3, 1)`,
        }}
      >
        {/* Front (1) */}
        <div className="absolute" style={{ width: size, height: size, transform: `translateZ(${half}px)` }}>
          <DiceFace faceValue={1} size={size} />
        </div>
        {/* Back (6) */}
        <div className="absolute" style={{ width: size, height: size, transform: `rotateY(180deg) translateZ(${half}px)` }}>
          <DiceFace faceValue={6} size={size} />
        </div>
        {/* Right (2) */}
        <div className="absolute" style={{ width: size, height: size, transform: `rotateY(90deg) translateZ(${half}px)` }}>
          <DiceFace faceValue={2} size={size} />
        </div>
        {/* Left (5) */}
        <div className="absolute" style={{ width: size, height: size, transform: `rotateY(-90deg) translateZ(${half}px)` }}>
          <DiceFace faceValue={5} size={size} />
        </div>
        {/* Top (3) */}
        <div className="absolute" style={{ width: size, height: size, transform: `rotateX(90deg) translateZ(${half}px)` }}>
          <DiceFace faceValue={3} size={size} />
        </div>
        {/* Bottom (4) */}
        <div className="absolute" style={{ width: size, height: size, transform: `rotateX(-90deg) translateZ(${half}px)` }}>
          <DiceFace faceValue={4} size={size} />
        </div>
      </div>
    </div>
  );
}
