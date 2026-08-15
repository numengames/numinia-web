/**
 * UI messages for the store — typed per locale: a missing translation does
 * not compile (same guarantee as the domain constants).
 */

import type { SupportedLocale } from '@numinia/domain';

export interface ArchiveMessages {
  readonly archiveTitle: string;
  readonly archiveIntro: string;
  readonly searchPlaceholder: string;
  readonly allFormats: string;
  readonly download: string;
  readonly downloadUnavailable: string;
  readonly emptyState: string;
  readonly noResults: string;
  readonly backToArchive: string;
  readonly category: string;
  readonly format: string;
  readonly license: string;
  readonly worldFileNote: string;
}

/** Site chrome: header nav, language selector, footer. */
export interface ChromeMessages {
  readonly navHome: string;
  readonly navGallery: string;
  readonly navArchive: string;
  readonly navFinder: string;
  readonly languageSelector: string;
  readonly footerNavigation: string;
  readonly footerResources: string;
  readonly footerDataRepo: string;
  readonly footerLicenseNote: string;
}

export const CHROME_MESSAGES: Readonly<Record<SupportedLocale, ChromeMessages>> = {
  es: {
    navHome: 'Inicio',
    navGallery: 'Galería',
    navArchive: 'Archivo',
    navFinder: 'Finder',
    languageSelector: 'Idioma',
    footerNavigation: 'Navegación',
    footerResources: 'Recursos',
    footerDataRepo: 'Repositorio de datos',
    footerLicenseNote: '© 2026 Numinia. Todos los bienes digitales son CC0.',
  },
  en: {
    navHome: 'Home',
    navGallery: 'Gallery',
    navArchive: 'Archive',
    navFinder: 'Finder',
    languageSelector: 'Language',
    footerNavigation: 'Navigation',
    footerResources: 'Resources',
    footerDataRepo: 'Data repository',
    footerLicenseNote: '© 2026 Numinia. All digital goods are CC0.',
  },
  ja: {
    navHome: 'ホーム',
    navGallery: 'ギャラリー',
    navArchive: 'アーカイブ',
    navFinder: 'Finder',
    languageSelector: '言語',
    footerNavigation: 'ナビゲーション',
    footerResources: 'リソース',
    footerDataRepo: 'データリポジトリ',
    footerLicenseNote: '© 2026 Numinia. すべてのデジタルグッズはCC0です。',
  },
  ko: {
    navHome: '홈',
    navGallery: '갤러리',
    navArchive: '아카이브',
    navFinder: 'Finder',
    languageSelector: '언어',
    footerNavigation: '내비게이션',
    footerResources: '리소스',
    footerDataRepo: '데이터 저장소',
    footerLicenseNote: '© 2026 Numinia. 모든 디지털 굿즈는 CC0입니다.',
  },
  'pt-br': {
    navHome: 'Início',
    navGallery: 'Galeria',
    navArchive: 'Arquivo',
    navFinder: 'Finder',
    languageSelector: 'Idioma',
    footerNavigation: 'Navegação',
    footerResources: 'Recursos',
    footerDataRepo: 'Repositório de dados',
    footerLicenseNote: '© 2026 Numinia. Todos os bens digitais são CC0.',
  },
};

/** Landing page: hero, CTAs, and content sections (mirrors the original home). */
export interface LandingMessages {
  readonly heroTitle: string;
  readonly heroSub: string;
  readonly ctaGallery: string;
  readonly ctaArchive: string;
  readonly aboutTitle: string;
  readonly aboutBody: string;
  readonly toolsTitle: string;
  readonly toolGallery: string;
  readonly toolArchive: string;
  readonly toolsSoon: string;
}

