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
  /** Session page */
  readonly sessionTitle: string;
  readonly sessionIntro: string;
  readonly sessionWhy: string;
  readonly sessionOpen: string;
  readonly backToSettings: string;
  /** Legal gate at the door (MIS-086) */
  readonly acceptLabel: string;
  readonly acceptRead: string;
  readonly acceptPending: string;
}

export const SETTINGS_UI: Readonly<Record<SupportedLocale, SettingsMessages>> = {
  es: {
    title: 'Ajustes',
    intro:
      'Cómo se ve, en qué idioma habla y qué guarda esta plataforma. Todo vive en tu navegador.',
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
    signedOut: 'Estás recorriendo Numinia como nómada, sin sesión.',
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
      'No guardamos tu ficha ni tu actividad en ningún servidor: tu ficha es un archivo tuyo y tus preferencias viven en este navegador.',
    about: 'Acerca de',
    version: 'Versión',
    designSystem: 'Sistema de diseño',
    sourceData: 'Repositorio de datos',
    sessionTitle: 'Entrar en Numinia',
    sessionIntro:
      'Entra con lo que ya tienes: una cuenta de Google, tu correo, una passkey o tu propia cartera.',
    sessionWhy:
      'Puedes recorrer la ciudad y llevarte todo el archivo sin entrar. La sesión existe para lo que necesita recordarte: tu ficha, tus sellos, tu progreso.',
    sessionOpen: 'Numinia solo comprueba que la dirección es tuya. Las llaves siguen siendo tuyas.',
    backToSettings: '← Ajustes',
    acceptLabel:
      'He leído y acepto los términos y condiciones y la política de privacidad de Numen Games.',
    acceptRead: 'Leer:',
    acceptPending: 'Marca la casilla para continuar. Ninguna sesión se abre sin aceptación.',
  },
  en: {
    title: 'Settings',
    intro:
      'How this platform looks, which language it speaks, and what it keeps. Everything lives in your browser.',
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
    signedOut: 'You are walking Numinia as a Nomad, with no session.',
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
      'We keep neither your sheet nor your activity on any server: your sheet is a file you own and your preferences live in this browser.',
    about: 'About',
    version: 'Version',
    designSystem: 'Design system',
    sourceData: 'Data repository',
    sessionTitle: 'Enter Numinia',
    sessionIntro:
      'Enter with what you already have: a Google account, your email, a passkey, or your own wallet.',
    sessionWhy:
      'You can walk the city and take the whole archive without entering. A session exists for what needs to remember you: your sheet, your seals, your progress.',
    sessionOpen: 'Numinia only checks that the address is yours. The keys stay yours.',
    backToSettings: '← Settings',
    acceptLabel: 'I have read and accept the Numen Games terms and conditions and privacy policy.',
    acceptRead: 'Read:',
    acceptPending: 'Tick the box to continue. No session is opened without acceptance.',
  },
  ja: {
    title: '設定',
    intro: 'このプラットフォームの見え方、言語、保存するもの。すべてブラウザの中にあります。',
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
    signedOut: 'セッションなしで、ノマドとしてヌミニアを歩いています。',
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
      'シートも行動履歴もサーバーには保存しません。シートはあなたのファイルであり、設定はこのブラウザにあります。',
    about: '情報',
    version: 'バージョン',
    designSystem: 'デザインシステム',
    sourceData: 'データリポジトリ',
    sessionTitle: 'ヌミニアに入る',
    sessionIntro:
      'すでにお持ちのもので入れます:Googleアカウント、メール、パスキー、またはご自身のウォレット。',
    sessionWhy:
      '入らなくても都市を歩き、アーカイブを持ち帰れます。セッションは、あなたを記憶する必要があるもののために存在します。',
    sessionOpen:
      'ヌミニアはアドレスがあなたのものであることを確認するだけです。鍵はあなたのものです。',
    backToSettings: '← 設定',
    acceptLabel: 'Numen Games の利用規約およびプライバシーポリシーを読み、同意します。',
    acceptRead: '本文を読む:',
    acceptPending: '続けるにはチェックを入れてください。同意なしにセッションは開始されません。',
  },
  ko: {
    title: '설정',
    intro: '이 플랫폼의 외관, 언어, 그리고 무엇을 저장하는지. 모든 것은 브라우저 안에 있습니다.',
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
    signedOut: '세션 없이 노마드로 누미니아를 걷고 있습니다.',
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
      '시트도 활동도 서버에 저장하지 않습니다. 시트는 당신의 파일이고, 설정은 이 브라우저에 있습니다.',
    about: '정보',
    version: '버전',
    designSystem: '디자인 시스템',
    sourceData: '데이터 저장소',
    sessionTitle: '누미니아 입장',
    sessionIntro: '이미 가진 것으로 들어오세요: Google 계정, 이메일, 패스키, 또는 당신의 지갑.',
    sessionWhy:
      '입장하지 않아도 도시를 걷고 아카이브를 가져갈 수 있습니다. 세션은 당신을 기억해야 하는 것들을 위해 존재합니다.',
    sessionOpen: '누미니아는 주소가 당신의 것인지만 확인합니다. 열쇠는 당신의 것입니다.',
    backToSettings: '← 설정',
    acceptLabel: 'Numen Games의 이용약관과 개인정보 처리방침을 읽고 동의합니다.',
    acceptRead: '읽기:',
    acceptPending: '계속하려면 체크하세요. 동의 없이는 세션이 시작되지 않습니다.',
  },
  'pt-br': {
    title: 'Configurações',
    intro:
      'Como esta plataforma se vê, em que idioma fala e o que guarda. Tudo vive no seu navegador.',
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
    signedOut: 'Você percorre Numinia como nômade, sem sessão.',
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
      'Não guardamos sua ficha nem sua atividade em nenhum servidor: sua ficha é um arquivo seu e suas preferências vivem neste navegador.',
    about: 'Sobre',
    version: 'Versão',
    designSystem: 'Sistema de design',
    sourceData: 'Repositório de dados',
    sessionTitle: 'Entrar em Numinia',
    sessionIntro:
      'Entre com o que já tem: uma conta Google, seu e-mail, uma passkey ou sua própria carteira.',
    sessionWhy:
      'Você pode percorrer a cidade e levar todo o arquivo sem entrar. A sessão existe para o que precisa lembrar de você.',
    sessionOpen: 'Numinia apenas verifica que o endereço é seu. As chaves continuam suas.',
    backToSettings: '← Configurações',
    acceptLabel: 'Li e aceito os termos e condições e a política de privacidade da Numen Games.',
    acceptRead: 'Ler:',
    acceptPending: 'Marque a caixa para continuar. Nenhuma sessão é aberta sem aceitação.',
  },
};
