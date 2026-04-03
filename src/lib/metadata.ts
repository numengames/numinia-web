import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/constants';
import { locales, type Locale } from './i18n-config';

type PageMeta = Partial<Record<Locale, Metadata>>;

const pageMetadata: Record<string, PageMeta> = {
  home: {
    en: {
      title: 'Numinia Digital Goods — Free CC0 3D Assets for Games, VR & Metaverse',
      description: 'Browse and download free CC0 digital assets: 3D models (GLB), avatars (VRM), Hyperfy worlds (HYP), audio, video, STL. No attribution required.',
      openGraph: {
        title: 'Numinia Open Source 3D Assets - Free GLB Models',
        description: 'Download free, high-quality CC0 digital assets for games, VR, and 3D projects. CC0 licensed.',
        type: 'website',
        images: [{ url: SITE_URL + '/opengraph-image', width: 1200, height: 630, alt: 'Numinia Open Source 3D Assets' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Numinia Open Source 3D Assets - Free GLB Models',
        description: 'Download free, high-quality CC0 digital assets. CC0 licensed.',
        images: [SITE_URL + '/opengraph-image'],
      },
    },
    ja: {
      title: 'Numinia Open Source 3D Assets - ゲーム・VR・3D向け無料GLBモデル',
      description: 'ゲーム、VR、3Dプロジェクト向けの無料の高品質CC0デジタルアセットをダウンロード。CC0ライセンス - クレジット表記不要で自由に使用可能。',
      openGraph: {
        title: 'Numinia Open Source 3D Assets - 無料GLB 3Dアセット',
        description: 'ゲーム、VR、3Dプロジェクト向けの無料の高品質CC0デジタルアセットをダウンロード。CC0ライセンス。',
        type: 'website',
        locale: 'ja_JP',
        images: [{ url: SITE_URL + '/opengraph-image', width: 1200, height: 630, alt: 'Numinia Open Source 3D Assets - 無料GLB 3Dアセット' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Numinia Open Source 3D Assets - 無料GLB 3Dアセット',
        description: '無料の高品質CC0デジタルアセットをダウンロード。CC0ライセンス。',
        images: [SITE_URL + '/opengraph-image'],
      },
    },
    es: {
      title: 'Numinia Digital Goods — Activos 3D CC0 Gratis para Juegos, VR y Metaverso',
      description: 'Explora y descarga activos digitales CC0 gratuitos: modelos 3D (GLB), avatares (VRM), mundos Hyperfy (HYP), audio, video, STL. Sin atribucion requerida.',
      openGraph: {
        title: 'Numinia Digital Goods - Activos 3D CC0 Gratis',
        description: 'Descarga activos digitales CC0 de alta calidad para juegos, VR y proyectos 3D.',
        type: 'website',
        locale: 'es_ES',
        images: [{ url: SITE_URL + '/opengraph-image', width: 1200, height: 630, alt: 'Numinia Digital Goods - Activos 3D CC0 Gratis' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Numinia Digital Goods - Activos 3D CC0 Gratis',
        description: 'Descarga activos digitales CC0 de alta calidad. Licencia CC0.',
        images: [SITE_URL + '/opengraph-image'],
      },
    },
  },

  archive: {
    en: {
      title: 'Free CC0 Digital Assets Gallery | Open Source Avatars',
      description: 'Browse and download free CC0 digital assets for VR, gaming, VTubing, and metaverse. All CC0 licensed - use them in any project, no attribution required.',
      openGraph: {
        title: 'Free CC0 Digital Assets Gallery | Open Source Avatars',
        description: 'Browse and download free CC0 digital assets for VR, gaming, VTubing, and metaverse. All CC0 licensed.',
        type: 'website',
        images: [{ url: '/api/og?type=gallery&title=Asset Gallery&description=Free CC0 Digital Assets for VR, Gaming & Metaverse', width: 1200, height: 630, alt: 'Open Source Assets Gallery' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Free CC0 Digital Assets Gallery',
        description: 'Browse and download free CC0 digital assets. All CC0 licensed.',
        images: ['/api/og?type=gallery&title=Asset Gallery&description=Free CC0 Digital Assets for VR, Gaming & Metaverse'],
      },
    },
    ja: {
      title: '300種類以上の無料GLBアセットギャラリー | Open Source Avatars',
      description: 'VR、ゲーム、VTuber、メタバース向けの300種類以上の無料・高品質3D GLBアセットを閲覧・ダウンロード。すべてCC0ライセンス - クレジット表記不要で自由に使用可能。',
      openGraph: {
        title: '300種類以上の無料GLBアセットギャラリー | Open Source Avatars',
        description: 'VR、ゲーム、VTuber、メタバース向けの300種類以上の無料・高品質3D GLBアセットを閲覧・ダウンロード。すべてCC0ライセンス。',
        type: 'website',
        images: [{ url: '/api/og?type=gallery&title=アセットギャラリー&description=VR、ゲーム、メタバース向けの300種類以上の無料GLBアセット', width: 1200, height: 630, alt: 'Open Source Assets ギャラリー' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: '300種類以上の無料GLBアセットギャラリー',
        description: '300種類以上の無料・高品質3D GLBアセットを閲覧・ダウンロード。すべてCC0ライセンス。',
        images: ['/api/og?type=gallery&title=アセットギャラリー&description=VR、ゲーム、メタバース向けの300種類以上の無料GLBアセット'],
      },
    },
    es: {
      title: 'Galeria de Activos Digitales CC0 Gratis | Open Source Avatars',
      description: 'Explora y descarga activos digitales CC0 gratuitos para VR, gaming, VTubing y metaverso. Todos con licencia CC0 - usalos en cualquier proyecto, sin atribucion.',
      openGraph: {
        title: 'Galeria de Activos Digitales CC0 Gratis | Open Source Avatars',
        description: 'Explora y descarga activos digitales CC0 gratuitos para VR, gaming, VTubing y metaverso.',
        type: 'website',
        images: [{ url: '/api/og?type=gallery&title=Galeria de Activos&description=Activos Digitales CC0 Gratis para VR, Gaming y Metaverso', width: 1200, height: 630, alt: 'Galeria Open Source Assets' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Galeria de Activos Digitales CC0 Gratis',
        description: 'Explora y descarga activos digitales CC0 gratuitos. Licencia CC0.',
        images: ['/api/og?type=gallery&title=Galeria de Activos&description=Activos Digitales CC0 Gratis para VR, Gaming y Metaverso'],
      },
    },
  },

  gallery: {
    en: {
      title: 'Free CC0 Digital Assets Gallery | Open Source Avatars',
      description: 'Browse and download free CC0 digital assets for VR, gaming, VTubing, and metaverse. All CC0 licensed.',
    },
    ja: {
      title: '300種類以上の無料GLBアセットギャラリー | Open Source Avatars',
      description: 'VR、ゲーム、VTuber、メタバース向けの300種類以上の無料・高品質3D GLBアセットを閲覧・ダウンロード。すべてCC0ライセンス。',
    },
    es: {
      title: 'Galeria de Activos Digitales CC0 Gratis | Open Source Avatars',
      description: 'Explora y descarga activos digitales CC0 gratuitos para VR, gaming, VTubing y metaverso. Licencia CC0.',
    },
  },

  finder: {
    en: {
      title: 'Asset Finder - Batch Download | Open Source Avatars',
      description: 'Browse and download multiple assets at once. File finder interface for batch downloading VRM, GLB, FBX, and other 3D asset formats.',
      openGraph: {
        title: 'Asset Finder - Batch Download | Open Source Avatars',
        description: 'Browse and download multiple assets at once. File finder interface for batch downloading VRM, GLB, FBX, and other 3D asset formats.',
        type: 'website',
        images: [{ url: '/api/og?type=finder&title=Asset Finder&description=Batch Download Multiple Assets', width: 1200, height: 630, alt: 'Open Source Avatars Finder' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Asset Finder - Batch Download',
        description: 'Browse and download multiple assets at once.',
        images: ['/api/og?type=finder&title=Asset Finder&description=Batch Download Multiple Assets'],
      },
    },
    ja: {
      title: 'アセットファインダー - 一括ダウンロード | Open Source Avatars',
      description: '複数のアセットを一度に閲覧・ダウンロード。VRM、GLB、FBXなどの3Dアセットフォーマットの一括ダウンロードインターフェース。',
      openGraph: {
        title: 'アセットファインダー - 一括ダウンロード | Open Source Avatars',
        description: '複数のアセットを一度に閲覧・ダウンロード。',
        type: 'website',
        images: [{ url: '/api/og?type=finder&title=アセットファインダー&description=複数アセットの一括ダウンロード', width: 1200, height: 630, alt: 'Open Source Avatars ファインダー' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'アセットファインダー - 一括ダウンロード',
        description: '複数のアセットを一度に閲覧・ダウンロード。',
        images: ['/api/og?type=finder&title=アセットファインダー&description=複数アセットの一括ダウンロード'],
      },
    },
    es: {
      title: 'Buscador de Activos - Descarga por Lotes | Open Source Avatars',
      description: 'Explora y descarga multiples activos a la vez. Interfaz de buscador para descarga por lotes de VRM, GLB, FBX y otros formatos 3D.',
      openGraph: {
        title: 'Buscador de Activos - Descarga por Lotes | Open Source Avatars',
        description: 'Explora y descarga multiples activos a la vez.',
        type: 'website',
        images: [{ url: '/api/og?type=finder&title=Buscador de Activos&description=Descarga por Lotes de Multiples Activos', width: 1200, height: 630, alt: 'Buscador Open Source Avatars' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Buscador de Activos - Descarga por Lotes',
        description: 'Explora y descarga multiples activos a la vez.',
        images: ['/api/og?type=finder&title=Buscador de Activos&description=Descarga por Lotes de Multiples Activos'],
      },
    },
  },

  glbinspector: {
    en: {
      title: 'GLB Inspector - Analyze & Preview GLB 3D Models | Numinia Digital Goods',
      description: 'Free online GLB 3D inspector and analyzer tool. View metadata, inspect materials, analyze textures, and preview GLB/glTF files.',
    },
    ja: {
      title: 'GLBインスペクター - GLB 3Dモデルの分析とプレビュー | Numinia Digital Goods',
      description: '無料のオンラインGLB 3Dインスペクター・分析ツール。メタデータの表示、マテリアルの検査、テクスチャの分析、GLB/glTFファイルのプレビュー。',
    },
    es: {
      title: 'Inspector GLB - Analiza y Previsualiza Modelos 3D GLB | Numinia Digital Goods',
      description: 'Herramienta gratuita online para inspeccionar y analizar modelos 3D GLB. Ve metadata, inspecciona materiales, analiza texturas y previsualiza archivos GLB/glTF.',
    },
  },

  vrminspector: {
    en: {
      title: 'VRM Inspector - Analyze & Preview VRM Avatars | Numinia Digital Goods',
      description: 'Free online VRM avatar inspector and analyzer tool. View metadata, test expressions, inspect materials, analyze textures, and validate VRM files.',
    },
    ja: {
      title: 'VRMインスペクター - VRMアバターの分析とプレビュー | Numinia Digital Goods',
      description: '無料のオンラインVRMアバターインスペクター・分析ツール。メタデータの表示、表情テスト、マテリアル検査、テクスチャ分析、VRMファイル検証。',
    },
    es: {
      title: 'Inspector VRM - Analiza y Previsualiza Avatares VRM | Numinia Digital Goods',
      description: 'Herramienta gratuita online para inspeccionar avatares VRM. Ve metadata, prueba expresiones, inspecciona materiales y valida archivos VRM.',
    },
  },
};

/** Returns locale-specific metadata with hreflang alternates */
export function getPageMetadata(page: string, locale: Locale): Metadata {
  const meta = pageMetadata[page]?.[locale] ?? pageMetadata[page]?.en ?? {};
  const slug = page === 'home' ? '' : `/${page}`;

  return {
    ...meta,
    alternates: {
      canonical: `${SITE_URL}/${locale}${slug}`,
      languages: Object.fromEntries(
        locales.map((l) => [l, `${SITE_URL}/${l}${slug}`])
      ),
    },
  };
}
