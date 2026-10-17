/**
 * «Ajustes de la comunidad»'s words (/panel/ajustes/), five locales: the
 * pieces a community switches on, «Cómo se llama cada cosa» and «Acceso de
 * la casa» (read-only text: the real switch is not built, the house stays in
 * during the alpha). The names of the pieces come from i18n/panel.ts and the
 * words of the three presets from lib/panel-settings.ts, so nothing is said
 * twice. A community is «comunidad»; a venue, «sede».
 *
 * Read on the server only: the page hands the island the one locale it needs.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { Vocabulary } from '../lib/panel-settings';

export interface PanelSettingsMessages {
  readonly pieces: {
    readonly title: string;
    readonly note: string;
    readonly on: string;
    readonly off: string;
    /** Summary and Settings: nobody turns them off. */
    readonly always: string;
    /** `{piece}`: the switch's accessible name. */
    readonly switchLabel: string;
  };
  readonly words: {
    readonly title: string;
    readonly note: string;
    readonly presets: Readonly<Record<Vocabulary, string>>;
    /** `{venues}`, `{gatherings}`, `{owner}`: what the preset in use says. */
    readonly now: string;
    readonly label: string;
  };
  readonly house: {
    readonly title: string;
    readonly text: string;
    readonly alpha: string;
  };
  readonly aiAgent: {
    readonly title: string;
    /** `{model}`, `{cap}`: «Agente IA: activo · gpt-5-nano · tope $1.50». */
    readonly lineOn: string;
    readonly lineOff: string;
    readonly note: string;
  };
  readonly readOnly: string;
  readonly saving: string;
  readonly saved: string;
  readonly failed: string;
  readonly loading: string;
}

