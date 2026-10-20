/**
 * «Normas de la comunidad», the public page (condiciones/w3), five locales.
 * Castilian is the master and the words of the Ajustes section (panel-terms.ts):
 * a community is «comunidad», its rules «normas», a permission over a person's
 * data «datos». The English is written by the team; Japanese, Korean and
 * Brazilian Portuguese are working translations, to be read over by a native
 * speaker before the legal copy is final. The terms themselves (title and text
 * of each point) are the community's own and are shown as it wrote them.
 */

import type { SupportedLocale } from '@numinia/domain';

export interface CommunityTermsPageMessages {
  /** `{x}`: the community's name. */
  readonly title: string;
  readonly eyebrow: string;
  /** `{x}`: the community's name. */
  readonly back: string;
  readonly description: string;
  readonly fixed: {
    readonly label: string;
    readonly text: string;
    /** `{version}`: the Terms of Use of Numinia the person signs in with. */
    readonly link: string;
  };
  readonly own: {
    readonly label: string;
    /** `{version}`, `{date}`. */
    readonly inForce: string;
    readonly none: string;
    readonly mandatory: string;
    readonly optional: string;
    readonly norm: string;
    readonly data: string;
    readonly dataNote: string;
    /** `{n}`: the position of the point. */
    readonly point: string;
  };
  readonly history: {
    readonly title: string;
    readonly version: string;
    readonly date: string;
    readonly inForce: string;
  };
  readonly unavailable: string;
  readonly machine: {
    readonly text: string;
    readonly link: string;
  };
  /** The card on the community's page that points here. */
  readonly card: {
    readonly title: string;
    readonly text: string;
    readonly link: string;
  };
}

export const COMMUNITY_TERMS_PAGE_UI: Readonly<
  Record<SupportedLocale, CommunityTermsPageMessages>
