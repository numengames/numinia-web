'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { CONSENT_KEY, isConsentCurrent, saveConsent } from '@/lib/consent';
import { useI18n } from '@/lib/i18n';

export function CookieConsent() {
  const { locale } = useI18n();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      if (!raw || !isConsentCurrent()) {
        // Small delay for smoother page load
        const timer = setTimeout(() => {
          setVisible(true);
          setMounted(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    } catch {
      setVisible(true);
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (mounted && acceptRef.current) {
      acceptRef.current.focus();
    }
  }, [mounted]);

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
      className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-50
        bg-white dark:bg-gray-900 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40
        border border-gray-200 dark:border-gray-700/60
        transition-all duration-500 ease-out
        ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
      role="dialog"
      aria-label="Cookie consent"
      aria-describedby="cookie-desc"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800">
            <Shield className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
            Privacy & Cookies
          </h3>
        </div>

        {/* Body */}
        <p id="cookie-desc" className="text-[13px] leading-relaxed text-gray-500 dark:text-gray-400 mb-4">
          We use strictly necessary cookies for authentication and security.
          No tracking, analytics, or advertising.{' '}
          <Link
            href={`/${locale}/legal/cookies`}
            className="text-gray-900 dark:text-gray-200 underline decoration-gray-300 dark:decoration-gray-600 underline-offset-2 hover:decoration-gray-900 dark:hover:decoration-gray-200 transition-colors"
          >
            Learn more
          </Link>
        </p>

        {/* Actions */}
        <div className="flex gap-2.5">
          <button
            onClick={handleNecessaryOnly}
            className="flex-1 px-4 py-2.5 text-[13px] font-medium
              text-gray-700 dark:text-gray-300
              bg-gray-100 dark:bg-gray-800
              rounded-xl
              hover:bg-gray-200 dark:hover:bg-gray-700
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:focus:ring-offset-gray-900"
          >
            Necessary only
          </button>
          <button
            ref={acceptRef}
            onClick={handleAcceptAll}
            className="flex-1 px-4 py-2.5 text-[13px] font-medium
              text-white dark:text-gray-900
              bg-gray-900 dark:bg-gray-100
              rounded-xl
              hover:bg-gray-800 dark:hover:bg-gray-200
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-white dark:focus:ring-offset-gray-900"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
