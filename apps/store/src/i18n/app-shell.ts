/**
 * The words of the app shell (numinia.com since v0.83.0): the sidebar, the
 * top bar, the phone's tab bar and the folded footer. Plain Spanish first;
 * typed per locale, so a missing translation does not compile.
 *
 * Words the site already says elsewhere are reused from where they live:
 * Comunidades, Calendario and Buscar from i18n/communities.ts, the legal
 * links and the build line from CHROME_MESSAGES.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { MoreId, NavId } from '../lib/app-nav';

export interface AppShellMessages {
  /** The first stop of the keyboard: straight to the page. */
  readonly skip: string;
  /** The sidebar's landmark. */
  readonly sidebar: string;
  /** The main navigation (sidebar) and its phone twin (tab bar). */
  readonly mainNav: string;
  readonly tabsNav: string;
  readonly collapse: string;
  readonly expand: string;
  readonly nav: Readonly<Record<NavId, string>>;
  /** Only the Bazar is new here; Comunidades and Calendario come from communities.ts. */
  readonly bazaar: string;
  readonly more: string;
  readonly moreItems: Readonly<Record<MoreId, string>>;
  /** The sidebar's call to sign in, one line. */
  readonly cta: string;
  readonly signIn: string;
  /** With a session: the person's menu in the top bar (its spoken name),
      the word before the rank, and the one way out. */
  readonly account: string;
  readonly rankLine: string;
  readonly profile: string;
  readonly signOut: string;
  /** The ⋮ button and its three groups. */
  readonly options: string;
  readonly appearance: string;
  readonly night: string;
  readonly day: string;
  readonly settings: string;
  /** The folded footer: the three sites and the legal texts. */
  readonly footerSites: string;
  readonly footerLegal: string;
  readonly archive: string;
}