> = {
  es: {
    title: 'Normas de {x}',
    eyebrow: 'Normas de la comunidad',
    back: 'Volver a {x}',
    description:
      'Lo que acepta quien entra en los mundos de {x}: las normas de Numinia, primero, y las de la comunidad, con su historial de versiones.',
    fixed: {
      label: 'Numinia · siempre delante',
      text: 'Las normas de Numinia van delante de las de esta comunidad y valen siempre.',
      link: 'Condiciones de uso de Numinia · v{version}',
    },
    own: {
      label: 'Las de esta comunidad',
      inForce: 'En vigor: versión {version} · publicada el {date}',
      none: 'Esta comunidad no añade normas propias: valen las de Numinia.',
      mandatory: 'Obligatoria',
      optional: 'Opcional',
      norm: 'Norma',
      data: 'Datos',
      dataNote: 'Un permiso sobre datos nunca cierra la puerta: quien lo rechaza entra igual.',
      point: 'Punto {n}',
    },
    history: {
      title: 'Versiones publicadas',
      version: 'Versión',
      date: 'Fecha',
      inForce: 'en vigor',
    },
    unavailable: 'No hemos podido leer las normas ahora mismo. Inténtalo de nuevo en un rato.',
    machine: {
      text: 'Para IAs y herramientas, estas mismas normas se leen como JSON:',
      link: 'normas en JSON',
    },
    card: {
      title: 'Normas',
      text: 'Lo que acepta quien entra en los mundos de esta comunidad, y cómo han cambiado.',
      link: 'Leer las normas',
    },
  },
  en: {
    title: 'Rules of {x}',
    eyebrow: 'Community rules',
    back: 'Back to {x}',
    description:
      'What anyone entering the worlds of {x} accepts: the rules of Numinia first, then the community’s own, with the history of its versions.',
    fixed: {
      label: 'Numinia · always first',
      text: 'The rules of Numinia come before this community’s and always apply.',
      link: 'Numinia Terms of Use · v{version}',
    },
    own: {
      label: 'This community’s own',
      inForce: 'In force: version {version} · published {date}',
      none: 'This community adds no rules of its own: Numinia’s rules apply.',
      mandatory: 'Required',
      optional: 'Optional',
      norm: 'Rule',
      data: 'Data',
      dataNote:
        'A permission over your data never closes the door: whoever declines it gets in all the same.',
      point: 'Point {n}',
    },
    history: {
      title: 'Published versions',
      version: 'Version',
      date: 'Date',
      inForce: 'in force',
    },
    unavailable: 'We could not read the rules right now. Please try again in a while.',
    machine: {
      text: 'For AIs and tools, these same rules can be read as JSON:',
      link: 'rules as JSON',
    },
    card: {
      title: 'Rules',
      text: 'What anyone entering this community’s worlds accepts, and how it has changed.',
      link: 'Read the rules',
    },
  },
  ja: {
    title: '{x}のルール',
    eyebrow: 'コミュニティのルール',
    back: '{x}に戻る',
    description:
      '{x}のワールドに入る人が同意する内容です。まずNuminiaのルール、次にコミュニティ独自のルールと、そのバージョン履歴を掲載しています。',
    fixed: {
      label: 'Numinia · 常に先頭',
      text: 'Numiniaのルールはこのコミュニティのルールより先に置かれ、常に適用されます。',
      link: 'Numinia 利用規約 · v{version}',
    },
    own: {
      label: 'このコミュニティ独自のルール',
      inForce: '有効: バージョン {version} · {date} 公開',
      none: 'このコミュニティ独自のルールはありません。Numiniaのルールが適用されます。',
      mandatory: '必須',
      optional: '任意',
      norm: 'ルール',
      data: 'データ',
      dataNote: 'データに関する許可が入口を閉ざすことはありません。断っても入れます。',
      point: '項目 {n}',
    },
    history: {
      title: '公開済みのバージョン',
      version: 'バージョン',
      date: '日付',
      inForce: '有効',
    },
    unavailable: '今はルールを読み込めませんでした。しばらくしてからもう一度お試しください。',
    machine: {
      text: 'AIやツール向けに、同じルールをJSONで読めます:',
      link: 'JSONのルール',
    },
    card: {
      title: 'ルール',
      text: 'このコミュニティのワールドに入る人が同意する内容と、その変更履歴です。',
      link: 'ルールを読む',
    },
  },
  ko: {
    title: '{x}의 규칙',
    eyebrow: '커뮤니티 규칙',
    back: '{x}(으)로 돌아가기',
    description:
      '{x}의 월드에 들어오는 사람이 동의하는 내용입니다. 먼저 Numinia의 규칙, 그다음 커뮤니티 자체 규칙과 버전 기록을 보여 줍니다.',
    fixed: {
      label: 'Numinia · 항상 맨 앞',
      text: 'Numinia의 규칙은 이 커뮤니티의 규칙보다 앞에 놓이며 항상 적용됩니다.',
      link: 'Numinia 이용 약관 · v{version}',
    },
    own: {
      label: '이 커뮤니티의 규칙',
      inForce: '시행 중: 버전 {version} · {date} 게시',
      none: '이 커뮤니티는 자체 규칙을 추가하지 않습니다. Numinia의 규칙이 적용됩니다.',
      mandatory: '필수',
      optional: '선택',
      norm: '규칙',
      data: '데이터',
      dataNote: '데이터 권한은 입구를 막지 않습니다. 거절해도 들어올 수 있습니다.',
      point: '항목 {n}',
    },
    history: {
      title: '게시된 버전',
      version: '버전',
      date: '날짜',
      inForce: '시행 중',
    },
    unavailable: '지금은 규칙을 읽을 수 없습니다. 잠시 후 다시 시도해 주세요.',
    machine: {
      text: 'AI와 도구를 위해 같은 규칙을 JSON으로 읽을 수 있습니다:',
      link: 'JSON 규칙',
    },
    card: {
      title: '규칙',
      text: '이 커뮤니티의 월드에 들어오는 사람이 동의하는 내용과 그 변경 기록입니다.',
      link: '규칙 읽기',
    },
  },
  'pt-br': {
    title: 'Regras de {x}',
    eyebrow: 'Regras da comunidade',
    back: 'Voltar a {x}',
    description:
      'O que aceita quem entra nos mundos de {x}: primeiro as regras da Numinia, depois as da comunidade, com o histórico de versões.',
    fixed: {
      label: 'Numinia · sempre na frente',
      text: 'As regras da Numinia vêm na frente das desta comunidade e valem sempre.',
      link: 'Termos de Uso da Numinia · v{version}',
    },
    own: {
      label: 'As desta comunidade',
      inForce: 'Em vigor: versão {version} · publicada em {date}',
      none: 'Esta comunidade não acrescenta regras próprias: valem as da Numinia.',
      mandatory: 'Obrigatória',
      optional: 'Opcional',
      norm: 'Regra',
      data: 'Dados',
      dataNote:
        'Uma permissão sobre dados nunca fecha a porta: quem a recusa entra do mesmo jeito.',
      point: 'Ponto {n}',
    },
    history: {
      title: 'Versões publicadas',
      version: 'Versão',
      date: 'Data',
      inForce: 'em vigor',
    },
    unavailable: 'Não foi possível ler as regras agora. Tente de novo daqui a pouco.',
    machine: {
      text: 'Para IAs e ferramentas, estas mesmas regras podem ser lidas como JSON:',
      link: 'regras em JSON',
    },
    card: {
      title: 'Regras',
      text: 'O que aceita quem entra nos mundos desta comunidade, e como mudou.',
      link: 'Ler as regras',
    },
  },
};
