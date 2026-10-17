/**
 * The front door's visitor face (v0.86.0, the Oracle 2026-10-14): what a
 * first-time visitor reads before signing in — what Numinia is in a line,
 * the way in without an account, the communities that already have a home,
 * how to ask for one, what stays yours, the city in one paragraph and the
 * questions that stop people. A signed-in person sees «Para ti» instead.
 *
 * The four steps and the six templates are not repeated here: both faces of
 * «Cómo funciona» read them from `how-it-works.ts`.
 */

import type { SupportedLocale } from '@numinia/domain';

export interface FrontDoorQuestion {
  readonly q: string;
  readonly a: string;
}

export interface FrontDoorMessages {
  readonly eyebrow: string;
  readonly heading: string;
  readonly lead: string;
  readonly enterCity: string;
  /** Under the buttons: the way in needs no account. */
  readonly enterNote: string;
  readonly openHome: string;
  readonly pictureAlt: string;
  readonly stepsEyebrow: string;
  readonly stepsTitle: string;
  readonly homesEyebrow: string;
  readonly homesTitle: string;
  readonly homesHelp: string;
  readonly allCommunities: string;
  readonly formTitle: string;
  readonly formHelp: string;
  readonly formName: string;
  readonly formKind: string;
  readonly formKindUnsure: string;
  readonly formWhen: string;
  readonly formEmail: string;
  readonly formSend: string;
  /** Under the button: what pressing it does. */
  readonly formNote: string;
  /** The mail's subject; "{name}" is the community. */
  readonly mailSubject: string;
  readonly yoursEyebrow: string;
  readonly yoursTitle: string;
  readonly yoursLead: string;
  readonly yoursBazaar: string;
  readonly yoursCode: string;
  readonly cityEyebrow: string;
  readonly cityLine: string;
  readonly readStory: string;
  readonly faqEyebrow: string;
  readonly faqTitle: string;
  readonly faq: readonly [
    FrontDoorQuestion,
    FrontDoorQuestion,
    FrontDoorQuestion,
    FrontDoorQuestion,
    FrontDoorQuestion,
  ];
}

/** The city's story in one paragraph, from the canon the «Cómo funciona» page quotes. */
const CITY_ES =
  'A comienzos del siglo XX, un científico conocido como Holberins concibió Numinia para reunir el conocimiento humano en un único espacio compartido. Un incendio la destruyó en 1920, pero él había guardado su esencia en los Registros Akáshicos, y un siglo después la ciudad renació.';
const CITY_EN =
  'At the beginning of the 20th century, a scientist known as Holberins conceived Numinia to gather human knowledge in a single shared space. A fire destroyed it in 1920, but he had kept its essence in the Akashic Records, and a century later the city was reborn.';
const CITY_JA =
  '20世紀のはじめ、ホルベリンスという科学者が、人類の知をひとつの共有された空間に集めるために Numinia を構想しました。1920年の火災がそれを滅ぼしましたが、彼はその本質をアカシック・レコードに残していて、一世紀の後に都市はよみがえりました。';
const CITY_KO =
  '20세기 초, 홀베린스라는 과학자가 인류의 지식을 하나의 공유 공간에 모으기 위해 Numinia를 구상했습니다. 1920년 화재가 도시를 파괴했지만, 그는 그 본질을 아카식 레코드에 간직해 두었고, 한 세기 뒤에 도시는 다시 태어났습니다.';
const CITY_PT =
  'No começo do século XX, um cientista conhecido como Holberins concebeu Numinia para reunir o conhecimento humano em um único espaço compartilhado. Um incêndio a destruiu em 1920, mas ele havia guardado sua essência nos Registros Akáshicos, e um século depois a cidade renasceu.';

