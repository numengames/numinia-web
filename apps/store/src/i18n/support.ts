/**
 * /back — the ways to back Numinia (patronage; moved off /support, which is
 * now the help page, Oracle 2026-10-03), five locales.
 *
 * The goods and their prices are the record in numinia-archive,
 * `operations/OPS-014-supporting-numinia-the-offer.md` (STD-033 PAY-003):
 * change a price there first, then here. Sales happen on numinia.com, never on
 * numinia.org — the archive only keeps the record.
 *
 * Payment happens on the processor's own page (PAY-005): a good is payable
 * only when it carries a payment link. Today only the Backer's one-off 5 EUR
 * has one, and it is a TEST-mode link: nothing is charged.
 */

import type { SupportedLocale } from '@numinia/domain';

/** A Stripe payment link. `test` links charge nothing (card 4242 4242 4242 4242). */
export interface PaymentLink {
  readonly href: string;
  readonly test: boolean;
}

export interface SupportGood {
  readonly id: 'backer' | 'sponsor-bronze' | 'sponsor-silver' | 'sponsor-gold';
  /** Price with VAT, in EUR. */
  readonly amount: number;
  /** Empty until the Oracle creates the link in the processor (PRO-020 step 5). */
  readonly link: PaymentLink | null;
}

export const SUPPORT_GOODS: readonly SupportGood[] = [
  {
    id: 'backer',
    amount: 5,
    link: { href: 'https://buy.stripe.com/test_fZu4gA4WU2ZG3iMgssdMI00', test: true },
  },
  { id: 'sponsor-bronze', amount: 200, link: null },
  { id: 'sponsor-silver', amount: 2000, link: null },
  { id: 'sponsor-gold', amount: 10000, link: null },
];

export interface SupportMessages {
  readonly footerLink: string;
  readonly title: string;
  readonly description: string;
  readonly lead: string;
  readonly whyTitle: string;
  readonly why: readonly string[];
  readonly backerKind: string;
  readonly backerName: string;
  readonly backerLine: string;
  readonly once: string;
  readonly pay: string;
  readonly testNote: string;
  readonly sponsorTitle: string;
  readonly sponsorLine: string;
  readonly levels: Readonly<Record<'sponsor-bronze' | 'sponsor-silver' | 'sponsor-gold', string>>;
  readonly soon: string;
  readonly monthlySoon: string;
  readonly giftTitle: string;
  readonly gift: readonly string[];
  readonly whereTitle: string;
  readonly where: string;
  readonly whereLink: string;
}

const EN: SupportMessages = {
  footerLink: 'Back Numinia',
  title: 'Back Numinia',
  description:
    'Help keep Numinia going: a coffee for 5 EUR, or sponsor it from 200 EUR. Paid on Stripe, with a gift for those who sign in.',
  lead: 'Numinia is made in the open and stays open: the archive, the chronicle and the objects are free to read and to use. If it is worth something to you, you can buy us a coffee.',
  whyTitle: 'Why we ask',
  why: [
    'A small studio makes Numinia. What you give pays for the hours and the servers that keep it going.',
    'Nothing that is open today closes for those who do not pay. What you get is thanks, not access.',
  ],
  backerKind: 'A coffee',
  backerName: 'Backer',
  backerLine: 'Support Numinia with a coffee and help it keep going.',
  once: 'once',
  pay: 'Buy a coffee',
  testNote:
    'Test mode: nothing is charged. To try it, use the card 4242 4242 4242 4242, any future date and any CVC.',
  sponsorTitle: 'Sponsors',
  sponsorLine: 'For companies and people who want to hold Numinia up in a bigger way.',
  levels: { 'sponsor-bronze': 'Bronze', 'sponsor-silver': 'Silver', 'sponsor-gold': 'Gold' },
  soon: 'Coming soon',
  monthlySoon: 'Giving every month is coming soon, for every card.',
  giftTitle: 'What you get',
  gift: [
    'Whoever pays gets a small gift inside Numinia: a supporter’s badge on their citizen profile.',
    'If you are signed in, it will reach your account. If not, you can pay without an account and claim it later by signing in with the same email. Or stay anonymous.',
  ],
  whereTitle: 'Where the money goes',
  where: 'Every euro that comes in and goes out is a line of one public account.',
  whereLink: 'Open books, on numinia.org',
};

