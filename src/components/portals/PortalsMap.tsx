'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ExternalLink } from 'lucide-react';

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
  position: { x: number; y: number };
  spaces: Space[];
}

interface PortalsData {
  hub: { id: string; name: string; description: string; url: string; position: { x: number; y: number } };
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
  x: number; y: number; color: string; accent: string;
  spaceOffsets: { dx: number; dy: number }[];
}> = {
  vitruvian: {
    x: 20, y: 18, color: '#c4922a', accent: '#e8b84a',
    spaceOffsets: [{ dx: -12, dy: 14 }, { dx: 12, dy: 14 }, { dx: -12, dy: 26 }, { dx: 12, dy: 26 }],
  },
  sycamore: {
    x: 80, y: 18, color: '#4a9e6e', accent: '#6bc48e',
    spaceOffsets: [{ dx: -12, dy: 14 }, { dx: 12, dy: 14 }, { dx: -12, dy: 26 }, { dx: 12, dy: 26 }, { dx: 0, dy: 36 }],
  },
  solomon: {
    x: 20, y: 82, color: '#b8742a', accent: '#d4944a',
    spaceOffsets: [{ dx: -12, dy: -30 }, { dx: 12, dy: -30 }, { dx: -12, dy: -20 }, { dx: 12, dy: -20 }, { dx: -12, dy: -10 }, { dx: 12, dy: -10 }, { dx: 0, dy: -2 }],
  },
  ouroboros: {
    x: 80, y: 82, color: '#8b5ec4', accent: '#a87ee4',
    spaceOffsets: [{ dx: -12, dy: -30 }, { dx: 12, dy: -30 }, { dx: -12, dy: -18 }, { dx: 12, dy: -18 }],
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
    <g opacity={0.06}>
      <animateTransform attributeName="transform" type="rotate" from={`0 ${x} ${y}`} to={`360 ${x} ${y}`} dur={`${speed}s`} repeatCount="indefinite" />
      <path d={d} fill="none" stroke="#8b7355" strokeWidth="1" transform={`translate(${x},${y})`} />
    </g>
  );
}

