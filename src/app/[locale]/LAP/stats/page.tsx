'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function StatsPage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!stats) return <div className="p-6 text-gray-500">Failed to load stats.</div>;

  const total = Number(stats.total_assets) || 0;
  const layer = stats.by_layer as Record<string, number> | undefined;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Stats</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Total Assets" value={String(stats.total_assets ?? 0)} />
        <StatCard label="Total Size" value={`${stats.total_size_mb ?? 0} MB`} />
        <StatCard label="Projects" value={String(stats.total_projects ?? 0)} />
      </div>

      {!!stats.by_type && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">By Type</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {Object.entries(stats.by_type as Record<string, number>).map(([type, count]) => (
              <div key={type} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{count}</div>
                <div className="text-xs text-gray-500">{type}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!!layer && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Storage Layers</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(layer).map(([l, count]) => (
              <div key={l} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{count}</div>
                <div className="text-xs text-gray-500">{l.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {layer && total > 0 && (() => {
        const r2 = layer.r2 || 0;
        const gh = layer.github || 0;
        const redundant = Math.min(r2, gh);
        const singlePoint = total - redundant;
        const pct = Math.round((redundant / total) * 100);
        return (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Redundancy Health</h2>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Redundant assets</span>
                  <span className="font-medium text-gray-900 dark:text-white">{pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div><div className="text-lg font-bold text-green-600">{redundant}</div><div className="text-gray-500">Redundant</div></div>
                <div><div className="text-lg font-bold text-red-500">{singlePoint}</div><div className="text-gray-500">Single point</div></div>
                <div><div className="text-lg font-bold text-gray-900 dark:text-white">{total}</div><div className="text-gray-500">Total</div></div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
