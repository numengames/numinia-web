'use client';

import { useState, useEffect, useCallback } from 'react';
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

// District visual config — positions on map (% from top-left)
const DISTRICT_LAYOUT: Record<string, {
  x: number; y: number; color: string; accent: string; icon: string;
  spaceOffsets: { dx: number; dy: number }[];
}> = {
  vitruvian: {
    x: 22, y: 18, color: '#c4922a', accent: '#e8b84a', icon: '🔥',
    spaceOffsets: [
      { dx: -8, dy: 12 }, { dx: 6, dy: 14 }, { dx: -4, dy: 22 }, { dx: 8, dy: 24 },
    ],
  },
  sycamore: {
    x: 76, y: 18, color: '#4a9e6e', accent: '#6bc48e', icon: '🌿',
    spaceOffsets: [
      { dx: -6, dy: 12 }, { dx: 6, dy: 14 }, { dx: -8, dy: 22 }, { dx: 4, dy: 24 }, { dx: 0, dy: 30 },
    ],
  },
  solomon: {
    x: 22, y: 72, color: '#b8742a', accent: '#d4944a', icon: '⚙️',
    spaceOffsets: [
      { dx: -6, dy: -18 }, { dx: 6, dy: -16 }, { dx: -8, dy: -10 }, { dx: 8, dy: -8 },
      { dx: -4, dy: -2 }, { dx: 4, dy: 4 }, { dx: 0, dy: 10 },
    ],
  },
  ouroboros: {
    x: 76, y: 72, color: '#8b5ec4', accent: '#a87ee4', icon: '🐍',
    spaceOffsets: [
      { dx: -6, dy: -16 }, { dx: 6, dy: -14 }, { dx: -4, dy: -6 }, { dx: 4, dy: -2 },
    ],
  },
};