export function PortalsMap() {
  const [data, setData] = useState<PortalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredSpace, setHoveredSpace] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/PabloFMM/numinia-digital-goods-data/main/data/portals/numinia-portals.json')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const showTooltip = useCallback((e: React.MouseEvent | React.TouchEvent, space: Space, district?: District) => {
    const target = e.currentTarget as HTMLElement | SVGElement;
    const containerRect = containerRef.current?.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    if (!containerRect) return;

    setTooltip({
      name: space.name,
      district: district?.name,
      theme: district?.theme,
      url: space.url,
      subspaces: space.subspaces,
      x: rect.right - containerRect.left + 8,
      y: rect.top - containerRect.top,
    });
    setHoveredSpace(space.id);
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip(null);
    setHoveredSpace(null);
  }, []);

  const openPortal = useCallback((url: string | null) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
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
  const totalSpaces = data.districts.reduce((n, d) => n + d.spaces.length, 0) + 1;
  const W = 1200;
  const H = 800;

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[500px] overflow-hidden select-none" style={{ background: '#1a1611' }}>
      {/* Texture + vignette */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='80' height='80' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 35%, rgba(10,8,5,0.8) 100%)',
      }} />

      {/* Counters bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 sm:gap-6 bg-[#1e1a14]/80 backdrop-blur border border-[#3d3428] rounded-full px-4 py-1.5">
        <div className="text-center">
          <div className="text-sm sm:text-lg font-bold text-[#d4a44a] font-serif">{totalPortals}</div>
          <div className="text-[8px] sm:text-[9px] text-[#6b5a3e] uppercase tracking-wider">Portals</div>
        </div>
        <div className="w-px h-6 bg-[#3d3428]" />
        <div className="text-center">
          <div className="text-sm sm:text-lg font-bold text-[#8b7a5e] font-serif">{totalSpaces}</div>
          <div className="text-[8px] sm:text-[9px] text-[#6b5a3e] uppercase tracking-wider">Spaces</div>
        </div>
        <div className="w-px h-6 bg-[#3d3428]" />
        <div className="text-center">
          <div className="text-sm sm:text-lg font-bold text-[#8b7a5e] font-serif">4</div>
          <div className="text-[8px] sm:text-[9px] text-[#6b5a3e] uppercase tracking-wider">Districts</div>
        </div>
      </div>

      {/* SVG Map */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="parchment" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#2a2218" />
            <stop offset="100%" stopColor="#151210" />
          </radialGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="glow-lg"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>

        <rect width={W} height={H} fill="url(#parchment)" />

        {/* Grid */}
        {[...Array(21)].map((_, i) => <line key={`h${i}`} x1={0} y1={i * 35} x2={W} y2={i * 35} stroke="#3d3428" strokeWidth="0.3" opacity={0.25} />)}
        {[...Array(29)].map((_, i) => <line key={`v${i}`} x1={i * 35} y1={0} x2={i * 35} y2={H} stroke="#3d3428" strokeWidth="0.3" opacity={0.25} />)}

        {/* Axes */}
        <line x1={W / 2} y1={50} x2={W / 2} y2={H - 30} stroke="#5a4a32" strokeWidth="0.8" opacity={0.3} strokeDasharray="8 4" />
        <line x1={50} y1={H / 2} x2={W - 50} y2={H / 2} stroke="#5a4a32" strokeWidth="0.8" opacity={0.3} strokeDasharray="8 4" />

        {/* Gears */}
        <DecoGear x={130} y={600} r={45} speed={60} />
        <DecoGear x={870} y={110} r={35} speed={50} />
        <DecoGear x={880} y={610} r={50} speed={75} />
        <DecoGear x={120} y={100} r={28} speed={40} />

        {/* Compass */}
        <g transform="translate(930, 660) scale(0.5)" opacity={0.25}>
          <line x1="0" y1="-30" x2="0" y2="30" stroke="#8b7355" strokeWidth="1.5" />
          <line x1="-30" y1="0" x2="30" y2="0" stroke="#8b7355" strokeWidth="1.5" />
          <polygon points="0,-28 -5,-8 5,-8" fill="#8b7355" />
          <text y="-34" textAnchor="middle" fill="#8b7355" fontSize="12" fontFamily="serif">N</text>
        </g>

        {/* Hub connections */}
        {data.districts.map(d => {
          const l = DISTRICT_LAYOUT[d.id];
          if (!l) return null;
          return <line key={`c-${d.id}`} x1={W / 2} y1={H / 2} x2={l.x * W / 100} y2={l.y * H / 100}
            stroke="#5a4a32" strokeWidth="1.2" opacity={0.2} strokeDasharray="6 3" />;
        })}

        {/* Districts + spaces */}
        {data.districts.map(district => {
          const l = DISTRICT_LAYOUT[district.id];
          if (!l) return null;
          const cx = l.x * W / 100;
          const cy = l.y * H / 100;
          const portalCount = district.spaces.filter(s => s.url).length;

          return (
            <g key={district.id}>
              {/* District title */}
              <text x={cx} y={cy - 10} textAnchor="middle" fill={l.accent} fontSize="13" fontWeight="bold" fontFamily="serif" letterSpacing="2">
                {district.name.toUpperCase()}
              </text>
              <text x={cx} y={cy + 3} textAnchor="middle" fill={l.color} fontSize="8" fontFamily="serif" opacity={0.6}>
                {district.theme} · {portalCount} portals
              </text>

              {/* Spaces */}
              {district.spaces.map((space, i) => {
                const off = l.spaceOffsets[i] || { dx: 0, dy: (i + 1) * 7 };
                const sx = cx + off.dx * 4;
                const sy = cy + off.dy * 3;
                const active = !!space.url;
                const hovered = hoveredSpace === space.id;
                const pinR = hovered ? 7 : 5;

                return (
                  <g key={space.id}>
                    <line x1={cx} y1={cy + 8} x2={sx} y2={sy} stroke={l.color} strokeWidth={hovered ? 1.2 : 0.5} opacity={hovered ? 0.4 : 0.12} />

                    <g
                      style={{ cursor: active ? 'pointer' : 'default' }}
                      onMouseEnter={(e) => showTooltip(e, space, district)}
                      onMouseLeave={hideTooltip}
                      onClick={() => openPortal(space.url)}
                      onTouchStart={(e) => { showTooltip(e, space, district); if (active) openPortal(space.url); }}
                      filter={hovered ? 'url(#glow)' : undefined}
                    >
                      {/* Pulse ring */}
                      {hovered && active && (
                        <circle cx={sx} cy={sy} r={pinR + 6} fill={l.accent} opacity={0.15}>
                          <animate attributeName="r" from={String(pinR + 4)} to={String(pinR + 14)} dur="1.5s" repeatCount="indefinite" />
                          <animate attributeName="opacity" from="0.2" to="0" dur="1.5s" repeatCount="indefinite" />
                        </circle>
                      )}
                      {active && <circle cx={sx} cy={sy} r={pinR + 2} fill={l.accent} opacity={0.1} />}
                      <circle cx={sx} cy={sy} r={pinR} fill={active ? l.accent : '#3a3a3a'} stroke={active ? '#fff' : '#555'} strokeWidth="1.5" />
                      {active && <circle cx={sx} cy={sy} r={pinR * 0.3} fill="#fff" opacity={0.7} />}

                      {/* Label — below pin */}
                      <text x={sx} y={sy + 16} textAnchor="middle"
                        fill={hovered ? '#e8dcc8' : (active ? '#9a8b72' : '#4a4035')}
                        fontSize={hovered ? '8.5' : '7'} fontFamily="serif"
                        style={{ transition: 'fill 0.2s, font-size 0.2s' }}>
                        {space.name}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Ágora Plaza */}
        <g
          style={{ cursor: 'pointer' }}
          onClick={() => openPortal(data.hub.url)}
          onMouseEnter={(e) => showTooltip(e, { id: 'agora', name: data.hub.name, url: data.hub.url, subspaces: [] })}
          onMouseLeave={hideTooltip}
          onTouchStart={() => openPortal(data.hub.url)}
          filter={hoveredSpace === 'agora' ? 'url(#glow-lg)' : 'url(#glow)'}
        >
          {hoveredSpace === 'agora' && (
            <circle cx={W / 2} cy={H / 2} r={24} fill="#d4a44a" opacity={0.1}>
              <animate attributeName="r" from="20" to="30" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.15" to="0" dur="2s" repeatCount="indefinite" />
            </circle>
          )}
          <circle cx={W / 2} cy={H / 2} r={14} fill="#d4a44a" stroke="#fff" strokeWidth="2.5" />
          <circle cx={W / 2} cy={H / 2} r={5} fill="#fff" opacity={0.6} />
          <text x={W / 2} y={H / 2 + 28} textAnchor="middle" fill="#d4a44a" fontSize="11" fontWeight="bold" fontFamily="serif" letterSpacing="3">
            ÁGORA PLAZA
          </text>
        </g>

        {/* Title */}
        <text x={W / 2} y={28} textAnchor="middle" fill="#6b5a3e" fontSize="9" fontFamily="serif" letterSpacing="5" opacity={0.5}>
          PORTALS OF NUMINIA
        </text>

        {/* Frame */}
        <rect x={6} y={6} width={W - 12} height={H - 12} fill="none" stroke="#3d3428" strokeWidth="1" rx={3} opacity={0.35} />
        <rect x={10} y={10} width={W - 20} height={H - 20} fill="none" stroke="#3d3428" strokeWidth="0.4" rx={2} opacity={0.15} />
      </svg>

      {/* Tooltip — positioned relative to container */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none transition-all duration-150"
          style={{
            left: Math.min(tooltip.x, (containerRef.current?.clientWidth || 800) - 240),
            top: Math.max(tooltip.y, 50),
          }}
        >
          <div className="bg-[#1e1a14]/95 border border-[#4a3f2e] rounded-lg p-3 sm:p-4 shadow-2xl backdrop-blur max-w-[220px] sm:max-w-xs"
            style={{ boxShadow: '0 0 24px rgba(180,140,60,0.12)' }}>
            <div className="text-xs sm:text-sm font-bold text-[#e8dcc8] font-serif">{tooltip.name}</div>
            {tooltip.district && <div className="text-[9px] sm:text-[10px] text-[#6b5a3e] mt-0.5">{tooltip.district} · {tooltip.theme}</div>}
            {tooltip.url ? (
              <div className="flex items-center gap-1 mt-2 text-[10px] sm:text-xs text-[#d4a44a]">
                <ExternalLink className="h-3 w-3" /> Enter portal
              </div>
            ) : (
              <div className="mt-2 text-[10px] sm:text-xs text-[#4a4035] italic">Portal coming soon</div>
            )}
            {tooltip.subspaces.length > 0 && (
              <div className="mt-2 pt-2 border-t border-[#3a3225]">
                <div className="text-[8px] sm:text-[9px] text-[#5a4a32] uppercase tracking-wider mb-1">Contains</div>
                {tooltip.subspaces.map(s => <div key={s} className="text-[10px] sm:text-[11px] text-[#7a6b55]">· {s}</div>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom legend */}
      <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 sm:gap-5 text-[8px] sm:text-[10px] text-[#4a4035] font-serif">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#d4a44a] border border-white/30" />
          <span>Active</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#3a3a3a] border border-[#555]" />
          <span>Soon</span>
        </div>
        <span className="text-[#2d2820]">·</span>
        <a href="https://oncyber.io" target="_blank" rel="noopener noreferrer" className="text-[#6b5a3e] hover:text-[#d4a44a] transition-colors">oncyber</a>
      </div>
    </div>
  );
}