export const LANDING_MESSAGES: Readonly<Record<SupportedLocale, LandingMessages>> = {
  es: {
    heroTitle: 'Bienes digitales open source para juegos, VR y mundos 3D',
    heroSub:
      'Avatares, modelos, mundos y más — la cultura material de Numinia, libre bajo CC0 para usar, remezclar y mejorar.',
    ctaGallery: 'Explorar la galería',
    ctaArchive: 'Abrir el archivo',
    aboutTitle: 'El proyecto',
    aboutBody:
      'Numinia es una ciudad entre planos, y estos son los objetos que sus ciudadanos usan, ganan y llevan consigo. Cada activo se publica en formatos abiertos (GLB, VRM y más) con metadatos portables: los datos viven en repositorios públicos, no en una base de datos cerrada.',
    toolsTitle: 'Herramientas',
    toolGallery: 'La galería: los avatares de la ciudad, colección a colección.',
    toolArchive: 'El archivo: todos los formatos, con búsqueda, filtros y descarga directa.',
    toolsSoon: 'En camino: el inspector 3D.',
  },
  en: {
    heroTitle: 'Open-source digital goods for games, VR, and 3D worlds',
    heroSub:
      'Avatars, models, worlds and more — the material culture of Numinia, free under CC0 to use, remix, and improve.',
    ctaGallery: 'Explore the gallery',
    ctaArchive: 'Open the archive',
    aboutTitle: 'The project',
    aboutBody:
      'Numinia is a city between planes, and these are the objects its citizens use, earn, and carry. Every asset ships in open formats (GLB, VRM and more) with portable metadata: the data lives in public repositories, not a closed database.',
    toolsTitle: 'Tools',
    toolGallery: 'The gallery: the avatars of the city, collection by collection.',
    toolArchive: 'The archive: every format, with search, filters, and direct download.',
    toolsSoon: 'Coming next: the 3D inspector.',
  },
  ja: {
    heroTitle: 'ゲーム・VR・3Dワールドのためのオープンソース・デジタルグッズ',
    heroSub:
      'アバター、モデル、ワールドなど — ヌミニアの物質文化。CC0で自由に使い、リミックスし、改良できます。',
    ctaGallery: 'ギャラリーを見る',
    ctaArchive: 'アーカイブを開く',
    aboutTitle: 'プロジェクトについて',
    aboutBody:
      'ヌミニアは次元の狭間にある都市。ここにあるのは市民が使い、獲得し、持ち歩く品々です。すべてのアセットはオープンフォーマット（GLB、VRMなど）とポータブルなメタデータで公開され、データは閉じたデータベースではなく公開リポジトリにあります。',
    toolsTitle: 'ツール',
    toolGallery: 'ギャラリー:都市のアバターをコレクションごとに。',
    toolArchive: 'アーカイブ:全フォーマット。検索・フィルター・直接ダウンロード。',
    toolsSoon: '近日公開:3Dインスペクター。',
  },
  ko: {
    heroTitle: '게임·VR·3D 월드를 위한 오픈소스 디지털 굿즈',
    heroSub:
      '아바타, 모델, 월드 등 — 누미니아의 물질 문화. CC0로 자유롭게 쓰고, 리믹스하고, 개선하세요.',
    ctaGallery: '갤러리 둘러보기',
    ctaArchive: '아카이브 열기',
    aboutTitle: '프로젝트 소개',
    aboutBody:
      '누미니아는 차원 사이의 도시이며, 여기 있는 것은 시민들이 쓰고, 얻고, 지니는 물건들입니다. 모든 에셋은 개방형 포맷(GLB, VRM 등)과 이동 가능한 메타데이터로 공개되며, 데이터는 닫힌 데이터베이스가 아닌 공개 저장소에 있습니다.',
    toolsTitle: '도구',
    toolGallery: '갤러리: 도시의 아바타를 컬렉션별로.',
    toolArchive: '아카이브: 모든 포맷, 검색·필터·직접 다운로드.',
    toolsSoon: '곧 공개: 3D 인스펙터.',
  },
  'pt-br': {
    heroTitle: 'Bens digitais open source para jogos, VR e mundos 3D',
    heroSub:
      'Avatares, modelos, mundos e mais — a cultura material de Numinia, livre sob CC0 para usar, remixar e melhorar.',
    ctaGallery: 'Explorar a galeria',
    ctaArchive: 'Abrir o arquivo',
    aboutTitle: 'O projeto',
    aboutBody:
      'Numinia é uma cidade entre planos, e estes são os objetos que seus cidadãos usam, ganham e carregam. Cada ativo é publicado em formatos abertos (GLB, VRM e mais) com metadados portáveis: os dados vivem em repositórios públicos, não em um banco de dados fechado.',
    toolsTitle: 'Ferramentas',
    toolGallery: 'A galeria: os avatares da cidade, coleção por coleção.',
    toolArchive: 'O arquivo: todos os formatos, com busca, filtros e download direto.',
    toolsSoon: 'Em breve: o inspetor 3D.',
  },
};

/** Finder island — every label the client component needs, resolved at build. */
export interface FinderMessages {
  readonly finderTitle: string;
  readonly finderIntro: string;
  readonly collectionsLabel: string;
  readonly filesLabel: string;
  readonly previewLabel: string;
  readonly emptyPreview: string;
  readonly queueLabel: string;
  readonly addToQueue: string;
  readonly removeFromQueue: string;
  readonly downloadAll: string;
  readonly download: string;
  readonly downloadUnavailable: string;
  readonly queueEmpty: string;
  readonly categories: Readonly<Record<string, string>>;
}

