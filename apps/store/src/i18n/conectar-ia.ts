/**
 * «MCP remoto», story W4: the words of the «Conecta tu IA» consent page,
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
  /** «{app} quiere actuar en mundos de Numinia.» — `{app}` in bold. */
  readonly asks: string;
  /** Before the host in large type. */
  readonly returnsTo: string;
  /** Only when the host is this computer (localhost). */
  readonly loopback: string;
  /** The link is missing something, or is not one: no form at all. */
  readonly badTitle: string;
  readonly badLead: string;
  /** Signed out: why, and the door (which comes back here). */
  readonly signedOutLead: string;
  readonly signIn: string;
  /** The till is not there. */
  readonly unavailable: string;
  /** No community where the person may add an AI. */
  readonly noneTitle: string;
  readonly noneLead: string;
  /** The pickers. */
  readonly community: string;
  readonly which: string;
  readonly newAi: string;
  readonly nameLabel: string;
  /** «Volver a conectar «{name}»». */
  readonly again: string;
  readonly againNote: string;
  readonly role: string;
  readonly roleHelp: string;
  /** No role beyond the base one, for a new AI. */
  readonly roleNone: string;
  /** Reconnecting: keep the roles it has. */
  readonly roleKeep: string;
  /** What it may and may not do. */
  readonly can: string;
  /** The unchecked box: whether the AI may hear what is said nearby. */
  readonly hearLabel: string;
  readonly hearHint: string;
  readonly cannot: string;
  readonly answer: string;
  /** The buttons and what follows them. */
  readonly allow: string;
  readonly allowing: string;
  readonly cancel: string;
  readonly done: string;
  readonly cancelled: string;
  readonly refusals: Readonly<Record<ConsentRefusalKey, string>>;
}

