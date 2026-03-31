'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const CONSENT_KEY = 'numinia-cookie-consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) setVisible(true);
  }, []);

  // Focus the accept button when banner appears (a11y focus trap)
  useEffect(() => {
    if (visible && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [visible]);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
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
        <button
          ref={buttonRef}
          onClick={accept}
          className="shrink-0 px-4 py-2 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-white"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
