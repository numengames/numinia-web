/**
 * «El panel»'s words (/panel/), five locales: the organization's panel the
 * account menu opens — its rail of pieces, the organization's switcher, what
 * you are in it, and the sentences for a person who is out, who is in no
 * organization yet or whom the till did not answer. Plain Spanish first.
 *
 * The words the site already says elsewhere are taken from where they live,
 * so they can never drift: Saldo's terms win («organización», «Miembros y
 * roles», «Titular», the till's refusals) and the LAP's give the rooms of the
 * Oracle and the «En construcción» mark. Only what is new is written here.
 * «piezas» are the panel's pieces (the prototype's word), not objects.
 *
 * Read on the server only: the page hands the island the one locale it
 * needs, so a client chunk never carries the five (or Saldo's, or the LAP's).
 */

import type { SupportedLocale } from '@numinia/domain';
import type { BuiltPiece, OrgPiece, RoomPiece, SoonPiece } from '../lib/panel';
import { LAP_UI } from './lap';
import { SALDO_UI } from './saldo';

export interface PanelMessages {
  /** The rail's landmark. */
  readonly railLabel: string;
  /** Above the list of pieces: «Piezas · 9». */
  readonly piecesLabel: string;
  /** Above the Oracle's rooms. */
  readonly roomsLabel: string;
  /** The LAP's «En construcción» mark, on the pieces still to be built. */
  readonly building: string;
  /** Beside the organization's name at the top of the rail: «Panel de». */
  readonly switcher: string;
  readonly loading: string;
  readonly signedOut: { readonly title: string; readonly text: string; readonly cta: string };
  /** In no organization yet: the sentence and the way to Saldo, where one is created. */
  readonly none: { readonly text: string; readonly cta: string };
  /** The till is not bound, did not answer, or the person asks again (Saldo's words). */
  readonly desk: { readonly notBound: string; readonly failed: string; readonly retry: string };
  /** What each piece is called, in the rail, on its card and above its screen. */
  readonly names: Readonly<Record<OrgPiece, string>>;
  /** What a screen that exists says under its title (and on its card). */
  readonly leads: Readonly<Record<BuiltPiece, string>>;
  /** What a piece still to be built will do, on its card. */
  readonly notes: Readonly<Record<SoonPiece, string>>;
  /** The Oracle's rooms, as the LAP calls them. */
  readonly rooms: Readonly<Record<RoomPiece, { readonly name: string; readonly note: string }>>;
  /** «Tu lugar aquí»: what the person is in the organization and the roles held in it. */
  readonly standing: {
    readonly label: string;
    readonly as: { readonly owner: string; readonly house: string; readonly member: string };
    readonly says: { readonly owner: string; readonly house: string; readonly member: string };
    readonly roles: string;
    readonly noRoles: string;
  };
}

/** The LAP's and Saldo's own words for one locale, ready to be reused here. */
function shared(locale: SupportedLocale) {
  const lap = LAP_UI[locale];
  const saldo = SALDO_UI[locale];
  return {
    building: lap.building.label,
    desk: { notBound: saldo.notBound, failed: saldo.failed, retry: saldo.retry },
    rooms: {
      census: { name: lap.census.title, note: lap.census.intro },
      worlds: { name: lap.worlds.title, note: lap.worlds.intro },
      prices: { name: lap.prices.title, note: lap.prices.intro },
      assets: { name: lap.admin.assets, note: lap.admin.assetsIntro },
    },
    members: { name: saldo.panel.title, lead: saldo.panel.lead },
    standing: {
      owner: saldo.panel.owner,
      member: saldo.roles.member,
      ownerSays: saldo.panel.ownerStrip,
      houseSays: saldo.panel.house,
      noRoles: saldo.panel.noRolesYet,
    },
    summary: lap.sections.overview,
  } as const;
}

