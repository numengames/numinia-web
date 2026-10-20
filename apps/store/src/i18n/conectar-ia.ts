/**
 * «MCP remoto», story W4 (rebuilt as C5): the words of the «Conecta tu IA» consent page,
 * /conectar-ia/, in five locales (DISENO-MCP-REMOTO.md §2 (d)). Spanish is
 * the reference; ja and ko still want a native reading.
 *
 * Plain words. A community is «comunidad» on screen (the back keeps
 * «organization»). `{app}`, `{name}` and `{host}` are filled by the page.
 * Hearing nearby chat is a switch per AI, off by default (Pablo, 2026-10-20):
 * `hearLabel` and `hearHint` word the unchecked box on the consent.
 */

import type { SupportedLocale } from '@numinia/domain';

/** Every reason the POST can say no, as lib/conectar-ia-page.ts answers it. */
export type ConsentRefusalKey =
  | 'request'
  | 'client'
  | 'name'
  | 'not-token'
  | 'no-permission'
  | 'house'
  | 'limit'
  | 'role'
  | 'other-organization'
  | 'not-below'
  | 'no-such-agent'
  | 'taken'
  | 'till'
  | 'failed'
  | 'unavailable'
  | 'signed-out'
  | 'forbidden';

export interface ConectarIaMessages {
  readonly title: string;
  /** The page's description (meta). */
  readonly lead: string;
  /** The three-step progress at the top (its list's accessible name, then the steps). */
  readonly stepsLabel: string;
  readonly steps: readonly [string, string, string];
  /** «{app} quiere entrar en los mundos de tu comunidad.» — `{app}` in bold. */
  readonly asks: string;
  /** Before the host in large type. */
  readonly returnsTo: string;
  /** Only when the host is this computer (localhost). */
  readonly loopback: string;
  /** The link is missing something, or is not one: no form at all. */
  readonly badTitle: string;
  readonly badLead: string;
  /** Signed out: what this is, and the door (which comes back here). */
  readonly signedOutTitle: string;
  readonly signedOutLead: string;
  readonly signIn: string;
  /** The till is not there. */
  readonly unavailable: string;
  /** No community where the person may add an AI: why, what to do, where to go. */
  readonly noneTitle: string;
  readonly noneWhyLabel: string;
  readonly noneWhy: string;
  readonly noneDoLabel: string;
  readonly noneDo: string;
  readonly noneCommunities: string;
  readonly noneClose: string;
  /** The pickers. */
  readonly community: string;
  readonly which: string;
  readonly newAi: string;
  readonly nameLabel: string;
  readonly nameHint: string;
  /** «Volver a conectar «{name}»». */
  readonly again: string;
  readonly againNote: string;
  readonly role: string;
  readonly roleHelp: string;
  /** No role beyond the base one, for a new AI. */
  readonly roleNone: string;
  /** Reconnecting: keep the roles it has. */
  readonly roleKeep: string;
  /** What it may and may not do: two short lists. */
  readonly canTitle: string;
  readonly canItems: readonly string[];
  readonly cannotTitle: string;
  readonly cannotItems: readonly string[];
  /** The unchecked box: whether the AI may hear what is said nearby. */
  readonly hearLabel: string;
  readonly hearHint: string;
  readonly answer: string;
  /** The buttons and what follows them. */
  readonly allow: string;
  readonly allowing: string;
  readonly deny: string;
  readonly cancelled: string;
  /** «Listo»: step 3, with what was chosen. `{name}` is the AI's, in bold. */
  readonly doneTitle: string;
  readonly doneLead: string;
  readonly doneReturning: string;
  readonly doneBack: string;
  readonly sumCommunity: string;
  readonly sumRole: string;
  readonly sumHear: string;
  readonly sumReturn: string;
  readonly yes: string;
  readonly no: string;
  readonly doneNote: string;
  readonly donePanel: string;
  readonly refusals: Readonly<Record<ConsentRefusalKey, string>>;
}

