'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AvatarAdminDashboard from '@/components/AvatarAdminDashboard';
import { WalletConnect } from '@/components/admin/WalletConnect';
import { AssetUpload } from '@/components/admin/AssetUpload';
import { Changelog } from '@/components/admin/Changelog';
import { AdminSidebar, type AdminView } from '@/components/admin/AdminSidebar';
import { DigitalGoods } from '@/components/admin/DigitalGoods';
import { Loader2 } from 'lucide-react';

type AdminSession = {
  authenticated: boolean;
  address?: string;
  role?: string;
};

export default function AdminPage() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<AdminView>('assets');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/wallet/session')
      .then(res => res.json())
      .then(data => setSession(data))
      .catch(() => setSession({ authenticated: false }))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSignOut = useCallback(async () => {
    await fetch('/api/auth/wallet/session', { method: 'DELETE' });
    setSession({ authenticated: false });
    router.refresh();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session?.authenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-cream dark:bg-cream-dark">
        <img src="/logo-numinia.svg" alt="Numinia" className="h-8 w-auto" />
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Numinia Admin</h1>
          <p className="text-sm text-gray-500">
            Connect your Ethereum wallet to access the admin panel.
          </p>
        </div>
        <WalletConnect onAuthenticated={setSession} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-cream dark:bg-cream-dark">
      {/* Sidebar */}
      <AdminSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        walletAddress={session.address}
        onSignOut={handleSignOut}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {activeView === 'assets' && (
          <AvatarAdminDashboard />
        )}

        {activeView === 'upload' && (
          <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Upload Asset</h1>
            <AssetUpload onUploaded={() => setActiveView('assets')} />
          </div>
        )}

        {activeView === 'loot' && (
          <DigitalGoods />
        )}

        {activeView === 'stats' && (
          <StatsView />
        )}

        {activeView === 'settings' && (
          <SettingsView address={session.address} />
        )}

        {activeView === 'updates' && (
          <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Updates</h1>
            <Changelog />
          </div>
        )}
      </main>
    </div>
  );
}

// Stats view — reads from /api/admin/stats
function StatsView() {
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

      {!!stats.by_layer && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Storage Layers</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(stats.by_layer as Record<string, number>).map(([layer, count]) => (
              <div key={layer} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{count}</div>
                <div className="text-xs text-gray-500">{layer.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
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

// Settings view — Claude-style clean layout
function SettingsView({ address }: { address?: string }) {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

      {/* Profile */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500 block mb-1">Wallet Address</label>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500">
                {address?.slice(2, 4).toUpperCase()}
              </div>
              <code className="text-sm font-mono text-gray-700 dark:text-gray-300">{address}</code>
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-500 block mb-1">Role</label>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm">
              Admin
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200 dark:border-gray-700" />

      {/* Platform */}
      <section className="my-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Platform</h2>
        <div className="space-y-4">
          <SettingRow
            label="Public Gallery"
            description="Show assets in the public gallery at numinia.store"
            enabled={true}
          />
          <SettingRow
            label="Auto-upload to R2"
            description="Automatically upload files to Cloudflare R2 CDN when available"
            enabled={true}
          />
          <SettingRow
            label="Download Tracking"
            description="Track anonymous download counts for assets"
            enabled={true}
          />
        </div>
      </section>

      <div className="border-t border-gray-200 dark:border-gray-700" />

      {/* Info */}
      <section className="my-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">About</h2>
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex justify-between"><span>Version</span><span className="text-gray-900 dark:text-white">0.11.0</span></div>
          <div className="flex justify-between"><span>ID System</span><span className="text-gray-900 dark:text-white">UUID v7 (RFC 9562)</span></div>
          <div className="flex justify-between"><span>Storage</span><span className="text-gray-900 dark:text-white">R2 + GitHub</span></div>
          <div className="flex justify-between">
            <span>Documentation</span>
            <a href="https://github.com/PabloFMM/numinia-digital-goods" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">GitHub ↗</a>
          </div>
        </div>
      </section>
    </div>
  );
}

function SettingRow({ label, description, enabled }: { label: string; description: string; enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => setOn(!on)}
        className={`relative w-10 h-5 rounded-full transition-colors ${on ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${on ? 'translate-x-5 bg-white dark:bg-gray-900' : 'bg-white dark:bg-gray-400'}`} />
      </button>
    </div>
  );
}
