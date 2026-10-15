/**
 * UI messages for the store — typed per locale: a missing translation does
 * not compile (same guarantee as the domain constants).
 */

import type { SupportedLocale } from '@numinia/domain';
import type { AssetCategory } from '../lib/data';

export interface ArchiveMessages {
  readonly download: string;
  readonly downloadUnavailable: string;
  readonly category: string;
  readonly format: string;
  readonly license: string;
  readonly worldFileNote: string;
  /** Summa entity card (experiment): the block shown beside a legacy record that has a card. */
  readonly summaTitle: string;
  readonly summaIntro: string;
  readonly summaStatus: string;
  readonly summaStatusDraft: string;
  readonly summaStatusActive: string;
  readonly summaForms: string;
  readonly summaRightsHolder: string;
  readonly summaEmbedded: string;
  readonly summaCopies: string;
  readonly summaCopiesCount: string;
  readonly summaDownloadDepot: string;
  readonly summaReadCard: string;
}

/** Site chrome: the language selector, the mode switch, the footer. */
export interface ChromeMessages {
  readonly footerLegal: string;
  readonly legalPrivacy: string;
  readonly legalCookies: string;
  readonly legalTerms: string;
  readonly legalNotice: string;
  readonly languageSelector: string;
  readonly modeToggle: string;
  /** The footer's sister sites: this one is marked, not linked. */
  readonly footerThisSite: string;
  /** Brand block: one line saying what this site is. */
  readonly footerTagline: string;
  /** The build line: licence · telemetry · version · commit (house footer). */
  readonly footerLicence: string;
  readonly footerLicenceTitle: string;
  readonly footerTelemetry: string;
  readonly footerTelemetryTitle: string;
  readonly footerVersionTitle: string;
  readonly footerCommitTitle: string;
  /** /telemetry — the placeholder page until the site measures itself. */
  readonly telemetryTitle: string;
  readonly telemetryIntro: string;
  readonly telemetryPending: string;
  readonly telemetryVersion: string;
  readonly telemetryCommit: string;
  /** Combined Terms + Cookies banner (D12). Real copy since MIS-086: it
      describes what the platform actually stores, nothing else. */
  /** The footer button that reopens the cookie notice's preferences. */
  readonly legalCookieChoice: string;
}