const ES: ConectarIaMessages = {
  title: 'Conectar una IA a tus mundos',
  lead: 'Una app pide actuar en los mundos de tu comunidad. Tú eliges qué IA es y qué rol tiene.',
  asks: '{app} quiere entrar en los mundos de tu comunidad.',
  returnsTo: 'Al terminar volverás a',
  loopback: 'Esta IA corre en un ordenador (localhost). Conéctala solo si acabas de pedirlo tú.',
  badTitle: 'Este enlace no sirve',
  badLead:
    'Le falta algo o no es un enlace para conectar una IA. Vuelve a tu IA y pide conectar otra vez.',
  signedOutLead:
    'Necesitamos saber quién eres para que elijas la comunidad de esta IA. Al entrar volverás aquí.',
  signIn: 'Entrar',
  unavailable: 'Ahora mismo no podemos conectar IAs. Inténtalo dentro de un rato.',
  noneTitle: 'No hay ninguna comunidad donde puedas añadir una IA',
  community: '¿De qué comunidad?',
  which: '¿Qué IA es?',
  newAi: 'Una IA nueva',
  nameLabel: 'Su nombre',
  again: 'Volver a conectar «{name}»',
  againNote: 'La conexión anterior se corta.',
  role: '¿Con qué rol?',
  roleHelp: 'El rol es lo que la IA puede hacer en la comunidad. Solo ves los que tú puedes dar.',
  roleNone: 'Ninguno: solo mira y habla',
  roleKeep: 'Los que ya tiene',
  hearLabel: 'Que pueda oír lo que se habla cerca',
  hearHint:
    'Si lo enciendes, la IA lee el chat cercano en los mundos donde esté. Lo que lea llegará a la empresa de tu IA. Viene sin marcar y lo cambias cuando quieras en Panel › Agentes.',
  answer:
    'Tú respondes de ella. En Panel › Agentes puedes apagarla o desconectarla cuando quieras.',
  allow: 'Permitir',
  allowing: 'Conectando…',
  cancelled: 'No se ha conectado nada. Puedes cerrar esta pestaña.',
  stepsLabel: 'Pasos',
  steps: ['Tu IA lo pide', 'Elige comunidad y permiso', 'Vuelve a tu IA'],
  signedOutTitle: 'Entra en Numinia para seguir',
  canTitle: 'Podrá',
  canItems: [
    'Entrar en los mundos de la comunidad',
    'Moverse y hablar',
    'Construir, si su rol lo deja',
  ],
  cannotTitle: 'No podrá',
  cannotItems: [
    'Gastar saldo',
    'Encender ni apagar mundos',
    'Ver datos de personas ni cambiar roles',
    'Actuar fuera de esta comunidad',
  ],
  nameHint: 'Es el nombre que verás en el panel y en los mundos.',
  noneWhyLabel: 'Por qué:',
  noneWhy:
    'Necesitas poder gestionar roles en una comunidad, y ahora no tienes ese permiso en ninguna.',
  noneDoLabel: 'Qué hacer:',
  noneDo:
    'Pídeselo a quien la administre y, cuando te lo den, vuelve a tu IA y conéctala otra vez.',
  noneCommunities: 'Ver mis comunidades',
  noneClose: 'Cerrar',
  deny: 'No permitir',
  doneTitle: 'Listo: vuelve a tu IA',
  doneLead: '{name} ya puede entrar en tus mundos. Puedes cerrar esta pestaña.',
  doneReturning: 'Te llevamos de vuelta a tu IA…',
  doneBack: 'Volver a tu IA ahora',
  sumCommunity: 'Comunidad',
  sumRole: 'Rol',
  sumHear: 'Oír lo que se habla cerca',
  sumReturn: 'Vuelve a',
  yes: 'Sí',
  no: 'No',
  doneNote:
    'La verás en Panel › Agentes. Ahí puedes apagarla, o encender que oiga lo que se habla cerca, cuando quieras.',
  donePanel: 'Ver mis IAs en el panel',
  refusals: {
    request: 'Este enlace no sirve. Vuelve a tu IA y pide conectar otra vez.',
    client: 'Este enlace no sirve. Vuelve a tu IA y pide conectar otra vez.',
    name: 'Ponle un nombre de 1 a 40 letras.',
    'not-token': 'Esa IA se conecta con su propia clave: no se puede volver a conectar así.',
    'no-permission': 'Para conectar una IA hace falta poder gestionar los roles de la comunidad.',
    house: 'La casa no responde por una IA: la conecta una persona de la comunidad.',
    limit: 'La comunidad ya tiene todas las IAs que caben (20).',
    role: 'Ese rol no lo puedes dar tú.',
    'other-organization': 'Esa IA es de otra comunidad.',
    'not-below': 'No respondes de esa IA ni estás por encima de ella.',
    'no-such-agent': 'Esa IA ya no está en la comunidad. Recarga la página.',
    taken: 'Ya hay una IA con ese nombre. Elige volver a conectarla o pon otro nombre.',
    till: 'La comunidad no lo ha permitido. Recarga la página y vuelve a probar.',
    failed: 'Algo ha salido mal. Inténtalo de nuevo.',
    unavailable: 'Ahora mismo no podemos conectar IAs. Inténtalo dentro de un rato.',
    'signed-out': 'Tu sesión ha terminado. Vuelve a entrar.',
    forbidden: 'Esta petición no viene de esta página. Recárgala y vuelve a probar.',
  },
};

