'use client';

/**
 * ConnectWallet — Thirdweb ConnectButton wrapper (v5).
 *
 * Follows Thirdweb v5 official integration guide:
 *   1. ThirdwebProvider in AuthProvider.tsx (context only, no props needed)
 *   2. ConnectButton here with client + wallets + optional SIWE auth
 *   3. Auth callbacks POST to /api/auth/thirdweb
 *
 * Two modes:
 *   - With SIWE auth: when server-side auth is configured (THIRDWEB_AUTH_DOMAIN etc.)
 *     ConnectButton shows wallet connection → SIWE signature → JWT session
 *   - Connection only: when server auth is not configured, just connects wallet
 *
 * Requires NEXT_PUBLIC_THIRDWEB_CLIENT_ID to be configured.
 */

import { ConnectButton } from 'thirdweb/react';
import { createThirdwebClient } from 'thirdweb';
import { inAppWallet, createWallet } from 'thirdweb/wallets';

// ---------------------------------------------------------------------------
// Client — singleton, created once from env var
// ---------------------------------------------------------------------------
const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

const client = clientId ? createThirdwebClient({ clientId }) : null;

// ---------------------------------------------------------------------------
// Wallets — in-app (social + email + passkey) + external
// ---------------------------------------------------------------------------
const wallets = [
  inAppWallet({
    auth: {
      options: ['google', 'discord', 'github', 'x', 'email', 'passkey'],
    },
  }),
  createWallet('io.metamask'),
  createWallet('com.coinbase.wallet'),
  createWallet('me.rainbow'),
  createWallet('walletConnect'),
];

// ---------------------------------------------------------------------------
// SIWE auth callbacks — called by ConnectButton after wallet connection.
// All calls include error handling to prevent the button from hanging.
// ---------------------------------------------------------------------------

async function getLoginPayload(params: { address: string }) {
  const res = await fetch('/api/auth/thirdweb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'payload', address: params.address }),
  });
  if (!res.ok) {
    throw new Error(`Failed to get login payload: ${res.status}`);
  }
  return res.json();
}

async function doLogin(params: { payload: unknown; signature: string }) {
  const res = await fetch('/api/auth/thirdweb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', ...params }),
  });
  if (!res.ok) {
    throw new Error(`Login failed: ${res.status}`);
  }
}

async function isLoggedIn(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/thirdweb');
    if (!res.ok) return false;
    const data = await res.json();
    return data.loggedIn === true;
  } catch {
    // Network error or API down — treat as not logged in, don't hang
    return false;
  }
}

async function doLogout() {
  try {
    await fetch('/api/auth/thirdweb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
  } catch {
    // Best-effort — still redirect even if API call fails
  }
  window.location.href = '/';
}

// ---------------------------------------------------------------------------
// Button styles (UX conventions)
// ---------------------------------------------------------------------------
const loginButtonStyle: React.CSSProperties = {
  minHeight: '48px',
  minWidth: '280px',
  width: '100%',
  padding: '14px 24px',
  fontFamily: 'Inter, Roboto, system-ui, sans-serif',
  fontSize: '16px',
  fontWeight: 600,
  borderRadius: '8px',
  border: 'none',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  transition: 'background-color 150ms ease, transform 100ms ease, box-shadow 150ms ease',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface ConnectWalletProps {
  theme?: 'dark' | 'light';
  onLogin?: () => void;
}

export function ConnectWallet({ theme = 'dark', onLogin }: ConnectWalletProps) {
  if (!client) return null;

  async function handleLogin(params: { payload: unknown; signature: string }) {
    await doLogin(params);
    onLogin?.();
  }

  return (
    <ConnectButton
      client={client}
      wallets={wallets}
      theme={theme}
      autoConnect={{ timeout: 10000 }}
      connectButton={{
        label: 'Iniciar sesión',
        style: loginButtonStyle,
        className: 'numinia-login-btn',
      }}
      signInButton={{
        label: 'Iniciar sesión',
        style: loginButtonStyle,
        className: 'numinia-login-btn',
      }}
      connectModal={{
        size: 'compact',
        showThirdwebBranding: false,
      }}
      auth={{
        getLoginPayload,
        doLogin: handleLogin,
        isLoggedIn,
        doLogout,
      }}
    />
  );
}
