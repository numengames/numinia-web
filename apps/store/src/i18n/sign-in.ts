/**
 * The words of the sign-in page's island (/lap/session/): the account once
 * you are in, the way out, and the step-by-step guide beside the wallet
 * widget. Until v0.84.0 the island spoke English in every language (D9);
 * the widget itself now gets thirdweb's own locale (`WIDGET_LOCALE`).
 *
 * Copy rule for the guide (MISSION-002): reassure, never alarm — no word
 * about payments. The one word about transactions (`walletNote`) says none
 * is asked: MetaMask's own dialog lists «send transaction requests» to every
 * site that connects, and Pablo asked whether we need it (2026-10-14). We do
 * not — the sign-in is one signature of a text, on the wallet's own network.
 */

import type { SupportedLocale } from '@numinia/domain';

export type LoginMethodId = 'google' | 'email' | 'passkey' | 'wallet';

export interface MethodCopy {
  readonly label: string;
  /** One line per step: connect, sign, done. */
  readonly steps: readonly [string, string, string];
}

export interface SignInMessages {
  readonly checking: string;
  readonly unreachable: string;
  /** With a session: who you are and what to do next. */
  readonly signedIn: string;
  readonly wallet: string;
  readonly rank: string;
  readonly continue: string;
  readonly signOut: string;
  readonly signingOut: string;
  /** The guide: its landmark, «Paso {n} de 3», and each method's three steps. */
  readonly progress: string;
  readonly step: string;
  /** Beside the wallet's steps: the permission list is MetaMask's, the same
      for every site; Numinia uses the address and one signature. */
  readonly walletNote: string;
  /** The widget's place while the terms are not accepted yet. */
  readonly doorTitle: string;
  readonly doorMethods: string;
  readonly methods: Readonly<Record<LoginMethodId, MethodCopy>>;
}

/** thirdweb's own translation of its widget, per site locale. */
export const WIDGET_LOCALE = {
  es: 'es_ES',
  en: 'en_US',
  ja: 'ja_JP',
  ko: 'ko_KR',
  'pt-br': 'pt_BR',
} as const satisfies Readonly<Record<SupportedLocale, string>>;

