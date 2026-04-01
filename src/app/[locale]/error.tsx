'use client';

import { useI18n } from '@/lib/i18n';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale } = useI18n();

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream dark:bg-cream-dark">
      <div className="max-w-md text-center px-6">
        <div className="text-7xl font-bold text-gray-900 dark:text-white mb-2">500</div>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Something went wrong loading this page.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            Try again
          </button>
          <a
            href={`/${locale}`}
            className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