export const PANEL_SETTINGS_UI: Readonly<Record<SupportedLocale, PanelSettingsMessages>> = {
  es: {
    pieces: {
      title: 'Piezas',
      note: 'Cada comunidad enciende solo las piezas que usa.',
      on: 'Encendida',
      off: 'Apagada · enciéndela cuando la necesites',
      always: 'Siempre encendida',
      switchLabel: 'Encender o apagar {piece}',
    },
    words: {
      title: 'Cómo se llama cada cosa',
      note: 'Sede, ritual, propietario… o sus palabras: sala, reunión, coordinación. Solo cambia lo que se lee en el panel.',
      presets: { simple: 'Sencillo', mixed: 'Mixto', numinia: 'Numinia' },
      now: 'Ahora se lee: {venues} · {gatherings} · {owner}',
      label: 'Palabras del panel',
    },
    house: {
      title: 'Acceso de la casa',
      text: 'La casa entra a ayudar con la comunidad y su sede; lo que hace sale en el registro, con nombre.',
      alpha: 'Durante la alfa está fijo en «Siempre».',
    },
    aiAgent: {
      title: 'Agente IA',
      lineOn: 'Agente IA: activo · {model} · tope {cap}',
      lineOff: 'Agente IA: inactivo · {model} · tope {cap}',
      note: 'Cada comunidad nace con un agente de IA de modelo barato y un tope de prueba. Encenderlo o apagarlo llega en otra entrega.',
    },
    readOnly: 'Solo quien administra la comunidad puede cambiar esto.',
    saving: 'Guardando…',
    saved: 'Guardado.',
    failed: 'No se ha podido guardar. Inténtalo otra vez.',
    loading: 'Leyendo los ajustes…',
  },
  en: {
    pieces: {
      title: 'Pieces',
      note: 'Each community switches on only the pieces it uses.',
      on: 'On',
      off: 'Off · turn it on when you need it',
      always: 'Always on',
      switchLabel: 'Turn {piece} on or off',
    },
    words: {
      title: 'What each thing is called',
      note: 'Venue, ritual, owner… or its words: room, meeting, coordination. It only changes what the panel reads.',
      presets: { simple: 'Simple', mixed: 'Mixed', numinia: 'Numinia' },
      now: 'It now reads: {venues} · {gatherings} · {owner}',
      label: "The panel's words",
    },
    house: {
      title: "The house's access",
      text: 'The house comes in to help with the community and its venue; what it does appears in the log, by name.',
      alpha: 'During the alpha this is fixed on “Always”.',
    },
    aiAgent: {
      title: 'AI agent',
      lineOn: 'AI agent: active · {model} · cap {cap}',
      lineOff: 'AI agent: inactive · {model} · cap {cap}',
      note: 'Every community is born with a cheap-model AI agent and a trial cap. Switching it on or off ships in a later cut.',
    },
    readOnly: 'Only whoever manages the community can change this.',
    saving: 'Saving…',
    saved: 'Saved.',
    failed: 'It could not be saved. Try again.',
    loading: 'Reading the settings…',
  },
  ja: {
    pieces: {
      title: '機能',
      note: 'コミュニティは使う機能だけをオンにします。',
      on: 'オン',
      off: 'オフ · 必要になったらオンにしてください',
      always: '常にオン',
      switchLabel: '{piece}のオン/オフを切り替える',
    },
    words: {
      title: '呼び名',
      note: '拠点・儀式・オーナー…、または部屋・ミーティング・コーディネーター。パネルの表示だけが変わります。',
      presets: { simple: 'シンプル', mixed: 'ミックス', numinia: 'ヌミニア' },
      now: '現在の表示: {venues} · {gatherings} · {owner}',
      label: 'パネルの言葉',
    },
    house: {
      title: 'ハウスのアクセス',
      text: 'ハウスはコミュニティとその拠点を手伝うために入ります。その操作は記録に名前つきで残ります。',
      alpha: 'アルファ期間中は「常に」に固定されています。',
    },
    aiAgent: {
      title: 'AIエージェント',
      lineOn: 'AIエージェント: 稼働中 · {model} · 上限 {cap}',
      lineOff: 'AIエージェント: 停止中 · {model} · 上限 {cap}',
      note: 'コミュニティは誕生時から、安価なモデルのAIエージェントと試用上限を持ちます。オン/オフの切り替えは今後の更新で提供されます。',
    },
    readOnly: 'これを変更できるのはコミュニティの管理者だけです。',
    saving: '保存中…',
    saved: '保存しました。',
    failed: '保存できませんでした。もう一度お試しください。',
    loading: '設定を読み込み中…',
  },
  ko: {
    pieces: {
      title: '기능',
      note: '커뮤니티는 쓰는 기능만 켭니다.',
      on: '켜짐',
      off: '꺼짐 · 필요할 때 켜세요',
      always: '항상 켜짐',
      switchLabel: '{piece} 켜기/끄기',
    },
    words: {
      title: '이름 붙이기',
      note: '거점, 의식, 소유자… 또는 방, 회의, 코디네이터. 패널에 보이는 말만 바뀝니다.',
      presets: { simple: '간단', mixed: '혼합', numinia: '누미니아' },
      now: '지금 표시: {venues} · {gatherings} · {owner}',
      label: '패널의 말',
    },
    house: {
      title: '하우스의 접근',
      text: '하우스는 커뮤니티와 그 거점을 돕기 위해 들어옵니다. 하우스가 한 일은 이름과 함께 기록에 남습니다.',
      alpha: '알파 기간에는 「항상」으로 고정되어 있습니다.',
    },
    aiAgent: {
      title: 'AI 에이전트',
      lineOn: 'AI 에이전트: 활성 · {model} · 한도 {cap}',
      lineOff: 'AI 에이전트: 비활성 · {model} · 한도 {cap}',
      note: '커뮤니티는 생성될 때부터 저가 모델 AI 에이전트와 체험 한도를 갖습니다. 켜고 끄는 기능은 다음 업데이트에서 제공됩니다.',
    },
    readOnly: '이 설정은 커뮤니티 관리자만 바꿀 수 있습니다.',
    saving: '저장 중…',
    saved: '저장했습니다.',
    failed: '저장하지 못했습니다. 다시 시도해 주세요.',
    loading: '설정을 읽는 중…',
  },
  'pt-br': {
    pieces: {
      title: 'Peças',
      note: 'Cada comunidade liga só as peças que usa.',
      on: 'Ligada',
      off: 'Desligada · ligue quando precisar',
      always: 'Sempre ligada',
      switchLabel: 'Ligar ou desligar {piece}',
    },
    words: {
      title: 'Como se chama cada coisa',
      note: 'Sede, ritual, proprietário… ou suas palavras: sala, reunião, coordenação. Só muda o que se lê no painel.',
      presets: { simple: 'Simples', mixed: 'Misto', numinia: 'Numinia' },
      now: 'Agora se lê: {venues} · {gatherings} · {owner}',
      label: 'Palavras do painel',
    },
    house: {
      title: 'Acesso da casa',
      text: 'A casa entra para ajudar com a comunidade e a sua sede; o que faz aparece no registro, com nome.',
      alpha: 'Durante a alfa isto fica fixo em «Sempre».',
    },
    aiAgent: {
      title: 'Agente de IA',
      lineOn: 'Agente de IA: ativo · {model} · limite {cap}',
      lineOff: 'Agente de IA: inativo · {model} · limite {cap}',
      note: 'Cada comunidade nasce com um agente de IA de modelo barato e um limite de teste. Ligar ou desligar chega em outra entrega.',
    },
    readOnly: 'Só quem administra a comunidade pode mudar isto.',
    saving: 'Salvando…',
    saved: 'Salvo.',
    failed: 'Não foi possível salvar. Tente de novo.',
    loading: 'Lendo os ajustes…',
  },
};
