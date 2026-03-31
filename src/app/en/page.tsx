import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/constants';
import Home from './HomeClient';

export const metadata: Metadata = {
  title: 'Numinia Digital Goods — Free CC0 3D Assets for Games, VR & Metaverse',
  description: 'Browse and download free CC0 digital assets: 3D models (GLB), avatars (VRM), Hyperfy worlds (HYP), audio, video, STL for 3D printing. No attribution required.',
  alternates: {
    canonical: SITE_URL + '/en',
    languages: { en: SITE_URL + '/en', ja: SITE_URL + '/ja' },
  },
  openGraph: {
    title: 'Numinia Digital Goods — Free CC0 3D Assets',
    description: 'Download free CC0 digital assets for games, VR, and metaverse projects.',
    url: SITE_URL + '/en',
    type: 'website',
  },
};

export default function Page() {
  return <Home />;
}