const ES: FrontDoorMessages = {
  eyebrow: 'Numinia',
  heading: 'Tu organización, con sede propia en una ciudad 3D.',
  lead: 'Un congreso, un aula, un equipo o un grupo de amigos. Cada uno tiene en Numinia su espacio 3D, su calendario y su archivo. Se abre en el navegador, también en el móvil, sin instalar nada.',
  enterCity: 'Entrar a la ciudad',
  enterNote: 'Entras a la Plaza del Ágora sin registrarte.',
  openHome: 'Abrir la sede de mi organización',
  pictureAlt: 'Ciudadanos de Numinia caminando por la ciudad',
  stepsEyebrow: 'Cómo funciona',
  stepsTitle: 'Cuatro pasos',
  homesEyebrow: 'Ya están aquí',
  homesTitle: 'Con sede en la ciudad',
  homesHelp: 'Las que ya tienen su espacio 3D abierto.',
  allCommunities: 'Todas las comunidades',
  formTitle: 'Cuéntanos de la tuya',
  formHelp: 'Te abrimos la sede y la hacéis vuestra.',
  formName: 'Nombre',
  formKind: 'Tipo de sede',
  formKindUnsure: 'Aún no lo sé',
  formWhen: 'Fecha aproximada',
  formEmail: 'Tu email',
  formSend: 'Enviar',
  formNote: 'Se abre tu correo con todo escrito; solo tienes que darle a enviar.',
  mailSubject: 'Abrir la sede de {name}',
  yoursEyebrow: 'Lo vuestro es vuestro',
  yoursTitle: 'Si un día os vais, os lo lleváis todo.',
  yoursLead:
    'Todo lo que creáis son ficheros vuestros, en formatos abiertos. Los objetos de la ciudad son CC0 y el código es abierto.',
  yoursBazaar: 'El Bazar',
  yoursCode: 'El código',
  cityEyebrow: 'La ciudad',
  cityLine: CITY_ES,
  readStory: 'Lee su historia',
  faqEyebrow: 'Preguntas',
  faqTitle: 'Lo que la gente pregunta',
  faq: [
    {
      q: '¿Cuesta algo entrar?',
      a: 'No. Entrar a la ciudad y a las sedes abiertas es gratis.',
    },
    {
      q: '¿Necesito instalar algo o tener una cartera cripto?',
      a: 'No. Todo se abre en el navegador. Para entrar con tu cuenta te vale Google, un email o una passkey; la cartera es opcional.',
    },
    {
      q: '¿Qué datos guardáis de mí?',
      a: 'Tu personaje vive en tu dispositivo y en los ficheros que te lleves; nadie en Numinia guarda copia. La medición de la página, si la aceptas, no sale de tu pestaña.',
    },
    {
      q: '¿Cómo se modera una sede?',
      a: 'Cada sede la cuida la comunidad que la lleva, y la ciudad la cuida Numen Games. Si ves algo que no debería estar, escríbenos a hola@numengames.com.',
    },
    {
      q: '¿Puedo usar los objetos fuera de Numinia?',
      a: 'Sí. Son CC0: úsalos, cámbialos y llévatelos, sin pedir permiso.',
    },
  ],
};

const EN: FrontDoorMessages = {
  eyebrow: 'Numinia',
  heading: 'Your organization, with a home of its own in a 3D city.',
  lead: 'A conference, a classroom, a team or a group of friends. Each has in Numinia its own 3D space, its calendar and its archive. It opens in the browser, on your phone too, with nothing to install.',
  enterCity: 'Enter the city',
  enterNote: 'You enter the Agora Plaza without signing up.',
  openHome: 'Open my organization’s home',
  pictureAlt: 'Citizens of Numinia walking through the city',
  stepsEyebrow: 'How it works',
  stepsTitle: 'Four steps',
  homesEyebrow: 'Already here',
  homesTitle: 'With a home in the city',
  homesHelp: 'The ones whose 3D space is already open.',
  allCommunities: 'All communities',
  formTitle: 'Tell us about yours',
  formHelp: 'We open the home and you make it yours.',
  formName: 'Name',
  formKind: 'Kind of home',
  formKindUnsure: 'Not sure yet',
  formWhen: 'Rough date',
  formEmail: 'Your email',
  formSend: 'Send',
  formNote: 'Your mail opens with everything written; you only press send.',
  mailSubject: 'Open the home of {name}',
  yoursEyebrow: 'Yours is yours',
  yoursTitle: 'If you leave one day, you take it all.',
  yoursLead:
    'Everything you make is files of your own, in open formats. The city’s objects are CC0 and the code is open.',
  yoursBazaar: 'The Bazaar',
  yoursCode: 'The code',
  cityEyebrow: 'The city',
  cityLine: CITY_EN,
  readStory: 'Read its story',
  faqEyebrow: 'Questions',
  faqTitle: 'What people ask',
  faq: [
    {
      q: 'Does it cost anything to enter?',
      a: 'No. Entering the city and the open homes is free.',
    },
    {
      q: 'Do I need to install anything or have a crypto wallet?',
      a: 'No. Everything opens in the browser. To sign in, Google, an email or a passkey will do; a wallet is optional.',
    },
    {
      q: 'What data do you keep about me?',
      a: 'Your character lives on your device and in the files you take; nobody at Numinia keeps a copy. The page’s measurement, if you accept it, never leaves your tab.',
    },
    {
      q: 'How is a home moderated?',
      a: 'Each home is looked after by the community that runs it, and the city by Numen Games. If you see something that should not be there, write to hola@numengames.com.',
    },
    {
      q: 'Can I use the objects outside Numinia?',
      a: 'Yes. They are CC0: use them, change them and take them, without asking.',
    },
  ],
};