const ES: ConectarIaMessages = {
  title: 'Conectar una IA a tus mundos',
  lead: 'Una app pide actuar en los mundos de tu comunidad. Tú eliges qué IA es y qué rol tiene.',
  asks: '{app} quiere actuar en mundos de Numinia.',
  returnsTo: 'Al terminar volverás a',
  loopback: 'Esta IA corre en un ordenador (localhost). Conéctala solo si acabas de pedirlo tú.',
  badTitle: 'Este enlace no sirve',
  badLead:
    'Le falta algo o no es un enlace para conectar una IA. Vuelve a tu IA y pide conectar otra vez.',
  signedOutLead: 'Entra en Numinia para elegir de qué comunidad es esta IA.',
  signIn: 'Entrar',
  unavailable: 'Ahora mismo no podemos conectar IAs. Inténtalo dentro de un rato.',
  noneTitle: 'No hay ninguna comunidad donde puedas añadir una IA',
  noneLead:
    'Para conectar una IA hace falta poder gestionar los roles de una comunidad. Pídeselo a quien la administre.',
  community: '¿De qué comunidad?',
  which: '¿Qué IA es?',
  newAi: 'Una nueva',
  nameLabel: 'Su nombre',
  again: 'Volver a conectar «{name}»',
  againNote: 'La conexión anterior se corta.',
  role: '¿Qué rol tiene?',
  roleHelp: 'Solo los roles que tú puedes dar.',
  roleNone: 'Ninguno: solo mira y habla',
  roleKeep: 'Los que ya tiene',
  can: 'Podrá entrar en los mundos de la comunidad, moverse, hablar y construir si su rol lo deja.',
  hearLabel: 'Que pueda oír lo que se habla cerca',
  hearHint: 'Si lo enciendes, la IA lee el chat cercano en los mundos donde esté.',
  cannot:
    'No podrá gastar saldo, encender ni apagar mundos, ver datos de personas ni cambiar roles.',
  answer:
    'Tú respondes de ella. En Panel › Agentes puedes apagarla o desconectarla cuando quieras.',
  allow: 'Permitir',
  allowing: 'Conectando…',
  cancel: 'Cancelar',
  done: 'Listo: {name} ya está conectada. Vuelve a {app} para seguir.',
  cancelled: 'No se ha conectado nada. Puedes cerrar esta pestaña.',
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
  asks: '{app} wants to act in Numinia worlds.',
  returnsTo: 'When you finish you will go back to',
  loopback: 'This AI runs on a computer (localhost). Connect it only if you just asked for this.',
  badTitle: 'This link does not work',
  badLead:
    'Something is missing, or it is not a link to connect an AI. Go back to your AI and ask to connect again.',
  signedOutLead: 'Sign in to Numinia to choose which community this AI belongs to.',
  signIn: 'Sign in',
  unavailable: 'We cannot connect AIs right now. Try again in a while.',
  noneTitle: 'There is no community where you can add an AI',
  noneLead:
    'To connect an AI you need to be able to manage a community’s roles. Ask whoever administers it.',
  community: 'Which community?',
  which: 'Which AI is it?',
  newAi: 'A new one',
  nameLabel: 'Its name',
  again: 'Reconnect «{name}»',
  againNote: 'The previous connection stops.',
  role: 'What role does it have?',
  roleHelp: 'Only the roles you can give.',
  roleNone: 'None: it only looks and talks',
  roleKeep: 'The ones it already has',
  can: 'It can enter the community’s worlds, move, talk and build if its role allows.',
  hearLabel: 'Let it hear what is said nearby',
  hearHint: 'If you turn it on, the AI reads the nearby chat in the worlds it is in.',
  cannot: 'It cannot spend balance, start or stop worlds, see people’s data or change roles.',
  answer:
    'You answer for it. You can switch it off or disconnect it in Panel › Agents at any time.',
  allow: 'Allow',
  allowing: 'Connecting…',
  cancel: 'Cancel',
  done: 'Done: {name} is connected. Go back to {app} to carry on.',
  cancelled: 'Nothing was connected. You can close this tab.',
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
  asks: '{app} がNuminiaのワールドで行動しようとしています。',
  returnsTo: '完了すると次の場所に戻ります',
  loopback:
    'このAIはパソコン上で動いています（localhost）。今あなたが依頼した場合のみ接続してください。',
  badTitle: 'このリンクは使えません',
  badLead:
    '何かが足りないか、AIを接続するためのリンクではありません。AIに戻って、もう一度接続を依頼してください。',
  signedOutLead: 'Numiniaに入って、このAIがどのコミュニティのものかを選んでください。',
  signIn: '入る',
  unavailable: '今はAIを接続できません。しばらくしてからお試しください。',
  noneTitle: 'AIを追加できるコミュニティがありません',
  noneLead:
    'AIを接続するには、コミュニティのロールを管理できる必要があります。管理者に頼んでください。',
  community: 'どのコミュニティですか？',
  which: 'どのAIですか？',
  newAi: '新しいAI',
  nameLabel: '名前',
  again: '「{name}」を再接続',
  againNote: '前の接続は切れます。',
  role: 'どの役割にしますか？',
  roleHelp: 'あなたが付けられる役割だけです。',
  roleNone: 'なし：見て話すだけ',
  roleKeep: '今の役割のまま',
  can: 'コミュニティのワールドに入り、動き、話し、役割が許せば建てることができます。',
  hearLabel: '近くの会話を聞けるようにする',
  hearHint: 'オンにすると、AIは自分がいる世界で近くのチャットを読みます。',
  cannot: '残高の使用、ワールドの起動・停止、個人データの閲覧、役割の変更はできません。',
  answer:
    'このAIの責任はあなたにあります。パネル › エージェントでいつでもオフや接続解除ができます。',
  allow: '許可する',
  allowing: '接続中…',
  cancel: 'キャンセル',
  done: '完了：{name} が接続されました。{app} に戻って続けてください。',
  cancelled: '何も接続されていません。このタブは閉じてかまいません。',
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
  asks: '{app} 이(가) Numinia 월드에서 활동하려고 합니다.',
  returnsTo: '완료하면 다음으로 돌아갑니다',
  loopback: '이 AI는 컴퓨터에서 실행됩니다(localhost). 방금 직접 요청한 경우에만 연결하세요.',
  badTitle: '이 링크는 사용할 수 없습니다',
  badLead: '무언가 빠졌거나 AI를 연결하는 링크가 아닙니다. AI로 돌아가 다시 연결을 요청하세요.',
  signedOutLead: 'Numinia에 들어가서 이 AI가 어느 커뮤니티의 것인지 고르세요.',
  signIn: '들어가기',
  unavailable: '지금은 AI를 연결할 수 없습니다. 잠시 후 다시 시도하세요.',
  noneTitle: 'AI를 추가할 수 있는 커뮤니티가 없습니다',
  noneLead: 'AI를 연결하려면 커뮤니티의 역할을 관리할 수 있어야 합니다. 관리자에게 요청하세요.',
  community: '어느 커뮤니티인가요?',
  which: '어떤 AI인가요?',
  newAi: '새 AI',
  nameLabel: '이름',
  again: '«{name}» 다시 연결',
  againNote: '이전 연결은 끊어집니다.',
  role: '어떤 역할인가요?',
  roleHelp: '내가 줄 수 있는 역할만 보입니다.',
  roleNone: '없음: 보고 말하기만',
  roleKeep: '지금 가진 역할 그대로',
  can: '커뮤니티의 월드에 들어가고, 움직이고, 말하고, 역할이 허용하면 건설할 수 있습니다.',
  hearLabel: '근처 대화를 들을 수 있게 하기',
  hearHint: '켜면 AI가 있는 세계에서 근처 채팅을 읽습니다.',
  cannot: '잔액 사용, 월드 켜기·끄기, 개인 데이터 열람, 역할 변경은 할 수 없습니다.',
  answer: '이 AI는 당신이 책임집니다. 패널 › 에이전트에서 언제든 끄거나 연결을 해제할 수 있습니다.',
  allow: '허용',
  allowing: '연결 중…',
  cancel: '취소',
  done: '완료: {name} 이(가) 연결되었습니다. {app} (으)로 돌아가 계속하세요.',
  cancelled: '아무것도 연결되지 않았습니다. 이 탭을 닫아도 됩니다.',
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
  asks: '{app} quer agir em mundos da Numinia.',
  returnsTo: 'Ao terminar, você volta para',
  loopback:
    'Esta IA roda em um computador (localhost). Conecte só se foi você que acabou de pedir.',
  badTitle: 'Este link não funciona',
  badLead:
    'Falta alguma coisa, ou não é um link para conectar uma IA. Volte à sua IA e peça para conectar de novo.',
  signedOutLead: 'Entre na Numinia para escolher de qual comunidade é esta IA.',
  signIn: 'Entrar',
  unavailable: 'Agora não conseguimos conectar IAs. Tente daqui a pouco.',
  noneTitle: 'Não há nenhuma comunidade onde você possa adicionar uma IA',
  noneLead:
    'Para conectar uma IA é preciso poder gerenciar os papéis de uma comunidade. Peça a quem a administra.',
  community: 'De qual comunidade?',
  which: 'Qual IA é?',
  newAi: 'Uma nova',
  nameLabel: 'O nome dela',
  again: 'Reconectar «{name}»',
  againNote: 'A conexão anterior é cortada.',
  role: 'Qual papel ela tem?',
  roleHelp: 'Só os papéis que você pode dar.',
  roleNone: 'Nenhum: só olha e fala',
  roleKeep: 'Os que ela já tem',
  can: 'Poderá entrar nos mundos da comunidade, se mover, falar e construir se o papel permitir.',
  hearLabel: 'Que possa ouvir o que se fala por perto',
  hearHint: 'Se você ligar, a IA lê o chat próximo nos mundos em que estiver.',
  cannot:
    'Não poderá gastar saldo, ligar ou desligar mundos, ver dados de pessoas nem mudar papéis.',
  answer:
    'Você responde por ela. Pode desligá-la ou desconectá-la em Painel › Agentes quando quiser.',
  allow: 'Permitir',
  allowing: 'Conectando…',
  cancel: 'Cancelar',
  done: 'Pronto: {name} está conectada. Volte para {app} para continuar.',
  cancelled: 'Nada foi conectado. Você pode fechar esta aba.',
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