export const CHROME_MESSAGES: Readonly<Record<SupportedLocale, ChromeMessages>> = {
  es: {
    footerLegal: 'Legal',
    legalPrivacy: 'Privacidad',
    legalCookies: 'Cookies',
    legalTerms: 'Términos',
    legalNotice: 'Aviso legal',
    languageSelector: 'Idioma',
    modeToggle: 'Modo de color',
    footerThisSite: 'estás aquí',
    footerTagline:
      'Un mundo a lo largo de tres siglos. Su crónica, su cultura material —CC0— y el juego.',
    footerLicence: 'Abierto por licencia, por fichero',
    footerLicenceTitle:
      'Código AGPL-3.0 · UI y dominio MIT · catálogo CC0 · marca reservada. El mapa por ruta está en REUSE.toml',
    footerTelemetry: 'Telemetría',
    footerTelemetryTitle: 'Medidas de este sitio — pendiente de publicar',
    footerVersionTitle: 'Ver el registro de versiones',
    footerCommitTitle: 'Ver este commit en GitHub',
    telemetryTitle: 'Telemetría',
    telemetryIntro:
      'Lo que este sitio mide de sí mismo. Hoy, solo dos hechos sobre el artefacto que estás viendo; el resto está por construir.',
    telemetryPending:
      'Pendiente: interacción con la página (qué se pulsa, qué se lee), rendimiento y consentimiento. Cuando exista, se medirá aquí, no se afirmará.',
    telemetryVersion: 'Versión',
    telemetryCommit: 'Commit',
    legalCookieChoice: 'Cambiar mi elección de cookies',
  },
  en: {
    footerLegal: 'Legal',
    legalPrivacy: 'Privacy',
    legalCookies: 'Cookies',
    legalTerms: 'Terms',
    legalNotice: 'Legal notice',
    languageSelector: 'Language',
    modeToggle: 'Color mode',
    footerThisSite: 'you are here',
    footerTagline:
      'A world across three centuries. Its chronicle, its material culture — CC0 — and the game.',
    footerLicence: 'Open by licence, per file',
    footerLicenceTitle:
      'Code AGPL-3.0 · UI and domain MIT · catalogue CC0 · brand reserved. The per-path map is REUSE.toml',
    footerTelemetry: 'Telemetry',
    footerTelemetryTitle: 'Measurements of this site — not yet published',
    footerVersionTitle: 'See the version timeline',
    footerCommitTitle: 'See this commit on GitHub',
    telemetryTitle: 'Telemetry',
    telemetryIntro:
      'What this site measures about itself. Today, only two facts about the artefact you are looking at; the rest is yet to be built.',
    telemetryPending:
      'Pending: interaction with the page (what is clicked, what is read), performance and consent. When it exists it will be measured here, not asserted.',
    telemetryVersion: 'Version',
    telemetryCommit: 'Commit',
    legalCookieChoice: 'Change my cookie choice',
  },
  ja: {
    footerLegal: '法的情報',
    legalPrivacy: 'プライバシー',
    legalCookies: 'クッキー',
    legalTerms: '利用規約',
    legalNotice: '法的通知',
    languageSelector: '言語',
    modeToggle: 'カラーモード',
    footerThisSite: '現在地',
    footerTagline: '三世紀にわたる世界。その年代記、その物質文化（CC0）、そしてゲーム。',
    footerLicence: 'ファイルごとのライセンスで公開',
    footerLicenceTitle:
      'コード AGPL-3.0 · UI とドメイン MIT · カタログ CC0 · ブランドは留保。パスごとの対応表は REUSE.toml',
    footerTelemetry: 'テレメトリー',
    footerTelemetryTitle: 'このサイトの計測 — 未公開',
    footerVersionTitle: 'バージョン履歴を見る',
    footerCommitTitle: 'このコミットを GitHub で見る',
    telemetryTitle: 'テレメトリー',
    telemetryIntro:
      'このサイトが自身について計測するもの。現在は閲覧中の成果物に関する 2 つの事実のみで、残りは未構築です。',
    telemetryPending:
      '未実装: ページ操作（クリック、閲覧）、パフォーマンス、同意。実装後はここで計測され、主張ではなく数値で示されます。',
    telemetryVersion: 'バージョン',
    telemetryCommit: 'コミット',
    legalCookieChoice: 'クッキーの選択を変更',
  },
  ko: {
    footerLegal: '법적 고지',
    legalPrivacy: '개인정보',
    legalCookies: '쿠키',
    legalTerms: '이용약관',
    legalNotice: '법적 고지사항',
    languageSelector: '언어',
    modeToggle: '색상 모드',
    footerThisSite: '현재 위치',
    footerTagline: '세 세기에 걸친 세계. 그 연대기, 그 물질문화(CC0), 그리고 게임.',
    footerLicence: '파일별 라이선스로 공개',
    footerLicenceTitle:
      '코드 AGPL-3.0 · UI와 도메인 MIT · 카탈로그 CC0 · 브랜드 보유. 경로별 지도는 REUSE.toml',
    footerTelemetry: '텔레메트리',
    footerTelemetryTitle: '이 사이트의 측정값 — 아직 공개되지 않음',
    footerVersionTitle: '버전 기록 보기',
    footerCommitTitle: 'GitHub에서 이 커밋 보기',
    telemetryTitle: '텔레메트리',
    telemetryIntro:
      '이 사이트가 자신에 대해 측정하는 것. 오늘은 보고 있는 결과물에 대한 두 가지 사실만 있으며 나머지는 아직 만들어지지 않았습니다.',
    telemetryPending:
      '예정: 페이지 상호작용(클릭, 읽기), 성능, 동의. 구현되면 주장이 아니라 여기서 측정됩니다.',
    telemetryVersion: '버전',
    telemetryCommit: '커밋',
    legalCookieChoice: '쿠키 선택 변경',
  },
  'pt-br': {
    footerLegal: 'Legal',
    legalPrivacy: 'Privacidade',
    legalCookies: 'Cookies',
    legalTerms: 'Termos',
    legalNotice: 'Aviso legal',
    languageSelector: 'Idioma',
    modeToggle: 'Modo de cor',
    footerThisSite: 'você está aqui',
    footerTagline:
      'Um mundo ao longo de três séculos. Sua crônica, sua cultura material — CC0 — e o jogo.',
    footerLicence: 'Aberto por licença, por arquivo',
    footerLicenceTitle:
      'Código AGPL-3.0 · UI e domínio MIT · catálogo CC0 · marca reservada. O mapa por caminho está em REUSE.toml',
    footerTelemetry: 'Telemetria',
    footerTelemetryTitle: 'Medições deste site — ainda não publicadas',
    footerVersionTitle: 'Ver o histórico de versões',
    footerCommitTitle: 'Ver este commit no GitHub',
    telemetryTitle: 'Telemetria',
    telemetryIntro:
      'O que este site mede sobre si mesmo. Hoje, apenas dois fatos sobre o artefato que você está vendo; o resto ainda está por construir.',
    telemetryPending:
      'Pendente: interação com a página (o que é clicado, o que é lido), desempenho e consentimento. Quando existir, será medido aqui, não afirmado.',
    telemetryVersion: 'Versão',
    telemetryCommit: 'Commit',
    legalCookieChoice: 'Alterar minha escolha de cookies',
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
    heroTitle: 'Numinia: una ciudad para el conocimiento, proyectada sobre un tablero de juego',
    heroSub:
      'Recorre su crónica, llévate su cultura material — avatares, modelos y mundos, todo CC0 — y cruza al área del jugador. La ciudad se construye con quienes entran.',
    ctaCity: 'Entrar en la Ciudad',
    ctaAssets: 'Explorar los Assets',
    pillarsTitle: 'Tres puertas',
    pillarCity:
      'La Ciudad: qué es Numinia — su historia, sus distritos, sus habitantes y el juego que la construye.',
    pillarAssets:
      'Assets: bienes digitales CC0 en formatos abiertos para construir mundos — galería, archivo, finder e inspector.',
    pillarLap:
      'LAP: el área del jugador — tu puerta al juego virtual y a tu información de ciudadano.',
  },
  en: {
    heroTitle: 'Numinia: a city for knowledge, projected onto a game board',
    heroSub:
      'Walk its chronicle, take its material culture — avatars, models and worlds, all CC0 — and step into the player area. The city is built by those who enter.',
    ctaCity: 'Enter the City',
    ctaAssets: 'Explore the Assets',
    pillarsTitle: 'Three doors',
    pillarCity:
      'The City: what Numinia is — its history, its districts, its inhabitants, and the game that builds it.',
    pillarAssets:
      'Assets: CC0 digital goods in open formats for building worlds — gallery, archive, finder, and inspector.',
    pillarLap: 'LAP: the player area — your door to the virtual game and your citizen information.',
  },
  ja: {
    heroTitle: 'ヌミニア:ゲーム盤の上に描かれた、知のための都市',
    heroSub:
      '都市の物語をたどり、その物質文化 — アバター、モデル、ワールド、すべてCC0 — を持ち帰り、プレイヤーエリアへ。都市は、訪れる人とともに築かれます。',
    ctaCity: '都市に入る',
    ctaAssets: 'アセットを探索',
    pillarsTitle: '三つの扉',
    pillarCity: '都市:ヌミニアとは — その歴史、地区、住民、そして都市を築くゲーム。',
    pillarAssets:
      'アセット:世界を作るためのCC0デジタルグッズ — ギャラリー、アーカイブ、Finder、インスペクター。',
    pillarLap: 'LAP:プレイヤーエリア — 仮想ゲームと市民情報への入り口。',
  },
  ko: {
    heroTitle: '누미니아: 게임 보드 위에 그려진, 지식을 위한 도시',
    heroSub:
      '도시의 연대기를 걷고, 그 물질 문화 — 아바타, 모델, 월드, 모두 CC0 — 를 가져가고, 플레이어 구역으로 들어오세요. 도시는 들어오는 사람들과 함께 지어집니다.',
    ctaCity: '도시로 들어가기',
    ctaAssets: '에셋 탐색하기',
    pillarsTitle: '세 개의 문',
    pillarCity: '도시: 누미니아란 — 역사, 구역, 주민, 그리고 도시를 만드는 게임.',
    pillarAssets: '에셋: 월드를 만들기 위한 CC0 디지털 굿즈 — 갤러리, 아카이브, Finder, 인스펙터.',
    pillarLap: 'LAP: 플레이어 구역 — 가상 게임과 시민 정보로 가는 문.',
  },
  'pt-br': {
    heroTitle: 'Numinia: uma cidade para o conhecimento, projetada sobre um tabuleiro de jogo',
    heroSub:
      'Percorra sua crônica, leve sua cultura material — avatares, modelos e mundos, tudo CC0 — e entre na área do jogador. A cidade se constrói com quem entra.',
    ctaCity: 'Entrar na Cidade',
    ctaAssets: 'Explorar os Assets',
    pillarsTitle: 'Três portas',
    pillarCity:
      'A Cidade: o que é Numinia — sua história, seus distritos, seus habitantes e o jogo que a constrói.',
    pillarAssets:
      'Assets: bens digitais CC0 em formatos abertos para construir mundos — galeria, arquivo, finder e inspetor.',
    pillarLap: 'LAP: a área do jogador — sua porta para o jogo virtual e suas informações.',
  },
};

