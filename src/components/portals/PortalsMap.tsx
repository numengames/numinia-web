'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';

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

interface Tooltip {
  name: string;
  theme?: string;
  url: string | null;
  subspaces: string[];
  x: number;
  y: number;
}

const EMBLEM_ICONS: Record<string, string> = {
  torch: '🔥',
  harp: '🎵',
  gears: '⚙️',
  serpent: '🐍',
};

const DISTRICT_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  vitruvian: { bg: 'bg-amber-900/20', border: 'border-amber-600/40', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
  sycamore: { bg: 'bg-emerald-900/20', border: 'border-emerald-600/40', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
  solomon: { bg: 'bg-orange-900/20', border: 'border-orange-600/40', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
  ouroboros: { bg: 'bg-purple-900/20', border: 'border-purple-600/40', text: 'text-purple-400', glow: 'shadow-purple-500/20' },
};

function PortalNode({ space, districtId, onHover, onLeave }: {
  space: Space;
  districtId: string;
  onHover: (e: React.MouseEvent, space: Space) => void;
  onLeave: () => void;
}) {
  const hasPortal = !!space.url;
  const colors = DISTRICT_COLORS[districtId];

  return (
    <div
      className="relative group"
      onMouseEnter={(e) => onHover(e, space)}
      onMouseLeave={onLeave}
    >
      {hasPortal ? (
        <a
          href={space.url!}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer
            ${colors.bg} ${colors.border} hover:shadow-lg ${colors.glow}
            hover:scale-105 hover:border-opacity-80`}
        >
          <div className={`w-2 h-2 rounded-full bg-current ${colors.text} animate-pulse`} />
          <span className="text-sm font-medium text-gray-200">{space.name}</span>
          <ExternalLink className="h-3 w-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700/30 bg-gray-800/20">
          <div className="w-2 h-2 rounded-full bg-gray-600" />
          <span className="text-sm text-gray-500">{space.name}</span>
        </div>
      )}
    </div>
  );
}

function DistrictCard({ district, onHoverSpace, onLeaveSpace }: {
  district: District;
  onHoverSpace: (e: React.MouseEvent, space: Space) => void;
  onLeaveSpace: () => void;
}) {
  const colors = DISTRICT_COLORS[district.id];
  const emblem = EMBLEM_ICONS[district.emblem] || '✦';
  const portalCount = district.spaces.filter(s => s.url).length;

  return (
    <div className={`rounded-2xl border ${colors.border} ${colors.bg} backdrop-blur-sm p-5 space-y-4`}>
      {/* District header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">{emblem}</span>
        <div>
          <h3 className={`text-lg font-bold ${colors.text}`}>{district.name}</h3>
          <p className="text-xs text-gray-500">{district.theme}</p>
        </div>
        <div className="ml-auto">
          <span className={`text-xs ${colors.text} bg-black/30 px-2 py-0.5 rounded-full`}>
            {portalCount} portal{portalCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Spaces */}
      <div className="space-y-1.5">
        {district.spaces.map(space => (
          <PortalNode
            key={space.id}
            space={space}
            districtId={district.id}
            onHover={onHoverSpace}
            onLeave={onLeaveSpace}
          />
        ))}
      </div>
    </div>
  );
}

export function PortalsMap() {
  const [data, setData] = useState<PortalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/PabloFMM/numinia-digital-goods-data/main/data/portals/numinia-portals.json')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleHover = (e: React.MouseEvent, space: Space) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      name: space.name,
      url: space.url,
      subspaces: space.subspaces,
      x: rect.right + 8,
      y: rect.top,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-gray-500 p-8">Failed to load portals data</div>;
  }

  const totalPortals = data.districts.reduce((acc, d) => acc + d.spaces.filter(s => s.url).length, 0) + 1;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">Portals of Numinia</h1>
        <p className="text-sm text-gray-400">
          {totalPortals} portals to explore across 4 districts. Click to enter a 3D world.
        </p>
      </div>

      {/* Ágora Plaza — Hub */}
      <div className="flex justify-center">
        <a
          href={data.hub.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 px-6 py-3 rounded-xl border-2 border-amber-500/50 bg-amber-900/20 hover:bg-amber-900/40 hover:border-amber-400/70 hover:shadow-lg hover:shadow-amber-500/20 transition-all duration-300"
        >
          <MapPin className="h-5 w-5 text-amber-400" />
          <div>
            <div className="text-lg font-bold text-amber-300">Ágora Plaza</div>
            <div className="text-xs text-gray-400">{data.hub.description}</div>
          </div>
          <ExternalLink className="h-4 w-4 text-amber-500/50 group-hover:text-amber-400 transition-colors" />
        </a>
      </div>

      {/* Crosshair lines */}
      <div className="relative">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-amber-500/20 via-amber-500/5 to-amber-500/20 -translate-x-1/2 pointer-events-none" />
      </div>

      {/* Districts Grid — 2x2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.districts.map(district => (
          <DistrictCard
            key={district.id}
            district={district}
            onHoverSpace={handleHover}
            onLeaveSpace={() => setTooltip(null)}
          />
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl backdrop-blur max-w-xs pointer-events-none"
          style={{ left: Math.min(tooltip.x, window.innerWidth - 280), top: tooltip.y }}
        >
          <div className="text-sm font-semibold text-white">{tooltip.name}</div>
          {tooltip.url ? (
            <div className="text-xs text-amber-400 mt-1">Click to enter portal</div>
          ) : (
            <div className="text-xs text-gray-500 mt-1">Coming soon</div>
          )}
          {tooltip.subspaces.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="text-[10px] text-gray-500 uppercase mb-1">Contains</div>
              {tooltip.subspaces.map(s => (
                <div key={s} className="text-xs text-gray-400">· {s}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-600 pt-4">
        Worlds powered by <a href="https://oncyber.io" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-amber-400 transition-colors">oncyber</a>
      </div>
    </div>
  );
}
