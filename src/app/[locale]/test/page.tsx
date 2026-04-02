'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConnectWallet } from '@/components/auth/ConnectWallet';

export default function TestPage() {
  const [status, setStatus] = useState('');
  const [userData, setUserData] = useState<Record<string, unknown> | null>(null);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/thirdweb', {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.loggedIn) {
        setUserData(data);
        setStatus(`Logged in as: ${data.address}`);
      } else {
        setUserData(null);
        setStatus('No active session');
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setStatus('Error checking session: ' + e.message);
      } else {
        setStatus('Error checking session');
      }
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleSignOut = async () => {
    try {
      setStatus('Signing out...');
      await fetch('/api/auth/thirdweb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
        credentials: 'include',
      });
      setUserData(null);
      setStatus('Signed out successfully');
    } catch (e: unknown) {
      if (e instanceof Error) {
        setStatus(e.message || 'Sign out failed');
      } else {
        setStatus('Sign out failed');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6">
          <h2 className="text-xl font-bold text-center">Auth Test Page</h2>

          <div className="space-y-2">
            {!userData ? (
              <div className="flex justify-center">
                <ConnectWallet onLogin={checkSession} />
              </div>
            ) : (
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full"
              >
                Sign Out
              </Button>
            )}

            <Button
              onClick={checkSession}
              variant="outline"
              className="w-full"
            >
              Check Session
            </Button>
          </div>

          {status && (
            <div className="p-4 bg-gray-100 rounded-md text-sm">
              {status}
            </div>
          )}

          {userData && (
            <div className="p-4 bg-gray-100 rounded-md text-sm">
              <h3 className="font-semibold">User Data:</h3>
              <pre className="whitespace-pre-wrap overflow-x-auto text-xs mt-2">
                {JSON.stringify(userData, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