const ES: SupportMessages = {
  footerLink: 'Apoya Numinia',
  title: 'Apoya Numinia',
  description:
    'Ayuda a que Numinia siga adelante: un café por 5 €, o patrocínalo desde 200 €. Se paga en Stripe, con un regalo para quien entra con su cuenta.',
  lead: 'Numinia se hace a la vista y sigue abierta: el archivo, la crónica y los objetos se leen y se usan gratis. Si te vale algo, puedes invitarnos a un café.',
  whyTitle: 'Por qué lo pedimos',
  why: [
    'Numinia la hace un estudio pequeño. Lo que das paga las horas y los servidores que la mantienen en pie.',
    'Nada de lo que hoy está abierto se cierra para quien no paga. Lo que recibes es un agradecimiento, no acceso.',
  ],
  backerKind: 'Un café',
  backerName: 'Backer',
  backerLine: 'Apoya Numinia con un café y ayúdala a seguir adelante.',
  once: 'una vez',
  pay: 'Invitar a un café',
  testNote:
    'Modo de prueba: no se cobra nada. Para probarlo, usa la tarjeta 4242 4242 4242 4242, cualquier fecha futura y cualquier CVC.',
  sponsorTitle: 'Patrocinadores',
  sponsorLine: 'Para empresas y personas que quieren sostener Numinia a lo grande.',
  levels: { 'sponsor-bronze': 'Bronce', 'sponsor-silver': 'Plata', 'sponsor-gold': 'Oro' },
  soon: 'Próximamente',
  monthlySoon: 'Pagar cada mes llegará pronto, en todas las tarjetas.',
  giftTitle: 'Qué te llevas',
  gift: [
    'Quien paga recibe un pequeño regalo dentro de Numinia: una insignia de mecenas en su ficha de ciudadano.',
    'Si has entrado con tu cuenta, llegará a ella. Si no, puedes pagar sin cuenta y reclamarlo después entrando con el mismo email. O quedarte en el anonimato.',
  ],
  whereTitle: 'A dónde va el dinero',
  where: 'Cada euro que entra y sale es una línea de una única cuenta pública.',
  whereLink: 'Cuentas abiertas, en numinia.org',
};

const PT: SupportMessages = {
  footerLink: 'Apoie Numinia',
  title: 'Apoie Numinia',
  description:
    'Ajude Numinia a seguir em frente: um café por 5 EUR, ou patrocine a partir de 200 EUR. Pago na Stripe, com um presente para quem entra com a sua conta.',
  lead: 'Numinia é feita às claras e continua aberta: o arquivo, a crónica e os objetos são grátis para ler e usar. Se vale algo para você, pode nos pagar um café.',
  whyTitle: 'Por que pedimos',
  why: [
    'Um estúdio pequeno faz Numinia. O que você dá paga as horas e os servidores que a mantêm de pé.',
    'Nada do que hoje é aberto se fecha para quem não paga. O que você recebe é um agradecimento, não acesso.',
  ],
  backerKind: 'Um café',
  backerName: 'Backer',
  backerLine: 'Apoie Numinia com um café e ajude-a a seguir em frente.',
  once: 'uma vez',
  pay: 'Pagar um café',
  testNote:
    'Modo de teste: nada é cobrado. Para testar, use o cartão 4242 4242 4242 4242, qualquer data futura e qualquer CVC.',
  sponsorTitle: 'Patrocinadores',
  sponsorLine: 'Para empresas e pessoas que querem sustentar Numinia em grande.',
  levels: { 'sponsor-bronze': 'Bronze', 'sponsor-silver': 'Prata', 'sponsor-gold': 'Ouro' },
  soon: 'Em breve',
  monthlySoon: 'Pagar todo mês chega em breve, em todos os cartões.',
  giftTitle: 'O que você leva',
  gift: [
    'Quem paga recebe um pequeno presente dentro de Numinia: uma insígnia de apoiador na sua ficha de cidadão.',
    'Se você entrou com a sua conta, ela chega lá. Se não, pode pagar sem conta e resgatá-la depois entrando com o mesmo email. Ou ficar anônimo.',
  ],
  whereTitle: 'Para onde vai o dinheiro',
  where: 'Cada euro que entra e sai é uma linha de uma única conta pública.',
  whereLink: 'Contas abertas, em numinia.org',
};

