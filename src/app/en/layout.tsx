import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { I18nProvider } from '@/lib/i18n';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export const metadata: Metadata = {
  title: 'Numinia Digital Goods — Free CC0 3D Assets for Games, VR & Metaverse',
  description: 'Browse and download free CC0 digital assets: 3D models (GLB), avatars (VRM), Hyperfy worlds (HYP), audio, video, STL. No attribution required.',
  alternates: {
    canonical: 'https://numinia.store/en',
    languages: { 'en': 'https://numinia.store/en', 'ja': 'https://numinia.store/ja' },
  },
  openGraph: {
    title: 'Numinia Open Source 3D Assets - Free GLB Models',
    description: 'Download free, high-quality CC0 digital assets for games, VR, and 3D projects. CC0 licensed.',
    url: 'https://numinia.store/en',
    type: 'website',
    images: [
      {
        url: 'https://numinia.store/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Numinia Open Source 3D Assets - Free GLB Models',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Numinia Open Source 3D Assets - Free GLB Models',
    description: 'Download free, high-quality CC0 digital assets. CC0 licensed.',
    images: ['https://numinia.store/opengraph-image.png'],
  },
};

// Nested layouts must NOT render <html>/<body> — the root layout owns those.
// This layout only provides the locale-specific context providers.
export default function EnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <I18nProvider defaultLocale="en">
      <AuthProvider>{children}</AuthProvider>
    </I18nProvider>
  );
}