/**
 * The Bazaar (v0.83.0) — the Finder rethought, the one way to navigate the
 * city's digital goods. Every label the page and its island need, resolved
 * at build. `{n}`, `{total}`, `{format}` and `{names}` are filled in.
 */
export interface BazaarMessages {
  readonly title: string;
  readonly lead: string;
  /** The object pages' breadcrumb landmark. */
  readonly breadcrumbLabel: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly filtersLabel: string;
  readonly collectionsLabel: string;
  readonly allLabel: string;
  readonly formatsLabel: string;
  readonly licenceLabel: string;
  readonly licenceNote: string;
  readonly countOne: string;
  readonly countOther: string;
  /** Said after the count while every good is CC0. */
  readonly allCc0: string;
  readonly sortLabel: string;
  readonly sortRecent: string;
  readonly sortName: string;
  readonly gridLabel: string;
  readonly noResults: string;
  readonly clearFilters: string;
  readonly cardLicence: string;
  readonly previewLabel: string;
  readonly emptyPreview: string;
  readonly closePreview: string;
  readonly viewIn3d: string;
  /** The same, with the file's weight: «{size}». */
  readonly viewIn3dSized: string;
  readonly download: string;
  readonly downloadUnavailable: string;
  readonly addToQueue: string;
  readonly inQueue: string;
  readonly removeFromQueue: string;
  readonly openCard: string;
  readonly factFormat: string;
  readonly factLicence: string;
  readonly factKind: string;
  readonly factCollection: string;
  readonly factSize: string;
  readonly queueLabel: string;
  readonly queueEmpty: string;
  readonly downloadAll: string;
  readonly zipBusy: string;
  readonly zipDone: string;
  readonly zipPartial: string;
  readonly zipFailed: string;
  /** The first line of the README.txt that travels inside the zip. */
  readonly zipReadme: string;
  /** The kinds of goods, plural: the filter column. */
  readonly categories: Readonly<Record<AssetCategory, string>>;
  /** The kinds of goods, singular: the card's first line. */
  readonly kinds: Readonly<Record<AssetCategory, string>>;
}