export const SIGN_IN_UI: Readonly<Record<SupportedLocale, SignInMessages>> = {
  es: {
    checking: 'Comprobando tu sesión…',
    unreachable: 'No hemos podido comprobar tu sesión. Vuelve a intentarlo en un momento.',
    signedIn: 'Has entrado en Numinia.',
    wallet: 'Cartera',
    rank: 'Rango',
    continue: 'Continuar',
    signOut: 'Salir',
    signingOut: 'Saliendo…',
    progress: 'Cómo vas',
    step: 'Paso {n} de 3',
    walletNote:
      'MetaMask enseña esa misma lista de permisos a cualquier web que se conecta: no se puede pedir menos. Numinia solo usa tu dirección y una firma para comprobar que es tuya; no te pide ninguna transacción.',
    doorTitle: 'La entrada',
    doorMethods:
      'Aquí aparecerán las formas de entrar: Google, tu correo, una passkey o tu cartera.',
    methods: {
      google: {
        label: 'Google',
        steps: [
          'Se abre una ventana de Google: elige tu cuenta y se cierra sola.',
          'Numinia prepara tu llave personal y te hace entrar sin más.',
          'Ya estás dentro: eres nómada de Numinia.',
        ],
      },
      email: {
        label: 'Correo',
        steps: [
          'Escribe tu correo y pulsa la flecha: te llega un código de 6 cifras.',
          'Escribe el código. Tu acceso se crea al momento, sin contraseña.',
          'Ya estás dentro: eres nómada de Numinia.',
        ],
      },
      passkey: {
        label: 'Passkey',
        steps: [
          'Tu dispositivo te pide la huella, la cara o el PIN.',
          'Tu acceso se abre y entras sin más.',
          'Ya estás dentro: eres nómada de Numinia.',
        ],
      },
      wallet: {
        label: 'Cartera',
        steps: [
          'Tu cartera pide permiso para conectarse con este sitio: acéptalo.',
          'Tu cartera te pide una firma: apruébala para confirmar que la dirección es tuya. Es todo lo que hace.',
          'Ya estás dentro: eres nómada de Numinia.',
        ],
      },
    },
  },
  en: {
    checking: 'Checking your session…',
    unreachable: 'We could not check your session. Try again in a moment.',
    signedIn: 'You are in Numinia.',
    wallet: 'Wallet',
    rank: 'Rank',
    continue: 'Continue',
    signOut: 'Sign out',
    signingOut: 'Signing out…',
    progress: 'Your progress',
    step: 'Step {n} of 3',
    walletNote:
      'MetaMask shows that same list of permissions to every site that connects: no site can ask for less. Numinia only uses your address and one signature to check it is yours; it asks for no transaction.',
    doorTitle: 'The way in',
    doorMethods: 'Your ways in will appear here: Google, your email, a passkey or your wallet.',
    methods: {
      google: {
        label: 'Google',
        steps: [
          'A Google window opens — pick your account and it closes by itself.',
          'Numinia prepares your personal key and signs you in automatically.',
          'Welcome in — you are now a Nomad of Numinia.',
        ],
      },
      email: {
        label: 'Email',
        steps: [
          'Type your email and press the arrow — a 6-digit code lands in your inbox.',
          'Enter the code. Your access is created on the spot — no password, ever.',
          'Welcome in — you are now a Nomad of Numinia.',
        ],
      },
      passkey: {
        label: 'Passkey',
        steps: [
          'Your device asks for your fingerprint, face or PIN.',
          'Your access unlocks and signs you in automatically.',
          'Welcome in — you are now a Nomad of Numinia.',
        ],
      },
      wallet: {
        label: 'Wallet',
        steps: [
          'Your wallet asks permission to connect with this site — accept to continue.',
          'Your wallet shows a signature request — approve it to confirm the address is yours. That is all it does.',
          'Welcome in — you are now a Nomad of Numinia.',
        ],
      },
    },
  },
  ja: {
    checking: 'セッションを確認しています…',
    unreachable: 'セッションを確認できませんでした。少し待ってからもう一度お試しください。',
    signedIn: 'ヌミニアに入りました。',
    wallet: 'ウォレット',
    rank: 'ランク',
    continue: '続ける',
    signOut: 'ログアウト',
    signingOut: 'ログアウトしています…',
    progress: '進み具合',
    step: 'ステップ {n} / 3',
    walletNote:
      'MetaMask は接続するすべてのサイトに同じ許可の一覧を表示します。それより少なく求めることはできません。ヌミニアが使うのは、あなたのアドレスと、それがあなたのものだと確かめる署名だけです。取引を求めることはありません。',
    doorTitle: '入口',
    doorMethods: 'ここに入り方が表示されます：Google、メール、パスキー、またはウォレット。',
    methods: {
      google: {
        label: 'Google',
        steps: [
          'Google のウィンドウが開きます。アカウントを選ぶと自動で閉じます。',
          'ヌミニアがあなた専用の鍵を用意し、自動でログインします。',
          'ようこそ。あなたはヌミニアのノマドです。',
        ],
      },
      email: {
        label: 'メール',
        steps: [
          'メールアドレスを入力して矢印を押すと、6桁のコードが届きます。',
          'コードを入力してください。パスワードなしで、その場でアクセスが作られます。',
          'ようこそ。あなたはヌミニアのノマドです。',
        ],
      },
      passkey: {
        label: 'パスキー',
        steps: [
          '端末が指紋、顔、または PIN を求めます。',
          'アクセスが開き、自動でログインします。',
          'ようこそ。あなたはヌミニアのノマドです。',
        ],
      },
      wallet: {
        label: 'ウォレット',
        steps: [
          'ウォレットがこのサイトへの接続許可を求めます。承認してください。',
          'ウォレットが署名を求めます。アドレスがあなたのものだと確かめるためだけのものです。',
          'ようこそ。あなたはヌミニアのノマドです。',
        ],
      },
    },
  },
  ko: {
    checking: '세션을 확인하는 중…',
    unreachable: '세션을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    signedIn: '누미니아에 들어왔습니다.',
    wallet: '지갑',
    rank: '등급',
    continue: '계속',
    signOut: '로그아웃',
    signingOut: '로그아웃하는 중…',
    progress: '진행 상황',
    step: '{n}/3단계',
    walletNote:
      'MetaMask는 연결하는 모든 사이트에 같은 권한 목록을 보여 줍니다. 그보다 적게 요청할 수는 없습니다. 누미니아는 주소와, 그 주소가 당신의 것임을 확인하는 서명 하나만 사용하며 거래는 요청하지 않습니다.',
    doorTitle: '입구',
    doorMethods: '여기에 들어오는 방법이 나타납니다: Google, 이메일, 패스키 또는 지갑.',
    methods: {
      google: {
        label: 'Google',
        steps: [
          'Google 창이 열립니다. 계정을 고르면 저절로 닫힙니다.',
          '누미니아가 개인 키를 준비하고 자동으로 로그인합니다.',
          '환영합니다. 이제 누미니아의 노마드입니다.',
        ],
      },
      email: {
        label: '이메일',
        steps: [
          '이메일을 입력하고 화살표를 누르면 6자리 코드가 도착합니다.',
          '코드를 입력하세요. 비밀번호 없이 바로 접속이 만들어집니다.',
          '환영합니다. 이제 누미니아의 노마드입니다.',
        ],
      },
      passkey: {
        label: '패스키',
        steps: [
          '기기가 지문, 얼굴 또는 PIN을 요청합니다.',
          '접속이 열리고 자동으로 로그인합니다.',
          '환영합니다. 이제 누미니아의 노마드입니다.',
        ],
      },
      wallet: {
        label: '지갑',
        steps: [
          '지갑이 이 사이트와 연결할 권한을 묻습니다. 수락하세요.',
          '지갑이 서명을 요청합니다. 주소가 당신의 것임을 확인할 뿐입니다.',
          '환영합니다. 이제 누미니아의 노마드입니다.',
        ],
      },
    },
  },
  'pt-br': {
    checking: 'Verificando sua sessão…',
    unreachable: 'Não conseguimos verificar sua sessão. Tente de novo em um instante.',
    signedIn: 'Você entrou em Numinia.',
    wallet: 'Carteira',
    rank: 'Posto',
    continue: 'Continuar',
    signOut: 'Sair',
    signingOut: 'Saindo…',
    progress: 'Seu progresso',
    step: 'Passo {n} de 3',
    walletNote:
      'O MetaMask mostra essa mesma lista de permissões a qualquer site que se conecta: não dá para pedir menos. Numinia só usa seu endereço e uma assinatura para confirmar que ele é seu; não pede nenhuma transação.',
    doorTitle: 'A entrada',
    doorMethods:
      'Aqui aparecem as formas de entrar: Google, seu e-mail, uma passkey ou sua carteira.',
    methods: {
      google: {
        label: 'Google',
        steps: [
          'Abre-se uma janela do Google: escolha sua conta e ela se fecha sozinha.',
          'Numinia prepara sua chave pessoal e faz você entrar sozinho.',
          'Bem-vindo: agora você é nômade de Numinia.',
        ],
      },
      email: {
        label: 'E-mail',
        steps: [
          'Digite seu e-mail e toque na seta: chega um código de 6 dígitos.',
          'Digite o código. Seu acesso é criado na hora, sem senha.',
          'Bem-vindo: agora você é nômade de Numinia.',
        ],
      },
      passkey: {
        label: 'Passkey',
        steps: [
          'Seu dispositivo pede a digital, o rosto ou o PIN.',
          'Seu acesso se abre e você entra sozinho.',
          'Bem-vindo: agora você é nômade de Numinia.',
        ],
      },
      wallet: {
        label: 'Carteira',
        steps: [
          'Sua carteira pede permissão para se conectar a este site: aceite.',
          'Sua carteira pede uma assinatura: aprove para confirmar que o endereço é seu. É só isso.',
          'Bem-vindo: agora você é nômade de Numinia.',
        ],
      },
    },
  },
};