export const FINDER_MESSAGES: Readonly<Record<SupportedLocale, FinderMessages>> = {
  es: {
    finderTitle: 'Finder',
    finderIntro: 'Explora las colecciones de la ciudad y descarga por lotes.',
    collectionsLabel: 'Colecciones',
    filesLabel: 'Archivos',
    previewLabel: 'Vista previa',
    emptyPreview: 'Selecciona un archivo para previsualizarlo.',
    queueLabel: 'Cola de descarga',
    addToQueue: 'Añadir a la cola',
    removeFromQueue: 'Quitar de la cola',
    downloadAll: 'Descargar todo',
    download: 'Descargar',
    downloadUnavailable: 'Descarga no disponible',
    queueEmpty: 'La cola está vacía.',
    categories: {
      models: 'Modelos',
      avatars: 'Avatares',
      worlds: 'Mundos',
      audio: 'Audio',
      video: 'Vídeo',
      images: 'Imágenes',
    },
  },
  en: {
    finderTitle: 'Finder',
    finderIntro: 'Browse the city collections and batch-download.',
    collectionsLabel: 'Collections',
    filesLabel: 'Files',
    previewLabel: 'Preview',
    emptyPreview: 'Select a file to preview it.',
    queueLabel: 'Download queue',
    addToQueue: 'Add to queue',
    removeFromQueue: 'Remove from queue',
    downloadAll: 'Download all',
    download: 'Download',
    downloadUnavailable: 'Download unavailable',
    queueEmpty: 'The queue is empty.',
    categories: {
      models: 'Models',
      avatars: 'Avatars',
      worlds: 'Worlds',
      audio: 'Audio',
      video: 'Video',
      images: 'Images',
    },
  },
  ja: {
    finderTitle: 'Finder',
    finderIntro: '都市のコレクションを探索して、まとめてダウンロード。',
    collectionsLabel: 'コレクション',
    filesLabel: 'ファイル',
    previewLabel: 'プレビュー',
    emptyPreview: 'ファイルを選択するとプレビューできます。',
    queueLabel: 'ダウンロードキュー',
    addToQueue: 'キューに追加',
    removeFromQueue: 'キューから削除',
    downloadAll: 'すべてダウンロード',
    download: 'ダウンロード',
    downloadUnavailable: 'ダウンロード不可',
    queueEmpty: 'キューは空です。',
    categories: {
      models: 'モデル',
      avatars: 'アバター',
      worlds: 'ワールド',
      audio: 'オーディオ',
      video: 'ビデオ',
      images: '画像',
    },
  },
  ko: {
    finderTitle: 'Finder',
    finderIntro: '도시의 컬렉션을 둘러보고 일괄 다운로드하세요.',
    collectionsLabel: '컬렉션',
    filesLabel: '파일',
    previewLabel: '미리보기',
    emptyPreview: '파일을 선택하면 미리 볼 수 있습니다.',
    queueLabel: '다운로드 대기열',
    addToQueue: '대기열에 추가',
    removeFromQueue: '대기열에서 제거',
    downloadAll: '모두 다운로드',
    download: '다운로드',
    downloadUnavailable: '다운로드 불가',
    queueEmpty: '대기열이 비어 있습니다.',
    categories: {
      models: '모델',
      avatars: '아바타',
      worlds: '월드',
      audio: '오디오',
      video: '비디오',
      images: '이미지',
    },
  },
  'pt-br': {
    finderTitle: 'Finder',
    finderIntro: 'Explore as coleções da cidade e baixe em lote.',
    collectionsLabel: 'Coleções',
    filesLabel: 'Arquivos',
    previewLabel: 'Pré-visualização',
    emptyPreview: 'Selecione um arquivo para visualizá-lo.',
    queueLabel: 'Fila de download',
    addToQueue: 'Adicionar à fila',
    removeFromQueue: 'Remover da fila',
    downloadAll: 'Baixar tudo',
    download: 'Baixar',
    downloadUnavailable: 'Download indisponível',
    queueEmpty: 'A fila está vazia.',
    categories: {
      models: 'Modelos',
      avatars: 'Avatares',
      worlds: 'Mundos',
      audio: 'Áudio',
      video: 'Vídeo',
      images: 'Imagens',
    },
  },
};

export interface GalleryMessages {
  readonly galleryTitle: string;
  readonly galleryIntro: string;
  readonly emptyState: string;
  readonly viewInArchive: string;
}

