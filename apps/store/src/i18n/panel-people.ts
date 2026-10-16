/**
 * «La gente»'s words (the panel's Miembros and Roles, /panel/miembros/ and
 * /panel/roles/), five locales, Spanish first. Only what is new is written
 * here: Saldo's terms win and are taken from where they live
 * (i18n/saldo.ts — «organización», «Titular», the till's refusals, the
 * fresh signature, the log), a rank's name is the domain's own
 * (RANK_DEFINITIONS) and the column says it as the app shell does.
 *
 * Read on the server only: the page hands the island the one locale it
 * needs, and only the two pages of «La gente» carry these words.
 *
 * «encuentro», never «ritual», on screen: the domain's labels of the two
 * gathering permissions still say «rituales», so they are said again here
 * (`labels`), the other fifteen are the domain's.
 */

import {
  RANK_DEFINITIONS,
  type OrganizationPermission,
  type OwnerAct,
  type Rank,
  type SupportedLocale,
} from '@numinia/domain';
import { APP_SHELL_UI } from './app-shell';

/** The one-and-many forms of a count; `{n}` is the number. */
interface Plural {
  readonly one: string;
  readonly other: string;
}

type PermissionGroup = 'organization' | 'people' | 'gatherings' | 'venues' | 'money';

/** The house's swatches (lib/panel-people.ts SWATCHES), named for whoever cannot see them. */
type Swatch = '#c0392b' | '#d98324' | '#c9a227' | '#3d8b5f' | '#2f7fa8' | '#6b5ca5' | '#a8477a';

export interface PeopleMessages {
  /** Miembros: the table of people. */
  readonly members: {
    readonly search: string;
    readonly count: Plural;
    /** `{q}`: what was searched. */
    readonly none: string;
    readonly add: string;
    readonly addLabel: string;
    readonly addSave: string;
    readonly addBad: string;
    readonly columns: {
      readonly person: string;
      readonly rank: string;
      readonly roles: string;
      readonly since: string;
      readonly actions: string;
    };
    /** Each rank's name, as the city says it. */
    readonly ranks: Readonly<Record<Rank, string>>;
    /** The title of «—»: a rank nobody could read. */
    readonly rankUnknown: string;
    readonly loadingRanks: string;
    /** `{who}`. */
    readonly menu: string;
    /** `{who}`. */
    readonly giveMore: string;
    readonly remove: string;
    readonly leave: string;
    /** `{who}`. */
    readonly removeConfirm: string;
    readonly leaveConfirm: string;
    readonly removeYes: string;
    readonly leaveYes: string;
    readonly copy: string;
    readonly copied: string;
    /** `{wallet}`. */
    readonly copyFailed: string;
  };
  /** Roles: the editor. */
  readonly roles: {
    readonly owners: string;
    readonly ownersNote: string;
    readonly listLabel: string;
    readonly people: Plural;
    readonly create: string;
    readonly freshName: string;
    readonly rule: string;
    readonly tabsLabel: string;
    /** `members`: `{n}`. */
    readonly tabs: {
      readonly look: string;
      readonly permissions: string;
      readonly members: string;
    };
    readonly swatches: Readonly<Record<Swatch, string>>;
    readonly apartLine: string;
    readonly hintTitle: string;
    readonly hint: string;
    /** `{name}`: the base role's name, in the three tabs. */
    readonly baseLook: string;
    readonly basePermissions: string;
    readonly baseMembers: string;
    readonly delete: string;
    readonly groups: Readonly<Record<PermissionGroup, string>>;
    /** Said again where the domain's label says «ritual». */
    readonly labels: Readonly<Partial<Record<OrganizationPermission, string>>>;
    readonly descriptions: Readonly<Record<OrganizationPermission, string>>;
    readonly ownersOnly: string;
    readonly ownerActs: Readonly<Record<OwnerAct, string>>;
    readonly byAdmin: string;
    readonly notHeld: string;
    readonly savePermissions: string;
    readonly undo: string;
    /** `{act}` and `{holders}`. */
    readonly readOnly: string;
    /** `{act}`. */
    readonly readOnlyOwners: string;
    readonly giveTo: string;
    readonly add: string;
  };
}

