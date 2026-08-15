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
  readonly navCity: string;
  readonly navAssets: string;
  readonly navLap: string;
  readonly navGallery: string;
  readonly navArchive: string;
  readonly navFinder: string;
  readonly navUpdates: string;
  readonly navDocs: string;
  readonly navInspector: string;
  readonly footerLegal: string;
  readonly legalPrivacy: string;
  readonly legalCookies: string;
  readonly legalTerms: string;
  readonly legalNotice: string;
  readonly languageSelector: string;
  readonly footerNavigation: string;
  readonly footerResources: string;
  readonly footerDataRepo: string;
  readonly footerLicenseNote: string;
}

export const CHROME_MESSAGES: Readonly<Record<SupportedLocale, ChromeMessages>> = {
  es: {
    navHome: 'Inicio',
    navCity: 'La Ciudad',
    navAssets: 'Assets',
    navLap: 'L.A.P.',
    navGallery: 'Galería',
    navArchive: 'Archivo',
    navFinder: 'Finder',
    navUpdates: 'Actualizaciones',
    navDocs: 'Recursos',
    navInspector: 'Inspector',
    footerLegal: 'Legal',
    legalPrivacy: 'Privacidad',
    legalCookies: 'Cookies',
    legalTerms: 'Términos',
    legalNotice: 'Aviso legal',
    languageSelector: 'Idioma',
    footerNavigation: 'Navegación',
    footerResources: 'Recursos',
    footerDataRepo: 'Repositorio de datos',
    footerLicenseNote: '© 2026 Numinia. Todos los bienes digitales son CC0.',
  },
  en: {
    navHome: 'Home',
    navCity: 'The City',
    navAssets: 'Assets',
    navLap: 'L.A.P.',
    navGallery: 'Gallery',
    navArchive: 'Archive',
    navFinder: 'Finder',
    navUpdates: 'Updates',
    navDocs: 'Resources',
    navInspector: 'Inspector',
    footerLegal: 'Legal',
    legalPrivacy: 'Privacy',
    legalCookies: 'Cookies',
    legalTerms: 'Terms',
    legalNotice: 'Legal notice',
    languageSelector: 'Language',
    footerNavigation: 'Navigation',
    footerResources: 'Resources',
    footerDataRepo: 'Data repository',
    footerLicenseNote: '© 2026 Numinia. All digital goods are CC0.',
  },
  ja: {
    navHome: 'ホーム',
    navCity: '都市',
    navAssets: 'アセット',
    navLap: 'L.A.P.',
    navGallery: 'ギャラリー',
    navArchive: 'アーカイブ',
    navFinder: 'Finder',
    navUpdates: '更新履歴',
    navDocs: 'リソース',
    navInspector: 'インスペクター',
    footerLegal: '法的情報',
    legalPrivacy: 'プライバシー',
    legalCookies: 'クッキー',
    legalTerms: '利用規約',
    legalNotice: '法的通知',
    languageSelector: '言語',
    footerNavigation: 'ナビゲーション',
    footerResources: 'リソース',
    footerDataRepo: 'データリポジトリ',
    footerLicenseNote: '© 2026 Numinia. すべてのデジタルグッズはCC0です。',
  },
  ko: {
    navHome: '홈',
    navCity: '도시',
    navAssets: '에셋',
    navLap: 'L.A.P.',
    navGallery: '갤러리',
    navArchive: '아카이브',
    navFinder: 'Finder',
    navUpdates: '업데이트',
    navDocs: '리소스',
    navInspector: '인스펙터',
    footerLegal: '법적 고지',
    legalPrivacy: '개인정보',
    legalCookies: '쿠키',
    legalTerms: '이용약관',
    legalNotice: '법적 고지사항',
    languageSelector: '언어',
    footerNavigation: '내비게이션',
    footerResources: '리소스',
    footerDataRepo: '데이터 저장소',
    footerLicenseNote: '© 2026 Numinia. 모든 디지털 굿즈는 CC0입니다.',
  },
  'pt-br': {
    navHome: 'Início',
    navCity: 'A Cidade',
    navAssets: 'Assets',
    navLap: 'L.A.P.',
    navGallery: 'Galeria',
    navArchive: 'Arquivo',
    navFinder: 'Finder',
    navUpdates: 'Atualizações',
    navDocs: 'Recursos',
    navInspector: 'Inspetor',
    footerLegal: 'Legal',
    legalPrivacy: 'Privacidade',
    legalCookies: 'Cookies',
    legalTerms: 'Termos',
    legalNotice: 'Aviso legal',
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
  readonly ctaCity: string;
  readonly ctaAssets: string;
  readonly pillarsTitle: string;
  readonly pillarCity: string;
  readonly pillarAssets: string;
  readonly pillarLap: string;
}

export const LANDING_MESSAGES: Readonly<Record<SupportedLocale, LandingMessages>> = {
  es: {
    heroTitle: 'Bienes digitales open source para juegos, VR y mundos 3D',
    heroSub:
      'Avatares, modelos, mundos y más — la cultura material de Numinia, libre bajo CC0 para usar, remezclar y mejorar.',
    ctaCity: 'Descubrir la Ciudad',
    ctaAssets: 'Explorar los Assets',
    pillarsTitle: 'Tres puertas',
    pillarCity:
      'La Ciudad: qué es Numinia — su historia, sus distritos, sus habitantes y el juego que la construye.',
    pillarAssets:
      'Assets: bienes digitales CC0 en formatos abiertos para construir mundos — galería, archivo, finder e inspector.',
    pillarLap:
      'L.A.P.: el área del jugador — tu puerta al juego virtual y a tu información de ciudadano.',
  },
  en: {
    heroTitle: 'Open-source digital goods for games, VR, and 3D worlds',
    heroSub:
      'Avatars, models, worlds and more — the material culture of Numinia, free under CC0 to use, remix, and improve.',
    ctaCity: 'Discover the City',
    ctaAssets: 'Explore the Assets',
    pillarsTitle: 'Three doors',
    pillarCity:
      'The City: what Numinia is — its history, its districts, its inhabitants, and the game that builds it.',
    pillarAssets:
      'Assets: CC0 digital goods in open formats for building worlds — gallery, archive, finder, and inspector.',
    pillarLap:
      'L.A.P.: the player area — your door to the virtual game and your citizen information.',
  },
  ja: {
    heroTitle: 'ゲーム・VR・3Dワールドのためのオープンソース・デジタルグッズ',
    heroSub:
      'アバター、モデル、ワールドなど — ヌミニアの物質文化。CC0で自由に使い、リミックスし、改良できます。',
    ctaCity: '都市を知る',
    ctaAssets: 'アセットを探索',
    pillarsTitle: '三つの扉',
    pillarCity: '都市:ヌミニアとは — その歴史、地区、住民、そして都市を築くゲーム。',
    pillarAssets:
      'アセット:世界を作るためのCC0デジタルグッズ — ギャラリー、アーカイブ、Finder、インスペクター。',
    pillarLap: 'L.A.P.:プレイヤーエリア — 仮想ゲームと市民情報への入り口。',
  },
  ko: {
    heroTitle: '게임·VR·3D 월드를 위한 오픈소스 디지털 굿즈',
    heroSub:
      '아바타, 모델, 월드 등 — 누미니아의 물질 문화. CC0로 자유롭게 쓰고, 리믹스하고, 개선하세요.',
    ctaCity: '도시 알아보기',
    ctaAssets: '에셋 탐색하기',
    pillarsTitle: '세 개의 문',
    pillarCity: '도시: 누미니아란 — 역사, 구역, 주민, 그리고 도시를 만드는 게임.',
    pillarAssets: '에셋: 월드를 만들기 위한 CC0 디지털 굿즈 — 갤러리, 아카이브, Finder, 인스펙터.',
    pillarLap: 'L.A.P.: 플레이어 구역 — 가상 게임과 시민 정보로 가는 문.',
  },
  'pt-br': {
    heroTitle: 'Bens digitais open source para jogos, VR e mundos 3D',
    heroSub:
      'Avatares, modelos, mundos e mais — a cultura material de Numinia, livre sob CC0 para usar, remixar e melhorar.',
    ctaCity: 'Descobrir a Cidade',
    ctaAssets: 'Explorar os Assets',
    pillarsTitle: 'Três portas',
    pillarCity:
      'A Cidade: o que é Numinia — sua história, seus distritos, seus habitantes e o jogo que a constrói.',
    pillarAssets:
      'Assets: bens digitais CC0 em formatos abertos para construir mundos — galeria, arquivo, finder e inspetor.',
    pillarLap: 'L.A.P.: a área do jogador — sua porta para o jogo virtual e suas informações.',
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

/** Updates timeline page. */
export interface UpdatesMessages {
  readonly updatesTitle: string;
  readonly updatesIntro: string;
  readonly techNote: string;
  readonly typeLabels: Readonly<Record<'NEW' | 'FIX' | 'UPD', string>>;
  readonly roadmapTitle: string;
  readonly latestLabel: string;
  readonly statusLabels: Readonly<Record<'planned' | 'research', string>>;
}

export const UPDATES_MESSAGES: Readonly<Record<SupportedLocale, UpdatesMessages>> = {
  es: {
    updatesTitle: 'Actualizaciones',
    updatesIntro: 'La línea temporal de la plataforma, de v0.1.0 al presente.',
    techNote: 'El registro técnico se mantiene en inglés.',
    typeLabels: { NEW: 'Nuevo', FIX: 'Arreglo', UPD: 'Mejora' },
    roadmapTitle: 'Próximamente',
    latestLabel: 'Última',
    statusLabels: { planned: 'Planificado', research: 'Investigación' },
  },
  en: {
    updatesTitle: 'Updates',
    updatesIntro: 'The platform timeline, from v0.1.0 to the present.',
    techNote: 'The technical record is kept in English.',
    typeLabels: { NEW: 'New', FIX: 'Fix', UPD: 'Updated' },
    roadmapTitle: 'Incoming',
    latestLabel: 'Latest',
    statusLabels: { planned: 'Planned', research: 'Research' },
  },
  ja: {
    updatesTitle: '更新履歴',
    updatesIntro: 'v0.1.0から現在までのプラットフォームの歩み。',
    techNote: '技術記録は英語で管理されています。',
    typeLabels: { NEW: '新規', FIX: '修正', UPD: '更新' },
    roadmapTitle: '今後の予定',
    latestLabel: '最新',
    statusLabels: { planned: '計画中', research: '調査中' },
  },
  ko: {
    updatesTitle: '업데이트',
    updatesIntro: 'v0.1.0부터 현재까지의 플랫폼 타임라인.',
    techNote: '기술 기록은 영어로 유지됩니다.',
    typeLabels: { NEW: '신규', FIX: '수정', UPD: '업데이트' },
    roadmapTitle: '예정',
    latestLabel: '최신',
    statusLabels: { planned: '계획됨', research: '조사 중' },
  },
  'pt-br': {
    updatesTitle: 'Atualizações',
    updatesIntro: 'A linha do tempo da plataforma, de v0.1.0 ao presente.',
    techNote: 'O registro técnico é mantido em inglês.',
    typeLabels: { NEW: 'Novo', FIX: 'Correção', UPD: 'Melhoria' },
    roadmapTitle: 'Em breve',
    latestLabel: 'Mais recente',
    statusLabels: { planned: 'Planejado', research: 'Pesquisa' },
  },
};

/** Docs (resources) section shell. */
export interface DocsMessages {
  readonly docsTitle: string;
  readonly sidebarLabel: string;
  readonly previousLabel: string;
  readonly nextLabel: string;
  readonly legacyBanner: string;
  readonly languageNotice: string | null;
}

export const DOCS_MESSAGES: Readonly<Record<SupportedLocale, DocsMessages>> = {
  es: {
    docsTitle: 'Recursos',
    sidebarLabel: 'Documentación',
    previousLabel: 'Anterior',
    nextLabel: 'Siguiente',
    legacyBanner:
      'Esta página describe la arquitectura anterior de la plataforma y está pendiente de reescritura.',
    languageNotice: 'Este contenido está disponible solo en inglés y japonés por ahora.',
  },
  en: {
    docsTitle: 'Resources',
    sidebarLabel: 'Documentation',
    previousLabel: 'Previous',
    nextLabel: 'Next',
    legacyBanner:
      'This page describes the previous platform architecture and is pending a rewrite.',
    languageNotice: null,
  },
  ja: {
    docsTitle: 'リソース',
    sidebarLabel: 'ドキュメント',
    previousLabel: '前へ',
    nextLabel: '次へ',
    legacyBanner: 'このページは旧プラットフォーム構成を説明しており、書き直し予定です。',
    languageNotice: null,
  },
  ko: {
    docsTitle: '리소스',
    sidebarLabel: '문서',
    previousLabel: '이전',
    nextLabel: '다음',
    legacyBanner: '이 페이지는 이전 플랫폼 아키텍처를 설명하며 재작성될 예정입니다.',
    languageNotice: '이 콘텐츠는 현재 영어와 일본어로만 제공됩니다.',
  },
  'pt-br': {
    docsTitle: 'Recursos',
    sidebarLabel: 'Documentação',
    previousLabel: 'Anterior',
    nextLabel: 'Próximo',
    legacyBanner: 'Esta página descreve a arquitetura anterior da plataforma e aguarda reescrita.',
    languageNotice: 'Este conteúdo está disponível apenas em inglês e japonês por enquanto.',
  },
};

/** 3D inspector page + island labels. */
export interface InspectorMessages {
  readonly inspectorTitle: string;
  readonly inspectorIntro: string;
  readonly dropHint: string;
  readonly pickFile: string;
  readonly unsupported: string;
  readonly loadError: string;
  readonly statsTitle: string;
  readonly fileLabel: string;
  readonly sizeLabel: string;
  readonly privacyNote: string;
  readonly statLabels: Readonly<
    Record<
      | 'meshes'
      | 'vertices'
      | 'triangles'
      | 'materials'
      | 'textures'
      | 'animations'
      | 'vrmName'
      | 'vrmAuthors',
      string
    >
  >;
}

export const INSPECTOR_MESSAGES: Readonly<Record<SupportedLocale, InspectorMessages>> = {
  es: {
    inspectorTitle: 'Inspector 3D',
    inspectorIntro: 'Inspecciona un GLB o VRM local: vista previa y metadatos.',
    dropHint: 'Arrastra aquí un archivo .glb, .gltf o .vrm',
    pickFile: 'o elige un archivo',
    unsupported: 'Formato no soportado — usa .glb, .gltf o .vrm',
    loadError: 'No se pudo leer el modelo (archivo corrupto o incompatible).',
    statsTitle: 'Metadatos',
    fileLabel: 'Archivo',
    sizeLabel: 'Tamaño',
    privacyNote: 'Todo ocurre en tu navegador: el archivo nunca se sube.',
    statLabels: {
      meshes: 'Mallas',
      vertices: 'Vértices',
      triangles: 'Triángulos',
      materials: 'Materiales',
      textures: 'Texturas',
      animations: 'Animaciones',
      vrmName: 'Nombre VRM',
      vrmAuthors: 'Autoría VRM',
    },
  },
  en: {
    inspectorTitle: '3D Inspector',
    inspectorIntro: 'Inspect a local GLB or VRM: live preview plus metadata.',
    dropHint: 'Drop a .glb, .gltf or .vrm file here',
    pickFile: 'or pick a file',
    unsupported: 'Unsupported format — use .glb, .gltf or .vrm',
    loadError: 'The model could not be read (corrupt or incompatible file).',
    statsTitle: 'Metadata',
    fileLabel: 'File',
    sizeLabel: 'Size',
    privacyNote: 'Everything happens in your browser: the file is never uploaded.',
    statLabels: {
      meshes: 'Meshes',
      vertices: 'Vertices',
      triangles: 'Triangles',
      materials: 'Materials',
      textures: 'Textures',
      animations: 'Animations',
      vrmName: 'VRM name',
      vrmAuthors: 'VRM authors',
    },
  },
  ja: {
    inspectorTitle: '3Dインスペクター',
    inspectorIntro: 'ローカルのGLB/VRMを検査:プレビューとメタデータ。',
    dropHint: '.glb / .gltf / .vrm ファイルをここにドロップ',
    pickFile: 'またはファイルを選択',
    unsupported: '非対応フォーマットです — .glb / .gltf / .vrm を使ってください',
    loadError: 'モデルを読み込めませんでした(破損または非互換)。',
    statsTitle: 'メタデータ',
    fileLabel: 'ファイル',
    sizeLabel: 'サイズ',
    privacyNote: 'すべてブラウザ内で完結します。ファイルはアップロードされません。',
    statLabels: {
      meshes: 'メッシュ',
      vertices: '頂点',
      triangles: '三角形',
      materials: 'マテリアル',
      textures: 'テクスチャ',
      animations: 'アニメーション',
      vrmName: 'VRM名',
      vrmAuthors: 'VRM作者',
    },
  },
  ko: {
    inspectorTitle: '3D 인스펙터',
    inspectorIntro: '로컬 GLB/VRM 검사: 미리보기와 메타데이터.',
    dropHint: '.glb / .gltf / .vrm 파일을 여기에 끌어다 놓으세요',
    pickFile: '또는 파일 선택',
    unsupported: '지원하지 않는 형식 — .glb / .gltf / .vrm을 사용하세요',
    loadError: '모델을 읽을 수 없습니다(손상되었거나 호환되지 않는 파일).',
    statsTitle: '메타데이터',
    fileLabel: '파일',
    sizeLabel: '크기',
    privacyNote: '모든 처리는 브라우저 안에서 이루어지며 파일은 업로드되지 않습니다.',
    statLabels: {
      meshes: '메시',
      vertices: '정점',
      triangles: '삼각형',
      materials: '머티리얼',
      textures: '텍스처',
      animations: '애니메이션',
      vrmName: 'VRM 이름',
      vrmAuthors: 'VRM 제작자',
    },
  },
  'pt-br': {
    inspectorTitle: 'Inspetor 3D',
    inspectorIntro: 'Inspecione um GLB ou VRM local: prévia e metadados.',
    dropHint: 'Arraste um arquivo .glb, .gltf ou .vrm aqui',
    pickFile: 'ou escolha um arquivo',
    unsupported: 'Formato não suportado — use .glb, .gltf ou .vrm',
    loadError: 'Não foi possível ler o modelo (arquivo corrompido ou incompatível).',
    statsTitle: 'Metadados',
    fileLabel: 'Arquivo',
    sizeLabel: 'Tamanho',
    privacyNote: 'Tudo acontece no seu navegador: o arquivo nunca é enviado.',
    statLabels: {
      meshes: 'Malhas',
      vertices: 'Vértices',
      triangles: 'Triângulos',
      materials: 'Materiais',
      textures: 'Texturas',
      animations: 'Animações',
      vrmName: 'Nome VRM',
      vrmAuthors: 'Autoria VRM',
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
