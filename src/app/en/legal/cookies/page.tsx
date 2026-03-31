import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cookie Policy — Numinia Digital Goods',
  description: 'How Numinia uses cookies and local storage',
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-cream dark:bg-cream-dark">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/en/archive" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors no-underline">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </Link>
        <article className="prose prose-gray dark:prose-invert max-w-none">
          <h1>Cookie Policy</h1>
          <p className="text-sm text-gray-500">Last updated: March 2026</p>

          <h2>What Are Cookies?</h2>
          <p>
            Cookies are small text files stored on your device by your browser. They help the
            Platform function correctly, maintain security, and remember your preferences.
          </p>

          <h2>Cookies We Use</h2>

          <h3>Strictly Necessary Cookies</h3>
          <p>These are required for the Platform to function. They cannot be disabled.</p>
          <table>
            <thead>
              <tr><th>Cookie</th><th>Purpose</th><th>Duration</th></tr>
            </thead>
            <tbody>
              <tr><td><code>admin_session</code></td><td>Admin wallet authentication</td><td>24 hours</td></tr>
              <tr><td><code>user_session</code></td><td>User wallet authentication</td><td>24 hours</td></tr>
              <tr><td><code>session</code></td><td>GitHub OAuth authentication</td><td>7 days</td></tr>
              <tr><td><code>siwe_nonce</code></td><td>CSRF protection for wallet sign-in</td><td>5 minutes</td></tr>
              <tr><td><code>oauth_state</code></td><td>CSRF protection for GitHub OAuth</td><td>10 minutes</td></tr>
            </tbody>
          </table>

          <h3>Functional Storage (localStorage)</h3>
          <p>These store preferences locally in your browser. Data is never sent to our servers.</p>
          <table>
            <thead>
              <tr><th>Key</th><th>Purpose</th><th>Duration</th></tr>
            </thead>
            <tbody>
              <tr><td><code>numinia-favorites</code></td><td>Your favorited asset IDs</td><td>Until you clear browser data</td></tr>
              <tr><td><code>admin-last-seen-version</code></td><td>Changelog notification badge</td><td>Until you clear browser data</td></tr>
            </tbody>
          </table>

          <h3>Analytics Cookies</h3>
          <p>
            <strong>We do not use any analytics cookies.</strong> No Google Analytics, no tracking pixels,
            no third-party analytics. Your browsing behavior is not tracked.
          </p>

          <h2>Managing Cookies</h2>
          <p>You can manage cookies through your browser settings:</p>
          <ul>
            <li><a href="https://support.google.com/accounts/answer/32050" target="_blank" rel="noopener noreferrer">Chrome</a></li>
            <li><a href="https://support.apple.com/en-in/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
            <li><a href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noopener noreferrer">Firefox</a></li>
            <li><a href="https://support.microsoft.com/en-us/topic/how-to-delete-cookie-files-in-internet-explorer-bca9446f-d873-78de-77ba-d42645fa52fc" target="_blank" rel="noopener noreferrer">Edge/IE</a></li>
          </ul>
          <p>
            Note: disabling strictly necessary cookies will prevent you from signing in to the Platform.
          </p>

          <h2>Contact</h2>
          <p>
            <a href="mailto:legal@numengames.com">legal@numengames.com</a>
          </p>
        </article>
      </div>
    </div>
  );
}
