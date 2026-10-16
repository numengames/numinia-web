/**
 * «Mundos ↔ organizaciones»'s words (cut 4, 2026-10-16), five locales: the
 * Worlds room's placement dialog (the house puts each world in exactly one
 * organization), the panel's «Sedes» screen (the organization's worlds) and a
 * world's own page. Screen words: «sede» for an organization's world, «mundo»
 * for the world itself, «comunidad» never «grupo»; the house is «la casa».
 * `{name}` placeholders are filled by `fill()` (lib/accounts.ts).
 *
 * Read on the server only: each page hands its island the one part and the
 * one locale it needs.
 */

import type { SupportedLocale } from '@numinia/domain';

/** A count in its two forms (languages without plurals repeat one). */
export interface Counted {
  readonly one: string;
  readonly other: string;
}

/** What the Worlds room adds: each world's organization and the house's placement. */
export interface PlacementMessages {
  /** A world's organization, as its label says it. */
  readonly homeLabel: string;
  readonly unplaced: string;
  /** The link from a world to its own page. */
  readonly openPage: string;
  /** «Elegir {w}»: a row's checkbox, for screen readers. */
  readonly select: string;
  readonly assign: string;
  /** «Asignar {w} a una organización»: the row's button, for screen readers. */
  readonly assignLabel: string;
  /** The bulk button, with how many rows are chosen. */
  readonly assignChosen: string;
  readonly chosen: Counted;
  readonly clear: string;
  /** Chooses every world the filters show: «Elegir los {n} que se ven». */
  readonly selectShown: string;
  /** The dialog's title for one world and for several. */
  readonly titleOne: string;
  readonly titleMany: string;
  readonly orgLabel: string;
  readonly loading: string;
  readonly noOrgs: string;
  readonly save: string;
  readonly cancel: string;
  /** What the dialog says it will do to a world that already has an organization. */
  readonly moves: string;
  readonly placed: Counted;
  readonly failed: string;
  readonly forbidden: string;
  readonly unknownOrg: string;
  /** The list of placements did not load: rows show no organization. */
  readonly homesFailed: string;
}

/** The panel's «Sedes». */
export interface VenuesMessages {
  readonly loading: string;
  readonly failed: string;
  readonly forbidden: string;
  readonly retry: string;
  readonly empty: string;
  readonly emptyNote: string;
  readonly count: Counted;
  /** «Abrir la página de {w}», the link's accessible name. */
  readonly open: string;
  readonly openLabel: string;
  readonly address: string;
}

/** A world's own page. */
export interface WorldPageMessages {
  readonly loading: string;
  readonly missingTitle: string;
  readonly missing: string;
  readonly failed: string;
  readonly retry: string;
  readonly eyebrow: string;
  readonly homeLabel: string;
  readonly unplaced: string;
  readonly unplacedNote: string;
  readonly manage: {
    readonly title: string;
    readonly note: string;
    readonly venues: string;
    readonly members: string;
    readonly balance: string;
  };
  readonly back: string;
}

export interface MundosMessages {
  readonly placement: PlacementMessages;
  readonly venues: VenuesMessages;
  readonly page: WorldPageMessages;
}

