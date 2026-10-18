/**
 * «El panel»'s words (/panel/), five locales: the organization's panel the
 * account menu opens — its rail of pieces, the organization's switcher, what
 * you are in it, and the sentences for a person who is out, who is in no
 * organization yet or whom the till did not answer. Plain Spanish first.
 *
 * The words the site already says elsewhere are taken from where they live,
 * so they can never drift: Saldo's terms win («organización», «Titular»,
 * the till's refusals) and the LAP's give the rooms of the Oracle and the
 * «En construcción» mark. Only what is new is written here — and the words
 * of Miembros and Roles' own screens live in ./panel-people.ts, which only
 * those two pages carry. «piezas» are the panel's pieces (the prototype's
 * word), not objects.
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
  /** Above the list of pieces: «Piezas · 10». */
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
  /** A piece the community switched off, reached by its address: said plainly, with the way to turn it on. */
  readonly off: {
    readonly title: string;
    /** `{piece}`: the piece's name. */
    readonly text: string;
    readonly turnOn: string;
    readonly noRight: string;
    readonly failed: string;
  };
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
    off: {
      title: 'Esta pieza está apagada',
      text: '«{piece}» está apagada en esta comunidad.',
      turnOn: 'Encenderla',
      noRight: 'Quien administra la comunidad puede encenderla en Ajustes.',
      failed: 'No se ha podido encender. Inténtalo otra vez.',
    },
    names: {
      summary: shared('es').summary,
      venues: 'Sedes',
      gatherings: 'Encuentros',
      members: 'Miembros',
      gente: 'Gente',
      roles: 'Roles',
      agents: 'Agentes',
      memory: 'Memoria · la Summa',
      bazaar: 'Objetos del Bazar',
      balance: 'Saldo y consumo',
      settings: 'Ajustes',
    },
    leads: {
      gatherings:
        'Los encuentros de la comunidad: los próximos y los ya celebrados, cada uno con su página.',
      agents: 'Las IAs de la comunidad: cuáles hay, si están encendidas y en qué estado.',
      summary: 'Lo que hay en el panel de esta organización, de un vistazo.',
      venues: 'Las sedes de la organización: los mundos que la casa le ha asignado.',
      members:
        'Quién está dentro, su rango en la ciudad (es suyo, viaja con la persona) y sus roles aquí.',
      gente:
        'La gente de la organización en grupos: los Oráculos, cada rol con su propio nombre y el resto.',
      roles:
        'Cada organización crea sus roles, los ordena y decide qué puede hacer cada uno. Arriba manda más.',
      balance:
        'El saldo de la organización: no caduca, se recarga cuando haga falta y se ve en qué se gasta.',
      settings: 'Cada comunidad enciende solo las piezas que usa y decide cómo se llama cada cosa.',
    },
    notes: {
      memory: 'El archivo de la organización: sus ficheros, en su repositorio.',
      bazaar: 'Los objetos que la organización sube al Bazar.',
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
    off: {
      title: 'This piece is off',
      text: '“{piece}” is switched off in this community.',
      turnOn: 'Turn it on',
      noRight: 'Whoever manages the community can turn it on in Settings.',
      failed: 'It could not be turned on. Try again.',
    },
    names: {
      summary: shared('en').summary,
      venues: 'Homes',
      gatherings: 'Gatherings',
      members: 'Members',
      gente: 'People',
      roles: 'Roles',
      agents: 'Agents',
      memory: 'Memory · the Summa',
      bazaar: 'Bazaar items',
      balance: 'Balance and usage',
      settings: 'Settings',
    },
    leads: {
      gatherings:
        'The community’s gatherings: the coming ones and those already held, each with its page.',
      agents:
        "The community's AIs: which there are, whether they are on, and what state they are in.",
      summary: "What is in this organization's panel, at a glance.",
      venues: 'The organization’s homes: the worlds the house has assigned to it.',
      members:
        'Who is in, their rank in the city (it is theirs: it travels with the person) and their roles here.',
      gente:
        'The people of the organization in groups: the Oracles, each role under its own name, and everyone else.',
      roles:
        'Each organization makes its own roles, orders them and decides what each one may do. Higher up commands more.',
      balance:
        "The organization's balance: it never expires, you top up when needed and see what it is spent on.",
      settings:
        'Each community switches on only the pieces it uses and decides what each thing is called.',
    },
    notes: {
      memory: "The organization's archive: its files, in its own repository.",
      bazaar: 'The items the organization puts in the Bazaar.',
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
    off: {
      title: 'この機能はオフです',
      text: '「{piece}」はこのコミュニティでオフになっています。',
      turnOn: 'オンにする',
      noRight: 'コミュニティの管理者が設定でオンにできます。',
      failed: 'オンにできませんでした。もう一度お試しください。',
    },
    names: {
      summary: shared('ja').summary,
      venues: '拠点',
      gatherings: '集まり',
      members: 'メンバー',
      gente: 'ピープル',
      roles: 'ロール',
      agents: 'エージェント',
      memory: 'メモリー · Summa',
      bazaar: 'バザールのアイテム',
      balance: '残高と利用状況',
      settings: '設定',
    },
    leads: {
      gatherings: 'コミュニティの集まり：これからのものと開催済みのもの、それぞれのページへ。',
      agents: 'コミュニティのAI：どのAIがいて、オンかオフか、どんな状態か。',
      summary: 'この組織のパネルにあるものを、ひと目で。',
      venues: '組織の拠点：ハウスが組織に割り当てたワールド。',
      members:
        '誰が参加しているか、街でのランク（本人のもので、その人と一緒にどこへでも移ります）、そしてここでのロール。',
      gente:
        '組織の人々をグループ別に表示します：オラクル、組織が付けた名前の各ロール、そしてその他の人。',
      roles:
        '組織ごとにロールを作り、並べ、それぞれに何ができるかを決めます。上にあるほど権限が強くなります。',
      balance: '組織の残高：有効期限はなく、必要なときにチャージでき、使い道も確認できます。',
      settings: 'コミュニティは使う機能だけをオンにし、各項目の呼び名を決めます。',
    },
    notes: {
      memory: '組織のアーカイブ：そのファイルを、組織自身のリポジトリで。',
      bazaar: '組織がバザールに出すアイテム。',
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
    off: {
      title: '이 기능은 꺼져 있습니다',
      text: '「{piece}」은(는) 이 커뮤니티에서 꺼져 있습니다.',
      turnOn: '켜기',
      noRight: '커뮤니티 관리자가 설정에서 켤 수 있습니다.',
      failed: '켜지 못했습니다. 다시 시도해 주세요.',
    },
    names: {
      summary: shared('ko').summary,
      venues: '거점',
      gatherings: '모임',
      members: '구성원',
      gente: '사람들',
      roles: '역할',
      agents: '에이전트',
      memory: '기억 · Summa',
      bazaar: '바자르의 아이템',
      balance: '잔액과 사용량',
      settings: '설정',
    },
    leads: {
      gatherings: '커뮤니티의 모임: 다가오는 모임과 이미 열린 모임, 각각의 페이지로.',
      agents: '커뮤니티의 AI: 어떤 AI가 있고, 켜져 있는지, 어떤 상태인지.',
      summary: '이 조직의 패널에 있는 것을 한눈에.',
      venues: '조직의 거점: 하우스가 조직에 배정한 월드.',
      members:
        '누가 들어와 있는지, 도시에서의 등급(그 사람의 것이며 어디든 함께 따라갑니다), 그리고 이곳에서의 역할.',
      gente:
        '조직의 사람들을 그룹별로 보여 줍니다: 오라클, 조직이 정한 이름의 각 역할, 그리고 나머지.',
      roles:
        '조직마다 역할을 만들고, 순서를 정하고, 각 역할이 무엇을 할 수 있는지 정합니다. 위에 있을수록 권한이 큽니다.',
      balance: '조직의 잔액: 만료되지 않으며, 필요할 때 충전하고 어디에 쓰였는지 볼 수 있습니다.',
      settings: '커뮤니티는 쓰는 기능만 켜고, 각 항목을 무엇이라 부를지 정합니다.',
    },
    notes: {
      memory: '조직의 아카이브: 조직 자신의 저장소에 있는 파일들.',
      bazaar: '조직이 바자르에 올리는 아이템.',
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
    off: {
      title: 'Esta peça está desligada',
      text: '«{piece}» está desligada nesta comunidade.',
      turnOn: 'Ligar',
      noRight: 'Quem administra a comunidade pode ligá-la em Configurações.',
      failed: 'Não foi possível ligar. Tente de novo.',
    },
    names: {
      summary: shared('pt-br').summary,
      venues: 'Sedes',
      gatherings: 'Encontros',
      members: 'Membros',
      gente: 'Gente',
      roles: 'Papéis',
      agents: 'Agentes',
      memory: 'Memória · a Summa',
      bazaar: 'Objetos do Bazar',
      balance: 'Saldo e uso',
      settings: 'Configurações',
    },
    leads: {
      gatherings:
        'Os encontros da comunidade: os próximos e os já realizados, cada um com a sua página.',
      agents: 'As IAs da comunidade: quais existem, se estão ligadas e em que estado.',
      summary: 'O que há no painel desta organização, num relance.',
      venues: 'As sedes da organização: os mundos que a casa atribuiu a ela.',
      members:
        'Quem está dentro, seu posto na cidade (é da pessoa e viaja com ela) e seus papéis aqui.',
      gente:
        'As pessoas da organização em grupos: os Oráculos, cada papel com o nome que a organização lhe deu e o resto.',
      roles:
        'Cada organização cria seus papéis, os ordena e decide o que cada um pode fazer. Quanto mais acima, mais manda.',
      balance:
        'O saldo da organização: não expira, você recarrega quando precisar e vê no que ele é gasto.',
      settings: 'Cada comunidade liga só as peças que usa e decide como se chama cada coisa.',
    },
    notes: {
      memory: 'O arquivo da organização: seus arquivos, no seu repositório.',
      bazaar: 'Os objetos que a organização publica no Bazar.',
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
