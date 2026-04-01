import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Numinia Digital Goods',
  description: 'How Numinia processes and protects your personal data',
};

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div className="min-h-screen bg-cream dark:bg-cream-dark">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href={`/${locale}/archive`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors no-underline">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </Link>
        <article className="prose prose-gray dark:prose-invert max-w-none">
          <h1>Privacy Policy</h1>
          <p className="text-sm text-gray-500">Last updated: March 2026</p>

          <h2>1. Data Controller</h2>
          <p>
            The data controller is <strong>Numen Games S.L.</strong>, a Spanish limited liability company.
            Contact: <a href="mailto:legal@numengames.com">legal@numengames.com</a>
          </p>

          <h2>2. Data We Collect</h2>
          <h3>When you sign in with a wallet (SIWE)</h3>
          <ul>
            <li><strong>Ethereum address</strong> — stored in a session cookie</li>
            <li><strong>Chain ID</strong> — used during signature verification, not stored</li>
          </ul>

          <h3>When you sign in with GitHub</h3>
          <ul>
            <li><strong>Username and email</strong> — from GitHub OAuth</li>
            <li><strong>User ID</strong> — stored in session cookie</li>
          </ul>

          <h3>Automatically collected</h3>
          <ul>
            <li><strong>Favorites</strong> — stored in your browser&apos;s localStorage (never sent to our servers)</li>
            <li><strong>Session data</strong> — httpOnly cookies for authentication</li>
          </ul>

          <p>We do not use analytics services. We do not track your browsing behavior. We do not use advertising cookies.</p>

          <h2>3. Purposes and Legal Bases</h2>
          <table>
            <thead>
              <tr><th>Purpose</th><th>Legal basis (GDPR)</th></tr>
            </thead>
            <tbody>
              <tr><td>Authentication (wallet/GitHub)</td><td>Art. 6(1)(b) — contract performance</td></tr>
              <tr><td>Admin access control</td><td>Art. 6(1)(f) — legitimate interest</td></tr>
              <tr><td>CSRF protection</td><td>Art. 6(1)(f) — legitimate interest (security)</td></tr>
              <tr><td>Legal compliance</td><td>Art. 6(1)(c) — legal obligation</td></tr>
            </tbody>
          </table>

          <h2>4. Data Retention</h2>
          <ul>
            <li><strong>Session cookies</strong> — 24 hours (wallet) or 7 days (GitHub)</li>
            <li><strong>CSRF cookies</strong> — 5-10 minutes</li>
            <li><strong>Favorites</strong> — stored locally in your browser until you clear them</li>
            <li><strong>GitHub user records</strong> — until account deletion is requested</li>
          </ul>

          <h2>5. Data Sharing</h2>
          <p>We do not sell your data. We may share data with:</p>
          <ul>
            <li><strong>GitHub</strong> — for OAuth authentication and data storage (as a processor)</li>
            <li><strong>Vercel</strong> — hosting provider (as a processor)</li>
            <li><strong>Cloudflare</strong> — CDN and R2 storage (as a processor)</li>
          </ul>

          <h2>6. International Data Transfers</h2>
          <p>
            Your personal data may be transferred to and processed in countries outside the
            European Economic Area (EEA). Specifically:
          </p>
          <table>
            <thead>
              <tr><th>Processor</th><th>Location</th><th>Data transferred</th><th>Safeguard (GDPR Art. 44-49)</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Vercel Inc.</strong></td>
                <td>United States</td>
                <td>HTTP requests, session cookies, server logs</td>
                <td>EU-US Data Privacy Framework (DPF) + Standard Contractual Clauses (SCCs)</td>
              </tr>
              <tr>
                <td><strong>GitHub (Microsoft)</strong></td>
                <td>United States</td>
                <td>OAuth tokens, username, email, user ID; asset metadata stored in repos</td>
                <td>EU-US Data Privacy Framework (DPF) + Standard Contractual Clauses (SCCs)</td>
              </tr>
              <tr>
                <td><strong>Cloudflare Inc.</strong></td>
                <td>United States (edge nodes globally)</td>
                <td>HTTP requests proxied through CDN; asset binaries stored in R2 (EU region WEUR)</td>
                <td>EU-US Data Privacy Framework (DPF) + Standard Contractual Clauses (SCCs)</td>
              </tr>
            </tbody>
          </table>
          <p>
            We rely on adequacy decisions by the European Commission where available, and on
            Standard Contractual Clauses (Commission Implementing Decision (EU) 2021/914) as a
            supplementary safeguard. You may request a copy of the applicable SCCs by contacting{' '}
            <a href="mailto:legal@numengames.com">legal@numengames.com</a>.
          </p>
          <p>
            <strong>Cloudflare R2 storage</strong> is configured in the EU (Western Europe — WEUR region),
            so asset binaries remain within the EEA. Only metadata and CDN-proxied HTTP traffic
            may transit through non-EEA Cloudflare edge nodes.
          </p>

          <h2>7. Your Rights (GDPR)</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access</strong> — obtain a copy of your data</li>
            <li><strong>Rectification</strong> — correct inaccurate data</li>
            <li><strong>Erasure</strong> — request deletion</li>
            <li><strong>Restriction</strong> — limit processing</li>
            <li><strong>Portability</strong> — receive data in machine-readable format</li>
            <li><strong>Object</strong> — oppose processing based on legitimate interest</li>
            <li><strong>Withdraw consent</strong> — at any time</li>
          </ul>
          <p>
            Contact: <a href="mailto:legal@numengames.com">legal@numengames.com</a>.
            Response within 30 days. You may also lodge a complaint with the Spanish Data Protection
            Authority (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">AEPD</a>).
          </p>

          <h2>8. Security</h2>
          <p>
            We use HTTPS, httpOnly cookies, CSRF protection, and Zod-validated environment variables.
            Authentication uses cryptographic signatures (SIWE) and OAuth with state parameter validation.
          </p>

          <h2>9. Cookies</h2>
          <p>
            See our <a href={`/${locale}/legal/cookies`}>Cookie Policy</a> for detailed information about
            cookies used on this Platform.
          </p>

          <h2>10. Children</h2>
          <p>
            The Platform is not directed at individuals under 16. We do not knowingly collect
            data from minors. Contact us if you believe we have collected such data.
          </p>

          <h2>11. Contact</h2>
          <p>
            <a href="mailto:legal@numengames.com">legal@numengames.com</a>
          </p>
        </article>
      </div>
    </div>
  );
}