const JA: FrontDoorMessages = {
  eyebrow: 'Numinia',
  heading: 'あなたの組織に、3D の都市の拠点を。',
  lead: 'カンファレンス、教室、チーム、友人のグループ。それぞれが Numinia に、自分たちの 3D の空間、カレンダー、アーカイブを持ちます。ブラウザで開き、スマートフォンでも使え、インストールは不要です。',
  enterCity: '都市に入る',
  enterNote: '登録なしでアゴラ広場に入れます。',
  openHome: '組織の拠点を開く',
  pictureAlt: '都市を歩く Numinia の市民たち',
  stepsEyebrow: '仕組み',
  stepsTitle: '4 つのステップ',
  homesEyebrow: 'すでにここに',
  homesTitle: '都市に拠点がある',
  homesHelp: '3D の空間がすでに開いているところ。',
  allCommunities: 'すべてのコミュニティ',
  formTitle: 'あなたのところについて教えてください',
  formHelp: '拠点を開き、あなたたちのものにしていただきます。',
  formName: '名前',
  formKind: '拠点の種類',
  formKindUnsure: 'まだわからない',
  formWhen: 'おおよその日付',
  formEmail: 'メールアドレス',
  formSend: '送信',
  formNote: 'すべて書き込まれた状態でメールが開きます。送信を押すだけです。',
  mailSubject: '{name} の拠点を開く',
  yoursEyebrow: 'あなたたちのものは、あなたたちのもの',
  yoursTitle: 'いつか離れるときは、すべて持っていけます。',
  yoursLead:
    '作ったものはすべて、オープンな形式の自分たちのファイルです。都市のオブジェクトは CC0、コードはオープンです。',
  yoursBazaar: 'バザール',
  yoursCode: 'コード',
  cityEyebrow: '都市',
  cityLine: CITY_JA,
  readStory: 'その歴史を読む',
  faqEyebrow: '質問',
  faqTitle: 'よくある質問',
  faq: [
    { q: '入るのにお金はかかりますか？', a: 'いいえ。都市と開いている拠点に入るのは無料です。' },
    {
      q: '何かをインストールしたり、暗号資産のウォレットが必要ですか？',
      a: 'いいえ。すべてブラウザで開きます。サインインには Google、メール、パスキーが使えます。ウォレットは任意です。',
    },
    {
      q: '私のどんなデータを保存しますか？',
      a: 'あなたのキャラクターはあなたの端末と、持ち帰るファイルの中にあります。Numinia の誰もコピーを持ちません。ページの計測は、同意した場合でもタブの外に出ません。',
    },
    {
      q: '拠点はどのようにモデレートされますか？',
      a: '各拠点はそれを運営するコミュニティが、都市は Numen Games が見守ります。あるべきでないものを見つけたら、hola@numengames.com までご連絡ください。',
    },
    {
      q: 'オブジェクトを Numinia の外で使えますか？',
      a: 'はい。CC0 です。許可なく使い、変え、持ち出せます。',
    },
  ],
};

const KO: FrontDoorMessages = {
  eyebrow: 'Numinia',
  heading: '당신의 조직에게, 3D 도시 속 자신만의 거점을.',
  lead: '컨퍼런스, 교실, 팀, 친구들의 모임. 각각은 Numinia에 자신만의 3D 공간, 달력, 아카이브를 갖습니다. 브라우저에서 열리고 휴대폰에서도 되며, 설치할 것이 없습니다.',
  enterCity: '도시에 들어가기',
  enterNote: '가입 없이 아고라 광장에 들어갑니다.',
  openHome: '우리 조직의 거점 열기',
  pictureAlt: '도시를 걷는 Numinia의 시민들',
  stepsEyebrow: '작동 방식',
  stepsTitle: '네 단계',
  homesEyebrow: '이미 여기에',
  homesTitle: '도시에 거점이 있는 곳',
  homesHelp: '3D 공간이 이미 열려 있는 곳.',
  allCommunities: '모든 커뮤니티',
  formTitle: '여러분에 대해 알려 주세요',
  formHelp: '거점을 열어 드리면 여러분의 것으로 만들면 됩니다.',
  formName: '이름',
  formKind: '거점의 종류',
  formKindUnsure: '아직 모르겠어요',
  formWhen: '대략적인 날짜',
  formEmail: '이메일',
  formSend: '보내기',
  formNote: '모든 내용이 적힌 메일이 열립니다. 보내기만 누르면 됩니다.',
  mailSubject: '{name}의 거점 열기',
  yoursEyebrow: '여러분의 것은 여러분의 것',
  yoursTitle: '언젠가 떠나도, 모두 가져갈 수 있습니다.',
  yoursLead:
    '여러분이 만드는 모든 것은 열린 형식의 여러분의 파일입니다. 도시의 오브젝트는 CC0이고 코드는 공개되어 있습니다.',
  yoursBazaar: '바자르',
  yoursCode: '코드',
  cityEyebrow: '도시',
  cityLine: CITY_KO,
  readStory: '그 역사 읽기',
  faqEyebrow: '질문',
  faqTitle: '자주 묻는 질문',
  faq: [
    { q: '들어가는 데 비용이 드나요?', a: '아니요. 도시와 열린 거점에 들어가는 것은 무료입니다.' },
    {
      q: '무언가를 설치하거나 암호화폐 지갑이 필요한가요?',
      a: '아니요. 모두 브라우저에서 열립니다. 로그인에는 Google, 이메일, 패스키를 쓸 수 있고, 지갑은 선택입니다.',
    },
    {
      q: '제 어떤 데이터를 보관하나요?',
      a: '당신의 캐릭터는 당신의 기기와 가져가는 파일 속에 있습니다. Numinia의 누구도 사본을 갖지 않습니다. 페이지 측정은 동의하더라도 탭 밖으로 나가지 않습니다.',
    },
    {
      q: '거점은 어떻게 관리되나요?',
      a: '각 거점은 그것을 운영하는 커뮤니티가, 도시는 Numen Games가 돌봅니다. 있어서는 안 될 것을 보면 hola@numengames.com으로 알려 주세요.',
    },
    {
      q: '오브젝트를 Numinia 밖에서 써도 되나요?',
      a: '네. CC0입니다. 허락 없이 쓰고, 바꾸고, 가져가세요.',
    },
  ],
};

