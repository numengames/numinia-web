'use client';

import { useState, useCallback } from 'react';
import { SiweMessage } from 'siwe';
import { getAddress } from 'viem';
import { Button } from '@/components/ui/button';

type WalletSession = {
  authenticated: boolean;
  address?: string;
  role?: string;
};

type WalletConnectProps = {
  onAuthenticated: (session: WalletSession) => void;
};

export function WalletConnect({ onAuthenticated }: WalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Check if MetaMask is available (EIP-1193 provider)
      if (!window.ethereum) {
        setError('MetaMask not found. Install it at metamask.io');
        return;
      }

      // Request account access
      const accounts: string[] = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        setError('No accounts found. Unlock MetaMask and try again.');
        return;
      }

      // Convert to EIP-55 checksum format — SIWE rejects lowercase addresses
      const address = getAddress(accounts[0]);

      // Get chain ID
      const chainId: string = await window.ethereum.request({
        method: 'eth_chainId',
      });

      // Fetch nonce from our API
      const nonceRes = await fetch('/api/auth/wallet/nonce');
      const { nonce } = await nonceRes.json();

      // Create SIWE message
      const siweMessage = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to Numinia Admin',
        uri: window.location.origin,
        version: '1',
        chainId: parseInt(chainId, 16),
        nonce,
      });

      const messageToSign = siweMessage.prepareMessage();

      // Ask MetaMask to sign
      const signature: string = await window.ethereum.request({
        method: 'personal_sign',
        params: [messageToSign, address],
      });

      // Verify on our server
      const verifyRes = await fetch('/api/auth/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSign,
          signature,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setError(verifyData.error || 'Verification failed');
        return;
      }

      onAuthenticated({
        authenticated: true,
        address: verifyData.address,
        role: 'admin',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      // User rejected the signature request in MetaMask
      if (message.includes('user rejected') || message.includes('User denied')) {
        setError('Signature rejected. Try again when ready.');
      } else {
        setError(message);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [onAuthenticated]);

  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        onClick={connect}
        disabled={isConnecting}
        size="lg"
        className="gap-2"
      >
        {isConnecting ? (
          <>Connecting...</>
        ) : (
          <>
            <WalletIcon />
            Connect Wallet
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-red-500 max-w-sm text-center">{error}</p>
      )}
    </div>
  );
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