export const GALLERY_MESSAGES: Readonly<Record<SupportedLocale, GalleryMessages>> = {
  es: {
    galleryTitle: 'Galería',
    galleryIntro: 'Los avatares de Numinia, colección a colección. Todos CC0, todos tuyos.',
    emptyState: 'La galería está vacía por ahora.',
    viewInArchive: 'Ver en el Archivo',
  },
  en: {
    galleryTitle: 'Gallery',
    galleryIntro: 'The avatars of Numinia, collection by collection. All CC0, all yours.',
    emptyState: 'The gallery is empty for now.',
    viewInArchive: 'View in the Archive',
  },
  ja: {
    galleryTitle: 'ギャラリー',
    galleryIntro: 'ヌミニアのアバターをコレクションごとに。すべてCC0、すべてあなたのもの。',
    emptyState: 'ギャラリーはまだ空です。',
    viewInArchive: 'アーカイブで見る',
  },
  ko: {
    galleryTitle: '갤러리',
    galleryIntro: '누미니아의 아바타를 컬렉션별로. 전부 CC0, 전부 당신의 것.',
    emptyState: '갤러리가 아직 비어 있습니다.',
    viewInArchive: '아카이브에서 보기',
  },
  'pt-br': {
    galleryTitle: 'Galeria',
    galleryIntro: 'Os avatares de Numinia, coleção por coleção. Todos CC0, todos seus.',
    emptyState: 'A galeria está vazia por enquanto.',
    viewInArchive: 'Ver no Arquivo',
  },
};

export const ARCHIVE_MESSAGES: Readonly<Record<SupportedLocale, ArchiveMessages>> = {
  es: {
    archiveTitle: 'Archivo',
    archiveIntro: 'Bienes digitales CC0 de la ciudad de Numinia: úsalos, remézclalos, mejóralos.',
    searchPlaceholder: 'Buscar en el archivo…',
    allFormats: 'Todos',
    download: 'Descargar',
    downloadUnavailable: 'Descarga no disponible',
    emptyState: 'El archivo está vacío por ahora.',
    noResults: 'Nada coincide con tu búsqueda.',
    backToArchive: '← Volver al Archivo',
    category: 'Categoría',
    format: 'Formato',
    license: 'Licencia',
    worldFileNote: 'Archivo de mundo para Hyperfy. Descárgalo para usarlo en tu espacio.',
  },
  en: {
    archiveTitle: 'Archive',
    archiveIntro: 'CC0 digital goods from the city of Numinia: use them, remix them, improve them.',
    searchPlaceholder: 'Search the archive…',
    allFormats: 'All',
    download: 'Download',
    downloadUnavailable: 'Download unavailable',
    emptyState: 'The archive is empty for now.',
    noResults: 'Nothing matches your search.',
    backToArchive: '← Back to the Archive',
    category: 'Category',
    format: 'Format',
    license: 'License',
    worldFileNote: 'A world file for Hyperfy. Download it to use it in your space.',
  },
  ja: {
    archiveTitle: 'アーカイブ',
    archiveIntro:
      'ヌミニアの都市が贈るCC0デジタルグッズ。使って、リミックスして、良くしてください。',
    searchPlaceholder: 'アーカイブを検索…',
    allFormats: 'すべて',
    download: 'ダウンロード',
    downloadUnavailable: 'ダウンロード不可',
    emptyState: 'アーカイブはまだ空です。',
    noResults: '検索に一致するものがありません。',
    backToArchive: '← アーカイブへ戻る',
    category: 'カテゴリー',
    format: 'フォーマット',
    license: 'ライセンス',
    worldFileNote: 'Hyperfy用ワールドファイル。ダウンロードしてスペースで使えます。',
  },
  ko: {
    archiveTitle: '아카이브',
    archiveIntro: '누미니아 도시의 CC0 디지털 굿즈 — 쓰고, 리믹스하고, 더 좋게 만드세요.',
    searchPlaceholder: '아카이브 검색…',
    allFormats: '전체',
    download: '다운로드',
    downloadUnavailable: '다운로드 불가',
    emptyState: '아카이브가 아직 비어 있습니다.',
    noResults: '검색과 일치하는 항목이 없습니다.',
    backToArchive: '← 아카이브로 돌아가기',
    category: '카테고리',
    format: '포맷',
    license: '라이선스',
    worldFileNote: 'Hyperfy용 월드 파일입니다. 내려받아 내 공간에서 사용하세요.',
  },
  'pt-br': {
    archiveTitle: 'Arquivo',
    archiveIntro: 'Bens digitais CC0 da cidade de Numinia: use, remixe, melhore.',
    searchPlaceholder: 'Buscar no arquivo…',
    allFormats: 'Todos',
    download: 'Baixar',
    downloadUnavailable: 'Download indisponível',
    emptyState: 'O arquivo está vazio por enquanto.',
    noResults: 'Nada corresponde à sua busca.',
    backToArchive: '← Voltar ao Arquivo',
    category: 'Categoria',
    format: 'Formato',
    license: 'Licença',
    worldFileNote: 'Arquivo de mundo para o Hyperfy. Baixe para usar no seu espaço.',
  },
};
