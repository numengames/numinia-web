import './globals.css';
import { SITE_URL } from '@/lib/constants';
import { I18nProvider } from '@/lib/i18n';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import type { Metadata } from 'next';
import { WebsiteSchema, OrganizationSchema } from '@/components/StructuredData';
import { CookieConsent } from '@/components/CookieConsent';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL + ''),
  title: {
    default: 'Numinia Digital Goods - Free CC0 3D Assets for Games, VR & 3D Projects',
    template: '%s | Numinia Digital Goods',
  },
  description: 'Download free, high-quality CC0 digital assets for games, VR, and 3D projects. CC0 licensed open-source 3D models and environments. No attribution required.',
  keywords: [
    'free 3D assets',
    'GLB models download',
    'open source 3D assets',
    '3D props',
    '3D environments',
    'free 3D models',
    'game assets',
    'Blender assets',
    'CC0 3D models',
    'GLB inspector',
    '無料3Dアセット',
    '3Dモデル',
    'オープンソース3Dアセット',
  ],
  authors: [{ name: 'Numinia', url: SITE_URL + '' }],
  creator: 'Numinia',
  publisher: 'Numinia Digital Goods',
  applicationName: 'Numinia Digital Goods',
  
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL + '',
    title: 'Numinia Digital Goods - Free CC0 3D Assets',
    description: 'Download free, high-quality 3D assets for games, VR, and 3D projects. CC0 licensed.',
    siteName: 'Numinia Digital Goods',
  },
  
  twitter: {
    card: 'summary_large_image',
    site: '@numinia_xyz',
    creator: '@numinia_xyz',
    title: 'Numinia Open Source 3D Assets - Free GLB Models',
    description: 'Download free, high-quality CC0 digital assets for games, VR, and 3D projects. CC0 licensed.',
  },
  
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/favicon-16x16.png?v=2', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png?v=2', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png?v=2', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'android-chrome-192x192', url: '/android-chrome-192x192.png?v=2', sizes: '192x192', type: 'image/png' },
      { rel: 'android-chrome-512x512', url: '/android-chrome-512x512.png?v=2', sizes: '512x512', type: 'image/png' },
    ],
  },
  
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html 
      lang="en" 
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="google-site-verification" content="t4Qn-su363dOXOqODpU2eZWgSmBhbU1QgatUeWuiHgA" />
      </head>
      <body className={GeistSans.className}>
        {/* Theme init — runs immediately but after body open, not blocking head parsing */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme'),d=t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches);d?document.documentElement.classList.add('dark'):document.documentElement.classList.remove('dark')}catch(e){}`,
          }}
        />
        {/* Skip to content — a11y */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-gray-900">
          Skip to content
        </a>
        <WebsiteSchema />
        <OrganizationSchema />
        <I18nProvider defaultLocale="en">
          <main id="main-content">
            {children}
          </main>
          <CookieConsent />
        </I18nProvider>
      </body>
    </html>
  );
}
