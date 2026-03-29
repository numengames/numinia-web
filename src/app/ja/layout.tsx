import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { I18nProvider } from '@/lib/i18n';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export const metadata: Metadata = {
  title: 'Numinia Open Source 3D Assets - ゲーム・VR・3D向け無料GLBモデル',
  description: 'ゲーム、VR、3Dプロジェクト向けの991種類以上の無料・高品質GLB 3Dアセットをダウンロード。CC0ライセンス - クレジット表記不要で自由に使用可能。',
  openGraph: {
    title: 'Numinia Open Source 3D Assets - 無料GLB 3Dアセット',
    description: 'ゲーム、VR、3Dプロジェクト向けの991種類以上の無料・高品質GLB 3Dアセットをダウンロード。CC0ライセンス。',
    url: 'https://numinia.store/ja',
    type: 'website',
    locale: 'ja_JP',
    images: [
      {
        url: 'https://numinia.store/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Numinia Open Source 3D Assets - 無料GLB 3Dアセット',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Numinia Open Source 3D Assets - 無料GLB 3Dアセット',
    description: '991種類以上の無料・高品質GLB 3Dアセットをダウンロード。CC0ライセンス。',
    images: ['https://numinia.store/opengraph-image.png'],
  },
};

// Nested layouts must NOT render <html>/<body> — the root layout owns those.
// This layout only provides the locale-specific context providers.
export default function JaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <I18nProvider defaultLocale="ja">
      <AuthProvider>{children}</AuthProvider>
    </I18nProvider>
  );
}