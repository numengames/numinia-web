import type { Metadata } from 'next';
import { getPageMetadata } from '@/lib/metadata';
import { isValidLocale } from '@/lib/i18n-config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return {};
  return getPageMetadata('glbinspector', locale);
}

export default function GLBInspectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream dark:bg-cream-dark">
      {children}
    </div>
  );
}
