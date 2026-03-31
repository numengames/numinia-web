import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms and Conditions — Numinia Digital Goods',
  description: 'Terms and conditions for using numinia.store',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-cream dark:bg-cream-dark">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/en/archive" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors no-underline">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </Link>
        <article className="prose prose-gray dark:prose-invert max-w-none">
          <h1>Terms and Conditions</h1>
          <p className="text-sm text-gray-500">Last updated: March 2026</p>

          <h2>1. Introduction</h2>
          <p>
            Welcome to Numinia Digital Goods (&quot;Numinia&quot;, &quot;we&quot;, &quot;us&quot;), a project by Numen Games S.L.,
            a Spanish company. Contact: <a href="mailto:legal@numengames.com">legal@numengames.com</a>.
          </p>
          <p>
            These Terms govern your access to and use of <strong>numinia.store</strong> (the &quot;Platform&quot;)
            and all digital assets, tools, and services made available through it.
          </p>
          <p>
            By accessing or using the Platform, you agree to these Terms. If you do not agree,
            please do not use the Platform.
          </p>

          <h2>2. What Numinia Is</h2>
          <p>
            Numinia Digital Goods is an open registry of CC0-licensed digital assets: 3D models (GLB),
            avatars (VRM), Hyperfy worlds (HYP), audio, video, images, and STL files for 3D printing.
          </p>
          <p>
            The Platform follows a <strong>File Over App</strong> philosophy: data lives in open files
            (JSON on GitHub, binaries on CDN/Arweave). The app is a viewer, not the source of truth.
          </p>

          <h2>3. User Accounts</h2>
          <p>
            You may sign in with an Ethereum wallet (via SIWE — Sign-In with Ethereum) or GitHub OAuth.
            By signing in, you represent that you have the authority to use the wallet or GitHub account provided.
          </p>
          <p>
            Admin access is restricted to ETH addresses in the admin allowlist. Admin actions
            (upload, delete, edit) are logged via GitHub commit history.
          </p>

          <h2>4. Digital Assets and Licensing</h2>
          <p>
            All assets curated by Numinia are <strong>CC0 (Public Domain)</strong> unless otherwise indicated.
            You may use CC0 assets for any purpose without attribution. Some legacy assets may use CC-BY,
            which requires attribution — check each asset&apos;s license field.
          </p>
          <p>
            Numinia does not claim ownership of assets uploaded by users. Uploaders are responsible
            for ensuring they have the right to distribute the content they upload.
          </p>

          <h2>5. NFT Integration</h2>
          <p>
            Some assets may be linked to NFT contracts (ERC-721/ERC-1155) on blockchain networks.
            NFT ownership data is read from on-chain sources and displayed for informational purposes.
            Numinia does not issue, sell, or manage NFTs.
          </p>

          <h2>6. Intellectual Property</h2>
          <p>
            The Platform&apos;s code is MIT-licensed and available on{' '}
            <a href="https://github.com/PabloFMM/numinia-digital-goods" target="_blank" rel="noopener noreferrer">GitHub</a>.
            The Numinia name, logo (Khepri icon), and brand identity are property of Numen Games S.L.
          </p>

          <h2>7. Prohibited Uses</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Upload malicious files, malware, or content that violates third-party rights</li>
            <li>Attempt to gain unauthorized access to admin features</li>
            <li>Use automated systems to scrape or overload the Platform</li>
            <li>Misrepresent the ownership or licensing of uploaded assets</li>
          </ul>

          <h2>8. Limitation of Liability</h2>
          <p>
            The Platform is provided &quot;as is&quot; without warranties. Numen Games S.L. is not liable for
            indirect, incidental, or consequential damages arising from use of the Platform.
            Asset availability, accuracy, and permanence are not guaranteed.
          </p>

          <h2>9. Data Protection</h2>
          <p>
            See our <a href="/en/legal/privacy">Privacy Policy</a> for information about how we
            process personal data.
          </p>

          <h2>10. Governing Law</h2>
          <p>
            These Terms are governed by Spanish law. Disputes shall be subject to the courts of Madrid, Spain.
          </p>

          <h2>11. Contact</h2>
          <p>
            For legal matters: <a href="mailto:legal@numengames.com">legal@numengames.com</a><br />
            General: <a href="https://x.com/numinia_store" target="_blank" rel="noopener noreferrer">@numinia_store</a>
          </p>
        </article>
      </div>
    </div>
  );
}
