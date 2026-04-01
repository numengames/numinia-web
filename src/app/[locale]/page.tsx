import type { Metadata } from 'next';
import { getPageMetadata } from '@/lib/metadata';
import { isValidLocale } from '@/lib/i18n-config';
import Home from './HomeClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return {};
  return getPageMetadata('home', locale);
}

export default function Page() {
  return <Home />;
}