const EN: ConectarIaMessages = {
  title: 'Connect an AI to your worlds',
  lead: 'An app asks to act in your community’s worlds. You choose which AI it is and what role it has.',
  asks: '{app} wants to enter your community’s worlds.',
  returnsTo: 'When you finish you will go back to',
  loopback: 'This AI runs on a computer (localhost). Connect it only if you just asked for this.',
  badTitle: 'This link does not work',
  badLead:
    'Something is missing, or it is not a link to connect an AI. Go back to your AI and ask to connect again.',
  signedOutLead:
    'We need to know who you are so you can pick this AI’s community. When you sign in you will come back here.',
  signIn: 'Sign in',
  unavailable: 'We cannot connect AIs right now. Try again in a while.',
  noneTitle: 'There is no community where you can add an AI',
  community: 'Which community?',
  which: 'Which AI is it?',
  newAi: 'A new AI',
  nameLabel: 'Its name',
  again: 'Reconnect «{name}»',
  againNote: 'The previous connection stops.',
  role: 'Which role does it get?',
  roleHelp: 'The role is what the AI can do in the community. You only see the ones you can give.',
  roleNone: 'None: it only looks and talks',
  roleKeep: 'The ones it already has',
  hearLabel: 'Let it hear what is said nearby',
  hearHint:
    'If you turn it on, the AI reads the nearby chat in the worlds it is in. What it reads reaches the company behind your AI. It starts off, and you can change it any time in Panel › Agents.',
  answer:
    'You answer for it. You can switch it off or disconnect it in Panel › Agents at any time.',
  allow: 'Allow',
  allowing: 'Connecting…',
  cancelled: 'Nothing was connected. You can close this tab.',
  stepsLabel: 'Steps',
  steps: ['Your AI asks', 'Pick a community and permission', 'Back to your AI'],
  signedOutTitle: 'Sign in to Numinia to carry on',
  canTitle: 'It can',
  canItems: ['Enter the community’s worlds', 'Move and talk', 'Build, if its role allows'],
  cannotTitle: 'It cannot',
  cannotItems: [
    'Spend balance',
    'Start or stop worlds',
    'See people’s data or change roles',
    'Act outside this community',
  ],
  nameHint: 'This is the name you will see in the panel and in the worlds.',
  noneWhyLabel: 'Why:',
  noneWhy:
    'You need to be able to manage roles in a community, and right now you cannot in any of them.',
  noneDoLabel: 'What to do:',
  noneDo:
    'Ask whoever administers it and, once they give you that, go back to your AI and connect it again.',
  noneCommunities: 'See my communities',
  noneClose: 'Close',
  deny: 'Don’t allow',
  doneTitle: 'Done: go back to your AI',
  doneLead: '{name} can now enter your worlds. You can close this tab.',
  doneReturning: 'Taking you back to your AI…',
  doneBack: 'Go back to your AI now',
  sumCommunity: 'Community',
  sumRole: 'Role',
  sumHear: 'Hear what is said nearby',
  sumReturn: 'Goes back to',
  yes: 'Yes',
  no: 'No',
  doneNote:
    'You will find it in Panel › Agents. There you can switch it off, or turn on hearing nearby chat, whenever you like.',
  donePanel: 'See my AIs in the panel',
  refusals: {
    request: 'This link does not work. Go back to your AI and ask to connect again.',
    client: 'This link does not work. Go back to your AI and ask to connect again.',
    name: 'Give it a name of 1 to 40 letters.',
    'not-token': 'That AI connects with its own key: it cannot be reconnected this way.',
    'no-permission': 'To connect an AI you need to be able to manage the community’s roles.',
    house: 'The house does not answer for an AI: a person of the community connects it.',
    limit: 'The community already has all the AIs it can hold (20).',
    role: 'That role is not one you can give.',
    'other-organization': 'That AI belongs to another community.',
    'not-below': 'You do not answer for that AI and you do not stand above it.',
    'no-such-agent': 'That AI is no longer in the community. Reload the page.',
    taken: 'There is already an AI with that name. Choose to reconnect it or pick another name.',
    till: 'The community did not allow it. Reload the page and try again.',
    failed: 'Something went wrong. Try again.',
    unavailable: 'We cannot connect AIs right now. Try again in a while.',
    'signed-out': 'Your session has ended. Sign in again.',
    forbidden: 'This request does not come from this page. Reload it and try again.',
  },
};

