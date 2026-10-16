/**
 * «Quién ha entrado»'s words, five locales (cut «El censo», 2026-10-16): the
 * Census page's list of everyone who has signed in — for the house alone —
 * with the way to add each of them to an organization, and the suggestions
 * «Añadir miembro» offers the house as it types. «Organización» as Saldo
 * says it.
 */

import type { SupportedLocale } from '@numinia/domain';
import { ORG_CHOICE_WORDS, type OrgChoiceMessages } from './org-choices';

export interface CensusListMessages extends OrgChoiceMessages {
  /** The list's title. */
  readonly title: string;
  /** What it is, in one line. */
  readonly intro: string;
  /** The one sentence about people who signed in before the list existed. */
  readonly before: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly loading: string;
  readonly empty: string;
  /** Nobody matches the search. */
  readonly noMatch: string;
  readonly failed: string;
  readonly retry: string;
  /** The till does not keep the list yet. */
  readonly notBound: string;
  /** «{shown} de {total}». */
  readonly count: string;
  readonly more: string;
  readonly columns: {
    readonly person: string;
    readonly first: string;
    readonly last: string;
    readonly organizations: string;
    readonly actions: string;
  };
  readonly copy: string;
  /** «Copiar la cartera de {who}», for screen readers. */
  readonly copyLabel: string;
  readonly copied: string;
  readonly copyFailed: string;
  readonly add: string;
  /** «Añadir a {who} a una organización», for screen readers. */
  readonly addLabel: string;
  readonly dialogTitle: string;
  readonly orgLabel: string;
  readonly noOrgs: string;
  /** Every organization on offer already has this person: nothing is left to add them to. */
  readonly allJoined: string;
  readonly addSave: string;
  readonly cancel: string;
  /** «{who} ya está en {org}.» */
  readonly added: string;
  readonly addFailed: string;
  /** «Añadir miembro»'s suggestions, for the house. */
  readonly suggest: {
    /** The suggestions' list, for screen readers. */
    readonly label: string;
    /** «{n} sugerencias: flechas para elegir, Intro para usar una.» */
    readonly found: string;
  };
}