/** The domain's rank names and the app shell's word for the column, for one locale. */
function city(locale: SupportedLocale) {
  return {
    rank: APP_SHELL_UI[locale].rankLine,
    ranks: Object.fromEntries(
      RANK_DEFINITIONS.map((definition) => [definition.id, definition.name[locale]]),
    ) as Record<Rank, string>,
  } as const;
}

export const PEOPLE_UI: Readonly<Record<SupportedLocale, PeopleMessages>> = {
  es: {
    members: {
      search: 'Buscar por cartera o nombre',
      count: { one: '{n} miembro', other: '{n} miembros' },
      none: 'Nadie coincide con «{q}».',
      add: 'Añadir miembro',
      addLabel: 'Cartera de la persona (0x…)',
      addSave: 'Añadir',
      addBad: 'Una cartera es 0x y 40 caracteres: del 0 al 9 y de la a a la f.',
      columns: {
        person: 'Persona',
        rank: city('es').rank,
        roles: 'Roles',
        since: 'Desde',
        actions: 'Acciones',
      },
      ranks: city('es').ranks,
      rankUnknown: 'Rango desconocido: la ciudad no lo ha dicho ahora.',
      loadingRanks: 'Leyendo los rangos…',
      menu: 'Acciones para {who}',
      giveMore: 'Dar un rol a {who}',
      remove: 'Quitar de la organización',
      leave: 'Salir de la organización',
      removeConfirm:
        '¿Quitar a {who} de la organización? Podrá volver si alguien añade su cartera otra vez.',
      leaveConfirm:
        '¿Salir de la organización? Para volver, alguien tendrá que añadir tu cartera otra vez.',
      removeYes: 'Sí, quitar',
      leaveYes: 'Sí, salir',
      copy: 'Copiar la cartera',
      copied: 'Cartera copiada.',
      copyFailed: 'No se ha podido copiar. La cartera es {wallet}.',
    },
    roles: {
      owners: 'Titulares',
      ownersNote: 'No es un rol: lo pueden todo.',
      listLabel: 'Roles, de arriba abajo',
      people: { one: '{n} persona', other: '{n} personas' },
      create: 'Crear rol',
      freshName: 'Rol nuevo',
      rule: 'Nadie toca un rol de su altura o por encima, ni da un permiso que no tiene.',
      tabsLabel: 'Partes del rol',
      tabs: { look: 'Aspecto', permissions: 'Permisos', members: 'Miembros · {n}' },
      swatches: {
        '#c0392b': 'Rojo',
        '#d98324': 'Naranja',
        '#c9a227': 'Ocre',
        '#3d8b5f': 'Verde',
        '#2f7fa8': 'Azul',
        '#6b5ca5': 'Violeta',
        '#a8477a': 'Rosa',
      },
      apartLine:
        'Quienes lo tienen salen en un grupo propio en la lista de gente de la organización.',
      hintTitle: 'Un título, sin poderes',
      hint: 'Un rol sin permisos es solo un nombre y un color: «Ponente», «Fundadora», «Promoción 2026».',
      baseLook:
        '{name} es el rol de base: lo que tiene cualquiera que entra. Su nombre y su sitio no cambian; lo que deja hacer, sí, en Permisos.',
      basePermissions: '{name} es lo que tiene cualquiera que entra. Los demás roles suman encima.',
      baseMembers: 'Todo el que está dentro tiene {name}. Es lo mínimo de cualquiera.',
      delete: 'Borrar el rol',
      groups: {
        organization: 'La organización',
        people: 'Gente',
        gatherings: 'Encuentros',
        venues: 'Sedes',
        money: 'Dinero',
      },
      labels: {
        'create-rituals': 'Publicar encuentros',
        'manage-rituals': 'Gestionar encuentros',
      },
      descriptions: {
        administrator: 'Todo lo de esta lista. Lo de titulares, no. Dalo con cuidado.',
        'manage-organization':
          'Ficha, portada, enlaces, visibilidad, cómo se entra y cómo se llama cada cosa.',
        'view-organization-log': 'Quién hizo qué y cuándo dentro de la organización.',
        'manage-roles': 'Crear, ordenar y dar roles, siempre por debajo del suyo más alto.',
        'invite-members': 'Añadir gente a la organización por su cartera.',
        'remove-members': 'Sacar a alguien de la organización. Puede volver.',
        'ban-members': 'Sacar a alguien y que no pueda volver.',
        'mute-members': 'Callar a alguien un rato en la sede.',
        'create-rituals': 'Crear encuentros y cambiar los suyos.',
        'manage-rituals': 'Cambiar, mover o cancelar cualquier encuentro.',
        'enter-worlds': 'Cuando la sede es solo para miembros.',
        'build-in-worlds': 'Colocar y mover cosas dentro del mundo 3D.',
        'start-stop-worlds': 'Gasta saldo: encendida, cuesta cada día.',
        'create-worlds': 'Crear mundos con el saldo de la organización.',
        'view-balance': 'Cuánto queda, en qué se gasta y las facturas.',
        'top-up': 'Pagar recargas para la organización.',
        'manage-balance': 'Cambiar los datos de facturación.',
      },
      ownersOnly: 'Solo titulares · no se puede dar',
      ownerActs: {
        'delete-world': 'Borrar un mundo.',
        'see-world-code': 'Ver o cambiar el código de un mundo.',
        'download-world': 'Descargar un mundo.',
        'close-organization': 'Cerrar la organización.',
        'hand-over-organization': 'Pasar la organización a otra persona.',
        'manage-owners': 'Nombrar o quitar a otras personas titulares.',
        'set-house-access': 'Dejar entrar a la casa (después de la alfa).',
      },
      byAdmin: 'Lo da Administrador',
      notHeld: 'No lo tienes: no puedes darlo ni quitarlo.',
      savePermissions: 'Guardar los permisos',
      undo: 'Deshacer los cambios',
      readOnly:
        'Solo puedes mirar: cambiar los roles pide el permiso «{act}», que tienen las personas titulares y estos roles: {holders}.',
      readOnlyOwners:
        'Solo puedes mirar: cambiar los roles pide el permiso «{act}», que solo tienen las personas titulares.',
      giveTo: 'Persona a la que dar el rol',
      add: 'Añadir',
    },
  },
  en: {
    members: {
      search: 'Search by wallet or name',
      count: { one: '{n} member', other: '{n} members' },
      none: 'Nobody matches “{q}”.',
      add: 'Add member',
      addLabel: 'The person’s wallet (0x…)',
      addSave: 'Add',
      addBad: 'A wallet is 0x and 40 characters: 0 to 9 and a to f.',
      columns: {
        person: 'Person',
        rank: city('en').rank,
        roles: 'Roles',
        since: 'Since',
        actions: 'Actions',
      },
      ranks: city('en').ranks,
      rankUnknown: 'Rank unknown: the city did not say it just now.',
      loadingRanks: 'Reading the ranks…',
      menu: 'Actions for {who}',
      giveMore: 'Give {who} a role',
      remove: 'Remove from the organization',
      leave: 'Leave the organization',
      removeConfirm:
        'Remove {who} from the organization? They can come back if someone adds their wallet again.',
      leaveConfirm:
        'Leave the organization? To come back, someone will have to add your wallet again.',
      removeYes: 'Yes, remove',
      leaveYes: 'Yes, leave',
      copy: 'Copy the wallet',
      copied: 'Wallet copied.',
      copyFailed: 'It could not be copied. The wallet is {wallet}.',
    },
    roles: {
      owners: 'Owners',
      ownersNote: 'Not a role: they can do everything.',
      listLabel: 'Roles, from the top down',
      people: { one: '{n} person', other: '{n} people' },
      create: 'Create role',
      freshName: 'New role',
      rule: 'Nobody touches a role at their own height or above, nor gives a permission they do not have.',
      tabsLabel: 'Parts of the role',
      tabs: { look: 'Look', permissions: 'Permissions', members: 'Members · {n}' },
      swatches: {
        '#c0392b': 'Red',
        '#d98324': 'Orange',
        '#c9a227': 'Ochre',
        '#3d8b5f': 'Green',
        '#2f7fa8': 'Blue',
        '#6b5ca5': 'Violet',
        '#a8477a': 'Pink',
      },
      apartLine:
        'Whoever holds it shows in a group of its own in the organization’s list of people.',
      hintTitle: 'A title, no powers',
      hint: 'A role without permissions is just a name and a colour: “Speaker”, “Founder”, “Class of 2026”.',
      baseLook:
        '{name} is the base role: what anyone who comes in has. Its name and its place do not change; what it allows does, in Permissions.',
      basePermissions: '{name} is what anyone who comes in has. The other roles add on top.',
      baseMembers: 'Everyone inside has {name}. It is the least anyone has.',
      delete: 'Delete the role',
      groups: {
        organization: 'The organization',
        people: 'People',
        gatherings: 'Gatherings',
        venues: 'Homes',
        money: 'Money',
      },
      labels: {
        'create-rituals': 'Publish gatherings',
        'manage-rituals': 'Manage gatherings',
      },
      descriptions: {
        administrator: 'Everything on this list. Not what the owners do. Give it with care.',
        'manage-organization':
          'Profile, cover, links, visibility, how people join and what each thing is called.',
        'view-organization-log': 'Who did what, and when, inside the organization.',
        'manage-roles': 'Create, order and give roles, always below their own highest one.',
        'invite-members': 'Add people to the organization by their wallet.',
        'remove-members': 'Take someone out of the organization. They can come back.',
        'ban-members': 'Take someone out so that they cannot come back.',
        'mute-members': 'Silence someone for a while in the home.',
        'create-rituals': 'Create gatherings and change their own.',
        'manage-rituals': 'Change, move or cancel any gathering.',
        'enter-worlds': 'When the home is for members only.',
        'build-in-worlds': 'Place and move things inside the 3D world.',
        'start-stop-worlds': 'It spends balance: switched on, it costs every day.',
        'create-worlds': 'Create worlds with the organization’s balance.',
        'view-balance': 'How much is left, what it is spent on, and the invoices.',
        'top-up': 'Pay top-ups for the organization.',
        'manage-balance': 'Change the billing details.',
      },
      ownersOnly: 'Owners only · cannot be given',
      ownerActs: {
        'delete-world': 'Delete a world.',
        'see-world-code': 'See or change a world’s code.',
        'download-world': 'Download a world.',
        'close-organization': 'Close the organization.',
        'hand-over-organization': 'Hand the organization over to someone else.',
        'manage-owners': 'Name or remove other owners.',
        'set-house-access': 'Let the house in (after the alpha).',
      },
      byAdmin: 'Given by Administrator',
      notHeld: 'You do not hold it, so you cannot give it or take it.',
      savePermissions: 'Save the permissions',
      undo: 'Undo the changes',
      readOnly:
        'You can only look: changing roles needs the “{act}” permission, which the owners have, and these roles: {holders}.',
      readOnlyOwners:
        'You can only look: changing roles needs the “{act}” permission, which only the owners have.',
      giveTo: 'Person to give the role to',
      add: 'Add',
    },
  },
  ja: {
    members: {
      search: 'ウォレットか名前で検索',
      count: { one: 'メンバー{n}人', other: 'メンバー{n}人' },
      none: '「{q}」に一致する人はいません。',
      add: 'メンバーを追加',
      addLabel: 'その人のウォレット（0x…）',
      addSave: '追加',
      addBad: 'ウォレットは0xと40文字（0〜9とa〜f）です。',
      columns: {
        person: 'ユーザー',
        rank: city('ja').rank,
        roles: 'ロール',
        since: '参加',
        actions: '操作',
      },
      ranks: city('ja').ranks,
      rankUnknown: 'ランク不明：いまは街から答えがありません。',
      loadingRanks: 'ランクを読み込み中…',
      menu: '{who} の操作',
      giveMore: '{who} にロールを付与',
      remove: '組織から外す',
      leave: '組織から抜ける',
      removeConfirm: '{who} を組織から外しますか？誰かがもう一度ウォレットを追加すれば戻れます。',
      leaveConfirm:
        '組織から抜けますか？戻るには、誰かがあなたのウォレットをもう一度追加する必要があります。',
      removeYes: '外す',
      leaveYes: '抜ける',
      copy: 'ウォレットをコピー',
      copied: 'ウォレットをコピーしました。',
      copyFailed: 'コピーできませんでした。ウォレットは {wallet} です。',
    },
    roles: {
      owners: 'オーナー',
      ownersNote: 'ロールではありません。すべてを行えます。',
      listLabel: 'ロール（上から順に）',
      people: { one: '{n}人', other: '{n}人' },
      create: 'ロールを作成',
      freshName: '新しいロール',
      rule: '自分と同じ高さ以上のロールには誰も手を出せず、自分が持たない権限を与えることもできません。',
      tabsLabel: 'ロールの項目',
      tabs: { look: '見た目', permissions: '権限', members: 'メンバー · {n}' },
      swatches: {
        '#c0392b': '赤',
        '#d98324': 'オレンジ',
        '#c9a227': '黄土色',
        '#3d8b5f': '緑',
        '#2f7fa8': '青',
        '#6b5ca5': '紫',
        '#a8477a': 'ピンク',
      },
      apartLine: 'このロールを持つ人は、組織のメンバー一覧で独自のグループとして表示されます。',
      hintTitle: '権限のない肩書き',
      hint: '権限のないロールは、名前と色だけのものです：「登壇者」「創設者」「2026年度生」。',
      baseLook:
        '{name} は基本のロールです。参加した人なら誰でも持っています。名前と位置は変わりませんが、できることは「権限」で変えられます。',
      basePermissions:
        '{name} は参加した人なら誰でも持っているものです。ほかのロールはその上に加わります。',
      baseMembers: '参加している人は全員 {name} を持っています。誰にとっても最低限のものです。',
      delete: 'ロールを削除',
      groups: {
        organization: '組織',
        people: 'メンバー',
        gatherings: '集まり',
        venues: '拠点',
        money: 'お金',
      },
      labels: {
        'create-rituals': '集まりの公開',
        'manage-rituals': '集まりの管理',
      },
      descriptions: {
        administrator: 'この一覧のすべて。オーナーだけの操作は含みません。慎重に付与してください。',
        'manage-organization': 'プロフィール、カバー、リンク、公開範囲、参加方法、各項目の呼び名。',
        'view-organization-log': '組織の中で、誰がいつ何をしたか。',
        'manage-roles': 'ロールの作成・並べ替え・付与。常に自分の最上位のロールより下で。',
        'invite-members': 'ウォレットで人を組織に追加する。',
        'remove-members': '誰かを組織から外す。その人はまた戻れます。',
        'ban-members': '誰かを外し、戻れないようにする。',
        'mute-members': '拠点で誰かをしばらく黙らせる。',
        'create-rituals': '集まりを作り、自分の集まりを変更する。',
        'manage-rituals': 'どの集まりでも変更・移動・中止する。',
        'enter-worlds': '拠点がメンバー限定のとき。',
        'build-in-worlds': '3Dの世界の中で物を置いたり動かしたりする。',
        'start-stop-worlds': '残高を使います。オンの間は毎日費用がかかります。',
        'create-worlds': '組織の残高で世界を作る。',
        'view-balance': '残りの金額、使い道、請求書。',
        'top-up': '組織のためにチャージを支払う。',
        'manage-balance': '請求先の情報を変更する。',
      },
      ownersOnly: 'オーナーのみ · 付与できません',
      ownerActs: {
        'delete-world': '世界を削除する。',
        'see-world-code': '世界のコードを見る・変更する。',
        'download-world': '世界をダウンロードする。',
        'close-organization': '組織を閉じる。',
        'hand-over-organization': '組織を別の人に引き継ぐ。',
        'manage-owners': 'ほかのオーナーを任命する・外す。',
        'set-house-access': '運営の立ち入りを許可する（アルファ後）。',
      },
      byAdmin: '管理者により付与',
      notHeld: 'この権限を持っていないため、付与も解除もできません。',
      savePermissions: '権限を保存',
      undo: '変更を元に戻す',
      readOnly:
        '閲覧のみです。ロールを変更するには「{act}」の権限が必要です。持っているのはオーナーと次のロールです：{holders}。',
      readOnlyOwners:
        '閲覧のみです。ロールを変更するには「{act}」の権限が必要で、持っているのはオーナーだけです。',
      giveTo: 'ロールを付与する人',
      add: '追加',
    },
  },
  ko: {
    members: {
      search: '지갑 또는 이름으로 검색',
      count: { one: '구성원 {n}명', other: '구성원 {n}명' },
      none: '“{q}”와(과) 일치하는 사람이 없습니다.',
      add: '구성원 추가',
      addLabel: '그 사람의 지갑 (0x…)',
      addSave: '추가',
      addBad: '지갑은 0x와 40자(0~9, a~f)입니다.',
      columns: {
        person: '사람',
        rank: city('ko').rank,
        roles: '역할',
        since: '가입',
        actions: '작업',
      },
      ranks: city('ko').ranks,
      rankUnknown: '등급을 알 수 없음: 지금은 도시가 답하지 않았습니다.',
      loadingRanks: '등급을 불러오는 중…',
      menu: '{who} 작업',
      giveMore: '{who}에게 역할 주기',
      remove: '조직에서 내보내기',
      leave: '조직에서 나가기',
      removeConfirm:
        '{who}을(를) 조직에서 내보낼까요? 누군가 지갑을 다시 추가하면 돌아올 수 있습니다.',
      leaveConfirm: '조직에서 나갈까요? 돌아오려면 누군가 당신의 지갑을 다시 추가해야 합니다.',
      removeYes: '네, 내보내기',
      leaveYes: '네, 나가기',
      copy: '지갑 복사',
      copied: '지갑을 복사했습니다.',
      copyFailed: '복사하지 못했습니다. 지갑은 {wallet}입니다.',
    },
    roles: {
      owners: '소유자',
      ownersNote: '역할이 아닙니다: 모든 것을 할 수 있습니다.',
      listLabel: '역할 (위에서부터)',
      people: { one: '{n}명', other: '{n}명' },
      create: '역할 만들기',
      freshName: '새 역할',
      rule: '누구도 자기와 같은 높이 이상의 역할은 건드릴 수 없고, 자기에게 없는 권한은 줄 수 없습니다.',
      tabsLabel: '역할 항목',
      tabs: { look: '모양', permissions: '권한', members: '구성원 · {n}' },
      swatches: {
        '#c0392b': '빨강',
        '#d98324': '주황',
        '#c9a227': '황토',
        '#3d8b5f': '초록',
        '#2f7fa8': '파랑',
        '#6b5ca5': '보라',
        '#a8477a': '분홍',
      },
      apartLine: '이 역할을 가진 사람은 조직의 사람 목록에서 따로 묶여 표시됩니다.',
      hintTitle: '권한 없는 직함',
      hint: '권한이 없는 역할은 이름과 색일 뿐입니다: “발표자”, “창립자”, “2026년 기수”.',
      baseLook:
        '{name}은(는) 기본 역할입니다: 들어온 사람이라면 누구나 가집니다. 이름과 위치는 바뀌지 않지만, 허용하는 것은 ‘권한’에서 바꿀 수 있습니다.',
      basePermissions:
        '{name}은(는) 들어온 사람이라면 누구나 가지는 것입니다. 다른 역할은 그 위에 더해집니다.',
      baseMembers: '안에 있는 사람은 모두 {name}을(를) 가집니다. 누구에게나 최소한의 것입니다.',
      delete: '역할 삭제',
      groups: {
        organization: '조직',
        people: '사람',
        gatherings: '모임',
        venues: '거점',
        money: '돈',
      },
      labels: {
        'create-rituals': '모임 게시',
        'manage-rituals': '모임 관리',
      },
      descriptions: {
        administrator: '이 목록의 모든 것. 소유자만 하는 일은 빼고요. 신중하게 주세요.',
        'manage-organization': '프로필, 커버, 링크, 공개 범위, 들어오는 방법, 각 항목의 이름.',
        'view-organization-log': '조직 안에서 누가 언제 무엇을 했는지.',
        'manage-roles': '역할을 만들고 정렬하고 줍니다. 언제나 자신의 가장 높은 역할보다 아래에서.',
        'invite-members': '지갑으로 사람을 조직에 추가합니다.',
        'remove-members': '누군가를 조직에서 내보냅니다. 다시 돌아올 수 있습니다.',
        'ban-members': '누군가를 내보내고 다시 돌아올 수 없게 합니다.',
        'mute-members': '거점에서 누군가를 잠시 조용히 시킵니다.',
        'create-rituals': '모임을 만들고 자신의 모임을 바꿉니다.',
        'manage-rituals': '어떤 모임이든 바꾸거나 옮기거나 취소합니다.',
        'enter-worlds': '거점이 구성원 전용일 때.',
        'build-in-worlds': '3D 세계 안에 물건을 놓고 옮깁니다.',
        'start-stop-worlds': '잔액을 씁니다: 켜 두면 매일 비용이 듭니다.',
        'create-worlds': '조직의 잔액으로 세계를 만듭니다.',
        'view-balance': '얼마나 남았는지, 어디에 쓰였는지, 그리고 청구서.',
        'top-up': '조직을 위해 충전 금액을 결제합니다.',
        'manage-balance': '청구 정보를 바꿉니다.',
      },
      ownersOnly: '소유자 전용 · 줄 수 없음',
      ownerActs: {
        'delete-world': '세계를 삭제합니다.',
        'see-world-code': '세계의 코드를 보거나 바꿉니다.',
        'download-world': '세계를 다운로드합니다.',
        'close-organization': '조직을 닫습니다.',
        'hand-over-organization': '조직을 다른 사람에게 넘깁니다.',
        'manage-owners': '다른 소유자를 지정하거나 내보냅니다.',
        'set-house-access': '운영진의 출입을 허용합니다(알파 이후).',
      },
      byAdmin: '관리자가 부여함',
      notHeld: '이 권한이 없어서 주거나 거둘 수 없습니다.',
      savePermissions: '권한 저장',
      undo: '변경 취소',
      readOnly:
        '보기만 할 수 있습니다: 역할을 바꾸려면 “{act}” 권한이 필요하며, 소유자와 다음 역할이 가지고 있습니다: {holders}.',
      readOnlyOwners:
        '보기만 할 수 있습니다: 역할을 바꾸려면 “{act}” 권한이 필요하며, 소유자만 가지고 있습니다.',
      giveTo: '역할을 줄 사람',
      add: '추가',
    },
  },
  'pt-br': {
    members: {
      search: 'Buscar por carteira ou nome',
      count: { one: '{n} membro', other: '{n} membros' },
      none: 'Ninguém corresponde a “{q}”.',
      add: 'Adicionar membro',
      addLabel: 'Carteira da pessoa (0x…)',
      addSave: 'Adicionar',
      addBad: 'Uma carteira é 0x e 40 caracteres: de 0 a 9 e de a a f.',
      columns: {
        person: 'Pessoa',
        rank: city('pt-br').rank,
        roles: 'Papéis',
        since: 'Desde',
        actions: 'Ações',
      },
      ranks: city('pt-br').ranks,
      rankUnknown: 'Posto desconhecido: a cidade não o disse agora.',
      loadingRanks: 'Lendo os postos…',
      menu: 'Ações para {who}',
      giveMore: 'Dar um papel a {who}',
      remove: 'Tirar da organização',
      leave: 'Sair da organização',
      removeConfirm:
        'Tirar {who} da organização? A pessoa pode voltar se alguém adicionar a carteira dela de novo.',
      leaveConfirm:
        'Sair da organização? Para voltar, alguém terá de adicionar sua carteira de novo.',
      removeYes: 'Sim, tirar',
      leaveYes: 'Sim, sair',
      copy: 'Copiar a carteira',
      copied: 'Carteira copiada.',
      copyFailed: 'Não foi possível copiar. A carteira é {wallet}.',
    },
    roles: {
      owners: 'Titulares',
      ownersNote: 'Não é um papel: podem tudo.',
      listLabel: 'Papéis, de cima para baixo',
      people: { one: '{n} pessoa', other: '{n} pessoas' },
      create: 'Criar papel',
      freshName: 'Papel novo',
      rule: 'Ninguém mexe num papel da sua altura ou acima, nem dá uma permissão que não tem.',
      tabsLabel: 'Partes do papel',
      tabs: { look: 'Aparência', permissions: 'Permissões', members: 'Membros · {n}' },
      swatches: {
        '#c0392b': 'Vermelho',
        '#d98324': 'Laranja',
        '#c9a227': 'Ocre',
        '#3d8b5f': 'Verde',
        '#2f7fa8': 'Azul',
        '#6b5ca5': 'Violeta',
        '#a8477a': 'Rosa',
      },
      apartLine: 'Quem o tem aparece num grupo próprio na lista de pessoas da organização.',
      hintTitle: 'Um título, sem poderes',
      hint: 'Um papel sem permissões é só um nome e uma cor: “Palestrante”, “Fundadora”, “Turma de 2026”.',
      baseLook:
        '{name} é o papel de base: o que tem qualquer pessoa que entra. O nome e o lugar não mudam; o que ele permite, sim, em Permissões.',
      basePermissions:
        '{name} é o que tem qualquer pessoa que entra. Os outros papéis somam por cima.',
      baseMembers: 'Todo mundo que está dentro tem {name}. É o mínimo de qualquer pessoa.',
      delete: 'Apagar o papel',
      groups: {
        organization: 'A organização',
        people: 'Pessoas',
        gatherings: 'Encontros',
        venues: 'Sedes',
        money: 'Dinheiro',
      },
      labels: {
        'create-rituals': 'Publicar encontros',
        'manage-rituals': 'Gerenciar encontros',
      },
      descriptions: {
        administrator: 'Tudo desta lista. O que é dos titulares, não. Dê com cuidado.',
        'manage-organization':
          'Ficha, capa, links, visibilidade, como se entra e como se chama cada coisa.',
        'view-organization-log': 'Quem fez o quê e quando dentro da organização.',
        'manage-roles': 'Criar, ordenar e dar papéis, sempre abaixo do seu mais alto.',
        'invite-members': 'Adicionar gente à organização pela carteira.',
        'remove-members': 'Tirar alguém da organização. A pessoa pode voltar.',
        'ban-members': 'Tirar alguém e impedir que volte.',
        'mute-members': 'Silenciar alguém por um tempo na sede.',
        'create-rituals': 'Criar encontros e mudar os seus.',
        'manage-rituals': 'Mudar, mover ou cancelar qualquer encontro.',
        'enter-worlds': 'Quando a sede é só para membros.',
        'build-in-worlds': 'Colocar e mover coisas dentro do mundo 3D.',
        'start-stop-worlds': 'Gasta saldo: ligada, custa todo dia.',
        'create-worlds': 'Criar mundos com o saldo da organização.',
        'view-balance': 'Quanto resta, no que se gasta e as faturas.',
        'top-up': 'Pagar recargas para a organização.',
        'manage-balance': 'Mudar os dados de faturamento.',
      },
      ownersOnly: 'Só titulares · não se pode dar',
      ownerActs: {
        'delete-world': 'Apagar um mundo.',
        'see-world-code': 'Ver ou mudar o código de um mundo.',
        'download-world': 'Baixar um mundo.',
        'close-organization': 'Fechar a organização.',
        'hand-over-organization': 'Passar a organização para outra pessoa.',
        'manage-owners': 'Nomear ou tirar outros titulares.',
        'set-house-access': 'Deixar a casa entrar (depois do alfa).',
      },
      byAdmin: 'Dado por Administrador',
      notHeld: 'Você não tem esta permissão, então não pode dá-la nem tirá-la.',
      savePermissions: 'Salvar as permissões',
      undo: 'Desfazer as mudanças',
      readOnly:
        'Você só pode olhar: mudar os papéis pede a permissão “{act}”, que os titulares têm, e estes papéis: {holders}.',
      readOnlyOwners:
        'Você só pode olhar: mudar os papéis pede a permissão “{act}”, que só os titulares têm.',
      giveTo: 'Pessoa a quem dar o papel',
      add: 'Adicionar',
    },
  },
};
