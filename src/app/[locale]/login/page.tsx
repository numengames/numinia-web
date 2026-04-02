'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { ConnectWallet } from '@/components/auth/ConnectWallet';
import { LoadingScreen } from '@/components/ui/loading-screen';

function LoginPageLoading() {
  return <LoadingScreen className="bg-gray-50 dark:bg-gray-950" />;
}

function LoginContent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to Numinia
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Or{' '}
            <Link
              href="/"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              continue as guest
            </Link>
          </p>
        </div>

        <div className="w-full">
          <ConnectWallet
            onLogin={() => {
              window.location.href = '/';
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageLoading />}>
      <LoginContent />
    </Suspense>
  );
}