export const CENSUS_LIST_UI: Readonly<Record<SupportedLocale, CensusListMessages>> = {
  es: {
    ...ORG_CHOICE_WORDS.es,
    title: 'Quién ha entrado',
    intro:
      'Cada persona que ha iniciado sesión en numinia.com, la más reciente primero. Solo la casa ve esta lista.',
    before:
      'Solo aparece quien ha entrado desde que existe esta lista: quien entró antes aparecerá cuando vuelva a entrar.',
    searchLabel: 'Buscar por nombre o cartera',
    searchPlaceholder: 'Nombre o 0x…',
    loading: 'Cargando quién ha entrado…',
    empty: 'Todavía no ha entrado nadie desde que existe esta lista.',
    noMatch: 'Nadie coincide con esa búsqueda.',
    failed: 'No se ha podido leer la lista.',
    retry: 'Reintentar',
    notBound: 'La caja todavía no guarda quién entra: la lista aparecerá cuando lo haga.',
    count: '{shown} de {total}',
    more: 'Ver más',
    columns: {
      person: 'Persona',
      first: 'Primera vez',
      last: 'Última vez',
      organizations: 'Organizaciones',
      actions: 'Acciones',
    },
    copy: 'Copiar cartera',
    copyLabel: 'Copiar la cartera de {who}',
    copied: 'Cartera copiada.',
    copyFailed: 'No se ha podido copiar: {wallet}',
    add: 'Añadir a una organización',
    addLabel: 'Añadir a {who} a una organización',
    dialogTitle: 'Añadir a {who} a una organización',
    orgLabel: 'Organización',
    noOrgs: 'No hay organizaciones en las que entrar.',
    allJoined: 'Esta persona ya forma parte de todas las comunidades y organizaciones.',
    addSave: 'Añadir como miembro',
    cancel: 'Cancelar',
    added: '{who} ya está en {org}.',
    addFailed: 'No se ha podido añadir.',
    suggest: {
      label: 'Personas que han entrado',
      found: '{n} sugerencias: flechas para elegir, Intro para usar una.',
    },
  },
  en: {
    ...ORG_CHOICE_WORDS.en,
    title: 'Who has signed in',
    intro:
      'Everyone who has signed in to numinia.com, most recent first. Only the house sees this list.',
    before:
      'Only people who have signed in since this list began are here: anyone who signed in before appears when they sign in again.',
    searchLabel: 'Search by name or wallet',
    searchPlaceholder: 'Name or 0x…',
    loading: 'Loading who has signed in…',
    empty: 'Nobody has signed in since this list began.',
    noMatch: 'Nobody matches that search.',
    failed: 'The list could not be read.',
    retry: 'Try again',
    notBound: 'The till does not keep sign-ins yet: the list appears once it does.',
    count: '{shown} of {total}',
    more: 'Show more',
    columns: {
      person: 'Person',
      first: 'First time',
      last: 'Last time',
      organizations: 'Organizations',
      actions: 'Actions',
    },
    copy: 'Copy wallet',
    copyLabel: 'Copy the wallet of {who}',
    copied: 'Wallet copied.',
    copyFailed: 'Could not copy: {wallet}',
    add: 'Add to an organization',
    addLabel: 'Add {who} to an organization',
    dialogTitle: 'Add {who} to an organization',
    orgLabel: 'Organization',
    noOrgs: 'There are no organizations to enter.',
    allJoined: 'This person already belongs to every community and organization.',
    addSave: 'Add as a member',
    cancel: 'Cancel',
    added: '{who} is now in {org}.',
    addFailed: 'Could not add them.',
    suggest: {
      label: 'People who have signed in',
      found: '{n} suggestions: arrows to choose, Enter to use one.',
    },
  },
  ja: {
    ...ORG_CHOICE_WORDS.ja,
    title: 'サインインした人',
    intro:
      'numinia.comにサインインしたすべての人を、新しい順に表示します。このリストはハウスだけが見られます。',
    before:
      'このリストができてからサインインした人だけが表示されます。それより前の人は、次にサインインしたときに表示されます。',
    searchLabel: '名前またはウォレットで検索',
    searchPlaceholder: '名前または0x…',
    loading: 'サインインした人を読み込み中…',
    empty: 'このリストができてから、まだ誰もサインインしていません。',
    noMatch: 'その検索に合う人はいません。',
    failed: 'リストを読み込めませんでした。',
    retry: 'もう一度',
    notBound: 'レジはまだサインインを記録していません。記録を始めるとリストが表示されます。',
    count: '{total}人中{shown}人',
    more: 'もっと見る',
    columns: {
      person: '人',
      first: '初回',
      last: '最終',
      organizations: '組織',
      actions: '操作',
    },
    copy: 'ウォレットをコピー',
    copyLabel: '{who}のウォレットをコピー',
    copied: 'ウォレットをコピーしました。',
    copyFailed: 'コピーできませんでした：{wallet}',
    add: '組織に追加',
    addLabel: '{who}を組織に追加',
    dialogTitle: '{who}を組織に追加',
    orgLabel: '組織',
    noOrgs: '入れる組織がありません。',
    allJoined: 'この人はすべてのコミュニティと組織にすでに参加しています。',
    addSave: 'メンバーとして追加',
    cancel: 'キャンセル',
    added: '{who}は{org}のメンバーになりました。',
    addFailed: '追加できませんでした。',
    suggest: {
      label: 'サインインした人',
      found: '候補{n}件：矢印キーで選び、Enterで使います。',
    },
  },
  ko: {
    ...ORG_CHOICE_WORDS.ko,
    title: '로그인한 사람',
    intro:
      'numinia.com에 로그인한 모든 사람을 최근 순으로 보여 줍니다. 이 목록은 하우스만 볼 수 있습니다.',
    before:
      '이 목록이 생긴 뒤 로그인한 사람만 보입니다. 그 전에 로그인한 사람은 다시 로그인하면 나타납니다.',
    searchLabel: '이름이나 지갑으로 검색',
    searchPlaceholder: '이름 또는 0x…',
    loading: '로그인한 사람을 불러오는 중…',
    empty: '이 목록이 생긴 뒤로 아직 아무도 로그인하지 않았습니다.',
    noMatch: '검색과 맞는 사람이 없습니다.',
    failed: '목록을 읽지 못했습니다.',
    retry: '다시 시도',
    notBound: '계산대가 아직 로그인을 기록하지 않습니다. 기록을 시작하면 목록이 나타납니다.',
    count: '{total}명 중 {shown}명',
    more: '더 보기',
    columns: {
      person: '사람',
      first: '처음',
      last: '마지막',
      organizations: '조직',
      actions: '작업',
    },
    copy: '지갑 복사',
    copyLabel: '{who}의 지갑 복사',
    copied: '지갑을 복사했습니다.',
    copyFailed: '복사하지 못했습니다: {wallet}',
    add: '조직에 추가',
    addLabel: '{who}을(를) 조직에 추가',
    dialogTitle: '{who}을(를) 조직에 추가',
    orgLabel: '조직',
    noOrgs: '들어갈 수 있는 조직이 없습니다.',
    allJoined: '이 사람은 이미 모든 커뮤니티와 조직에 속해 있습니다.',
    addSave: '멤버로 추가',
    cancel: '취소',
    added: '{who}이(가) 이제 {org}에 있습니다.',
    addFailed: '추가하지 못했습니다.',
    suggest: {
      label: '로그인한 사람',
      found: '제안 {n}개: 화살표로 고르고 Enter로 사용합니다.',
    },
  },
  'pt-br': {
    ...ORG_CHOICE_WORDS['pt-br'],
    title: 'Quem já entrou',
    intro:
      'Cada pessoa que entrou em numinia.com, a mais recente primeiro. Só a casa vê esta lista.',
    before:
      'Só aparece quem entrou desde que esta lista existe: quem entrou antes aparece quando entrar de novo.',
    searchLabel: 'Buscar por nome ou carteira',
    searchPlaceholder: 'Nome ou 0x…',
    loading: 'Carregando quem já entrou…',
    empty: 'Ninguém entrou desde que esta lista existe.',
    noMatch: 'Ninguém corresponde a essa busca.',
    failed: 'Não foi possível ler a lista.',
    retry: 'Tentar de novo',
    notBound: 'O caixa ainda não guarda quem entra: a lista aparece quando guardar.',
    count: '{shown} de {total}',
    more: 'Ver mais',
    columns: {
      person: 'Pessoa',
      first: 'Primeira vez',
      last: 'Última vez',
      organizations: 'Organizações',
      actions: 'Ações',
    },
    copy: 'Copiar carteira',
    copyLabel: 'Copiar a carteira de {who}',
    copied: 'Carteira copiada.',
    copyFailed: 'Não foi possível copiar: {wallet}',
    add: 'Adicionar a uma organização',
    addLabel: 'Adicionar {who} a uma organização',
    dialogTitle: 'Adicionar {who} a uma organização',
    orgLabel: 'Organização',
    noOrgs: 'Não há organizações em que entrar.',
    allJoined: 'Esta pessoa já faz parte de todas as comunidades e organizações.',
    addSave: 'Adicionar como membro',
    cancel: 'Cancelar',
    added: '{who} agora está em {org}.',
    addFailed: 'Não foi possível adicionar.',
    suggest: {
      label: 'Pessoas que já entraram',
      found: '{n} sugestões: setas para escolher, Enter para usar uma.',
    },
  },
};
