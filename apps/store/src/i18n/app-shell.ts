/**
 * The words of the app shell (numinia.com v3, «La ciudad y tú»): the city's
 * rail on the left, yours on the right, their menus, the phone's header,
 * bottom bar and «Tú» sheet, and the folded footer. Plain Spanish first;
 * typed per locale, so a missing translation does not compile.
 *
 * Screen words: «comunidad», «encuentro» (never ritual on screen), «sede».
 * Words the site already says elsewhere are reused from where they live:
 * the legal links and the build line from CHROME_MESSAGES, the «n dentro
 * ahora» counts from COMMUNITIES_UI.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { CityId, CreateId, YouId } from '../lib/app-nav';

export interface AppShellMessages {
  /** The first stop of the keyboard: straight to the page. */
  readonly skip: string;
  /** The left rail's landmark and its navigation. */
  readonly cityRail: string;
  readonly cityNav: string;
  /** The right rail's landmark and its navigation («Lo tuyo»). */
  readonly youRail: string;
  readonly youNav: string;
  /** Each rail's fold button: fold, unfold. */
  readonly foldCity: string;
  readonly unfoldCity: string;
  readonly foldYou: string;
  readonly unfoldYou: string;
  readonly search: string;
  readonly city: Readonly<Record<CityId, string>>;
  readonly you: Readonly<Record<YouId, string>>;
  /** «Ahora en la ciudad»: the worlds with people in and the next encounter. */
  readonly nowInCity: string;
  /** The live dot's spoken name (someone is inside a world now). */
  readonly liveDot: string;
  /** The left rail's foot. */
  readonly how: string;
  readonly open: string;
  readonly back: string;
  readonly support: string;
  readonly footerSites: string;
  readonly footerLegal: string;
  readonly archive: string;
  /** The right rail's head, signed out: «Tú · Entrar». */
  readonly youWord: string;
  readonly enter: string;
  /** The door's full name (pages reuse it). */
  readonly signIn: string;
  /** The phone sheet's door: «Entrar · sin contraseña». */
  readonly signInSheet: string;
  /** Signed out, under the right rail's places. */
  readonly signedOutLine: string;
  /** The face button's spoken name and the menu it opens. */
  readonly account: string;
  readonly faceMenu: string;
  readonly rankLine: string;
  readonly panels: string;
  readonly face: {
    readonly profile: string;
    readonly balance: string;
    readonly panels: string;
    readonly signOut: string;
  };
  /** «Crear», the twin of «Buscar». */
  readonly create: string;
  readonly createItems: Readonly<
    Record<CreateId, { readonly title: string; readonly what: string; readonly tile: string }>
  >;
  /** What is not built yet, said as plain text. */
  readonly createSoon: string;
  /** The right rail's foot. */
  readonly settings: string;
  readonly appearance: string;
  readonly system: string;
  readonly night: string;
  readonly day: string;
  readonly signOut: string;
  /** The phone: the bottom bar, its «Tú», and the sheet. */
  readonly phoneNav: string;
  readonly bazaar: string;
  readonly sheetClose: string;
  readonly sheetCard: string;
  readonly sheetSettings: string;
}