const JA: ConectarIaMessages = {
  title: 'AIをあなたのワールドに接続',
  lead: 'アプリがあなたのコミュニティのワールドで行動しようとしています。どのAIか、どの役割かはあなたが選びます。',
  asks: '{app} があなたのコミュニティのワールドに入ろうとしています。',
  returnsTo: '完了すると次の場所に戻ります',
  loopback:
    'このAIはパソコン上で動いています（localhost）。今あなたが依頼した場合のみ接続してください。',
  badTitle: 'このリンクは使えません',
  badLead:
    '何かが足りないか、AIを接続するためのリンクではありません。AIに戻って、もう一度接続を依頼してください。',
  signedOutLead:
    'このAIがどのコミュニティのものかを選べるように、あなたが誰かを知る必要があります。入ると、ここに戻ります。',
  signIn: '入る',
  unavailable: '今はAIを接続できません。しばらくしてからお試しください。',
  noneTitle: 'AIを追加できるコミュニティがありません',
  community: 'どのコミュニティですか？',
  which: 'どのAIですか？',
  newAi: '新しいAI',
  nameLabel: '名前',
  again: '「{name}」を再接続',
  againNote: '前の接続は切れます。',
  role: 'どの役割にしますか？',
  roleHelp: '役割は、AIがコミュニティでできることです。あなたが付けられる役割だけが表示されます。',
  roleNone: 'なし：見て話すだけ',
  roleKeep: '今の役割のまま',
  hearLabel: '近くの会話を聞けるようにする',
  hearHint:
    'オンにすると、AIは自分がいるワールドで近くのチャットを読みます。読んだ内容はあなたのAIの会社に届きます。初期設定はオフで、パネル › エージェントでいつでも変えられます。',
  answer:
    'このAIの責任はあなたにあります。パネル › エージェントでいつでもオフや接続解除ができます。',
  allow: '許可する',
  allowing: '接続中…',
  cancelled: '何も接続されていません。このタブは閉じてかまいません。',
  stepsLabel: 'ステップ',
  steps: ['AIが依頼', 'コミュニティと許可を選ぶ', 'AIに戻る'],
  signedOutTitle: '続けるにはNuminiaに入ってください',
  canTitle: 'できること',
  canItems: ['コミュニティのワールドに入る', '動いて話す', '役割が許せば建てる'],
  cannotTitle: 'できないこと',
  cannotItems: [
    '残高を使う',
    'ワールドの起動・停止',
    '個人データの閲覧や役割の変更',
    'このコミュニティの外で動く',
  ],
  nameHint: 'パネルとワールドで表示される名前です。',
  noneWhyLabel: '理由：',
  noneWhy:
    'コミュニティのロールを管理できる必要がありますが、今はどのコミュニティでもその権限がありません。',
  noneDoLabel: 'すること：',
  noneDo: '管理者に頼んでください。権限をもらったらAIに戻って、もう一度接続してください。',
  noneCommunities: '自分のコミュニティを見る',
  noneClose: '閉じる',
  deny: '許可しない',
  doneTitle: '完了：AIに戻ってください',
  doneLead: '{name} はもうあなたのワールドに入れます。このタブは閉じてかまいません。',
  doneReturning: 'AIに戻っています…',
  doneBack: '今すぐAIに戻る',
  sumCommunity: 'コミュニティ',
  sumRole: '役割',
  sumHear: '近くの会話を聞く',
  sumReturn: '戻り先',
  yes: 'はい',
  no: 'いいえ',
  doneNote:
    'パネル › エージェントで確認できます。そこでいつでもオフにしたり、近くの会話を聞けるようにしたりできます。',
  donePanel: 'パネルで自分のAIを見る',
  refusals: {
    request: 'このリンクは使えません。AIに戻って、もう一度接続を依頼してください。',
    client: 'このリンクは使えません。AIに戻って、もう一度接続を依頼してください。',
    name: '1〜40文字の名前を付けてください。',
    'not-token': 'このAIは自分のキーで接続します。この方法では再接続できません。',
    'no-permission': 'AIを接続するには、コミュニティのロールを管理できる必要があります。',
    house: 'ハウスはAIの責任者になれません。コミュニティの人が接続します。',
    limit: 'コミュニティはすでに上限（20）までAIを抱えています。',
    role: 'その役割はあなたには付けられません。',
    'other-organization': 'このAIは別のコミュニティのものです。',
    'not-below': 'あなたはこのAIの責任者ではなく、その上の立場でもありません。',
    'no-such-agent': 'このAIはもうコミュニティにいません。ページを読み込み直してください。',
    taken: '同じ名前のAIがすでにいます。再接続を選ぶか、別の名前にしてください。',
    till: 'コミュニティが許可しませんでした。ページを読み込み直して、もう一度お試しください。',
    failed: '問題が起きました。もう一度お試しください。',
    unavailable: '今はAIを接続できません。しばらくしてからお試しください。',
    'signed-out': 'セッションが終了しました。もう一度入ってください。',
    forbidden: 'この依頼はこのページから来ていません。読み込み直して、もう一度お試しください。',
  },
};

