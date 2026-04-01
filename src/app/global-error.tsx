'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-[#EBE7E0]">
        <div className="max-w-md text-center px-6">
          <div className="text-6xl font-bold text-gray-900 mb-4">Oops</div>
          <p className="text-gray-600 mb-8">Something went wrong. Please try again.</p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