export const APP_SHELL_UI: Readonly<Record<SupportedLocale, AppShellMessages>> = {
  es: {
    skip: 'Saltar al contenido',
    cityRail: 'La ciudad',
    cityNav: 'Lugares de la ciudad',
    youRail: 'Tú',
    youNav: 'Lo tuyo',
    foldCity: 'Plegar la barra de la ciudad',
    unfoldCity: 'Desplegar la barra de la ciudad',
    foldYou: 'Plegar tu barra',
    unfoldYou: 'Desplegar tu barra',
    search: 'Buscar en la ciudad',
    city: {
      now: 'Ahora',
      communities: 'Comunidades',
      encounters: 'Encuentros',
      worlds: 'Mundos',
      bazaar: 'Bazar',
    },
    you: {
      notices: 'Avisos',
      'your-communities': 'Tus comunidades',
      balance: 'Tu saldo',
      loot: 'Tu botín',
    },
    nowInCity: 'Ahora en la ciudad',
    liveDot: 'Hay gente dentro ahora',
    how: 'Cómo funciona',
    open: 'Abre la sede de tu comunidad',
    back: 'Invítanos a un café',
    support: 'Ayuda',
    footerSites: 'Numen Games',
    footerLegal: 'Términos y políticas',
    archive: 'El Archivo',
    youWord: 'Tú',
    enter: 'Entrar',
    signIn: 'Iniciar sesión',
    signInSheet: 'Entrar · sin contraseña',
    signedOutLine: 'Tu ficha, tu agenda, tus comunidades… viven en esta barra. Entra y se llenan.',
    account: 'Tu menú',
    faceMenu: 'Tu menú',
    rankLine: 'Rango',
    panels: 'Paneles',
    face: {
      profile: 'Tu perfil',
      balance: 'Tu saldo',
      panels: 'Tus paneles',
      signOut: 'Cerrar sesión',
    },
    create: 'Crear',
    createItems: {
      community: {
        title: 'Una comunidad',
        what: 'Ábrele sede a la tuya.',
        tile: 'Comunidad',
      },
    },
    createSoon: 'Pronto: encuentros y mundos',
    settings: 'Ajustes',
    appearance: 'Aspecto',
    system: 'Sistema',
    night: 'Noche',
    day: 'Día',
    signOut: 'Cerrar sesión',
    phoneNav: 'Numinia',
    bazaar: 'Bazar',
    sheetClose: 'Cerrar',
    sheetCard: 'Tu ficha',
    sheetSettings: 'Ajustes · aspecto e idioma',
  },
  en: {
    skip: 'Skip to content',
    cityRail: 'The city',
    cityNav: "The city's places",
    youRail: 'You',
    youNav: 'Yours',
    foldCity: "Fold the city's bar",
    unfoldCity: "Unfold the city's bar",
    foldYou: 'Fold your bar',
    unfoldYou: 'Unfold your bar',
    search: 'Search the city',
    city: {
      now: 'Now',
      communities: 'Communities',
      encounters: 'Gatherings',
      worlds: 'Worlds',
      bazaar: 'Bazaar',
    },
    you: {
      notices: 'Notices',
      'your-communities': 'Your communities',
      balance: 'Your balance',
      loot: 'Your loot',
    },
    nowInCity: 'Now in the city',
    liveDot: 'People are inside now',
    how: 'How it works',
    open: "Open your community's home",
    back: 'Buy us a coffee',
    support: 'Help',
    footerSites: 'Numen Games',
    footerLegal: 'Terms and policies',
    archive: 'The Archive',
    youWord: 'You',
    enter: 'Sign in',
    signIn: 'Sign in',
    signInSheet: 'Sign in · no password',
    signedOutLine:
      'Your card, your agenda, your communities… live in this bar. Sign in and they fill up.',
    account: 'Your menu',
    faceMenu: 'Your menu',
    rankLine: 'Rank',
    panels: 'Panels',
    face: {
      profile: 'Your profile',
      balance: 'Your balance',
      panels: 'Your panels',
      signOut: 'Sign out',
    },
    create: 'Create',
    createItems: {
      community: {
        title: 'A community',
        what: 'Open a home for yours.',
        tile: 'Community',
      },
    },
    createSoon: 'Coming: gatherings and worlds',
    settings: 'Settings',
    appearance: 'Appearance',
    system: 'System',
    night: 'Night',
    day: 'Day',
    signOut: 'Sign out',
    phoneNav: 'Numinia',
    bazaar: 'Bazaar',
    sheetClose: 'Close',
    sheetCard: 'Your card',
    sheetSettings: 'Settings · appearance and language',
  },
  ja: {
    skip: '本文へスキップ',
    cityRail: '街',
    cityNav: '街の場所',
    youRail: 'あなた',
    youNav: 'あなたのもの',
    foldCity: '街のバーを折りたたむ',
    unfoldCity: '街のバーを展開する',
    foldYou: 'あなたのバーを折りたたむ',
    unfoldYou: 'あなたのバーを展開する',
    search: '街を検索',
    city: {
      now: 'いま',
      communities: 'コミュニティ',
      encounters: '集まり',
      worlds: 'ワールド',
      bazaar: 'バザール',
    },
    you: {
      notices: 'お知らせ',
      'your-communities': 'あなたのコミュニティ',
      balance: '残高',
      loot: '戦利品',
    },
    nowInCity: 'いま街で',
    liveDot: 'いま中に人がいます',
    how: '使い方',
    open: 'コミュニティの拠点を開く',
    back: 'コーヒーをおごる',
    support: 'ヘルプ',
    footerSites: 'Numen Games',
    footerLegal: '規約とポリシー',
    archive: 'アーカイブ',
    youWord: 'あなた',
    enter: 'ログイン',
    signIn: 'ログイン',
    signInSheet: 'ログイン・パスワード不要',
    signedOutLine:
      'あなたのカード、予定、コミュニティ…はこのバーにあります。ログインすると埋まります。',
    account: 'あなたのメニュー',
    faceMenu: 'あなたのメニュー',
    rankLine: 'ランク',
    panels: 'パネル',
    face: {
      profile: 'あなたのプロフィール',
      balance: '残高',
      panels: 'あなたのパネル',
      signOut: 'ログアウト',
    },
    create: '作成',
    createItems: {
      community: {
        title: 'コミュニティ',
        what: 'あなたのコミュニティに拠点を開く。',
        tile: 'コミュニティ',
      },
    },
    createSoon: '近日：集まりとワールド',
    settings: '設定',
    appearance: '外観',
    system: 'システム',
    night: '夜',
    day: '昼',
    signOut: 'ログアウト',
    phoneNav: 'Numinia',
    bazaar: 'バザール',
    sheetClose: '閉じる',
    sheetCard: 'あなたのカード',
    sheetSettings: '設定・外観と言語',
  },
  ko: {
    skip: '본문으로 건너뛰기',
    cityRail: '도시',
    cityNav: '도시의 장소',
    youRail: '나',
    youNav: '내 것',
    foldCity: '도시 바 접기',
    unfoldCity: '도시 바 펼치기',
    foldYou: '내 바 접기',
    unfoldYou: '내 바 펼치기',
    search: '도시에서 검색',
    city: {
      now: '지금',
      communities: '커뮤니티',
      encounters: '모임',
      worlds: '월드',
      bazaar: '바자르',
    },
    you: {
      notices: '알림',
      'your-communities': '내 커뮤니티',
      balance: '내 잔액',
      loot: '내 전리품',
    },
    nowInCity: '지금 도시에서',
    liveDot: '지금 안에 사람이 있어요',
    how: '이용 방법',
    open: '커뮤니티의 거점 열기',
    back: '커피 한 잔 사 주기',
    support: '도움말',
    footerSites: 'Numen Games',
    footerLegal: '약관 및 정책',
    archive: '아카이브',
    youWord: '나',
    enter: '로그인',
    signIn: '로그인',
    signInSheet: '로그인 · 비밀번호 없이',
    signedOutLine: '내 카드, 일정, 커뮤니티… 모두 이 바에 있어요. 로그인하면 채워집니다.',
    account: '내 메뉴',
    faceMenu: '내 메뉴',
    rankLine: '등급',
    panels: '패널',
    face: { profile: '내 프로필', balance: '내 잔액', panels: '내 패널', signOut: '로그아웃' },
    create: '만들기',
    createItems: {
      community: {
        title: '커뮤니티',
        what: '내 커뮤니티의 거점을 엽니다.',
        tile: '커뮤니티',
      },
    },
    createSoon: '곧: 모임과 월드',
    settings: '설정',
    appearance: '화면',
    system: '시스템',
    night: '밤',
    day: '낮',
    signOut: '로그아웃',
    phoneNav: 'Numinia',
    bazaar: '바자르',
    sheetClose: '닫기',
    sheetCard: '내 카드',
    sheetSettings: '설정 · 화면과 언어',
  },
  'pt-br': {
    skip: 'Pular para o conteúdo',
    cityRail: 'A cidade',
    cityNav: 'Lugares da cidade',
    youRail: 'Você',
    youNav: 'O seu',
    foldCity: 'Recolher a barra da cidade',
    unfoldCity: 'Expandir a barra da cidade',
    foldYou: 'Recolher a sua barra',
    unfoldYou: 'Expandir a sua barra',
    search: 'Buscar na cidade',
    city: {
      now: 'Agora',
      communities: 'Comunidades',
      encounters: 'Encontros',
      worlds: 'Mundos',
      bazaar: 'Bazar',
    },
    you: {
      notices: 'Avisos',
      'your-communities': 'Suas comunidades',
      balance: 'Seu saldo',
      loot: 'Seu espólio',
    },
    nowInCity: 'Agora na cidade',
    liveDot: 'Há gente dentro agora',
    how: 'Como funciona',
    open: 'Abra a sede da sua comunidade',
    back: 'Pague-nos um café',
    support: 'Ajuda',
    footerSites: 'Numen Games',
    footerLegal: 'Termos e políticas',
    archive: 'O Arquivo',
    youWord: 'Você',
    enter: 'Entrar',
    signIn: 'Entrar',
    signInSheet: 'Entrar · sem senha',
    signedOutLine:
      'Sua ficha, sua agenda, suas comunidades… vivem nesta barra. Entre e elas se enchem.',
    account: 'Seu menu',
    faceMenu: 'Seu menu',
    rankLine: 'Posto',
    panels: 'Painéis',
    face: {
      profile: 'Seu perfil',
      balance: 'Seu saldo',
      panels: 'Seus painéis',
      signOut: 'Encerrar sessão',
    },
    create: 'Criar',
    createItems: {
      community: {
        title: 'Uma comunidade',
        what: 'Abra uma sede para a sua.',
        tile: 'Comunidade',
      },
    },
    createSoon: 'Em breve: encontros e mundos',
    settings: 'Configurações',
    appearance: 'Aparência',
    system: 'Sistema',
    night: 'Noite',
    day: 'Dia',
    signOut: 'Encerrar sessão',
    phoneNav: 'Numinia',
    bazaar: 'Bazar',
    sheetClose: 'Fechar',
    sheetCard: 'Sua ficha',
    sheetSettings: 'Configurações · aparência e idioma',
  },
};
