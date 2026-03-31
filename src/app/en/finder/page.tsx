import React, { Suspense } from "react";
import { SITE_URL } from '@/lib/constants';
import Finder from "@/components/finder/Finder";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Asset Finder - Batch Download | Open Source Avatars',
  description: 'Browse and download multiple assets at once. File finder interface for batch downloading VRM, GLB, FBX, and other 3D asset formats.',
  openGraph: {
    title: 'Asset Finder - Batch Download | Open Source Avatars',
    description: 'Browse and download multiple assets at once. File finder interface for batch downloading VRM, GLB, FBX, and other 3D asset formats.',
    url: SITE_URL + '/en/finder',
    type: 'website',
    images: [
      {
        url: '/api/og?type=finder&title=Asset Finder&description=Batch Download Multiple Assets',
        width: 1200,
        height: 630,
        alt: 'Open Source Avatars Finder',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Asset Finder - Batch Download',
    description: 'Browse and download multiple assets at once.',
    images: ['/api/og?type=finder&title=Asset Finder&description=Batch Download Multiple Assets'],
  },
};

const FinderPage = () => {
  return (
    <main className="min-h-screen bg-cream dark:bg-cream-dark">
      <div className="container-custom pt-4">
        <Breadcrumb items={[{ label: 'Finder' }]} />
      </div>
      <Suspense fallback={<LoadingScreen />}>
        <Finder />
      </Suspense>
    </main>
  );
};

export default FinderPage;