export const PANEL_UI: Readonly<Record<SupportedLocale, PanelMessages>> = {
  es: {
    railLabel: 'Piezas de la organización',
    piecesLabel: 'Piezas',
    roomsLabel: 'Salas del Oráculo',
    building: shared('es').building,
    switcher: 'Panel de',
    loading: 'Leyendo tus organizaciones…',
    signedOut: {
      title: 'Entra para ver el panel de tu organización',
      text: 'El panel de cada organización de la que formas parte va con tu cuenta. Inicia sesión y lo verás aquí.',
      cta: 'Iniciar sesión',
    },
    none: {
      text: 'Todavía no estás en ninguna organización. Crea una desde Saldo y aquí tendrás su panel.',
      cta: 'Ir a Saldo',
    },
    desk: shared('es').desk,
    names: {
      summary: shared('es').summary,
      venues: 'Sedes',
      gatherings: 'Encuentros',
      members: shared('es').members.name,
      agents: 'Agentes',
      memory: 'Memoria · la Summa',
      bazaar: 'Objetos del Bazar',
      balance: 'Saldo y consumo',
      settings: 'Ajustes',
    },
    leads: {
      summary: 'Lo que hay en el panel de esta organización, de un vistazo.',
      members: shared('es').members.lead,
      balance:
        'El saldo de la organización: no caduca, se recarga cuando haga falta y se ve en qué se gasta.',
    },
    notes: {
      venues: 'Su mundo 3D: encenderlo, apagarlo y ver quién entra.',
      gatherings: 'Publicar, mover y cerrar encuentros; quién va y su crónica.',
      agents: 'Los agentes de la organización: qué hacen y quién los cuida.',
      memory: 'El archivo de la organización: sus ficheros, en su repositorio.',
      bazaar: 'Los objetos que la organización sube al Bazar.',
      settings: 'Qué piezas enciende la organización y cómo se llama cada cosa.',
    },
    rooms: shared('es').rooms,
    standing: {
      label: 'Tu lugar aquí',
      as: {
        owner: shared('es').standing.owner,
        house: 'La casa',
        member: shared('es').standing.member,
      },
      says: {
        owner: shared('es').standing.ownerSays,
        house: shared('es').standing.houseSays,
        member: 'Eres miembro de esta organización: ves y haces lo que tus roles te dejan.',
      },
      roles: 'Tus roles',
      noRoles: shared('es').standing.noRoles,
    },
  },
  en: {
    railLabel: 'Organization pieces',
    piecesLabel: 'Pieces',
    roomsLabel: "The Oracle's rooms",
    building: shared('en').building,
    switcher: 'Panel for',
    loading: 'Reading your organizations…',
    signedOut: {
      title: "Sign in to see your organization's panel",
      text: 'The panel of each organization you belong to travels with your account. Sign in and you will see it here.',
      cta: 'Sign in',
    },
    none: {
      text: 'You are not in any organization yet. Create one from Balance and its panel will be here.',
      cta: 'Go to Balance',
    },
    desk: shared('en').desk,
    names: {
      summary: shared('en').summary,
      venues: 'Homes',
      gatherings: 'Gatherings',
      members: shared('en').members.name,
      agents: 'Agents',
      memory: 'Memory · the Summa',
      bazaar: 'Bazaar items',
      balance: 'Balance and usage',
      settings: 'Settings',
    },
    leads: {
      summary: "What is in this organization's panel, at a glance.",
      members: shared('en').members.lead,
      balance:
        "The organization's balance: it never expires, you top up when needed and see what it is spent on.",
    },
    notes: {
      venues: 'Its 3D world: switch it on or off and see who comes in.',
      gatherings: 'Publish, move and close gatherings; who is going and their chronicle.',
      agents: "The organization's agents: what they do and who looks after them.",
      memory: "The organization's archive: its files, in its own repository.",
      bazaar: 'The items the organization puts in the Bazaar.',
      settings: 'Which pieces the organization switches on and what each thing is called.',
    },
    rooms: shared('en').rooms,
    standing: {
      label: 'Your place here',
      as: {
        owner: shared('en').standing.owner,
        house: 'The house',
        member: shared('en').standing.member,
      },
      says: {
        owner: shared('en').standing.ownerSays,
        house: shared('en').standing.houseSays,
        member: 'You are a member of this organization: you see and do what your roles let you.',
      },
      roles: 'Your roles',
      noRoles: shared('en').standing.noRoles,
    },
  },
  ja: {
    railLabel: '組織の機能',
    piecesLabel: '機能',
    roomsLabel: 'オラクルの部屋',
    building: shared('ja').building,
    switcher: 'パネル',
    loading: '組織を読み込み中…',
    signedOut: {
      title: 'ログインして組織のパネルを見る',
      text: 'あなたが所属する組織のパネルはアカウントに紐づいています。ログインするとここに表示されます。',
      cta: 'ログイン',
    },
    none: {
      text: 'まだどの組織にも入っていません。残高から組織を作ると、ここにそのパネルが表示されます。',
      cta: '残高へ',
    },
    desk: shared('ja').desk,
    names: {
      summary: shared('ja').summary,
      venues: '拠点',
      gatherings: '集まり',
      members: shared('ja').members.name,
      agents: 'エージェント',
      memory: 'メモリー · Summa',
      bazaar: 'バザールのアイテム',
      balance: '残高と利用状況',
      settings: '設定',
    },
    leads: {
      summary: 'この組織のパネルにあるものを、ひと目で。',
      members: shared('ja').members.lead,
      balance: '組織の残高：有効期限はなく、必要なときにチャージでき、使い道も確認できます。',
    },
    notes: {
      venues: '3Dの拠点：オンとオフの切り替えと、誰が入っているかの確認。',
      gatherings: '集まりの公開・日程の変更・終了、参加者とその記録。',
      agents: '組織のエージェント：何をしていて、誰が見ているか。',
      memory: '組織のアーカイブ：そのファイルを、組織自身のリポジトリで。',
      bazaar: '組織がバザールに出すアイテム。',
      settings: '組織がどの機能をオンにするか、各項目の呼び名。',
    },
    rooms: shared('ja').rooms,
    standing: {
      label: 'この組織でのあなた',
      as: {
        owner: shared('ja').standing.owner,
        house: '運営',
        member: shared('ja').standing.member,
      },
      says: {
        owner: shared('ja').standing.ownerSays,
        house: shared('ja').standing.houseSays,
        member: 'あなたはこの組織のメンバーです。ロールが許すことを見て、行うことができます。',
      },
      roles: 'あなたのロール',
      noRoles: shared('ja').standing.noRoles,
    },
  },
  ko: {
    railLabel: '조직 기능',
    piecesLabel: '기능',
    roomsLabel: '오라클의 방',
    building: shared('ko').building,
    switcher: '패널',
    loading: '조직을 불러오는 중…',
    signedOut: {
      title: '로그인하고 조직 패널 보기',
      text: '소속된 조직의 패널은 계정에 연결되어 있습니다. 로그인하면 여기에서 볼 수 있습니다.',
      cta: '로그인',
    },
    none: {
      text: '아직 속한 조직이 없습니다. 잔액에서 조직을 만들면 여기에 그 패널이 나타납니다.',
      cta: '잔액으로 이동',
    },
    desk: shared('ko').desk,
    names: {
      summary: shared('ko').summary,
      venues: '거점',
      gatherings: '모임',
      members: shared('ko').members.name,
      agents: '에이전트',
      memory: '기억 · Summa',
      bazaar: '바자르의 아이템',
      balance: '잔액과 사용량',
      settings: '설정',
    },
    leads: {
      summary: '이 조직의 패널에 있는 것을 한눈에.',
      members: shared('ko').members.lead,
      balance: '조직의 잔액: 만료되지 않으며, 필요할 때 충전하고 어디에 쓰였는지 볼 수 있습니다.',
    },
    notes: {
      venues: '3D 거점: 켜고 끄기, 그리고 누가 들어와 있는지.',
      gatherings: '모임 게시, 일정 변경, 종료, 참석자와 기록.',
      agents: '조직의 에이전트: 무엇을 하고 누가 돌보는지.',
      memory: '조직의 아카이브: 조직 자신의 저장소에 있는 파일들.',
      bazaar: '조직이 바자르에 올리는 아이템.',
      settings: '조직이 어떤 기능을 켜는지, 각 항목을 무엇이라 부르는지.',
    },
    rooms: shared('ko').rooms,
    standing: {
      label: '이 조직에서의 나',
      as: {
        owner: shared('ko').standing.owner,
        house: '운영진',
        member: shared('ko').standing.member,
      },
      says: {
        owner: shared('ko').standing.ownerSays,
        house: shared('ko').standing.houseSays,
        member: '당신은 이 조직의 구성원입니다. 역할이 허용하는 것을 보고 할 수 있습니다.',
      },
      roles: '내 역할',
      noRoles: shared('ko').standing.noRoles,
    },
  },
  'pt-br': {
    railLabel: 'Peças da organização',
    piecesLabel: 'Peças',
    roomsLabel: 'Salas do Oráculo',
    building: shared('pt-br').building,
    switcher: 'Painel de',
    loading: 'Lendo suas organizações…',
    signedOut: {
      title: 'Entre para ver o painel da sua organização',
      text: 'O painel de cada organização a que você pertence fica na sua conta. Entre e você o verá aqui.',
      cta: 'Entrar',
    },
    none: {
      text: 'Você ainda não está em nenhuma organização. Crie uma em Saldo e o painel dela estará aqui.',
      cta: 'Ir para Saldo',
    },
    desk: shared('pt-br').desk,
    names: {
      summary: shared('pt-br').summary,
      venues: 'Sedes',
      gatherings: 'Encontros',
      members: shared('pt-br').members.name,
      agents: 'Agentes',
      memory: 'Memória · a Summa',
      bazaar: 'Objetos do Bazar',
      balance: 'Saldo e uso',
      settings: 'Configurações',
    },
    leads: {
      summary: 'O que há no painel desta organização, num relance.',
      members: shared('pt-br').members.lead,
      balance:
        'O saldo da organização: não expira, você recarrega quando precisar e vê no que ele é gasto.',
    },
    notes: {
      venues: 'Seu mundo 3D: ligar, desligar e ver quem entra.',
      gatherings: 'Publicar, mover e encerrar encontros; quem vai e a crônica.',
      agents: 'Os agentes da organização: o que fazem e quem cuida deles.',
      memory: 'O arquivo da organização: seus arquivos, no seu repositório.',
      bazaar: 'Os objetos que a organização publica no Bazar.',
      settings: 'Quais peças a organização liga e como se chama cada coisa.',
    },
    rooms: shared('pt-br').rooms,
    standing: {
      label: 'O seu lugar aqui',
      as: {
        owner: shared('pt-br').standing.owner,
        house: 'A casa',
        member: shared('pt-br').standing.member,
      },
      says: {
        owner: shared('pt-br').standing.ownerSays,
        house: shared('pt-br').standing.houseSays,
        member: 'Você é membro desta organização: vê e faz o que os seus papéis permitem.',
      },
      roles: 'Seus papéis',
      noRoles: shared('pt-br').standing.noRoles,
    },
  },
};
