import React, { Suspense } from "react";
import Finder from "@/components/finder/Finder";
import { LoadingScreen } from "@/components/ui/loading-screen";
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
  return getPageMetadata('finder', locale);
}

export default function FinderPage() {
  return (
    <main className="min-h-screen bg-cream dark:bg-cream-dark">
      <Suspense fallback={<LoadingScreen />}>
        <Finder />
      </Suspense>
    </main>
  );
}