const KO: ConectarIaMessages = {
  title: 'AI를 내 월드에 연결',
  lead: '앱이 내 커뮤니티의 월드에서 활동하려고 합니다. 어떤 AI인지, 어떤 역할인지는 내가 정합니다.',
  asks: '{app} 이(가) 내 커뮤니티의 월드에 들어가려고 합니다.',
  returnsTo: '완료하면 다음으로 돌아갑니다',
  loopback: '이 AI는 컴퓨터에서 실행됩니다(localhost). 방금 직접 요청한 경우에만 연결하세요.',
  badTitle: '이 링크는 사용할 수 없습니다',
  badLead: '무언가 빠졌거나 AI를 연결하는 링크가 아닙니다. AI로 돌아가 다시 연결을 요청하세요.',
  signedOutLead:
    '이 AI가 어느 커뮤니티의 것인지 고를 수 있도록 누구인지 알아야 합니다. 들어가면 여기로 돌아옵니다.',
  signIn: '들어가기',
  unavailable: '지금은 AI를 연결할 수 없습니다. 잠시 후 다시 시도하세요.',
  noneTitle: 'AI를 추가할 수 있는 커뮤니티가 없습니다',
  community: '어느 커뮤니티인가요?',
  which: '어떤 AI인가요?',
  newAi: '새 AI',
  nameLabel: '이름',
  again: '«{name}» 다시 연결',
  againNote: '이전 연결은 끊어집니다.',
  role: '어떤 역할로 할까요?',
  roleHelp: '역할은 AI가 커뮤니티에서 할 수 있는 일입니다. 내가 줄 수 있는 역할만 보입니다.',
  roleNone: '없음: 보고 말하기만',
  roleKeep: '지금 가진 역할 그대로',
  hearLabel: '근처 대화를 들을 수 있게 하기',
  hearHint:
    '켜면 AI가 있는 월드에서 근처 채팅을 읽습니다. 읽은 내용은 내 AI를 만든 회사에 전달됩니다. 기본은 꺼짐이며, 패널 › 에이전트에서 언제든 바꿀 수 있습니다.',
  answer: '이 AI는 당신이 책임집니다. 패널 › 에이전트에서 언제든 끄거나 연결을 해제할 수 있습니다.',
  allow: '허용',
  allowing: '연결 중…',
  cancelled: '아무것도 연결되지 않았습니다. 이 탭을 닫아도 됩니다.',
  stepsLabel: '단계',
  steps: ['AI가 요청', '커뮤니티와 권한 고르기', 'AI로 돌아가기'],
  signedOutTitle: '계속하려면 Numinia에 들어가세요',
  canTitle: '할 수 있는 일',
  canItems: ['커뮤니티의 월드에 들어가기', '움직이고 말하기', '역할이 허용하면 건설하기'],
  cannotTitle: '할 수 없는 일',
  cannotItems: [
    '잔액 쓰기',
    '월드 켜기·끄기',
    '개인 데이터 보기, 역할 바꾸기',
    '이 커뮤니티 밖에서 활동하기',
  ],
  nameHint: '패널과 월드에서 보이는 이름입니다.',
  noneWhyLabel: '이유:',
  noneWhy:
    '커뮤니티의 역할을 관리할 수 있어야 하는데, 지금은 어느 커뮤니티에서도 그 권한이 없습니다.',
  noneDoLabel: '할 일:',
  noneDo: '관리자에게 요청하세요. 권한을 받으면 AI로 돌아가 다시 연결하세요.',
  noneCommunities: '내 커뮤니티 보기',
  noneClose: '닫기',
  deny: '허용 안 함',
  doneTitle: '완료: AI로 돌아가세요',
  doneLead: '{name} 이(가) 이제 내 월드에 들어갈 수 있습니다. 이 탭을 닫아도 됩니다.',
  doneReturning: 'AI로 돌아가는 중…',
  doneBack: '지금 AI로 돌아가기',
  sumCommunity: '커뮤니티',
  sumRole: '역할',
  sumHear: '근처 대화 듣기',
  sumReturn: '돌아갈 곳',
  yes: '예',
  no: '아니요',
  doneNote:
    '패널 › 에이전트에서 볼 수 있습니다. 거기서 언제든 끄거나 근처 대화를 듣게 켤 수 있습니다.',
  donePanel: '패널에서 내 AI 보기',
  refusals: {
    request: '이 링크는 사용할 수 없습니다. AI로 돌아가 다시 연결을 요청하세요.',
    client: '이 링크는 사용할 수 없습니다. AI로 돌아가 다시 연결을 요청하세요.',
    name: '1~40자의 이름을 지어 주세요.',
    'not-token': '이 AI는 자체 키로 연결됩니다. 이 방법으로는 다시 연결할 수 없습니다.',
    'no-permission': 'AI를 연결하려면 커뮤니티의 역할을 관리할 수 있어야 합니다.',
    house: '하우스는 AI의 책임자가 될 수 없습니다. 커뮤니티의 사람이 연결합니다.',
    limit: '커뮤니티가 담을 수 있는 AI(20)를 모두 채웠습니다.',
    role: '그 역할은 내가 줄 수 없습니다.',
    'other-organization': '이 AI는 다른 커뮤니티의 것입니다.',
    'not-below': '이 AI의 책임자가 아니고, 그보다 위에 있지도 않습니다.',
    'no-such-agent': '이 AI는 이제 커뮤니티에 없습니다. 페이지를 다시 불러오세요.',
    taken: '같은 이름의 AI가 이미 있습니다. 다시 연결을 고르거나 다른 이름을 쓰세요.',
    till: '커뮤니티가 허용하지 않았습니다. 페이지를 다시 불러와 다시 시도하세요.',
    failed: '문제가 생겼습니다. 다시 시도하세요.',
    unavailable: '지금은 AI를 연결할 수 없습니다. 잠시 후 다시 시도하세요.',
    'signed-out': '세션이 끝났습니다. 다시 들어가세요.',
    forbidden: '이 요청은 이 페이지에서 온 것이 아닙니다. 다시 불러와 다시 시도하세요.',
  },
};

