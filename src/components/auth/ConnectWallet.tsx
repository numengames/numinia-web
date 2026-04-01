'use client';

/**
 * ConnectWallet — Thirdweb ConnectButton wrapper.
 *
 * Replaces the custom LoginModal with thirdweb's unified auth UI:
 *   - 350+ external wallets (MetaMask, WalletConnect, Coinbase, etc.)
 *   - In-app wallets with social login (Google, Discord, GitHub, Twitter/X)
 *   - Email (OTP) and passkeys
 *   - SIWE server auth with JWT cookie
 *
 * Only renders when NEXT_PUBLIC_THIRDWEB_CLIENT_ID is configured.
 * Falls back to the legacy LoginModal otherwise.
 *
 * Usage:
 *   <ConnectWallet />                    // Default dark theme
 *   <ConnectWallet theme="light" />      // Light theme
 */

import { ConnectButton } from 'thirdweb/react';
import { createThirdwebClient } from 'thirdweb';
import { inAppWallet, createWallet } from 'thirdweb/wallets';

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

// Only create client if configured
const client = clientId
  ? createThirdwebClient({ clientId })
  : null;

/**
 * Wallet configuration:
 * - In-app wallet: social logins + email + passkeys (creates embedded wallet)
 * - External wallets: MetaMask, WalletConnect, Coinbase, Rainbow
 */
const wallets = [
  inAppWallet({
    auth: {
      options: [
        'google', 'discord', 'github', 'x',
        'email', 'passkey',
      ],
    },
  }),
  createWallet('io.metamask'),
  createWallet('com.coinbase.wallet'),
  createWallet('me.rainbow'),
  createWallet('walletConnect'),
];

/**
 * Server auth callbacks — called by ConnectButton to create/verify sessions.
 * These POST to /api/auth/thirdweb with the appropriate action.
 */
async function getLoginPayload(params: { address: string }) {
  const res = await fetch('/api/auth/thirdweb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'payload', address: params.address }),
  });
  return res.json();
}

async function defaultDoLogin(params: { payload: unknown; signature: string }) {
  const res = await fetch('/api/auth/thirdweb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', ...params }),
  });
  if (!res.ok) throw new Error('Login failed');
}

async function isLoggedIn() {
  const res = await fetch('/api/auth/thirdweb');
  const data = await res.json();
  return data.loggedIn === true;
}

async function doLogout() {
  await fetch('/api/auth/thirdweb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'logout' }),
  });
}

interface ConnectWalletProps {
  theme?: 'dark' | 'light';
  onLogin?: () => void;
}

export function ConnectWallet({ theme = 'dark', onLogin }: ConnectWalletProps) {
  if (!client) return null; // Not configured — parent should show legacy LoginModal

  async function handleLogin(params: { payload: unknown; signature: string }) {
    await defaultDoLogin(params);
    onLogin?.();
  }

  return (
    <ConnectButton
      client={client}
      wallets={wallets}
      theme={theme}
      connectModal={{ size: 'compact' }}
      auth={{
        getLoginPayload,
        doLogin: handleLogin,
        isLoggedIn,
        doLogout,
      }}
    />
  );
}

/**
 * Check if Thirdweb Connect is available (client-side check).
 */
export function isThirdwebConnectAvailable(): boolean {
  return !!clientId;
}