export const BAZAAR_MESSAGES: Readonly<Record<SupportedLocale, BazaarMessages>> = {
  es: {
    title: 'Bazar',
    lead: 'Objetos 3D, avatares, sonidos e imágenes para tu sede. Todo CC0: úsalo, cámbialo y llévatelo.',
    breadcrumbLabel: 'Ruta de navegación',
    searchLabel: 'Buscar en el Bazar',
    searchPlaceholder: 'Busca un objeto: avatar, silla, sonido…',
    filtersLabel: 'Filtros',
    collectionsLabel: 'Colecciones',
    allLabel: 'Todo',
    formatsLabel: 'Formato',
    licenceLabel: 'Licencia',
    licenceNote: 'Todo es CC0: úsalo, cámbialo y véndelo sin pedir permiso ni citar.',
    countOne: '1 objeto',
    countOther: '{n} objetos',
    allCc0: 'todos CC0',
    sortLabel: 'Orden',
    sortRecent: 'Más recientes',
    sortName: 'A–Z',
    gridLabel: 'Objetos',
    noResults: 'Nada con esos filtros.',
    clearFilters: 'Quitar los filtros',
    cardLicence: 'CC0 · libre, sin pedir permiso',
    previewLabel: 'Vista previa',
    emptyPreview: 'Elige un objeto para verlo aquí.',
    closePreview: 'Cerrar',
    viewIn3d: 'Verlo en 3D',
    viewIn3dSized: 'Verlo en 3D · {size}',
    download: 'Descargar {format}',
    downloadUnavailable: 'Descarga no disponible',
    addToQueue: 'A la cola',
    inQueue: 'En la cola',
    removeFromQueue: 'Quitar de la cola',
    openCard: 'Abrir la ficha',
    factFormat: 'Formato',
    factLicence: 'Licencia',
    factKind: 'Tipo',
    factCollection: 'Colección',
    factSize: 'Tamaño',
    queueLabel: 'Cola de descarga',
    queueEmpty: 'Vacía. Añade objetos con «A la cola» y bájalos juntos en un .zip.',
    downloadAll: 'Descargar todo (.zip)',
    zipBusy: 'Preparando el .zip: {n} de {total}…',
    zipDone: 'Hecho: el .zip ya se está descargando.',
    zipPartial: 'El .zip va sin {names}: no respondieron. Bájalos uno a uno desde su ficha.',
    zipFailed:
      'No se pudo preparar el .zip: ningún archivo respondió. Bájalos uno a uno desde su ficha.',
    zipReadme: 'Del Bazar de Numinia. Cada archivo, con su licencia y su ficha:',
    categories: {
      avatars: 'Avatares',
      models: 'Modelos 3D',
      worlds: 'Mundos',
      audio: 'Sonido',
      video: 'Vídeo',
      images: 'Imágenes',
    },
    kinds: {
      avatars: 'Avatar',
      models: 'Modelo 3D',
      worlds: 'Mundo',
      audio: 'Sonido',
      video: 'Vídeo',
      images: 'Imagen',
    },
  },
  en: {
    title: 'Bazaar',
    lead: '3D objects, avatars, sounds and images for your home. All CC0: use it, change it, take it with you.',
    breadcrumbLabel: 'Breadcrumb',
    searchLabel: 'Search the Bazaar',
    searchPlaceholder: 'Look for an object: avatar, chair, sound…',
    filtersLabel: 'Filters',
    collectionsLabel: 'Collections',
    allLabel: 'All',
    formatsLabel: 'Format',
    licenceLabel: 'Licence',
    licenceNote: 'Everything is CC0: use it, change it and sell it without asking or crediting.',
    countOne: '1 object',
    countOther: '{n} objects',
    allCc0: 'all CC0',
    sortLabel: 'Order',
    sortRecent: 'Newest',
    sortName: 'A–Z',
    gridLabel: 'Objects',
    noResults: 'Nothing with those filters.',
    clearFilters: 'Clear the filters',
    cardLicence: 'CC0 · free, no permission needed',
    previewLabel: 'Preview',
    emptyPreview: 'Pick an object to see it here.',
    closePreview: 'Close',
    viewIn3d: 'See it in 3D',
    viewIn3dSized: 'See it in 3D · {size}',
    download: 'Download {format}',
    downloadUnavailable: 'Download unavailable',
    addToQueue: 'Add to queue',
    inQueue: 'In the queue',
    removeFromQueue: 'Remove from the queue',
    openCard: 'Open its page',
    factFormat: 'Format',
    factLicence: 'Licence',
    factKind: 'Kind',
    factCollection: 'Collection',
    factSize: 'Size',
    queueLabel: 'Download queue',
    queueEmpty: 'Empty. Add objects with “Add to queue” and get them together in one .zip.',
    downloadAll: 'Download all (.zip)',
    zipBusy: 'Preparing the .zip: {n} of {total}…',
    zipDone: 'Done: your .zip is downloading.',
    zipPartial:
      'The .zip goes without {names}: they did not answer. Download them one by one from their page.',
    zipFailed:
      'The .zip could not be prepared: no file answered. Download them one by one from their page.',
    zipReadme: 'From the Numinia Bazaar. Each file, with its licence and its page:',
    categories: {
      avatars: 'Avatars',
      models: '3D models',
      worlds: 'Worlds',
      audio: 'Sound',
      video: 'Video',
      images: 'Images',
    },
    kinds: {
      avatars: 'Avatar',
      models: '3D model',
      worlds: 'World',
      audio: 'Sound',
      video: 'Video',
      images: 'Image',
    },
  },
  ja: {
    title: 'バザール',
    lead: '拠点のための3Dオブジェクト、アバター、サウンド、画像。すべてCC0:使って、変えて、持ち帰ってください。',
    breadcrumbLabel: 'パンくずリスト',
    searchLabel: 'バザールを検索',
    searchPlaceholder: 'オブジェクトを探す:アバター、椅子、サウンド…',
    filtersLabel: '絞り込み',
    collectionsLabel: 'コレクション',
    allLabel: 'すべて',
    formatsLabel: 'フォーマット',
    licenceLabel: 'ライセンス',
    licenceNote: 'すべてCC0です。許可も表記もなしで、使って、変えて、販売できます。',
    countOne: '1 件',
    countOther: '{n} 件',
    allCc0: 'すべてCC0',
    sortLabel: '並び順',
    sortRecent: '新しい順',
    sortName: 'A–Z',
    gridLabel: 'オブジェクト',
    noResults: 'その条件に合うものはありません。',
    clearFilters: '絞り込みを解除',
    cardLicence: 'CC0 · 許可不要で自由に',
    previewLabel: 'プレビュー',
    emptyPreview: 'オブジェクトを選ぶとここに表示されます。',
    closePreview: '閉じる',
    viewIn3d: '3Dで見る',
    viewIn3dSized: '3Dで見る · {size}',
    download: '{format} をダウンロード',
    downloadUnavailable: 'ダウンロード不可',
    addToQueue: 'キューに追加',
    inQueue: 'キューに追加済み',
    removeFromQueue: 'キューから削除',
    openCard: '詳細ページを開く',
    factFormat: 'フォーマット',
    factLicence: 'ライセンス',
    factKind: '種類',
    factCollection: 'コレクション',
    factSize: 'サイズ',
    queueLabel: 'ダウンロードキュー',
    queueEmpty: '空です。「キューに追加」で集めて、1つの .zip でまとめてダウンロードできます。',
    downloadAll: 'すべてダウンロード (.zip)',
    zipBusy: '.zip を準備中: {total} 件中 {n} 件…',
    zipDone: '完了: .zip のダウンロードを開始しました。',
    zipPartial:
      '{names} は応答がなかったため、.zip に含まれていません。詳細ページから個別にダウンロードしてください。',
    zipFailed:
      '.zip を準備できませんでした。どのファイルも応答しませんでした。詳細ページから個別にダウンロードしてください。',
    zipReadme: 'ヌミニアのバザールより。各ファイルとそのライセンス、詳細ページ:',
    categories: {
      avatars: 'アバター',
      models: '3Dモデル',
      worlds: 'ワールド',
      audio: 'サウンド',
      video: 'ビデオ',
      images: '画像',
    },
    kinds: {
      avatars: 'アバター',
      models: '3Dモデル',
      worlds: 'ワールド',
      audio: 'サウンド',
      video: 'ビデオ',
      images: '画像',
    },
  },
  ko: {
    title: '바자르',
    lead: '거점을 위한 3D 오브젝트, 아바타, 사운드, 이미지. 모두 CC0: 쓰고, 바꾸고, 가져가세요.',
    breadcrumbLabel: '이동 경로',
    searchLabel: '바자르 검색',
    searchPlaceholder: '오브젝트 찾기: 아바타, 의자, 사운드…',
    filtersLabel: '필터',
    collectionsLabel: '컬렉션',
    allLabel: '전체',
    formatsLabel: '포맷',
    licenceLabel: '라이선스',
    licenceNote: '모두 CC0입니다. 허락도 출처 표시도 없이 쓰고, 바꾸고, 팔 수 있습니다.',
    countOne: '오브젝트 1개',
    countOther: '오브젝트 {n}개',
    allCc0: '모두 CC0',
    sortLabel: '정렬',
    sortRecent: '최신순',
    sortName: 'A–Z',
    gridLabel: '오브젝트',
    noResults: '이 필터에 맞는 항목이 없습니다.',
    clearFilters: '필터 지우기',
    cardLicence: 'CC0 · 허락 없이 자유롭게',
    previewLabel: '미리보기',
    emptyPreview: '오브젝트를 고르면 여기에 보입니다.',
    closePreview: '닫기',
    viewIn3d: '3D로 보기',
    viewIn3dSized: '3D로 보기 · {size}',
    download: '{format} 다운로드',
    downloadUnavailable: '다운로드 불가',
    addToQueue: '대기열에 추가',
    inQueue: '대기열에 있음',
    removeFromQueue: '대기열에서 빼기',
    openCard: '상세 페이지 열기',
    factFormat: '포맷',
    factLicence: '라이선스',
    factKind: '종류',
    factCollection: '컬렉션',
    factSize: '크기',
    queueLabel: '다운로드 대기열',
    queueEmpty: '비어 있습니다. «대기열에 추가»로 모아서 .zip 하나로 함께 받으세요.',
    downloadAll: '모두 다운로드 (.zip)',
    zipBusy: '.zip 준비 중: {total}개 중 {n}개…',
    zipDone: '완료: .zip 다운로드가 시작되었습니다.',
    zipPartial: '{names}은(는) 응답하지 않아 .zip에서 빠졌습니다. 상세 페이지에서 하나씩 받으세요.',
    zipFailed:
      '.zip을 준비하지 못했습니다. 응답한 파일이 없습니다. 상세 페이지에서 하나씩 받으세요.',
    zipReadme: '누미니아 바자르에서. 각 파일과 라이선스, 상세 페이지:',
    categories: {
      avatars: '아바타',
      models: '3D 모델',
      worlds: '월드',
      audio: '사운드',
      video: '비디오',
      images: '이미지',
    },
    kinds: {
      avatars: '아바타',
      models: '3D 모델',
      worlds: '월드',
      audio: '사운드',
      video: '비디오',
      images: '이미지',
    },
  },
  'pt-br': {
    title: 'Bazar',
    lead: 'Objetos 3D, avatares, sons e imagens para a sua sede. Tudo CC0: use, mude e leve com você.',
    breadcrumbLabel: 'Trilha de navegação',
    searchLabel: 'Buscar no Bazar',
    searchPlaceholder: 'Procure um objeto: avatar, cadeira, som…',
    filtersLabel: 'Filtros',
    collectionsLabel: 'Coleções',
    allLabel: 'Tudo',
    formatsLabel: 'Formato',
    licenceLabel: 'Licença',
    licenceNote: 'Tudo é CC0: use, mude e venda sem pedir permissão nem citar.',
    countOne: '1 objeto',
    countOther: '{n} objetos',
    allCc0: 'todos CC0',
    sortLabel: 'Ordem',
    sortRecent: 'Mais recentes',
    sortName: 'A–Z',
    gridLabel: 'Objetos',
    noResults: 'Nada com esses filtros.',
    clearFilters: 'Limpar os filtros',
    cardLicence: 'CC0 · livre, sem pedir permissão',
    previewLabel: 'Pré-visualização',
    emptyPreview: 'Escolha um objeto para vê-lo aqui.',
    closePreview: 'Fechar',
    viewIn3d: 'Ver em 3D',
    viewIn3dSized: 'Ver em 3D · {size}',
    download: 'Baixar {format}',
    downloadUnavailable: 'Download indisponível',
    addToQueue: 'Para a fila',
    inQueue: 'Na fila',
    removeFromQueue: 'Tirar da fila',
    openCard: 'Abrir a ficha',
    factFormat: 'Formato',
    factLicence: 'Licença',
    factKind: 'Tipo',
    factCollection: 'Coleção',
    factSize: 'Tamanho',
    queueLabel: 'Fila de download',
    queueEmpty: 'Vazia. Adicione objetos com «Para a fila» e baixe todos juntos em um .zip.',
    downloadAll: 'Baixar tudo (.zip)',
    zipBusy: 'Preparando o .zip: {n} de {total}…',
    zipDone: 'Pronto: o seu .zip está baixando.',
    zipPartial: 'O .zip vai sem {names}: não responderam. Baixe-os um a um pela ficha.',
    zipFailed:
      'Não foi possível preparar o .zip: nenhum arquivo respondeu. Baixe-os um a um pela ficha.',
    zipReadme: 'Do Bazar de Numinia. Cada arquivo, com a sua licença e a sua ficha:',
    categories: {
      avatars: 'Avatares',
      models: 'Modelos 3D',
      worlds: 'Mundos',
      audio: 'Som',
      video: 'Vídeo',
      images: 'Imagens',
    },
    kinds: {
      avatars: 'Avatar',
      models: 'Modelo 3D',
      worlds: 'Mundo',
      audio: 'Som',
      video: 'Vídeo',
      images: 'Imagem',
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
  /** Each version card's link to its merge on GitHub (the pull request or the search). */
  readonly mergeLink: string;
}

export const UPDATES_MESSAGES: Readonly<Record<SupportedLocale, UpdatesMessages>> = {
  es: {
    updatesTitle: 'Updates',
    updatesIntro: 'La línea temporal de la plataforma, de v0.1.0 al presente.',
    techNote: 'El registro técnico se mantiene en inglés.',
    typeLabels: { NEW: 'New', FIX: 'Fix', UPD: 'Improved' },
    roadmapTitle: 'Próximamente',
    latestLabel: 'Latest',
    statusLabels: { planned: 'Planned', research: 'Research' },
    mergeLink: 'Ver en GitHub',
  },
  en: {
    updatesTitle: 'Updates',
    updatesIntro: 'The platform timeline, from v0.1.0 to the present.',
    techNote: 'The technical record is kept in English.',
    typeLabels: { NEW: 'New', FIX: 'Fix', UPD: 'Improved' },
    roadmapTitle: 'Incoming',
    latestLabel: 'Latest',
    statusLabels: { planned: 'Planned', research: 'Research' },
    mergeLink: 'View on GitHub',
  },
  ja: {
    updatesTitle: 'Updates',
    updatesIntro: 'v0.1.0から現在までのプラットフォームの歩み。',
    techNote: '技術記録は英語で管理されています。',
    typeLabels: { NEW: 'New', FIX: 'Fix', UPD: 'Improved' },
    roadmapTitle: '今後の予定',
    latestLabel: 'Latest',
    statusLabels: { planned: 'Planned', research: 'Research' },
    mergeLink: 'GitHubで見る',
  },
  ko: {
    updatesTitle: 'Updates',
    updatesIntro: 'v0.1.0부터 현재까지의 플랫폼 타임라인.',
    techNote: '기술 기록은 영어로 유지됩니다.',
    typeLabels: { NEW: 'New', FIX: 'Fix', UPD: 'Improved' },
    roadmapTitle: '예정',
    latestLabel: 'Latest',
    statusLabels: { planned: 'Planned', research: 'Research' },
    mergeLink: 'GitHub에서 보기',
  },
  'pt-br': {
    updatesTitle: 'Updates',
    updatesIntro: 'A linha do tempo da plataforma, de v0.1.0 ao presente.',
    techNote: 'O registro técnico é mantido em inglês.',
    typeLabels: { NEW: 'New', FIX: 'Fix', UPD: 'Improved' },
    roadmapTitle: 'Em breve',
    latestLabel: 'Latest',
    statusLabels: { planned: 'Planned', research: 'Research' },
    mergeLink: 'Ver no GitHub',
  },
};

export const ARCHIVE_MESSAGES: Readonly<Record<SupportedLocale, ArchiveMessages>> = {
  es: {
    download: 'Descargar',
    downloadUnavailable: 'Descarga no disponible',
    category: 'Categoría',
    format: 'Formato',
    license: 'Licencia',
    worldFileNote: 'Archivo de mundo para Hyperfy. Descárgalo para usarlo en tu espacio.',
    summaTitle: 'Ficha en el Summa',
    summaIntro:
      'Este bien tiene una ficha en el archivo de Numinia: qué es, su historia, cada forma con su licencia y su titular, y dónde están sus bytes con su huella.',
    summaStatus: 'Estado',
    summaStatusDraft: 'borrador — no admitida todavía',
    summaStatusActive: 'activa',
    summaForms: 'Formas',
    summaRightsHolder: 'titular',
    summaEmbedded: 'licencia dentro del fichero',
    summaCopies: 'Copias',
    summaCopiesCount: '{n} copias declaradas, huella y tamaño en la ficha',
    summaDownloadDepot: 'Descargar del depósito',
    summaReadCard: 'Leer la ficha en numinia.org',
  },
  en: {
    download: 'Download',
    downloadUnavailable: 'Download unavailable',
    category: 'Category',
    format: 'Format',
    license: 'License',
    worldFileNote: 'A world file for Hyperfy. Download it to use it in your space.',
    summaTitle: 'Card in the Summa',
    summaIntro:
      'This good has a card in the Numinia archive: what it is, its history, each form with its licence and rights holder, and where its bytes are, with their hash.',
    summaStatus: 'Status',
    summaStatusDraft: 'draft — not admitted yet',
    summaStatusActive: 'active',
    summaForms: 'Forms',
    summaRightsHolder: 'rights holder',
    summaEmbedded: 'licence inside the file',
    summaCopies: 'Copies',
    summaCopiesCount: '{n} copies declared, hash and size in the card',
    summaDownloadDepot: 'Download from the depot',
    summaReadCard: 'Read the card on numinia.org',
  },
  ja: {
    download: 'ダウンロード',
    downloadUnavailable: 'ダウンロード不可',
    category: 'カテゴリー',
    format: 'フォーマット',
    license: 'ライセンス',
    worldFileNote: 'Hyperfy用ワールドファイル。ダウンロードしてスペースで使えます。',
    summaTitle: 'スンマの記録カード',
    summaIntro:
      'このグッズにはヌミニア・アーカイブの記録カードがあります：それが何か、その来歴、各形態のライセンスと権利者、そしてバイトの所在とハッシュ。',
    summaStatus: '状態',
    summaStatusDraft: '下書き — 未承認',
    summaStatusActive: '有効',
    summaForms: '形態',
    summaRightsHolder: '権利者',
    summaEmbedded: 'ファイル内のライセンス',
    summaCopies: 'コピー',
    summaCopiesCount: '{n} 件のコピーを宣言、ハッシュとサイズはカードに記載',
    summaDownloadDepot: 'デポからダウンロード',
    summaReadCard: 'numinia.org でカードを読む',
  },
  ko: {
    download: '다운로드',
    downloadUnavailable: '다운로드 불가',
    category: '카테고리',
    format: '포맷',
    license: '라이선스',
    worldFileNote: 'Hyperfy용 월드 파일입니다. 내려받아 내 공간에서 사용하세요.',
    summaTitle: '수마의 기록 카드',
    summaIntro:
      '이 굿즈에는 누미니아 아카이브의 기록 카드가 있습니다: 무엇인지, 그 내력, 각 형태의 라이선스와 권리자, 그리고 바이트의 위치와 해시.',
    summaStatus: '상태',
    summaStatusDraft: '초안 — 아직 승인되지 않음',
    summaStatusActive: '활성',
    summaForms: '형태',
    summaRightsHolder: '권리자',
    summaEmbedded: '파일 안의 라이선스',
    summaCopies: '사본',
    summaCopiesCount: '{n}개의 사본 선언, 해시와 크기는 카드에',
    summaDownloadDepot: '보관소에서 다운로드',
    summaReadCard: 'numinia.org에서 카드 읽기',
  },
  'pt-br': {
    download: 'Baixar',
    downloadUnavailable: 'Download indisponível',
    category: 'Categoria',
    format: 'Formato',
    license: 'Licença',
    worldFileNote: 'Arquivo de mundo para o Hyperfy. Baixe para usar no seu espaço.',
    summaTitle: 'Ficha na Summa',
    summaIntro:
      'Este bem tem uma ficha no arquivo de Numinia: o que é, sua história, cada forma com sua licença e titular, e onde estão seus bytes, com o hash.',
    summaStatus: 'Estado',
    summaStatusDraft: 'rascunho — ainda não admitida',
    summaStatusActive: 'ativa',
    summaForms: 'Formas',
    summaRightsHolder: 'titular',
    summaEmbedded: 'licença dentro do arquivo',
    summaCopies: 'Cópias',
    summaCopiesCount: '{n} cópias declaradas, hash e tamanho na ficha',
    summaDownloadDepot: 'Baixar do depósito',
    summaReadCard: 'Ler a ficha em numinia.org',
  },
};