const JA: SupportMessages = {
  footerLink: 'Numinia を支援する',
  title: 'Numinia を支援する',
  description:
    'Numinia の継続を支えてください。コーヒー一杯 5 ユーロ、またはスポンサーとして 200 ユーロから。支払いは Stripe で、ログインした方には贈り物があります。',
  lead: 'Numinia は公開の場でつくられ、開かれたままです。アーカイブ、年代記、オブジェクトは自由に読み、使えます。価値があると思ったら、コーヒーを一杯ごちそうしてください。',
  whyTitle: 'お願いする理由',
  why: [
    'Numinia は小さなスタジオがつくっています。いただいた支援は、それを支える時間とサーバーに使われます。',
    '今開かれているものが、支払わない人に閉ざされることはありません。お返しは感謝であり、アクセス権ではありません。',
  ],
  backerKind: 'コーヒー一杯',
  backerName: 'Backer',
  backerLine: 'コーヒー一杯で Numinia を支え、続けていく力になってください。',
  once: '1回',
  pay: 'コーヒーをごちそうする',
  testNote:
    'テストモード：請求は発生しません。試すにはカード 4242 4242 4242 4242、未来の任意の日付、任意の CVC を使ってください。',
  sponsorTitle: 'スポンサー',
  sponsorLine: 'より大きく Numinia を支えたい企業や個人の方へ。',
  levels: {
    'sponsor-bronze': 'ブロンズ',
    'sponsor-silver': 'シルバー',
    'sponsor-gold': 'ゴールド',
  },
  soon: '近日公開',
  monthlySoon: '毎月の支援は、すべてのカードで近日対応します。',
  giftTitle: '受け取れるもの',
  gift: [
    '支援してくださった方には、Numinia の中で小さな贈り物があります。市民プロフィールに付く支援者バッジです。',
    'ログインしていればアカウントに届きます。ログインせずに支払い、あとで同じメールでログインして受け取ることもできます。匿名のままでも構いません。',
  ],
  whereTitle: 'お金の行き先',
  where: '出入りするすべてのユーロは、ひとつの公開帳簿の一行です。',
  whereLink: '公開帳簿（numinia.org）',
};

const KO: SupportMessages = {
  footerLink: 'Numinia 후원하기',
  title: 'Numinia 후원하기',
  description:
    'Numinia가 계속될 수 있도록 도와주세요. 커피 한 잔 5유로, 또는 200유로부터 후원. 결제는 Stripe에서, 로그인한 분께는 선물이 있습니다.',
  lead: 'Numinia는 공개적으로 만들어지고 계속 열려 있습니다. 아카이브, 연대기, 오브젝트는 무료로 읽고 쓸 수 있습니다. 가치가 있다면 커피 한 잔 사 주세요.',
  whyTitle: '요청하는 이유',
  why: [
    'Numinia는 작은 스튜디오가 만듭니다. 후원금은 Numinia를 유지하는 시간과 서버에 쓰입니다.',
    '지금 열려 있는 것은 후원하지 않는 사람에게도 닫히지 않습니다. 받는 것은 감사이지 접근 권한이 아닙니다.',
  ],
  backerKind: '커피 한 잔',
  backerName: 'Backer',
  backerLine: '커피 한 잔으로 Numinia를 응원하고 계속될 수 있게 도와주세요.',
  once: '1회',
  pay: '커피 사 주기',
  testNote:
    '테스트 모드: 요금이 청구되지 않습니다. 시험하려면 카드 4242 4242 4242 4242, 미래의 아무 날짜, 아무 CVC를 사용하세요.',
  sponsorTitle: '스폰서',
  sponsorLine: 'Numinia를 더 크게 지원하고 싶은 기업과 개인을 위해.',
  levels: { 'sponsor-bronze': '브론즈', 'sponsor-silver': '실버', 'sponsor-gold': '골드' },
  soon: '곧 제공',
  monthlySoon: '매월 후원은 모든 카드에서 곧 가능합니다.',
  giftTitle: '받는 것',
  gift: [
    '후원한 분은 Numinia 안에서 작은 선물을 받습니다. 시민 프로필의 후원자 배지입니다.',
    '로그인했다면 계정으로 전달됩니다. 로그인하지 않고 결제한 뒤, 나중에 같은 이메일로 로그인해 받을 수도 있습니다. 익명으로 남아도 됩니다.',
  ],
  whereTitle: '돈이 쓰이는 곳',
  where: '들어오고 나가는 모든 유로는 하나의 공개 장부의 한 줄입니다.',
  whereLink: '공개 장부 (numinia.org)',
};

export const SUPPORT_UI: Readonly<Record<SupportedLocale, SupportMessages>> = {
  en: EN,
  es: ES,
  'pt-br': PT,
  ja: JA,
  ko: KO,
};
