/**
 * /support/thanks/backer — the page a Backer's payment returns to, five
 * locales. Its rules are numinia-archive STD-044 "Every purchase ends in
 * thanks": thanks first and the good named, what happens next, where the
 * receipt is, help in one step, one way on. It proves nothing (only the
 * processor's confirmation delivers the badge) and keeps nothing: no amount,
 * no name, no email on the page or in its address.
 */

import type { SupportedLocale } from '@numinia/domain';

export interface ThanksMessages {
  readonly title: string;
  readonly description: string;
  readonly headline: string;
  readonly lead: string;
  readonly nextTitle: string;
  readonly next: readonly string[];
  readonly receiptTitle: string;
  readonly receipt: string;
  readonly helpTitle: string;
  readonly help: string;
  readonly onward: string;
  readonly back: string;
}

const EN: ThanksMessages = {
  title: 'Thank you',
  description: 'Thank you for supporting Numinia with a coffee.',
  headline: 'Thank you for the coffee',
  lead: 'You are now a Backer of Numinia. What you gave pays for the hours and the servers that keep it open for everyone.',
  nextTitle: 'What happens next',
  next: [
    'Your supporter’s badge is on its way to your citizen profile on numinia.com.',
    'If you were signed in when you paid, it reaches your account by itself. If not, sign in with the same email you paid with and it will be there.',
  ],
  receiptTitle: 'Your receipt',
  receipt:
    'The payment company, Stripe, emails you the receipt. That email is the proof of your payment.',
  helpTitle: 'If something went wrong',
  help: 'Reply to the receipt email and a person at Numen Games will answer.',
  onward: 'Go to your profile',
  back: 'Back to Numinia',
};

const ES: ThanksMessages = {
  title: 'Gracias',
  description: 'Gracias por apoyar Numinia con un café.',
  headline: 'Gracias por el café',
  lead: 'Ya eres Backer de Numinia. Lo que has dado paga las horas y los servidores que la mantienen abierta para todos.',
  nextTitle: 'Qué pasa ahora',
  next: [
    'Tu insignia de mecenas va de camino a tu ficha de ciudadano en numinia.com.',
    'Si habías entrado con tu cuenta al pagar, llega sola. Si no, entra con el mismo email con el que pagaste y estará allí.',
  ],
  receiptTitle: 'Tu recibo',
  receipt:
    'La empresa de pagos, Stripe, te envía el recibo por email. Ese email es la prueba de tu pago.',
  helpTitle: 'Si algo ha salido mal',
  help: 'Responde al email del recibo y te contestará una persona de Numen Games.',
  onward: 'Ir a tu ficha',
  back: 'Volver a Numinia',
};

const PT: ThanksMessages = {
  title: 'Obrigado',
  description: 'Obrigado por apoiar Numinia com um café.',
  headline: 'Obrigado pelo café',
  lead: 'Agora você é Backer de Numinia. O que você deu paga as horas e os servidores que a mantêm aberta para todos.',
  nextTitle: 'O que acontece agora',
  next: [
    'A sua insígnia de apoiador está a caminho da sua ficha de cidadão em numinia.com.',
    'Se você tinha entrado com a sua conta ao pagar, ela chega sozinha. Se não, entre com o mesmo email com que pagou e ela estará lá.',
  ],
  receiptTitle: 'O seu recibo',
  receipt:
    'A empresa de pagamentos, Stripe, envia o recibo por email. Esse email é a prova do seu pagamento.',
  helpTitle: 'Se algo deu errado',
  help: 'Responda ao email do recibo e uma pessoa da Numen Games vai responder.',
  onward: 'Ir para a sua ficha',
  back: 'Voltar a Numinia',
};

const JA: ThanksMessages = {
  title: 'ありがとうございます',
  description: 'コーヒー一杯で Numinia を支援してくださり、ありがとうございます。',
  headline: 'コーヒーをありがとうございます',
  lead: 'あなたは Numinia の Backer になりました。いただいた支援は、Numinia をみんなに開かれたままにする時間とサーバーに使われます。',
  nextTitle: 'このあと',
  next: [
    '支援者バッジが numinia.com のあなたの市民プロフィールに向かっています。',
    '支払い時にログインしていれば、自動で届きます。そうでなければ、支払いに使ったのと同じメールでログインすると届いています。',
  ],
  receiptTitle: '領収書',
  receipt: '決済会社 Stripe から領収書がメールで届きます。そのメールが支払いの証明です。',
  helpTitle: '問題があったとき',
  help: '領収書のメールに返信してください。Numen Games の担当者が対応します。',
  onward: 'プロフィールへ',
  back: 'Numinia に戻る',
};

const KO: ThanksMessages = {
  title: '감사합니다',
  description: '커피 한 잔으로 Numinia를 후원해 주셔서 감사합니다.',
  headline: '커피 감사합니다',
  lead: '이제 Numinia의 Backer입니다. 후원금은 Numinia를 모두에게 열어 두는 시간과 서버에 쓰입니다.',
  nextTitle: '다음 단계',
  next: [
    '후원자 배지가 numinia.com의 시민 프로필로 가고 있습니다.',
    '결제할 때 로그인해 있었다면 자동으로 도착합니다. 아니라면 결제한 이메일과 같은 이메일로 로그인하면 거기 있습니다.',
  ],
  receiptTitle: '영수증',
  receipt: '결제 회사 Stripe가 영수증을 이메일로 보냅니다. 그 이메일이 결제의 증명입니다.',
  helpTitle: '문제가 생겼다면',
  help: '영수증 이메일에 답장하시면 Numen Games 담당자가 답변드립니다.',
  onward: '프로필로 가기',
  back: 'Numinia로 돌아가기',
};

export const THANKS_UI: Readonly<Record<SupportedLocale, ThanksMessages>> = {
  en: EN,
  es: ES,
  'pt-br': PT,
  ja: JA,
  ko: KO,
};
