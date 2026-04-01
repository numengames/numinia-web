import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream dark:bg-cream-dark">
      <div className="max-w-md text-center px-6">
        <div className="text-8xl font-bold text-gray-900 dark:text-white mb-2">404</div>
        <p className="text-gray-600 dark:text-gray-400 mb-8">This page could not be found.</p>
        <Link
          href="/en"
          className="inline-flex px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors text-sm font-medium"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
