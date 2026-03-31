'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Space {
  id: string;
  name: string;
  url: string | null;
  subspaces: string[];
}

interface District {
  id: string;
  name: string;
  theme: string;
  emblem: string;
  spaces: Space[];
}

interface PortalsData {
  hub: { id: string; name: string; description: string; url: string };
  districts: District[];
}

interface TooltipData {
  name: string;
  district?: string;
  theme?: string;
  url: string | null;
  subspaces: string[];
  x: number;
  y: number;
}

const DISTRICT_LAYOUT: Record<string, {
  x: number; y: number; color: string; accent: string; glow: string;
  spacePositions: { x: number; y: number }[];
}> = {
  vitruvian: {
    x: 20, y: 18, color: '#c4922a', accent: '#e8b84a', glow: 'rgba(232,184,74,0.4)',
    spacePositions: [
      { x: 8, y: 28 }, { x: 22, y: 33 }, { x: 34, y: 28 }, { x: 21, y: 42 },
    ],
  },
  sycamore: {
    x: 80, y: 18, color: '#4a9e6e', accent: '#6bc48e', glow: 'rgba(107,196,142,0.4)',
    spacePositions: [
      { x: 66, y: 28 }, { x: 80, y: 33 }, { x: 92, y: 28 }, { x: 72, y: 42 }, { x: 88, y: 42 },
    ],
  },
  solomon: {
    x: 20, y: 82, color: '#b8742a', accent: '#d4944a', glow: 'rgba(212,148,74,0.4)',
    spacePositions: [
      { x: 6, y: 58 }, { x: 20, y: 56 }, { x: 34, y: 58 }, { x: 12, y: 66 },
      { x: 28, y: 66 }, { x: 8, y: 74 }, { x: 30, y: 74 },
    ],
  },
  ouroboros: {
    x: 80, y: 82, color: '#8b5ec4', accent: '#a87ee4', glow: 'rgba(168,126,228,0.4)',
    spacePositions: [
      { x: 66, y: 58 }, { x: 82, y: 56 }, { x: 74, y: 66 }, { x: 90, y: 66 },
    ],
  },
};

function DecoGear({ x, y, r, speed }: { x: number; y: number; r: number; speed: number }) {
  const teeth = 12;
  const inner = r * 0.7;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a1 = (i / teeth) * Math.PI * 2;
    const a2 = ((i + 0.3) / teeth) * Math.PI * 2;
    const a3 = ((i + 0.5) / teeth) * Math.PI * 2;
    const a4 = ((i + 0.8) / teeth) * Math.PI * 2;
    d += `${i === 0 ? 'M' : 'L'} ${Math.cos(a1) * inner} ${Math.sin(a1) * inner} `;
    d += `L ${Math.cos(a2) * r} ${Math.sin(a2) * r} `;
    d += `L ${Math.cos(a3) * r} ${Math.sin(a3) * r} `;
    d += `L ${Math.cos(a4) * inner} ${Math.sin(a4) * inner} `;
  }
  d += 'Z';
  return (
    <g opacity={0.05}>
      <animateTransform attributeName="transform" type="rotate" from={`0 ${x} ${y}`} to={`360 ${x} ${y}`} dur={`${speed}s`} repeatCount="indefinite" />
      <path d={d} fill="none" stroke="#8b7355" strokeWidth="1" transform={`translate(${x},${y})`} />
    </g>
  );
}