export const MUNDOS_UI: Readonly<Record<SupportedLocale, MundosMessages>> = {
  es: {
    placement: {
      homeLabel: 'Organización',
      unplaced: 'Sin organización',
      openPage: 'Ver su página',
      select: 'Elegir {w}',
      assign: 'Asignar a una organización',
      assignLabel: 'Asignar {w} a una organización',
      assignChosen: 'Asignar a una organización ({n})',
      chosen: { one: '{n} mundo elegido', other: '{n} mundos elegidos' },
      clear: 'Quitar la selección',
      selectShown: 'Elegir los {n} que se ven',
      titleOne: 'Asignar «{w}» a una organización',
      titleMany: 'Asignar {n} mundos a una organización',
      orgLabel: 'Organización',
      loading: 'Leyendo las organizaciones…',
      noOrgs: 'No hay organizaciones a las que asignar mundos.',
      save: 'Asignar',
      cancel: 'Cancelar',
      moves:
        'Cada mundo pertenece a una sola organización: la que lo paga es la que lo administra. Si ya tenía una, pasa a esta.',
      placed: {
        one: '{n} mundo asignado a {org}.',
        other: '{n} mundos asignados a {org}.',
      },
      failed: 'No se pudo asignar. Inténtalo de nuevo.',
      forbidden: 'Solo la casa asigna mundos a organizaciones.',
      unknownOrg: 'Esa organización ya no existe.',
      homesFailed: 'No se pudo leer a qué organización pertenece cada mundo.',
    },
    venues: {
      loading: 'Leyendo las sedes…',
      failed: 'No se pudieron leer las sedes de esta organización.',
      forbidden: 'Solo quien forma parte de la organización ve sus sedes.',
      retry: 'Reintentar',
      empty: 'Esta organización todavía no tiene sedes.',
      emptyNote:
        'Un mundo pasa a ser sede de una organización cuando la casa se lo asigna. Cuando lo haga, aparecerá aquí.',
      count: { one: '{n} sede', other: '{n} sedes' },
      open: 'Abrir la página',
      openLabel: 'Abrir la página de {w}',
      address: 'Mundo',
    },
    page: {
      loading: 'Leyendo el mundo…',
      missingTitle: 'No hay ningún mundo con ese nombre',
      missing: 'Quizá se escribió mal la dirección o el mundo ya no existe.',
      failed: 'No se pudo leer el mundo.',
      retry: 'Reintentar',
      eyebrow: 'Mundo',
      homeLabel: 'Organización',
      unplaced: 'Sin organización',
      unplacedNote: 'La casa todavía no lo ha asignado a ninguna organización.',
      manage: {
        title: 'Administración',
        note: 'Formas parte de la organización de este mundo: la que lo paga es la que lo administra.',
        venues: 'Sedes de la organización',
        members: 'Miembros',
        balance: 'Saldo y consumo',
      },
      back: 'Volver al inicio',
    },
  },
  en: {
    placement: {
      homeLabel: 'Organization',
      unplaced: 'No organization',
      openPage: 'See its page',
      select: 'Choose {w}',
      assign: 'Assign to an organization',
      assignLabel: 'Assign {w} to an organization',
      assignChosen: 'Assign to an organization ({n})',
      chosen: { one: '{n} world chosen', other: '{n} worlds chosen' },
      clear: 'Clear the selection',
      selectShown: 'Choose the {n} shown',
      titleOne: 'Assign “{w}” to an organization',
      titleMany: 'Assign {n} worlds to an organization',
      orgLabel: 'Organization',
      loading: 'Reading the organizations…',
      noOrgs: 'There are no organizations to assign worlds to.',
      save: 'Assign',
      cancel: 'Cancel',
      moves:
        'Each world belongs to one organization only: the one that pays for it is the one that administers it. If it already had one, it moves to this one.',
      placed: {
        one: '{n} world assigned to {org}.',
        other: '{n} worlds assigned to {org}.',
      },
      failed: 'Could not assign. Try again.',
      forbidden: 'Only the house assigns worlds to organizations.',
      unknownOrg: 'That organization no longer exists.',
      homesFailed: 'Could not read which organization each world belongs to.',
    },
    venues: {
      loading: 'Reading the homes…',
      failed: "Could not read this organization's homes.",
      forbidden: 'Only people in the organization see its homes.',
      retry: 'Try again',
      empty: 'This organization has no homes yet.',
      emptyNote:
        'A world becomes an organization’s home when the house assigns it. Once it does, it will show up here.',
      count: { one: '{n} home', other: '{n} homes' },
      open: 'Open the page',
      openLabel: 'Open the page of {w}',
      address: 'World',
    },
    page: {
      loading: 'Reading the world…',
      missingTitle: 'There is no world with that name',
      missing: 'The address may be misspelled, or the world no longer exists.',
      failed: 'Could not read the world.',
      retry: 'Try again',
      eyebrow: 'World',
      homeLabel: 'Organization',
      unplaced: 'No organization',
      unplacedNote: 'The house has not assigned it to an organization yet.',
      manage: {
        title: 'Administration',
        note: 'You are in this world’s organization: the one that pays for it is the one that administers it.',
        venues: "The organization's homes",
        members: 'Members',
        balance: 'Balance and usage',
      },
      back: 'Back to the start',
    },
  },
  ja: {
    placement: {
      homeLabel: '組織',
      unplaced: '組織なし',
      openPage: 'ページを見る',
      select: '{w}を選ぶ',
      assign: '組織に割り当てる',
      assignLabel: '{w}を組織に割り当てる',
      assignChosen: '組織に割り当てる（{n}）',
      chosen: { one: '{n}件のワールドを選択中', other: '{n}件のワールドを選択中' },
      clear: '選択を解除',
      selectShown: '表示中の{n}件を選ぶ',
      titleOne: '「{w}」を組織に割り当てる',
      titleMany: '{n}件のワールドを組織に割り当てる',
      orgLabel: '組織',
      loading: '組織を読み込み中…',
      noOrgs: 'ワールドを割り当てられる組織がありません。',
      save: '割り当てる',
      cancel: 'キャンセル',
      moves:
        'ワールドは1つの組織だけに属します。料金を支払う組織が管理する組織です。すでに組織があれば、この組織に移ります。',
      placed: {
        one: '{n}件のワールドを{org}に割り当てました。',
        other: '{n}件のワールドを{org}に割り当てました。',
      },
      failed: '割り当てできませんでした。もう一度お試しください。',
      forbidden: 'ワールドを組織に割り当てられるのはハウスだけです。',
      unknownOrg: 'その組織はもう存在しません。',
      homesFailed: '各ワールドの所属組織を読み込めませんでした。',
    },
    venues: {
      loading: '拠点を読み込み中…',
      failed: 'この組織の拠点を読み込めませんでした。',
      forbidden: '組織のメンバーだけが拠点を見られます。',
      retry: '再試行',
      empty: 'この組織にはまだ拠点がありません。',
      emptyNote:
        'ワールドは、ハウスが割り当てるとその組織の拠点になります。割り当てられるとここに表示されます。',
      count: { one: '拠点 {n}件', other: '拠点 {n}件' },
      open: 'ページを開く',
      openLabel: '{w}のページを開く',
      address: 'ワールド',
    },
    page: {
      loading: 'ワールドを読み込み中…',
      missingTitle: 'その名前のワールドはありません',
      missing: 'アドレスが間違っているか、ワールドがもう存在しません。',
      failed: 'ワールドを読み込めませんでした。',
      retry: '再試行',
      eyebrow: 'ワールド',
      homeLabel: '組織',
      unplaced: '組織なし',
      unplacedNote: 'ハウスはまだこのワールドを組織に割り当てていません。',
      manage: {
        title: '管理',
        note: 'あなたはこのワールドの組織に所属しています。料金を支払う組織が管理する組織です。',
        venues: '組織の拠点',
        members: 'メンバー',
        balance: '残高と利用',
      },
      back: 'トップへ戻る',
    },
  },
  ko: {
    placement: {
      homeLabel: '조직',
      unplaced: '조직 없음',
      openPage: '페이지 보기',
      select: '{w} 선택',
      assign: '조직에 배정',
      assignLabel: '{w}을(를) 조직에 배정',
      assignChosen: '조직에 배정 ({n})',
      chosen: { one: '월드 {n}개 선택됨', other: '월드 {n}개 선택됨' },
      clear: '선택 해제',
      selectShown: '표시된 {n}개 선택',
      titleOne: '“{w}”을(를) 조직에 배정',
      titleMany: '월드 {n}개를 조직에 배정',
      orgLabel: '조직',
      loading: '조직을 읽는 중…',
      noOrgs: '월드를 배정할 수 있는 조직이 없습니다.',
      save: '배정',
      cancel: '취소',
      moves:
        '월드는 하나의 조직에만 속합니다. 비용을 내는 조직이 관리하는 조직입니다. 이미 조직이 있다면 이 조직으로 옮겨집니다.',
      placed: {
        one: '월드 {n}개를 {org}에 배정했습니다.',
        other: '월드 {n}개를 {org}에 배정했습니다.',
      },
      failed: '배정하지 못했습니다. 다시 시도해 주세요.',
      forbidden: '월드를 조직에 배정할 수 있는 것은 하우스뿐입니다.',
      unknownOrg: '그 조직은 더 이상 없습니다.',
      homesFailed: '각 월드가 속한 조직을 읽지 못했습니다.',
    },
    venues: {
      loading: '거점을 읽는 중…',
      failed: '이 조직의 거점을 읽지 못했습니다.',
      forbidden: '조직의 구성원만 거점을 볼 수 있습니다.',
      retry: '다시 시도',
      empty: '이 조직에는 아직 거점이 없습니다.',
      emptyNote:
        '하우스가 월드를 배정하면 그 월드가 조직의 거점이 됩니다. 배정되면 여기에 표시됩니다.',
      count: { one: '거점 {n}개', other: '거점 {n}개' },
      open: '페이지 열기',
      openLabel: '{w} 페이지 열기',
      address: '월드',
    },
    page: {
      loading: '월드를 읽는 중…',
      missingTitle: '그 이름의 월드가 없습니다',
      missing: '주소가 잘못되었거나 월드가 더 이상 없습니다.',
      failed: '월드를 읽지 못했습니다.',
      retry: '다시 시도',
      eyebrow: '월드',
      homeLabel: '조직',
      unplaced: '조직 없음',
      unplacedNote: '하우스가 아직 이 월드를 조직에 배정하지 않았습니다.',
      manage: {
        title: '관리',
        note: '당신은 이 월드의 조직에 속해 있습니다. 비용을 내는 조직이 관리하는 조직입니다.',
        venues: '조직의 거점',
        members: '구성원',
        balance: '잔액과 사용량',
      },
      back: '처음으로',
    },
  },
  'pt-br': {
    placement: {
      homeLabel: 'Organização',
      unplaced: 'Sem organização',
      openPage: 'Ver a página',
      select: 'Escolher {w}',
      assign: 'Atribuir a uma organização',
      assignLabel: 'Atribuir {w} a uma organização',
      assignChosen: 'Atribuir a uma organização ({n})',
      chosen: { one: '{n} mundo escolhido', other: '{n} mundos escolhidos' },
      clear: 'Limpar a seleção',
      selectShown: 'Escolher os {n} exibidos',
      titleOne: 'Atribuir “{w}” a uma organização',
      titleMany: 'Atribuir {n} mundos a uma organização',
      orgLabel: 'Organização',
      loading: 'Lendo as organizações…',
      noOrgs: 'Não há organizações para atribuir mundos.',
      save: 'Atribuir',
      cancel: 'Cancelar',
      moves:
        'Cada mundo pertence a uma só organização: a que o paga é a que o administra. Se já tinha uma, passa para esta.',
      placed: {
        one: '{n} mundo atribuído a {org}.',
        other: '{n} mundos atribuídos a {org}.',
      },
      failed: 'Não foi possível atribuir. Tente de novo.',
      forbidden: 'Só a casa atribui mundos a organizações.',
      unknownOrg: 'Essa organização não existe mais.',
      homesFailed: 'Não foi possível ler a que organização cada mundo pertence.',
    },
    venues: {
      loading: 'Lendo as sedes…',
      failed: 'Não foi possível ler as sedes desta organização.',
      forbidden: 'Só quem faz parte da organização vê as sedes dela.',
      retry: 'Tentar de novo',
      empty: 'Esta organização ainda não tem sedes.',
      emptyNote:
        'Um mundo passa a ser sede de uma organização quando a casa o atribui. Quando isso acontecer, ele aparecerá aqui.',
      count: { one: '{n} sede', other: '{n} sedes' },
      open: 'Abrir a página',
      openLabel: 'Abrir a página de {w}',
      address: 'Mundo',
    },
    page: {
      loading: 'Lendo o mundo…',
      missingTitle: 'Não há nenhum mundo com esse nome',
      missing: 'O endereço pode estar errado ou o mundo não existe mais.',
      failed: 'Não foi possível ler o mundo.',
      retry: 'Tentar de novo',
      eyebrow: 'Mundo',
      homeLabel: 'Organização',
      unplaced: 'Sem organização',
      unplacedNote: 'A casa ainda não o atribuiu a nenhuma organização.',
      manage: {
        title: 'Administração',
        note: 'Você faz parte da organização deste mundo: a que o paga é a que o administra.',
        venues: 'Sedes da organização',
        members: 'Membros',
        balance: 'Saldo e consumo',
      },
      back: 'Voltar ao início',
    },
  },
};
