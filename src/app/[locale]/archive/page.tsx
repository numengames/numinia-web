import React from "react";
import AvatarGallery from "@/components/asset/AvatarGallery";
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
  return getPageMetadata('archive', locale);
}

export default function ArchivePage() {
  return (
    <main className="min-h-screen bg-cream dark:bg-cream-dark">
      <AvatarGallery />
    </main>
  );
}