export function PortalsMap() {
  const [data, setData] = useState<PortalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [clickedId, setClickedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/PabloFMM/numinia-digital-goods-data/main/data/portals/numinia-portals.json')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleEnter = useCallback((e: React.MouseEvent, space: Space, district?: District) => {
    const cr = containerRef.current?.getBoundingClientRect();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (!cr) return;
    setTooltip({
      name: space.name,
      district: district?.name,
      theme: district?.theme,
      url: space.url,
      subspaces: space.subspaces,
      x: r.left - cr.left + r.width / 2,
      y: r.top - cr.top - 8,
    });
    setHoveredId(space.id);
  }, []);

  const handleLeave = useCallback(() => {
    setTooltip(null);
    setHoveredId(null);
  }, []);

  const handleClick = useCallback((url: string | null, id: string) => {
    if (!url) return;
    setClickedId(id);
    setTimeout(() => setClickedId(null), 600);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="w-8 h-8 border-2 border-amber-700/30 border-t-amber-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <div className="text-center text-gray-500 p-8">Failed to load map data</div>;

  const totalPortals = data.districts.reduce((n, d) => n + d.spaces.filter(s => s.url).length, 0) + 1;

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[600px] overflow-hidden select-none" style={{ background: '#1a1611' }}>
      {/* Texture + vignette */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='80' height='80' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(10,8,5,0.8) 100%)',
      }} />

      {/* Counters */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-[#1e1a14]/80 backdrop-blur border border-[#3d3428] rounded-full px-5 py-1.5">
        <div className="text-center">
          <div className="text-lg font-bold text-[#d4a44a] font-serif">{totalPortals}</div>
          <div className="text-[8px] text-[#6b5a3e] uppercase tracking-wider">Portals</div>
        </div>
        <div className="w-px h-6 bg-[#3d3428]" />
        <div className="text-center">
          <div className="text-lg font-bold text-[#8b7a5e] font-serif">4</div>
          <div className="text-[8px] text-[#6b5a3e] uppercase tracking-wider">Districts</div>
        </div>
      </div>

      {/* SVG background layer — decorations only */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="pg" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#2a2218" />
            <stop offset="100%" stopColor="#131110" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill="url(#pg)" />
        {/* Grid */}
        {[...Array(20)].map((_, i) => <line key={`h${i}`} x1={0} y1={i * 5} x2={100} y2={i * 5} stroke="#3d3428" strokeWidth="0.05" opacity={0.3} />)}
        {[...Array(20)].map((_, i) => <line key={`v${i}`} x1={i * 5} y1={0} x2={i * 5} y2={100} stroke="#3d3428" strokeWidth="0.05" opacity={0.3} />)}
        {/* Axes */}
        <line x1={50} y1={5} x2={50} y2={95} stroke="#5a4a32" strokeWidth="0.1" opacity={0.25} strokeDasharray="1 0.5" />
        <line x1={5} y1={50} x2={95} y2={50} stroke="#5a4a32" strokeWidth="0.1" opacity={0.25} strokeDasharray="1 0.5" />
        {/* Connection lines to hub */}
        {Object.values(DISTRICT_LAYOUT).map((l, i) => (
          <line key={i} x1={50} y1={50} x2={l.x} y2={l.y} stroke="#5a4a32" strokeWidth="0.12" opacity={0.15} strokeDasharray="0.8 0.4" />
        ))}
      </svg>

      {/* Decorative gears — absolute positioned */}
      <svg viewBox="0 0 1000 800" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice">
        <DecoGear x={100} y={650} r={45} speed={60} />
        <DecoGear x={900} y={100} r={35} speed={50} />
        <DecoGear x={920} y={680} r={55} speed={80} />
        <DecoGear x={80} y={80} r={28} speed={40} />
        <DecoGear x={500} y={400} r={60} speed={120} />
      </svg>

      {/* Interactive HTML layer — portals as positioned divs */}
      <div className="absolute inset-0 z-10">

        {/* Ágora Plaza — center hub */}
        <div
          className="absolute z-20 group"
          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          onMouseEnter={(e) => handleEnter(e, { id: 'agora', name: data.hub.name, url: data.hub.url, subspaces: [] })}
          onMouseLeave={handleLeave}
          onClick={() => handleClick(data.hub.url, 'agora')}
        >
          <div className={`
            relative flex flex-col items-center cursor-pointer transition-all duration-300
            ${hoveredId === 'agora' ? 'scale-125' : 'scale-100'}
            ${clickedId === 'agora' ? 'scale-150' : ''}
          `}>
            <div className={`
              w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-[#d4a44a] bg-[#d4a44a]/20
              flex items-center justify-center transition-all duration-300
              ${hoveredId === 'agora' ? 'bg-[#d4a44a]/50 shadow-[0_0_30px_rgba(212,164,74,0.5)]' : ''}
              ${clickedId === 'agora' ? 'bg-[#d4a44a] shadow-[0_0_50px_rgba(212,164,74,0.8)]' : ''}
            `}>
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#d4a44a]" />
            </div>
            <span className={`
              mt-2 text-[10px] sm:text-xs font-bold font-serif tracking-[3px] transition-all duration-300
              ${hoveredId === 'agora' ? 'text-[#d4a44a]' : 'text-[#8b7a5e]'}
            `}>
              ÁGORA PLAZA
            </span>
          </div>
        </div>

        {/* Districts */}
        {data.districts.map(district => {
          const layout = DISTRICT_LAYOUT[district.id];
          if (!layout) return null;

          return (
            <div key={district.id}>
              {/* District title */}
              <div className="absolute pointer-events-none" style={{ left: `${layout.x}%`, top: `${layout.y}%`, transform: 'translate(-50%, -50%)' }}>
                <div className="text-center">
                  <div className="text-xs sm:text-sm font-bold font-serif tracking-[2px]" style={{ color: layout.accent }}>
                    {district.name.toUpperCase()}
                  </div>
                  <div className="text-[7px] sm:text-[9px] font-serif mt-0.5" style={{ color: layout.color, opacity: 0.6 }}>
                    {district.theme}
                  </div>
                </div>
              </div>

              {/* Space nodes */}
              {district.spaces.map((space, i) => {
                const pos = layout.spacePositions[i];
                if (!pos) return null;
                const active = !!space.url;
                const hovered = hoveredId === space.id;
                const clicked = clickedId === space.id;

                return (
                  <div
                    key={space.id}
                    className="absolute z-10 group"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                    onMouseEnter={(e) => handleEnter(e, space, district)}
                    onMouseLeave={handleLeave}
                    onClick={() => handleClick(space.url, space.id)}
                  >
                    <div className={`
                      flex flex-col items-center transition-all duration-200
                      ${active ? 'cursor-pointer' : 'cursor-default'}
                      ${hovered ? 'scale-[1.4]' : 'scale-100'}
                      ${clicked ? 'scale-[1.8]' : ''}
                    `}>
                      {/* Pin */}
                      <div className={`
                        w-4 h-4 sm:w-5 sm:h-5 rounded-full border-[1.5px] transition-all duration-200
                        flex items-center justify-center
                        ${active
                          ? `border-current bg-current/20 ${hovered ? 'shadow-lg' : ''}`
                          : 'border-[#555] bg-[#333]/30'
                        }
                        ${clicked ? 'bg-current/80' : ''}
                      `}
                        style={{
                          color: active ? layout.accent : '#555',
                          boxShadow: hovered && active ? `0 0 20px ${layout.glow}` : clicked && active ? `0 0 40px ${layout.glow}` : 'none',
                        }}
                      >
                        {active && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white/70" />}
                      </div>

                      {/* Label */}
                      <span className={`
                        mt-1 text-[6px] sm:text-[8px] font-serif text-center leading-tight max-w-[80px] sm:max-w-[100px] transition-all duration-200
                        ${hovered ? 'text-[#e8dcc8] opacity-100' : active ? 'text-[#7a6b55] opacity-80' : 'text-[#4a4035] opacity-50'}
                      `}>
                        {space.name}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Connection lines (SVG overlay per district) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                {district.spaces.map((space, i) => {
                  const pos = layout.spacePositions[i];
                  if (!pos) return null;
                  const hovered = hoveredId === space.id;
                  return (
                    <line key={space.id}
                      x1={`${layout.x}%`} y1={`${layout.y}%`}
                      x2={`${pos.x}%`} y2={`${pos.y}%`}
                      stroke={layout.color}
                      strokeWidth={hovered ? 1.5 : 0.5}
                      opacity={hovered ? 0.4 : 0.1}
                      style={{ transition: 'all 0.2s' }}
                    />
                  );
                })}
              </svg>
            </div>
          );
        })}
      </div>

      {/* Tooltip — positioned above the hovered element */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none transition-all duration-100"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-[#1e1a14]/95 border border-[#4a3f2e] rounded-lg px-3 py-2 shadow-2xl backdrop-blur text-center"
            style={{ boxShadow: '0 0 24px rgba(180,140,60,0.15)' }}>
            <div className="text-xs sm:text-sm font-bold text-[#e8dcc8] font-serif whitespace-nowrap">{tooltip.name}</div>
            {tooltip.district && <div className="text-[8px] sm:text-[9px] text-[#6b5a3e]">{tooltip.district}</div>}
            {tooltip.url ? (
              <div className="mt-1 text-[9px] sm:text-[10px] text-[#d4a44a] font-medium">Click to enter</div>
            ) : (
              <div className="mt-1 text-[9px] text-[#4a4035] italic">Coming soon</div>
            )}
            {tooltip.subspaces.length > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-[#3a3225] text-left">
                {tooltip.subspaces.slice(0, 3).map(s => <div key={s} className="text-[8px] sm:text-[9px] text-[#6b5a3e]">· {s}</div>)}
              </div>
            )}
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45 bg-[#1e1a14] border-r border-b border-[#4a3f2e]" />
          </div>
        </div>
      )}

      {/* Title */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 text-[8px] sm:text-[9px] text-[#3d3428] font-serif tracking-[4px]">
        PORTALS OF NUMINIA
      </div>

      {/* Frame */}
      <div className="absolute inset-2 border border-[#3d3428]/30 rounded pointer-events-none" />
      <div className="absolute inset-3 border border-[#3d3428]/15 rounded pointer-events-none" />
    </div>
  );
}
