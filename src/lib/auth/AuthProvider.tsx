'use client';

/**
 * AuthProvider — unified authentication context.
 *
 * Wraps the app with ThirdwebProvider and session state management.
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
  address?: string;
};

type AuthContextType = {
  user: UserType | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  setUser: (user: UserType | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        setIsLoading(true);

        // Check Thirdweb JWT
        const twRes = await fetch('/api/auth/thirdweb', { credentials: 'include' });
        if (twRes.ok) {
          const twData = await twRes.json();
          if (twData.loggedIn && twData.address) {
            setUser({
              userId: twData.address,
              username: twData.address.slice(0, 8),
              email: '',
              role: 'user',
              address: twData.address,
            });
            return;
          }
        }

        setUser(null);
      } catch (error) {
        console.error('Error checking session:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const signOut = async () => {
    try {
      await fetch('/api/auth/thirdweb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
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
    signOut,
    setUser,
  };

  return (
    <ThirdwebProvider>
      <AuthContext.Provider value={contextValue}>
        {children}
      </AuthContext.Provider>
    </ThirdwebProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
