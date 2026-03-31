'use client';
import { SITE_URL } from '@/lib/constants';

import React from 'react';
import Script from 'next/script';

interface WebsiteSchemaProps {
  locale?: 'en' | 'ja';
}

export function WebsiteSchema({ locale = 'en' }: WebsiteSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Numinia Digital Goods',
    alternateName: locale === 'ja' ? 'ヌミニア・デジタルグッズ' : 'Numinia',
    url: `${SITE_URL}/${locale}`,
    description:
      locale === 'en'
        ? 'Download free, high-quality 3D GLB assets for games, VR, 3D projects. CC0 licensed open-source models, props, and environments for any project.'
        : '無料で高品質な3D GLBアセットをダウンロード。ゲーム、VR、3Dプロジェクト用。CC0ライセンスのオープンソースモデル、小道具、環境。',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/${locale}/gallery?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: locale === 'en' ? 'en-US' : 'ja-JP',
  };

  return (
    <Script id="website-schema" type="application/ld+json" strategy="afterInteractive">
      {JSON.stringify(schema)}
    </Script>
  );
}

interface OrganizationSchemaProps {
  locale?: 'en' | 'ja';
}

export function OrganizationSchema({ locale = 'en' }: OrganizationSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Numinia Digital Goods',
    url: SITE_URL + '',
    logo: SITE_URL + '/logo.png',
    description:
      locale === 'en'
        ? 'A platform dedicated to providing high-quality, freely available 3D assets for creators, developers, and users worldwide.'
        : '世界中のクリエイター、開発者、ユーザーに高品質で自由に利用できる3Dアセットを提供することに特化したプラットフォーム。',
    founder: {
      '@type': 'Organization',
      name: 'Numen Games',
      url: 'https://numen.games',
    },
    sameAs: [
      'https://twitter.com/numinia_xyz',
      'https://github.com/PabloFMM/numinia-digital-goods',
      'https://github.com/PabloFMM/numinia-digital-goods-data',
    ],
  };

  return (
    <Script id="organization-schema" type="application/ld+json" strategy="afterInteractive">
      {JSON.stringify(schema)}
    </Script>
  );
}

interface AvatarProductSchemaProps {
  avatar: {
    id: string;
    name: string;
    description?: string;
    thumbnailUrl?: string;
    modelFileUrl: string;
    format: string;
    polygonCount?: number;
    materialCount?: number;
    project: string;
    createdAt: string;
  };
  locale?: 'en' | 'ja';
}

export function AvatarProductSchema({ avatar, locale = 'en' }: AvatarProductSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'DigitalDocument',
    '@id': `${SITE_URL}/${locale}/assets/${avatar.id}`,
    name: avatar.name,
    description:
      avatar.description ||
      (locale === 'en'
        ? `Free ${avatar.format.toUpperCase()} 3D asset from the ${avatar.project} collection. Perfect for games, VR, and 3D projects.`
        : `${avatar.project}コレクションの無料${avatar.format.toUpperCase()} 3Dアセット。ゲーム、VR、3Dプロジェクト用に最適。`),
    image: avatar.thumbnailUrl || SITE_URL + '/og-image.png',
    url: `${SITE_URL}/${locale}/assets/${avatar.id}`,
    dateCreated: avatar.createdAt,
    encodingFormat: avatar.format === 'vrm' ? 'model/gltf-binary' : 'model/fbx',
    fileFormat: avatar.format.toUpperCase(),
    license: 'https://creativecommons.org/publicdomain/zero/1.0/',
    keywords: [
      avatar.name,
      'GLB model',
      'free 3D asset',
      'open source 3D model',
      avatar.project,
      'CC0',
      'game asset',
      '3D prop',
    ].join(', '),
    isAccessibleForFree: true,
    creator: {
      '@type': 'Organization',
      name: 'Numinia Digital Goods',
      url: SITE_URL + '',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'Numinia Digital Goods',
      },
    },
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Polygon Count',
        value: avatar.polygonCount?.toString() || 'Unknown',
      },
      {
        '@type': 'PropertyValue',
        name: 'Material Count',
        value: avatar.materialCount?.toString() || 'Unknown',
      },
      {
        '@type': 'PropertyValue',
        name: 'Format',
        value: avatar.format.toUpperCase(),
      },
      {
        '@type': 'PropertyValue',
        name: 'Collection',
        value: avatar.project,
      },
    ],
  };

  return (
    <Script id="avatar-product-schema" type="application/ld+json" strategy="afterInteractive">
      {JSON.stringify(schema)}
    </Script>
  );
}

interface BreadcrumbSchemaProps {
  items: Array<{
    name: string;
    url: string;
  }>;
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Script id="breadcrumb-schema" type="application/ld+json" strategy="afterInteractive">
      {JSON.stringify(schema)}
    </Script>
  );
}

interface CollectionPageSchemaProps {
  totalItems: number;
  locale?: 'en' | 'ja';
}

export function CollectionPageSchema({ totalItems, locale = 'en' }: CollectionPageSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: locale === 'en' ? 'Asset Gallery' : 'アセットギャラリー',
    description:
      locale === 'en'
        ? `Browse our collection of ${totalItems}+ free, open-source 3D GLB assets`
        : `${totalItems}以上の無料オープンソース3D GLBアセットのコレクションを閲覧`,
    url: `${SITE_URL}/${locale}/gallery`,
    numberOfItems: totalItems,
    about: {
      '@type': 'Thing',
      name: locale === 'en' ? '3D Assets' : '3Dアセット',
      description:
        locale === 'en'
          ? 'Free GLB format 3D models for games, virtual reality, and 3D projects'
          : 'ゲーム、バーチャルリアリティ、3Dプロジェクト用の無料GLB形式3Dモデル',
    },
  };

  return (
    <Script id="collection-page-schema" type="application/ld+json" strategy="afterInteractive">
      {JSON.stringify(schema)}
    </Script>
  );
}
