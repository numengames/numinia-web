/**
 * /support — how to get help, five locales. One heading per channel, each
 * with its status (Oracle, 2026-10-03). Patronage lives at /back; the last
 * line points there.
 */

import type { SupportedLocale } from '@numinia/domain';

export const DISCORD_INVITE = 'https://discord.gg/ASwwdd24pp';
export const HELLO_EMAIL = 'hola@numengames.com';

export interface HelpChannel {
  readonly id: 'discord' | 'email' | 'data' | 'agent';
  readonly title: string;
  readonly status: string;
  readonly text: string;
}

export interface HelpMessages {
  readonly title: string;
  readonly description: string;
  readonly lead: string;
  readonly channels: readonly HelpChannel[];
  readonly backLine: string;
  readonly backLink: string;
}

const EN: HelpMessages = {
  title: 'Help',
  description:
    'How to get help with Numinia: Discord, email, your personal data, and an agent coming soon.',
  lead: 'How to get help. Pick the channel that fits; each one says whether it is open today.',
  channels: [
    {
      id: 'discord',
      title: 'Discord',
      status: 'Live today',
      text: 'The community. Questions, bugs, ideas. For a conduct problem, tell a Sentinel there.',
    },
    { id: 'email', title: 'Email', status: 'Open', text: 'A person answers.' },
    {
      id: 'data',
      title: 'Your personal data',
      status: 'Open',
      text: 'To see it, delete it or take it with you, write to:',
    },
    {
      id: 'agent',
      title: 'An agent that answers at any hour',
      status: 'Coming soon',
      text: 'Not open yet.',
    },
  ],
  backLine: 'Want to back Numinia instead?',
  backLink: 'Back Numinia',
};

const ES: HelpMessages = {
  title: 'Ayuda',
  description:
    'Cómo pedir ayuda en Numinia: Discord, email, tus datos personales y un agente que llega pronto.',
  lead: 'Cómo pedir ayuda. Elige el canal que te sirva; cada uno dice si está abierto hoy.',
  channels: [
    {
      id: 'discord',
      title: 'Discord',
      status: 'Abierto hoy',
      text: 'La comunidad. Preguntas, fallos, ideas. Si hay un problema de conducta, avisa allí a un Sentinel.',
    },
    { id: 'email', title: 'Email', status: 'Abierto', text: 'Te contesta una persona.' },
    {
      id: 'data',
      title: 'Tus datos personales',
      status: 'Abierto',
      text: 'Para verlos, borrarlos o llevártelos, escribe a:',
    },
    {
      id: 'agent',
      title: 'Un agente que responde a cualquier hora',
      status: 'Próximamente',
      text: 'Aún no está abierto.',
    },
  ],
  backLine: '¿Prefieres apoyar Numinia?',
  backLink: 'Apoya Numinia',
};

const PT: HelpMessages = {
  title: 'Ajuda',
  description:
    'Como pedir ajuda em Numinia: Discord, email, seus dados pessoais e um agente em breve.',
  lead: 'Como pedir ajuda. Escolha o canal que serve; cada um diz se está aberto hoje.',
  channels: [
    {
      id: 'discord',
      title: 'Discord',
      status: 'Aberto hoje',
      text: 'A comunidade. Perguntas, bugs, ideias. Para um problema de conduta, avise um Sentinel lá.',
    },
    { id: 'email', title: 'Email', status: 'Aberto', text: 'Uma pessoa responde.' },
    {
      id: 'data',
      title: 'Seus dados pessoais',
      status: 'Aberto',
      text: 'Para vê-los, apagá-los ou levá-los com você, escreva para:',
    },
    {
      id: 'agent',
      title: 'Um agente que responde a qualquer hora',
      status: 'Em breve',
      text: 'Ainda não está aberto.',
    },
  ],
  backLine: 'Prefere apoiar Numinia?',
  backLink: 'Apoie Numinia',
};

const JA: HelpMessages = {
  title: 'ヘルプ',
  description:
    'Numinia のサポート窓口：Discord、メール、個人データ、そして近日公開のエージェント。',
  lead: 'サポートの受け方。合う窓口を選んでください。それぞれ今日開いているかを示しています。',
  channels: [
    {
      id: 'discord',
      title: 'Discord',
      status: '公開中',
      text: 'コミュニティです。質問、バグ、アイデアはこちらへ。行為の問題は、そこで Sentinel に伝えてください。',
    },
    { id: 'email', title: 'メール', status: '受付中', text: '人が返信します。' },
    {
      id: 'data',
      title: 'あなたの個人データ',
      status: '受付中',
      text: '確認、削除、持ち出しの依頼はこちらへ：',
    },
    {
      id: 'agent',
      title: 'いつでも答えるエージェント',
      status: '近日公開',
      text: 'まだ開いていません。',
    },
  ],
  backLine: '代わりに Numinia を支援しますか？',
  backLink: 'Numinia を支援する',
};

const KO: HelpMessages = {
  title: '도움말',
  description: 'Numinia 도움 받는 방법: Discord, 이메일, 개인 데이터, 곧 제공될 에이전트.',
  lead: '도움 받는 방법. 맞는 채널을 고르세요. 각 채널에 오늘 열려 있는지 표시되어 있습니다.',
  channels: [
    {
      id: 'discord',
      title: 'Discord',
      status: '운영 중',
      text: '커뮤니티입니다. 질문, 버그, 아이디어. 행동 문제는 그곳의 Sentinel에게 알려 주세요.',
    },
    { id: 'email', title: '이메일', status: '운영 중', text: '사람이 답합니다.' },
    {
      id: 'data',
      title: '개인 데이터',
      status: '운영 중',
      text: '열람, 삭제, 가져가기는 여기로 보내 주세요:',
    },
    {
      id: 'agent',
      title: '언제든 답하는 에이전트',
      status: '곧 제공',
      text: '아직 열리지 않았습니다.',
    },
  ],
  backLine: '대신 Numinia를 후원하시겠어요?',
  backLink: 'Numinia 후원하기',
};

export const HELP_UI: Readonly<Record<SupportedLocale, HelpMessages>> = {
  en: EN,
  es: ES,
  'pt-br': PT,
  ja: JA,
  ko: KO,
};
