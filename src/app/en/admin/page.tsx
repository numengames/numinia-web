'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AvatarAdminDashboard from '@/components/AvatarAdminDashboard';
import { WalletConnect } from '@/components/admin/WalletConnect';
import { AssetUpload } from '@/components/admin/AssetUpload';
import { Changelog } from '@/components/admin/Changelog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

type AdminSession = {
  authenticated: boolean;
  address?: string;
  role?: string;
};

export default function AdminPage() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-6">
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
    <div>
      {/* Admin topbar */}
      <div className="p-4 flex justify-between items-center bg-cream border-b">
        <div className="flex items-center gap-3">
          <img src="/logo-numinia.svg" alt="Numinia" className="h-5 w-auto" />
          <span className="text-xs text-gray-400">|</span>
          <span className="text-sm text-gray-600">
            {session.address?.slice(0, 6)}...{session.address?.slice(-4)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSignOut} variant="destructive" size="sm">
            Sign Out
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Upload + Changelog */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AssetUpload onUploaded={() => router.refresh()} />
          </div>
          <div>
            <Changelog />
          </div>
        </div>
      </div>

      <AvatarAdminDashboard />
    </div>
  );
}
