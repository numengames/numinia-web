/**
 * Settings + Session strings (MISSION-010), five locales. What the platform
 * can honestly offer today: appearance, language, sidebar, the session, what
 * your rank grants, and where your data lives. Nothing promised that isn't
 * built.
 */

import type { SupportedLocale } from '@numinia/domain';

export interface SettingsMessages {
  readonly title: string;
  readonly intro: string;
  readonly appearance: string;
  readonly mode: string;
  readonly modeDiurno: string;
  readonly modeNocturno: string;
  readonly motion: string;
  readonly motionNote: string;
  readonly language: string;
  readonly languageNote: string;
  readonly sidebar: string;
  readonly sidebarNote: string;
  readonly session: string;
  readonly signedOut: string;
  readonly signedIn: string;
  readonly rank: string;
  readonly address: string;
  readonly signIn: string;
  readonly signOut: string;
  readonly permissions: string;
  readonly permissionsNote: string;
  readonly granted: string;
  readonly locked: string;
  readonly data: string;
  readonly dataNote: string;
  readonly about: string;
  readonly version: string;
  readonly designSystem: string;
  readonly sourceData: string;
  /** The sign-in door's meta description (SessionPage.astro). */
  readonly sessionIntro: string;
  /**
   * The five parts of personal settings (wireframe v3, «Tus ajustes»): the
   * side navigation's label and each part's name, in the design's words.
   * Notices and balance live on their own pages today: their part says so
   * and links there (MIS-268, first story: anchors only, no logic moved).
   */
  readonly parts: {
    readonly nav: string;
    readonly account: string;
    readonly notices: string;
    readonly look: string;
    readonly balance: string;
    readonly data: string;
  };
  readonly noticesNote: string;
  readonly noticesLink: string;
  readonly balanceNote: string;
  readonly balanceLink: string;
}