function MapPin({ x, y, active, color, size = 'md', pulsing = false }: {
  x: number; y: number; active: boolean; color: string; size?: 'sm' | 'md' | 'lg'; pulsing?: boolean;
}) {
  const s = size === 'lg' ? 16 : size === 'md' ? 10 : 7;
  return (
    <g transform={`translate(${x}, ${y})`}>
      {pulsing && active && (
        <circle r={s + 6} fill={color} opacity={0.15}>
          <animate attributeName="r" from={String(s + 4)} to={String(s + 12)} dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.2" to="0" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      {active && <circle r={s + 3} fill={color} opacity={0.12} />}
      <circle r={s} fill={active ? color : '#3a3a3a'} stroke={active ? '#fff' : '#555'} strokeWidth={size === 'lg' ? 2.5 : 1.5} />
      {active && <circle r={s * 0.35} fill="#fff" opacity={0.8} />}
    </g>
  );
}

function CompassRose({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y}) scale(0.6)`} opacity={0.3}>
      <line x1="0" y1="-30" x2="0" y2="30" stroke="#8b7355" strokeWidth="1" />
      <line x1="-30" y1="0" x2="30" y2="0" stroke="#8b7355" strokeWidth="1" />
      <polygon points="0,-28 -4,-8 4,-8" fill="#8b7355" />
      <text y="-32" textAnchor="middle" fill="#8b7355" fontSize="10" fontFamily="serif">N</text>
    </g>
  );
}

function DecoGear({ x, y, r, speed }: { x: number; y: number; r: number; speed: number }) {
  const teeth = 12;
  const inner = r * 0.7;
  const outer = r;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a1 = (i / teeth) * Math.PI * 2;
    const a2 = ((i + 0.3) / teeth) * Math.PI * 2;
    const a3 = ((i + 0.5) / teeth) * Math.PI * 2;
    const a4 = ((i + 0.8) / teeth) * Math.PI * 2;
    d += `${i === 0 ? 'M' : 'L'} ${Math.cos(a1) * inner} ${Math.sin(a1) * inner} `;
    d += `L ${Math.cos(a2) * outer} ${Math.sin(a2) * outer} `;
    d += `L ${Math.cos(a3) * outer} ${Math.sin(a3) * outer} `;
    d += `L ${Math.cos(a4) * inner} ${Math.sin(a4) * inner} `;
  }
  d += 'Z';
  return (
    <g transform={`translate(${x}, ${y})`} opacity={0.08}>
      <animateTransform attributeName="transform" type="rotate" from={`0 ${x} ${y}`} to={`360 ${x} ${y}`} dur={`${speed}s`} repeatCount="indefinite" />
      <path d={d} fill="none" stroke="#8b7355" strokeWidth="1" />
      <circle r={r * 0.25} fill="none" stroke="#8b7355" strokeWidth="0.8" />
    </g>
  );
}

export function PortalsMap() {
  const [data, setData] = useState<PortalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredSpace, setHoveredSpace] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/PabloFMM/numinia-digital-goods-data/main/data/portals/numinia-portals.json')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const showTooltip = useCallback((e: React.MouseEvent, name: string, district: string, theme: string, url: string | null, subspaces: string[]) => {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    setTooltip({ name, district, theme, url, subspaces, x: rect.right + 12, y: rect.top - 10 });
    setHoveredSpace(name);
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip(null);
    setHoveredSpace(null);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="w-8 h-8 border-2 border-amber-700/30 border-t-amber-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <div className="text-center text-gray-500 p-8">Failed to load map data</div>;

  const W = 1000;
  const H = 700;

  return (
    <div className="relative w-full h-full min-h-[600px] overflow-hidden select-none" style={{ background: '#1a1611' }}>
      {/* Parchment texture overlay */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
      }} />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(10,8,5,0.7) 100%)',
      }} />

      {/* SVG Map */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* Parchment gradient */}
          <radialGradient id="parchment" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#2a2218" />
            <stop offset="100%" stopColor="#151210" />
          </radialGradient>
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-strong">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={W} height={H} fill="url(#parchment)" />

        {/* Grid lines — steampunk schematic */}
        {[...Array(20)].map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 35} x2={W} y2={i * 35} stroke="#3d3428" strokeWidth="0.3" opacity={0.3} />
        ))}
        {[...Array(30)].map((_, i) => (
          <line key={`v${i}`} x1={i * 35} y1={0} x2={i * 35} y2={H} stroke="#3d3428" strokeWidth="0.3" opacity={0.3} />
        ))}

        {/* Cross axes — golden */}
        <line x1={W / 2} y1={40} x2={W / 2} y2={H - 40} stroke="#6b5a3e" strokeWidth="0.8" opacity={0.4} strokeDasharray="8 4" />
        <line x1={60} y1={H / 2} x2={W - 60} y2={H / 2} stroke="#6b5a3e" strokeWidth="0.8" opacity={0.4} strokeDasharray="8 4" />

        {/* Decorative gears */}
        <DecoGear x={150} y={580} r={40} speed={60} />
        <DecoGear x={850} y={120} r={30} speed={45} />
        <DecoGear x={870} y={580} r={50} speed={80} />
        <DecoGear x={130} y={130} r={25} speed={35} />

        {/* Compass */}
        <CompassRose x={920} y={640} />

        {/* Connection lines from hub to districts */}
        {data.districts.map(d => {
          const layout = DISTRICT_LAYOUT[d.id];
          if (!layout) return null;
          const hx = W / 2, hy = H / 2;
          const dx = layout.x * W / 100, dy = layout.y * H / 100;
          return (
            <line key={`conn-${d.id}`} x1={hx} y1={hy} x2={dx} y2={dy}
              stroke="#5a4a32" strokeWidth="1.5" opacity={0.25} strokeDasharray="6 3" />
          );
        })}

        {/* Districts */}
        {data.districts.map(district => {
          const layout = DISTRICT_LAYOUT[district.id];
          if (!layout) return null;
          const cx = layout.x * W / 100;
          const cy = layout.y * H / 100;

          return (
            <g key={district.id}>
              {/* District label */}
              <text x={cx} y={cy - 8} textAnchor="middle" fill={layout.accent} fontSize="13" fontWeight="bold" fontFamily="serif" letterSpacing="2">
                {district.name.toUpperCase()}
              </text>
              <text x={cx} y={cy + 6} textAnchor="middle" fill={layout.color} fontSize="8" fontFamily="serif" opacity={0.7}>
                {district.theme}
              </text>

              {/* Space pins + connection lines */}
              {district.spaces.map((space, i) => {
                const offset = layout.spaceOffsets[i] || { dx: 0, dy: (i + 1) * 8 };
                const sx = cx + offset.dx * 4;
                const sy = cy + offset.dy * 3;
                const hasPortal = !!space.url;
                const isHovered = hoveredSpace === space.name;

                return (
                  <g key={space.id}>
                    {/* Connection to district center */}
                    <line x1={cx} y1={cy + 10} x2={sx} y2={sy}
                      stroke={layout.color} strokeWidth={isHovered ? 1.5 : 0.6} opacity={isHovered ? 0.5 : 0.15} />

                    {/* Pin */}
                    <g
                      style={{ cursor: hasPortal ? 'pointer' : 'default' }}
                      onMouseEnter={(e) => showTooltip(e, space.name, district.name, district.theme, space.url, space.subspaces)}
                      onMouseLeave={hideTooltip}
                      onClick={() => hasPortal && window.open(space.url!, '_blank')}
                      filter={isHovered ? 'url(#glow)' : undefined}
                    >
                      <MapPin x={sx} y={sy} active={hasPortal} color={layout.accent} pulsing={isHovered} />

                      {/* Space label */}
                      <text x={sx + 14} y={sy + 3} fill={isHovered ? '#e8dcc8' : (hasPortal ? '#9a8b72' : '#5a5040')}
                        fontSize={isHovered ? '9' : '7.5'} fontFamily="serif"
                        style={{ transition: 'all 0.2s' }}>
                        {space.name}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Ágora Plaza — central hub */}
        <g
          style={{ cursor: 'pointer' }}
          onClick={() => window.open(data.hub.url, '_blank')}
          onMouseEnter={(e) => showTooltip(e, data.hub.name, '', 'The central convergence node', data.hub.url, [])}
          onMouseLeave={hideTooltip}
          filter={hoveredSpace === data.hub.name ? 'url(#glow-strong)' : 'url(#glow)'}
        >
          <MapPin x={W / 2} y={H / 2} active={true} color="#d4a44a" size="lg" pulsing={hoveredSpace === data.hub.name} />
          <text x={W / 2} y={H / 2 + 28} textAnchor="middle" fill="#d4a44a" fontSize="12" fontWeight="bold" fontFamily="serif" letterSpacing="3">
            ÁGORA PLAZA
          </text>
        </g>

        {/* Title */}
        <text x={W / 2} y={28} textAnchor="middle" fill="#8b7a5e" fontSize="10" fontFamily="serif" letterSpacing="4" opacity={0.6}>
          PORTALS OF NUMINIA
        </text>

        {/* Border frame */}
        <rect x={8} y={8} width={W - 16} height={H - 16} fill="none" stroke="#3d3428" strokeWidth="1" rx={4} opacity={0.4} />
        <rect x={12} y={12} width={W - 24} height={H - 24} fill="none" stroke="#3d3428" strokeWidth="0.5" rx={3} opacity={0.2} />
      </svg>

      {/* Tooltip overlay */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: Math.min(tooltip.x, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 300), top: Math.max(tooltip.y, 10) }}
        >
          <div className="bg-[#1e1a14]/95 border border-[#4a3f2e] rounded-lg p-4 shadow-2xl backdrop-blur max-w-xs"
            style={{ boxShadow: '0 0 20px rgba(180,140,60,0.1)' }}>
            <div className="text-sm font-bold text-[#e8dcc8] font-serif">{tooltip.name}</div>
            {tooltip.district && (
              <div className="text-[10px] text-[#8b7a5e] mt-0.5">{tooltip.district}</div>
            )}
            {tooltip.url ? (
              <div className="flex items-center gap-1 mt-2 text-xs text-[#d4a44a]">
                <ExternalLink className="h-3 w-3" />
                <span>Click to enter portal</span>
              </div>
            ) : (
              <div className="mt-2 text-xs text-[#5a5040] italic">Portal not yet active</div>
            )}
            {tooltip.subspaces.length > 0 && (
              <div className="mt-2 pt-2 border-t border-[#3a3225]">
                <div className="text-[9px] text-[#6b5a3e] uppercase tracking-wider mb-1">Contains</div>
                {tooltip.subspaces.map(s => (
                  <div key={s} className="text-[11px] text-[#8b7a5e]">· {s}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom legend */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-6 text-[10px] text-[#5a5040] font-serif">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#d4a44a] border border-white/30" />
          <span>Active Portal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#3a3a3a] border border-[#555]" />
          <span>Coming Soon</span>
        </div>
        <span className="text-[#3d3428]">|</span>
        <span>Worlds on <a href="https://oncyber.io" target="_blank" rel="noopener noreferrer" className="text-[#8b7a5e] hover:text-[#d4a44a] transition-colors">oncyber</a></span>
      </div>
    </div>
  );
}