const PT_BR: FrontDoorMessages = {
  eyebrow: 'Numinia',
  heading: 'Sua organização, com sede própria numa cidade 3D.',
  lead: 'Um congresso, uma sala de aula, uma equipe ou um grupo de amigos. Cada um tem na Numinia seu espaço 3D, seu calendário e seu arquivo. Abre no navegador, também no celular, sem instalar nada.',
  enterCity: 'Entrar na cidade',
  enterNote: 'Você entra na Praça da Ágora sem se cadastrar.',
  openHome: 'Abrir a sede da minha organização',
  pictureAlt: 'Cidadãos da Numinia caminhando pela cidade',
  stepsEyebrow: 'Como funciona',
  stepsTitle: 'Quatro passos',
  homesEyebrow: 'Já estão aqui',
  homesTitle: 'Com sede na cidade',
  homesHelp: 'As que já têm seu espaço 3D aberto.',
  allCommunities: 'Todas as comunidades',
  formTitle: 'Conte-nos sobre a sua',
  formHelp: 'Abrimos a sede e vocês a fazem sua.',
  formName: 'Nome',
  formKind: 'Tipo de sede',
  formKindUnsure: 'Ainda não sei',
  formWhen: 'Data aproximada',
  formEmail: 'Seu e-mail',
  formSend: 'Enviar',
  formNote: 'Seu e-mail abre com tudo escrito; é só apertar enviar.',
  mailSubject: 'Abrir a sede de {name}',
  yoursEyebrow: 'O que é de vocês é de vocês',
  yoursTitle: 'Se um dia forem embora, levam tudo.',
  yoursLead:
    'Tudo o que vocês criam são arquivos de vocês, em formatos abertos. Os objetos da cidade são CC0 e o código é aberto.',
  yoursBazaar: 'O Bazar',
  yoursCode: 'O código',
  cityEyebrow: 'A cidade',
  cityLine: CITY_PT,
  readStory: 'Leia a história',
  faqEyebrow: 'Perguntas',
  faqTitle: 'O que as pessoas perguntam',
  faq: [
    { q: 'Custa algo entrar?', a: 'Não. Entrar na cidade e nas sedes abertas é grátis.' },
    {
      q: 'Preciso instalar algo ou ter uma carteira cripto?',
      a: 'Não. Tudo abre no navegador. Para entrar, vale Google, um e-mail ou uma passkey; a carteira é opcional.',
    },
    {
      q: 'Que dados vocês guardam de mim?',
      a: 'Seu personagem vive no seu dispositivo e nos arquivos que você levar; ninguém na Numinia guarda cópia. A medição da página, se você aceitar, não sai da sua aba.',
    },
    {
      q: 'Como uma sede é moderada?',
      a: 'Cada sede é cuidada pela comunidade que a leva, e a cidade pela Numen Games. Se vir algo que não deveria estar ali, escreva para hola@numengames.com.',
    },
    {
      q: 'Posso usar os objetos fora da Numinia?',
      a: 'Sim. São CC0: use, mude e leve, sem pedir permissão.',
    },
  ],
};

export const FRONT_DOOR: Readonly<Record<SupportedLocale, FrontDoorMessages>> = {
  es: ES,
  en: EN,
  ja: JA,
  ko: KO,
  'pt-br': PT_BR,
};