export const SETTINGS_UI: Readonly<Record<SupportedLocale, SettingsMessages>> = {
  es: {
    title: 'Ajustes',
    intro:
      'Cómo se ve, en qué idioma habla y qué guarda esta plataforma. Todo vive en tu navegador, salvo el nombre que decidas mostrar.',
    appearance: 'Apariencia',
    mode: 'Modo',
    modeDiurno: 'Diurno',
    modeNocturno: 'Nocturno',
    motion: 'Movimiento',
    motionNote:
      'Las animaciones siguen la preferencia de tu sistema: si pides menos movimiento, todo aparece al instante.',
    language: 'Idioma',
    languageNote:
      'El idioma cambia la dirección de la página; el lore profundo vive en español e inglés.',
    sidebar: 'Secciones del panel',
    sidebarNote: 'Oculta lo que no uses. Tu elección se queda en este navegador.',
    session: 'Sesión',
    signedOut: 'Estás recorriendo Numinia sin sesión. Al entrar serás nómada.',
    signedIn: 'Sesión verificada.',
    rank: 'Rango',
    address: 'Dirección',
    signIn: 'Entrar en Numinia',
    signOut: 'Cerrar sesión',
    permissions: 'Lo que permite tu rango',
    permissionsNote: 'Los rangos son acumulativos: cada uno conserva todo lo anterior.',
    granted: 'Disponible',
    locked: 'Aún no',
    data: 'Tus datos',
    dataNote:
      'No guardamos tu ficha ni tu actividad en ningún servidor: tu ficha es un archivo tuyo y tus preferencias viven en este navegador. Solo si tú lo publicas, guardamos tu nombre y tu avatar para tus organizaciones («Tu nombre en la ciudad», más arriba), hasta que dejes de mostrarlo.',
    about: 'Acerca de',
    version: 'Versión',
    designSystem: 'Sistema de diseño',
    sourceData: 'Repositorio de datos',
    sessionIntro:
      'Entra con lo que ya tienes: una cuenta de Google, tu correo, una passkey o tu propia cartera.',
    parts: {
      nav: 'Tus ajustes',
      account: 'Cuenta',
      notices: 'Avisos',
      look: 'Aspecto e idioma',
      balance: 'Saldo y consumo',
      data: 'Tus datos',
    },
    noticesNote: 'Lo que te ha llegado, con su punto en la campana, está en Avisos.',
    noticesLink: 'Ir a Avisos',
    balanceNote: 'Tu saldo, las recargas y lo que gasta cada cosa están en Tu saldo.',
    balanceLink: 'Ir a Tu saldo',
  },
  en: {
    title: 'Settings',
    intro:
      'How this platform looks, which language it speaks, and what it keeps. Everything lives in your browser, except the name you choose to show.',
    appearance: 'Appearance',
    mode: 'Mode',
    modeDiurno: 'Diurno',
    modeNocturno: 'Nocturno',
    motion: 'Motion',
    motionNote:
      'Animations follow your system preference: ask for less motion and everything appears instantly.',
    language: 'Language',
    languageNote: 'Language changes the whole site; deep lore lives in Spanish and English.',
    sidebar: 'Panel sections',
    sidebarNote: 'Hide what you do not use. Your choice stays in this browser.',
    session: 'Session',
    signedOut: 'You are walking Numinia with no session. Signing in makes you a Nomad.',
    signedIn: 'Session verified.',
    rank: 'Rank',
    address: 'Address',
    signIn: 'Enter Numinia',
    signOut: 'Sign out',
    permissions: 'What your rank allows',
    permissionsNote: 'Ranks are cumulative: each one keeps everything below it.',
    granted: 'Available',
    locked: 'Not yet',
    data: 'Your data',
    dataNote:
      'We keep neither your sheet nor your activity on any server: your sheet is a file you own and your preferences live in this browser. Only if you publish them do we keep your name and avatar for your organizations («Your name in the city», above), until you stop showing them.',
    about: 'About',
    version: 'Version',
    designSystem: 'Design system',
    sourceData: 'Data repository',
    sessionIntro:
      'Enter with what you already have: a Google account, your email, a passkey, or your own wallet.',
    parts: {
      nav: 'Your settings',
      account: 'Account',
      notices: 'Notices',
      look: 'Appearance and language',
      balance: 'Balance and usage',
      data: 'Your data',
    },
    noticesNote: 'What has reached you, with its dot on the bell, is in Notices.',
    noticesLink: 'Go to Notices',
    balanceNote: 'Your balance, top-ups and what each thing spends are in Your balance.',
    balanceLink: 'Go to Your balance',
  },
  ja: {
    title: '設定',
    intro:
      'このプラットフォームの見え方、言語、保存するもの。表示すると決めた名前を除き、すべてブラウザの中にあります。',
    appearance: '外観',
    mode: 'モード',
    modeDiurno: 'ディウルノ(昼)',
    modeNocturno: 'ノクターノ(夜)',
    motion: 'モーション',
    motionNote:
      'アニメーションはシステム設定に従います。動きを減らす設定なら、すべて即座に表示されます。',
    language: '言語',
    languageNote: '言語はサイト全体に適用されます。深いロアはスペイン語と英語で提供されます。',
    sidebar: 'パネルのセクション',
    sidebarNote: '使わないものは隠せます。設定はこのブラウザに残ります。',
    session: 'セッション',
    signedOut: 'セッションなしでヌミニアを歩いています。ログインするとノマドになります。',
    signedIn: 'セッションを確認しました。',
    rank: 'ランク',
    address: 'アドレス',
    signIn: 'ヌミニアに入る',
    signOut: 'サインアウト',
    permissions: 'あなたのランクでできること',
    permissionsNote: 'ランクは累積します。下位のものはすべて保持されます。',
    granted: '利用可能',
    locked: 'まだ',
    data: 'あなたのデータ',
    dataNote:
      'シートも行動履歴もサーバーには保存しません。シートはあなたのファイルであり、設定はこのブラウザにあります。あなたが公開した場合に限り、名前とアバターを組織のために保存します（上の「まちでのあなたの名前」）。表示をやめるまで保存されます。',
    about: '情報',
    version: 'バージョン',
    designSystem: 'デザインシステム',
    sourceData: 'データリポジトリ',
    sessionIntro:
      'すでにお持ちのもので入れます:Googleアカウント、メール、パスキー、またはご自身のウォレット。',
    parts: {
      nav: 'あなたの設定',
      account: 'アカウント',
      notices: 'お知らせ',
      look: '外観と言語',
      balance: '残高と利用',
      data: 'あなたのデータ',
    },
    noticesNote: '届いたものは、ベルの点とともに「お知らせ」にあります。',
    noticesLink: 'お知らせへ',
    balanceNote: '残高、チャージ、それぞれの利用額は「残高」にあります。',
    balanceLink: '残高へ',
  },
  ko: {
    title: '설정',
    intro:
      '이 플랫폼의 외관, 언어, 그리고 무엇을 저장하는지. 표시하기로 한 이름을 빼면 모든 것은 브라우저 안에 있습니다.',
    appearance: '외관',
    mode: '모드',
    modeDiurno: '디우르노(낮)',
    modeNocturno: '노크투르노(밤)',
    motion: '모션',
    motionNote:
      '애니메이션은 시스템 설정을 따릅니다. 모션 감소를 선택하면 모든 것이 즉시 나타납니다.',
    language: '언어',
    languageNote: '언어는 사이트 전체에 적용됩니다. 깊은 로어는 스페인어와 영어로 제공됩니다.',
    sidebar: '패널 섹션',
    sidebarNote: '사용하지 않는 항목은 숨길 수 있습니다. 선택은 이 브라우저에 남습니다.',
    session: '세션',
    signedOut: '세션 없이 누미니아를 걷고 있습니다. 로그인하면 노마드가 됩니다.',
    signedIn: '세션이 확인되었습니다.',
    rank: '랭크',
    address: '주소',
    signIn: '누미니아 입장',
    signOut: '로그아웃',
    permissions: '랭크가 허용하는 것',
    permissionsNote: '랭크는 누적됩니다. 각 단계는 아래의 모든 것을 유지합니다.',
    granted: '사용 가능',
    locked: '아직',
    data: '당신의 데이터',
    dataNote:
      '시트도 활동도 서버에 저장하지 않습니다. 시트는 당신의 파일이고, 설정은 이 브라우저에 있습니다. 직접 공개한 경우에만 조직을 위해 이름과 아바타를 보관합니다(위의 «도시에서 쓰는 내 이름»). 표시를 중단할 때까지 보관됩니다.',
    about: '정보',
    version: '버전',
    designSystem: '디자인 시스템',
    sourceData: '데이터 저장소',
    sessionIntro: '이미 가진 것으로 들어오세요: Google 계정, 이메일, 패스키, 또는 당신의 지갑.',
    parts: {
      nav: '내 설정',
      account: '계정',
      notices: '알림',
      look: '외관과 언어',
      balance: '잔액과 사용량',
      data: '당신의 데이터',
    },
    noticesNote: '받은 것은 종의 점과 함께 「알림」에 있어요.',
    noticesLink: '알림으로 가기',
    balanceNote: '잔액, 충전, 각각의 사용량은 「내 잔액」에 있어요.',
    balanceLink: '내 잔액으로 가기',
  },
  'pt-br': {
    title: 'Configurações',
    intro:
      'Como esta plataforma se vê, em que idioma fala e o que guarda. Tudo vive no seu navegador, exceto o nome que você decidir mostrar.',
    appearance: 'Aparência',
    mode: 'Modo',
    modeDiurno: 'Diurno',
    modeNocturno: 'Noturno',
    motion: 'Movimento',
    motionNote:
      'As animações seguem a preferência do seu sistema: se pedir menos movimento, tudo aparece na hora.',
    language: 'Idioma',
    languageNote: 'O idioma muda o site inteiro; o lore profundo vive em espanhol e inglês.',
    sidebar: 'Seções do painel',
    sidebarNote: 'Esconda o que não usar. Sua escolha fica neste navegador.',
    session: 'Sessão',
    signedOut: 'Você percorre Numinia sem sessão. Ao entrar, será nômade.',
    signedIn: 'Sessão verificada.',
    rank: 'Rank',
    address: 'Endereço',
    signIn: 'Entrar em Numinia',
    signOut: 'Sair',
    permissions: 'O que seu rank permite',
    permissionsNote: 'Os ranks são cumulativos: cada um mantém tudo o que vem antes.',
    granted: 'Disponível',
    locked: 'Ainda não',
    data: 'Seus dados',
    dataNote:
      'Não guardamos sua ficha nem sua atividade em nenhum servidor: sua ficha é um arquivo seu e suas preferências vivem neste navegador. Só se você publicar, guardamos seu nome e seu avatar para as suas organizações («Seu nome na cidade», mais acima), até você deixar de mostrá-los.',
    about: 'Sobre',
    version: 'Versão',
    designSystem: 'Sistema de design',
    sourceData: 'Repositório de dados',
    sessionIntro:
      'Entre com o que já tem: uma conta Google, seu e-mail, uma passkey ou sua própria carteira.',
    parts: {
      nav: 'Suas configurações',
      account: 'Conta',
      notices: 'Avisos',
      look: 'Aparência e idioma',
      balance: 'Saldo e consumo',
      data: 'Seus dados',
    },
    noticesNote: 'O que chegou para você, com o ponto no sino, está em Avisos.',
    noticesLink: 'Ir para Avisos',
    balanceNote: 'Seu saldo, as recargas e o que cada coisa gasta estão em Seu saldo.',
    balanceLink: 'Ir para Seu saldo',
  },
};