export const APP_SHELL_UI: Readonly<Record<SupportedLocale, AppShellMessages>> = {
  es: {
    skip: 'Saltar al contenido',
    sidebar: 'Barra lateral',
    mainNav: 'Principal',
    tabsNav: 'Principal (móvil)',
    collapse: 'Contraer la barra lateral',
    expand: 'Expandir la barra lateral',
    nav: {
      'for-you': 'Para ti',
      explore: 'Explorar',
      belong: 'Perteneces',
      live: 'Live',
      profile: 'Perfil',
    },
    bazaar: 'Bazar',
    more: 'Más',
    moreItems: {
      how: 'Cómo funciona',
      open: 'Abre la sede de tu comunidad',
      back: 'Invítanos a un café',
      notifications: 'Notificaciones',
      support: 'Ayuda',
    },
    cta: 'Entra para seguir a tus comunidades, ir a sus encuentros y ver quién está en su sede.',
    signIn: 'Iniciar sesión',
    account: 'Tu cuenta',
    rankLine: 'Rango',
    profile: 'Perfil',
    signOut: 'Salir',
    options: 'Más opciones',
    appearance: 'Aspecto',
    night: 'Noche',
    day: 'Día',
    settings: 'Ajustes',
    footerSites: 'Numen Games',
    footerLegal: 'Términos y políticas',
    archive: 'El Archivo',
  },
  en: {
    skip: 'Skip to content',
    sidebar: 'Sidebar',
    mainNav: 'Main',
    tabsNav: 'Main (phone)',
    collapse: 'Collapse the sidebar',
    expand: 'Expand the sidebar',
    nav: {
      'for-you': 'For you',
      explore: 'Explore',
      belong: 'Belong',
      live: 'Live',
      profile: 'Profile',
    },
    bazaar: 'Bazaar',
    more: 'More',
    moreItems: {
      how: 'How it works',
      open: "Open your community's home",
      back: 'Buy us a coffee',
      notifications: 'Notifications',
      support: 'Help',
    },
    cta: 'Sign in to follow your communities, join their gatherings and see who is in their home.',
    signIn: 'Sign in',
    account: 'Your account',
    rankLine: 'Rank',
    profile: 'Profile',
    signOut: 'Sign out',
    options: 'More options',
    appearance: 'Appearance',
    night: 'Night',
    day: 'Day',
    settings: 'Settings',
    footerSites: 'Numen Games',
    footerLegal: 'Terms and policies',
    archive: 'The Archive',
  },
  ja: {
    skip: '本文へスキップ',
    sidebar: 'サイドバー',
    mainNav: 'メイン',
    tabsNav: 'メイン（モバイル）',
    collapse: 'サイドバーを折りたたむ',
    expand: 'サイドバーを展開する',
    nav: {
      'for-you': 'おすすめ',
      explore: '探す',
      belong: '所属',
      live: 'ライブ',
      profile: 'プロフィール',
    },
    bazaar: 'バザール',
    more: 'その他',
    moreItems: {
      how: '使い方',
      open: 'コミュニティの拠点を開く',
      back: 'コーヒーをおごる',
      notifications: '通知',
      support: 'ヘルプ',
    },
    cta: 'ログインすると、コミュニティをフォローし、その集まりに参加し、拠点に誰がいるかを見られます。',
    signIn: 'ログイン',
    account: 'あなたのアカウント',
    rankLine: 'ランク',
    profile: 'プロフィール',
    signOut: 'ログアウト',
    options: 'その他のオプション',
    appearance: '外観',
    night: '夜',
    day: '昼',
    settings: '設定',
    footerSites: 'Numen Games',
    footerLegal: '規約とポリシー',
    archive: 'アーカイブ',
  },
  ko: {
    skip: '본문으로 건너뛰기',
    sidebar: '사이드바',
    mainNav: '메인',
    tabsNav: '메인(모바일)',
    collapse: '사이드바 접기',
    expand: '사이드바 펼치기',
    nav: {
      'for-you': '추천',
      explore: '탐색',
      belong: '소속',
      live: '라이브',
      profile: '프로필',
    },
    bazaar: '바자르',
    more: '더 보기',
    moreItems: {
      how: '이용 방법',
      open: '커뮤니티의 거점 열기',
      back: '커피 한 잔 사 주기',
      notifications: '알림',
      support: '도움말',
    },
    cta: '로그인하면 커뮤니티를 팔로우하고, 모임에 참여하고, 거점에 누가 있는지 볼 수 있습니다.',
    signIn: '로그인',
    account: '내 계정',
    rankLine: '등급',
    profile: '프로필',
    signOut: '로그아웃',
    options: '더 많은 옵션',
    appearance: '화면',
    night: '밤',
    day: '낮',
    settings: '설정',
    footerSites: 'Numen Games',
    footerLegal: '약관 및 정책',
    archive: '아카이브',
  },
  'pt-br': {
    skip: 'Pular para o conteúdo',
    sidebar: 'Barra lateral',
    mainNav: 'Principal',
    tabsNav: 'Principal (celular)',
    collapse: 'Recolher a barra lateral',
    expand: 'Expandir a barra lateral',
    nav: {
      'for-you': 'Para você',
      explore: 'Explorar',
      belong: 'Pertence',
      live: 'Live',
      profile: 'Perfil',
    },
    bazaar: 'Bazar',
    more: 'Mais',
    moreItems: {
      how: 'Como funciona',
      open: 'Abra a sede da sua comunidade',
      back: 'Pague-nos um café',
      notifications: 'Notificações',
      support: 'Ajuda',
    },
    cta: 'Entre para seguir suas comunidades, participar dos encontros delas e ver quem está na sede.',
    signIn: 'Entrar',
    account: 'Sua conta',
    rankLine: 'Posto',
    profile: 'Perfil',
    signOut: 'Sair',
    options: 'Mais opções',
    appearance: 'Aparência',
    night: 'Noite',
    day: 'Dia',
    settings: 'Configurações',
    footerSites: 'Numen Games',
    footerLegal: 'Termos e políticas',
    archive: 'O Arquivo',
  },
};
