'use client';

/**
 * AuthProvider — unified authentication context.
 *
 * Wraps the app with:
 *   - ThirdwebProvider (when NEXT_PUBLIC_THIRDWEB_CLIENT_ID is configured)
 *   - Session state management (checks /api/auth/session + /api/auth/thirdweb)
 *
 * Components use useAuth() to access the current user state.
 * The ConnectWallet component handles the login UI.
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { ThirdwebProvider } from 'thirdweb/react';

type UserType = {
  userId: string;
  username: string;
  email: string;
  role: string;
  address?: string; // Wallet address (from Thirdweb or legacy SIWE)
};

type AuthContextType = {
  user: UserType | null;
  isLoading: boolean;
  signIn: () => void;
  signOut: () => Promise<void>;
  setUser: (user: UserType | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const thirdwebClientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        setIsLoading(true);

        // Check Thirdweb JWT first (new auth)
        if (thirdwebClientId) {
          const twRes = await fetch('/api/auth/thirdweb', { credentials: 'include' });
          if (twRes.ok) {
            const twData = await twRes.json();
            if (twData.loggedIn && twData.address) {
              setUser({
                userId: twData.address,
                username: twData.address.slice(0, 8),
                email: '',
                role: 'user', // Rank system resolves actual role server-side
                address: twData.address,
              });
              return;
            }
          }
        }

        // Fall back to legacy session (GitHub OAuth or SIWE)
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUser(data.user);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const signIn = () => {
    // If Thirdweb is configured, the ConnectButton handles login
    // Otherwise fall back to GitHub OAuth
    if (!thirdwebClientId) {
      window.location.href = '/api/auth/github/login';
    }
    // With Thirdweb, ConnectButton opens its own modal — no redirect needed
  };

  const signOut = async () => {
    try {
      // Logout from Thirdweb if configured
      if (thirdwebClientId) {
        await fetch('/api/auth/thirdweb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'logout' }),
          credentials: 'include',
        });
      }

      // Also logout from legacy session
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    user,
    isLoading,
    signIn,
    signOut,
    setUser,
  };

  // Wrap with ThirdwebProvider when configured
  const content = (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );

  if (thirdwebClientId) {
    return <ThirdwebProvider>{content}</ThirdwebProvider>;
  }

  return content;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
