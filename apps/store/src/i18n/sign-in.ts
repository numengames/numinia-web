/**
 * The words of the sign-in door (/lap/session/): one centred panel over the
 * app, the way TikTok's and Airbnb's sign-in modals look (Pablo, QA video of
 * 2026-10-15: «súper limpio, súper sencillito»). Its title, its close
 * button, the short lines of each state, who you are once in, the way out,
 * and the one legal line at its foot. The widget itself gets thirdweb's own
 * locale (`WIDGET_LOCALE`).
 *
 * The legal line is the sign-in-wrap the two references use: continuing is
 * accepting (MIS-086's checkbox became this line). It is cut in five pieces
 * so the two documents can be links in every language's word order.
 *
 * Copy rule (MISSION-002): reassure, never alarm — no word about payments.
 * The one word about transactions (`walletNote`) says none is asked:
 * MetaMask's own dialog lists «send transaction requests» to every site
 * that connects, and Pablo asked whether we need it (2026-10-14). We do
 * not — the sign-in is one signature of a text, on the wallet's own network.
 */

import type { SupportedLocale } from '@numinia/domain';

/** «Al continuar, aceptas los {terms} y confirmas que has leído la {privacy}…» */
interface LegalLineCopy {
  readonly lead: string;
  readonly terms: string;
  readonly join: string;
  readonly privacy: string;
  readonly tail: string;
}

export interface SignInMessages {
  /** The panel's title: «Inicia sesión en Numinia». */
  readonly title: string;
  /** The panel's title once you are in. */
  readonly signedIn: string;
  /** The × button's accessible name. */
  readonly close: string;
  /** The words on the widget's Google button. thirdweb words a lone social
      button itself — «Continue with» in English plus its own label, which
      in Spanish is already a sentence («Continue with Iniciar sesión con
      Google») — so the door prints these instead (SessionPage.astro). */
  readonly google: string;
  readonly checking: string;
  readonly unreachable: string;
  /** While the wallet connects. */
  readonly connecting: string;
  /** Connected, the SIWE signature still pending. */
  readonly signHint: string;
  /** Beside the signature of an external wallet: its permission list is
      MetaMask's, the same for every site; Numinia asks one signature. */
  readonly walletNote: string;
  readonly wallet: string;
  readonly rank: string;
  readonly continue: string;
  readonly signOut: string;
  readonly signingOut: string;
  readonly legal: LegalLineCopy;
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
    title: 'Inicia sesión en Numinia',
    signedIn: 'Has entrado en Numinia',
    close: 'Cerrar',
    google: 'Continuar con Google',
    checking: 'Comprobando tu sesión…',
    unreachable: 'No hemos podido comprobar tu sesión. Vuelve a intentarlo en un momento.',
    connecting: 'Conectando…',
    signHint: 'Firma en tu cartera para entrar.',
    walletNote:
      'MetaMask enseña esa misma lista de permisos a cualquier web; Numinia solo te pide una firma, nunca una transacción.',
    wallet: 'Cartera',
    rank: 'Rango',
    continue: 'Continuar',
    signOut: 'Salir',
    signingOut: 'Saliendo…',
    legal: {
      lead: 'Al continuar, aceptas los ',
      terms: 'Términos',
      join: ' y confirmas que has leído la ',
      privacy: 'Política de privacidad',
      tail: ' de Numen Games.',
    },
  },
  en: {
    title: 'Sign in to Numinia',
    signedIn: 'You are in Numinia',
    close: 'Close',
    google: 'Continue with Google',
    checking: 'Checking your session…',
    unreachable: 'We could not check your session. Try again in a moment.',
    connecting: 'Connecting…',
    signHint: 'Sign in your wallet to enter.',
    walletNote:
      'MetaMask shows every site that same list of permissions; Numinia only asks you for one signature, never a transaction.',
    wallet: 'Wallet',
    rank: 'Rank',
    continue: 'Continue',
    signOut: 'Sign out',
    signingOut: 'Signing out…',
    legal: {
      lead: "By continuing, you accept Numen Games' ",
      terms: 'Terms',
      join: ' and confirm that you have read its ',
      privacy: 'Privacy Policy',
      tail: '.',
    },
  },
  ja: {
    title: 'ヌミニアにログイン',
    signedIn: 'ヌミニアに入りました',
    close: '閉じる',
    google: 'Google で続ける',
    checking: 'セッションを確認しています…',
    unreachable: 'セッションを確認できませんでした。少し待ってからもう一度お試しください。',
    connecting: '接続しています…',
    signHint: 'ウォレットで署名するとログインできます。',
    walletNote:
      'MetaMask はどのサイトにも同じ許可の一覧を表示します。ヌミニアが求めるのは署名ひとつだけで、取引は求めません。',
    wallet: 'ウォレット',
    rank: 'ランク',
    continue: '続ける',
    signOut: 'ログアウト',
    signingOut: 'ログアウトしています…',
    legal: {
      lead: '続行すると、Numen Games の',
      terms: '利用規約',
      join: 'に同意し、',
      privacy: 'プライバシーポリシー',
      tail: 'を読んだことを確認したものとみなされます。',
    },
  },
  ko: {
    title: '누미니아에 로그인',
    signedIn: '누미니아에 들어왔습니다',
    close: '닫기',
    google: 'Google로 계속하기',
    checking: '세션을 확인하는 중…',
    unreachable: '세션을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    connecting: '연결하는 중…',
    signHint: '지갑에서 서명하면 들어갈 수 있습니다.',
    walletNote:
      'MetaMask는 모든 사이트에 같은 권한 목록을 보여 줍니다. 누미니아는 서명 하나만 요청하며 거래는 요청하지 않습니다.',
    wallet: '지갑',
    rank: '등급',
    continue: '계속',
    signOut: '로그아웃',
    signingOut: '로그아웃하는 중…',
    legal: {
      lead: '계속하면 Numen Games의 ',
      terms: '이용약관',
      join: '에 동의하고 ',
      privacy: '개인정보 처리방침',
      tail: '을 읽었음을 확인하는 것으로 간주됩니다.',
    },
  },
  'pt-br': {
    title: 'Entrar em Numinia',
    signedIn: 'Você entrou em Numinia',
    close: 'Fechar',
    google: 'Continuar com o Google',
    checking: 'Verificando sua sessão…',
    unreachable: 'Não conseguimos verificar sua sessão. Tente de novo em um instante.',
    connecting: 'Conectando…',
    signHint: 'Assine na sua carteira para entrar.',
    walletNote:
      'O MetaMask mostra essa mesma lista de permissões a qualquer site; Numinia só pede uma assinatura, nunca uma transação.',
    wallet: 'Carteira',
    rank: 'Posto',
    continue: 'Continuar',
    signOut: 'Sair',
    signingOut: 'Saindo…',
    legal: {
      lead: 'Ao continuar, você aceita os ',
      terms: 'Termos',
      join: ' e confirma que leu a ',
      privacy: 'Política de privacidade',
      tail: ' da Numen Games.',
    },
  },
};
