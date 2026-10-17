/**
 * «Tus mundos» (cut I, 2026-10-17): the words of /mis-mundos/ — the 3D
 * spaces of the communities you belong to, grouped by community — in five
 * locales. The cards reuse the index's words (i18n/ahora.ts); «{n}» is
 * filled by `fill()` in i18n/communities.ts.
 */

import type { SupportedLocale } from '@numinia/domain';

export interface MyWorldsMessages {
  /** The page. */
  readonly title: string;
  readonly lead: string;
  /** Signed out: what the page is for, and the door. */
  readonly signedOutLead: string;
  readonly signIn: string;
  /** No community of yours has a world yet, and where every world is. */
  readonly emptyTitle: string;
  readonly seeAll: string;
  /** Under a community's name without a world. */
  readonly noneHere: string;
  /** A community's name as a link to its page (spoken name: `{name}`). */
  readonly communityPage: string;
  /** A community without a page of its own on the register. */
  readonly worldsOfCommunity: string;
  /** The till is not there. */
  readonly unavailable: string;
}

const ES: MyWorldsMessages = {
  title: 'Tus mundos',
  lead: 'Los espacios 3D de tus comunidades, reunidos aquí. Se entra desde el navegador, también en el móvil.',
  signedOutLead:
    'Aquí se juntan los mundos de las comunidades a las que perteneces. Entra para verlos.',
  signIn: 'Entrar',
  emptyTitle: 'Tus comunidades no tienen mundos todavía',
  seeAll: 'Ver todos los mundos de la ciudad',
  noneHere: 'Esta comunidad no tiene mundos todavía.',
  communityPage: 'La página de {name}',
  worldsOfCommunity: 'Los mundos de {name}',
  unavailable: 'Tus mundos no responden ahora mismo. Vuelve a intentarlo en un momento.',
};

const EN: MyWorldsMessages = {
  title: 'Your worlds',
  lead: 'The 3D spaces of your communities, gathered here. You enter from the browser, on your phone too.',
  signedOutLead: 'The worlds of the communities you belong to gather here. Sign in to see them.',
  signIn: 'Sign in',
  emptyTitle: 'Your communities have no worlds yet',
  seeAll: 'See every world of the city',
  noneHere: 'This community has no worlds yet.',
  communityPage: '{name}’s page',
  worldsOfCommunity: 'The worlds of {name}',
  unavailable: 'Your worlds are not answering right now. Try again in a moment.',
};

const JA: MyWorldsMessages = {
  title: 'あなたのワールド',
  lead: 'あなたのコミュニティの3D空間をここに集めました。ブラウザから、スマートフォンからも入れます。',
  signedOutLead:
    'あなたが属するコミュニティのワールドがここに集まります。見るにはログインしてください。',
  signIn: 'ログイン',
  emptyTitle: 'あなたのコミュニティにはまだワールドがありません',
  seeAll: '街のすべてのワールドを見る',
  noneHere: 'このコミュニティにはまだワールドがありません。',
  communityPage: '{name}のページ',
  worldsOfCommunity: '{name}のワールド',
  unavailable: 'いまワールドが応答していません。しばらくしてからお試しください。',
};

const KO: MyWorldsMessages = {
  title: '내 월드',
  lead: '내 커뮤니티의 3D 공간을 여기에 모았습니다. 브라우저에서, 휴대전화에서도 들어갈 수 있어요.',
  signedOutLead: '내가 속한 커뮤니티의 월드가 여기에 모입니다. 보려면 로그인하세요.',
  signIn: '로그인',
  emptyTitle: '내 커뮤니티에는 아직 월드가 없습니다',
  seeAll: '도시의 모든 월드 보기',
  noneHere: '이 커뮤니티에는 아직 월드가 없습니다.',
  communityPage: '{name} 페이지',
  worldsOfCommunity: '{name}의 월드',
  unavailable: '지금은 월드가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.',
};

const PT_BR: MyWorldsMessages = {
  title: 'Seus mundos',
  lead: 'Os espaços 3D das suas comunidades, reunidos aqui. Entra-se pelo navegador, também no celular.',
  signedOutLead: 'Aqui se juntam os mundos das comunidades a que você pertence. Entre para vê-los.',
  signIn: 'Entrar',
  emptyTitle: 'Suas comunidades ainda não têm mundos',
  seeAll: 'Ver todos os mundos da cidade',
  noneHere: 'Esta comunidade ainda não tem mundos.',
  communityPage: 'A página de {name}',
  worldsOfCommunity: 'Os mundos de {name}',
  unavailable: 'Seus mundos não estão respondendo agora. Tente de novo em um instante.',
};

export const MY_WORLDS_UI: Readonly<Record<SupportedLocale, MyWorldsMessages>> = {
  es: ES,
  en: EN,
  ja: JA,
  ko: KO,
  'pt-br': PT_BR,
};
