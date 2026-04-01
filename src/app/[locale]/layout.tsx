import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { SITE_URL } from '@/lib/constants';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { I18nProvider } from '@/lib/i18n';
import { isValidLocale, locales } from '@/lib/i18n-config';
import { getPageMetadata } from '@/lib/metadata';
import { CookieConsent } from '@/components/CookieConsent';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return {};
  return getPageMetadata('home', locale);
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  return (
    <I18nProvider defaultLocale={locale}>
      <AuthProvider>
        <div className="animate-fade-in">
          {children}
        </div>
        <CookieConsent />
      </AuthProvider>
    </I18nProvider>
  );
}
