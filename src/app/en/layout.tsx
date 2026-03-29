import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { I18nProvider } from '@/lib/i18n';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export const metadata: Metadata = {
  title: 'Numinia Open Source 3D Assets - Free GLB Models for Games, VR & 3D Projects',
  description: 'Download 991+ free, high-quality GLB 3D assets for games, VR, and 3D projects. CC0 licensed open-source 3D models and environments. No attribution required.',
  openGraph: {
    title: 'Numinia Open Source 3D Assets - Free GLB Models',
    description: 'Download 991+ free, high-quality GLB 3D assets for games, VR, and 3D projects. CC0 licensed.',
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
    description: 'Download 991+ free, high-quality GLB 3D assets. CC0 licensed.',
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