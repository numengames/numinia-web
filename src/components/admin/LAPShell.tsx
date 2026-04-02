'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ConnectWallet } from '@/components/auth/ConnectWallet';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

import type { Rank } from '@/types/rank';

type AdminSession = {
  authenticated: boolean;
  address?: string;
  role?: string;
  rank?: Rank;
};

/**
 * LAPShell — shared wrapper for all /en/LAP/* routes.
 *
 * Handles authentication and renders the sidebar + main content area.
 * Each section page is passed as `children`.
 */
export function LAPShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { t } = useI18n();

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
    router.push('/');
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
        <img src="/logo-numinia.svg" alt="Numinia" className="h-8 w-auto dark:invert" />
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{t('admin.shell.title')}</h1>
          <p className="text-sm text-gray-500">
            {t('admin.shell.connectMessage')}
          </p>
        </div>
        <ConnectWallet
          onLogin={async () => {
            const res = await fetch('/api/auth/wallet/session');
            const data = await res.json();
            setSession(data);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-cream dark:bg-cream-dark">
      <AdminSidebar
        walletAddress={session.address}
        rank={session.rank}
        onSignOut={handleSignOut}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
