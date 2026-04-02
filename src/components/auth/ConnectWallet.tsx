'use client';

/**
 * ConnectWallet — Thirdweb ConnectButton wrapper (v5).
 *
 * Follows Thirdweb v5 official integration guide:
 *   1. ThirdwebProvider in AuthProvider.tsx (context only, no props needed)
 *   2. ConnectButton here with client + wallets + optional SIWE auth
 *   3. Auth callbacks POST to /api/auth/thirdweb
 *
 * Two variants:
 *   - "default": full-width button for login page / LAP (48px height, 280px min)
 *   - "compact": sidebar-friendly, no min-width constraint
 *
 * SIWE auth is only enabled when the server-side auth API is available.
 * Without it, the button still connects wallets (connection-only mode).
 *
 * Requires NEXT_PUBLIC_THIRDWEB_CLIENT_ID to be configured.
 */

import { useState, useEffect } from 'react';
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

/**
 * Check if server-side SIWE auth is configured.
 * If not, ConnectButton works in connection-only mode (no SIWE).
 */
async function checkAuthAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/thirdweb');
    if (!res.ok) return false;
    const data = await res.json();
    // If reason is 'thirdweb-auth-not-configured', SIWE is not available
    return data.reason !== 'thirdweb-auth-not-configured';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Button styles (UX conventions)
// ---------------------------------------------------------------------------

/** Full-width button for login page / standalone contexts */
const defaultButtonStyle: React.CSSProperties = {
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

/** Compact button for sidebars and tight spaces */
const compactButtonStyle: React.CSSProperties = {
  minHeight: '44px',
  width: '100%',
  padding: '10px 16px',
  fontFamily: 'Inter, Roboto, system-ui, sans-serif',
  fontSize: '14px',
  fontWeight: 600,
  borderRadius: '8px',
  border: 'none',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  transition: 'background-color 150ms ease, transform 100ms ease',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface ConnectWalletProps {
  theme?: 'dark' | 'light';
  variant?: 'default' | 'compact';
  onLogin?: () => void;
}

export function ConnectWallet({ theme = 'dark', variant = 'default', onLogin }: ConnectWalletProps) {
  const [authAvailable, setAuthAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuthAvailable().then(setAuthAvailable);
  }, []);

  if (!client) return null;
  // Wait for auth check before rendering to avoid SIWE errors
  if (authAvailable === null) return null;

  const buttonStyle = variant === 'compact' ? compactButtonStyle : defaultButtonStyle;
  const label = variant === 'compact' ? 'Conectar' : 'Iniciar sesión';

  async function handleLogin(params: { payload: unknown; signature: string }) {
    await doLogin(params);
    onLogin?.();
  }

  // Only pass auth prop when server-side SIWE is configured
  const authProp = authAvailable
    ? {
        getLoginPayload,
        doLogin: handleLogin,
        isLoggedIn,
        doLogout,
      }
    : undefined;

  return (
    <ConnectButton
      client={client}
      wallets={wallets}
      theme={theme}
      autoConnect={{ timeout: 10000 }}
      connectButton={{
        label,
        style: buttonStyle,
        className: 'numinia-login-btn',
      }}
      signInButton={{
        label: 'Iniciar sesión',
        style: buttonStyle,
        className: 'numinia-login-btn',
      }}
      connectModal={{
        size: 'compact',
        showThirdwebBranding: false,
      }}
      auth={authProp}
    />
  );
}
