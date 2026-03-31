'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { CONSENT_KEY, isConsentCurrent, saveConsent } from '@/lib/consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      if (!raw || !isConsentCurrent()) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (visible && acceptRef.current) {
      acceptRef.current.focus();
    }
  }, [visible]);

  const handleAcceptAll = () => {
    saveConsent('accepted');
    setVisible(false);
  };

  const handleNecessaryOnly = () => {
    saveConsent('necessary-only');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg"
      role="dialog"
      aria-label="Cookie consent"
      aria-describedby="cookie-desc"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <p id="cookie-desc" className="text-sm text-gray-600 dark:text-gray-400 flex-1">
          This site uses strictly necessary cookies for authentication and security.
          No tracking or analytics cookies are used.{' '}
          <Link href="/en/legal/cookies" className="text-blue-600 dark:text-blue-400 hover:underline">
            Cookie Policy
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleNecessaryOnly}
            className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
          >
            Necessary only
          </button>
          <button
            ref={acceptRef}
            onClick={handleAcceptAll}
            className="px-4 py-2 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-white"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
