'use client';

import { useState, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (session: { address?: string; username?: string; role: string }) => void;
}

function WalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

export function LoginModal({ open, onClose, onAuthenticated }: LoginModalProps) {
  const [isConnecting, setIsConnecting] = useState<'wallet' | 'github' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) { setError('Install MetaMask to continue'); return; }
    setIsConnecting('wallet');
    setError(null);
    try {
      const { SiweMessage } = await import('siwe');
      const { getAddress } = await import('viem');
      const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = getAddress(accounts[0]);
      const chainId: string = await window.ethereum.request({ method: 'eth_chainId' });
      const nonceRes = await fetch('/api/auth/wallet/nonce');
      const { nonce } = await nonceRes.json();
      const siweMessage = new SiweMessage({
        domain: window.location.host, address, statement: 'Sign in to Numinia',
        uri: window.location.origin, version: '1', chainId: parseInt(chainId, 16), nonce,
      });
      const messageToSign = siweMessage.prepareMessage();
      const signature: string = await window.ethereum.request({ method: 'personal_sign', params: [messageToSign, address] });
      const verifyRes = await fetch('/api/auth/wallet/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageToSign, signature }),
      });
      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        setError(data.error || 'Verification failed');
        return;
      }
      const data = await verifyRes.json();
      onAuthenticated({ address: data.address, role: data.role });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      if (msg.includes('user rejected') || msg.includes('User denied')) {
        setError('Signature rejected');
      } else {
        setError(msg);
      }
    } finally {
      setIsConnecting(null);
    }
  }, [onAuthenticated, onClose]);

  const connectGitHub = useCallback(() => {
    setIsConnecting('github');
    const returnUrl = window.location.pathname;
    window.location.href = `/api/auth/github?redirect_to=${encodeURIComponent(returnUrl)}`;
  }, []);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm bg-cream dark:bg-cream-dark rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/icon-khepri.svg" alt="Numinia" className="h-5 w-5" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sign In</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="px-6 text-sm text-gray-500 mb-6">
          Connect to browse your favorites, check NFT ownership, and more.
        </p>

        {/* Auth options */}
        <div className="px-6 pb-6 space-y-3">
          <Button
            onClick={connectWallet}
            disabled={!!isConnecting}
            className="w-full h-12 gap-3 text-sm font-medium"
          >
            {isConnecting === 'wallet' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <WalletIcon />
            )}
            {isConnecting === 'wallet' ? 'Connecting...' : 'Connect Wallet'}
          </Button>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            or
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          <Button
            onClick={connectGitHub}
            disabled={!!isConnecting}
            variant="outline"
            className="w-full h-12 gap-3 text-sm font-medium"
          >
            {isConnecting === 'github' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GitHubIcon />
            )}
            {isConnecting === 'github' ? 'Redirecting...' : 'Sign in with GitHub'}
          </Button>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
        </div>
      </div>
    </>
  );
}