const PT_BR: ConectarIaMessages = {
  title: 'Conectar uma IA aos seus mundos',
  lead: 'Um app pede para agir nos mundos da sua comunidade. Você escolhe qual IA é e qual papel ela tem.',
  asks: '{app} quer entrar nos mundos da sua comunidade.',
  returnsTo: 'Ao terminar, você volta para',
  loopback:
    'Esta IA roda em um computador (localhost). Conecte só se foi você que acabou de pedir.',
  badTitle: 'Este link não funciona',
  badLead:
    'Falta alguma coisa, ou não é um link para conectar uma IA. Volte à sua IA e peça para conectar de novo.',
  signedOutLead:
    'Precisamos saber quem você é para você escolher a comunidade desta IA. Ao entrar, você volta aqui.',
  signIn: 'Entrar',
  unavailable: 'Agora não conseguimos conectar IAs. Tente daqui a pouco.',
  noneTitle: 'Não há nenhuma comunidade onde você possa adicionar uma IA',
  community: 'De qual comunidade?',
  which: 'Qual IA é?',
  newAi: 'Uma IA nova',
  nameLabel: 'O nome dela',
  again: 'Reconectar «{name}»',
  againNote: 'A conexão anterior é cortada.',
  role: 'Com qual papel?',
  roleHelp: 'O papel é o que a IA pode fazer na comunidade. Você só vê os que pode dar.',
  roleNone: 'Nenhum: só olha e fala',
  roleKeep: 'Os que ela já tem',
  hearLabel: 'Que possa ouvir o que se fala por perto',
  hearHint:
    'Se você ligar, a IA lê o chat próximo nos mundos em que estiver. O que ela ler chega à empresa da sua IA. Vem desligado e você muda quando quiser em Painel › Agentes.',
  answer:
    'Você responde por ela. Pode desligá-la ou desconectá-la em Painel › Agentes quando quiser.',
  allow: 'Permitir',
  allowing: 'Conectando…',
  cancelled: 'Nada foi conectado. Você pode fechar esta aba.',
  stepsLabel: 'Passos',
  steps: ['Sua IA pede', 'Escolha comunidade e permissão', 'Volte à sua IA'],
  signedOutTitle: 'Entre na Numinia para continuar',
  canTitle: 'Poderá',
  canItems: [
    'Entrar nos mundos da comunidade',
    'Se mover e falar',
    'Construir, se o papel permitir',
  ],
  cannotTitle: 'Não poderá',
  cannotItems: [
    'Gastar saldo',
    'Ligar nem desligar mundos',
    'Ver dados de pessoas nem mudar papéis',
    'Agir fora desta comunidade',
  ],
  nameHint: 'É o nome que você verá no painel e nos mundos.',
  noneWhyLabel: 'Por quê:',
  noneWhy:
    'Você precisa poder gerenciar papéis em uma comunidade, e agora não tem essa permissão em nenhuma.',
  noneDoLabel: 'O que fazer:',
  noneDo:
    'Peça a quem a administra e, quando você receber a permissão, volte à sua IA e conecte-a de novo.',
  noneCommunities: 'Ver minhas comunidades',
  noneClose: 'Fechar',
  deny: 'Não permitir',
  doneTitle: 'Pronto: volte à sua IA',
  doneLead: '{name} já pode entrar nos seus mundos. Você pode fechar esta aba.',
  doneReturning: 'Estamos levando você de volta à sua IA…',
  doneBack: 'Voltar à sua IA agora',
  sumCommunity: 'Comunidade',
  sumRole: 'Papel',
  sumHear: 'Ouvir o que se fala por perto',
  sumReturn: 'Volta para',
  yes: 'Sim',
  no: 'Não',
  doneNote:
    'Você a verá em Painel › Agentes. Lá você pode desligá-la, ou ligar para ela ouvir o que se fala por perto, quando quiser.',
  donePanel: 'Ver minhas IAs no painel',
  refusals: {
    request: 'Este link não funciona. Volte à sua IA e peça para conectar de novo.',
    client: 'Este link não funciona. Volte à sua IA e peça para conectar de novo.',
    name: 'Dê a ela um nome de 1 a 40 letras.',
    'not-token': 'Essa IA se conecta com a própria chave: não dá para reconectá-la assim.',
    'no-permission': 'Para conectar uma IA é preciso poder gerenciar os papéis da comunidade.',
    house: 'A casa não responde por uma IA: quem conecta é uma pessoa da comunidade.',
    limit: 'A comunidade já tem todas as IAs que cabem (20).',
    role: 'Esse papel não é um que você possa dar.',
    'other-organization': 'Essa IA é de outra comunidade.',
    'not-below': 'Você não responde por essa IA nem está acima dela.',
    'no-such-agent': 'Essa IA não está mais na comunidade. Recarregue a página.',
    taken: 'Já existe uma IA com esse nome. Escolha reconectá-la ou dê outro nome.',
    till: 'A comunidade não permitiu. Recarregue a página e tente de novo.',
    failed: 'Algo deu errado. Tente de novo.',
    unavailable: 'Agora não conseguimos conectar IAs. Tente daqui a pouco.',
    'signed-out': 'Sua sessão terminou. Entre de novo.',
    forbidden: 'Este pedido não vem desta página. Recarregue e tente de novo.',
  },
};

export const CONECTAR_IA_UI: Readonly<Record<SupportedLocale, ConectarIaMessages>> = {
  es: ES,
  en: EN,
  ja: JA,
  ko: KO,
  'pt-br': PT_BR,
};
