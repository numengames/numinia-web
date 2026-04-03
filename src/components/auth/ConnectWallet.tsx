'use client';

/**
 * ConnectWallet — Thirdweb ConnectButton wrapper (v5).
 *
 * Follows Thirdweb v5 official integration guide:
 *   1. ThirdwebProvider in AuthProvider.tsx (context only, no props needed)
 *   2. ConnectButton here with client + wallets + SIWE auth callbacks
 *   3. Auth callbacks POST to /api/auth/thirdweb
 *
 * Two variants:
 *   - "default": full-width button for login page / LAP (48px height, 280px min)
 *   - "compact": sidebar-friendly, no min-width constraint
 *
 * Requires NEXT_PUBLIC_THIRDWEB_CLIENT_ID to be configured.
 */

import { ConnectButton } from 'thirdweb/react';
import { createThirdwebClient } from 'thirdweb';
import { createWallet } from 'thirdweb/wallets';

// ---------------------------------------------------------------------------
// Client — singleton, created once from env var
// ---------------------------------------------------------------------------
const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

const client = clientId ? createThirdwebClient({ clientId }) : null;

// ---------------------------------------------------------------------------
// Wallets — external wallets only.
// In-App Wallet (social login) is disabled until Thirdweb domain verification
// is complete. social.thirdweb.com returns 500 without it.
// TODO: Re-enable inAppWallet after verifying domain in Thirdweb Dashboard.
// ---------------------------------------------------------------------------
const wallets = [
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
  if (!client) return null;

  const buttonStyle = variant === 'compact' ? compactButtonStyle : defaultButtonStyle;
  const label = variant === 'compact' ? 'Conectar' : 'Iniciar sesión';

  async function handleLogin(params: { payload: unknown; signature: string }) {
    await doLogin(params);
    onLogin?.();
  }

  return (
    <ConnectButton
      client={client}
      wallets={wallets}
      theme={theme}
      autoConnect={false}
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
      auth={{
        getLoginPayload,
        doLogin: handleLogin,
        isLoggedIn,
        doLogout,
      }}
    />
  );
}
