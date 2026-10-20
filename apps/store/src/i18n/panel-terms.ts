/**
 * «Normas de vuestros espacios» — the words of the Ajustes section where a
 * community's administrators write the terms of their worlds (condiciones/w2),
 * five locales. Castilian is the master; the validator's own messages (the
 * problems shown next to a field) are Castilian in every locale, because they
 * are the world file's and the engine's language too.
 *
 * A community is «comunidad» on screen; the rules are «normas»; a permission
 * over a person's data is «datos». Read on the server only: the page hands
 * the island the one locale it needs.
 */

import type { SupportedLocale } from '@numinia/domain';

export interface PanelTermsMessages {
  readonly title: string;
  readonly lead: string;
  /** To whoever may not write them. */
  readonly readOnly: string;
  readonly loading: string;
  readonly failed: string;
  readonly retry: string;
  readonly fixed: {
    readonly label: string;
    readonly text: string;
    /** `{version}`: the Terms of Use of Numinia the person signs in with. */
    readonly link: string;
  };
  readonly own: {
    readonly label: string;
    /** `{version}`: the version in force. */
    readonly inForce: string;
    readonly none: string;
    readonly noneRead: string;
    readonly mandatory: string;
    readonly optional: string;
    readonly norm: string;
    readonly data: string;
  };
  readonly edit: {
    /** `{n}`: the position of the point in the list. */
    readonly point: string;
    readonly titleLabel: string;
    readonly textLabel: string;
    readonly mandatoryLabel: string;
    readonly kindLabel: string;
    readonly kindHint: string;
    /** Why «Obligatoria» is off for a data point. */
    readonly dataNote: string;
    readonly remove: string;
    readonly add: string;
    readonly full: string;
  };
  readonly publish: {
    readonly versionLabel: string;
    readonly versionHint: string;
    /** `{version}`. */
    readonly button: string;
    readonly buttonBare: string;
    readonly note: string;
    readonly publishing: string;
    /** `{version}`. */
    readonly done: string;
    readonly failed: string;
    readonly problems: string;
    readonly discard: string;
  };
  readonly history: {
    readonly title: string;
    readonly empty: string;
    readonly inForce: string;
    /** `{count}`. */
    readonly points: string;
  };
}

export const PANEL_TERMS_UI: Readonly<Record<SupportedLocale, PanelTermsMessages>> = {
  es: {
    title: 'Normas de vuestros espacios',
    lead: 'Lo que acepta quien entra en vuestros mundos. Valen para todos vuestros mundos; se leen en la burbuja de entrada, también en VR.',
    readOnly: 'Solo quien tiene el rol de administrador cambia estas normas. Tú puedes leerlas.',
    loading: 'Leyendo las normas…',
    failed: 'No hemos podido leer las normas ahora mismo.',
    retry: 'Reintentar',
    fixed: {
      label: 'Numinia · siempre delante · no se pueden quitar',
      text: 'Las normas de Numinia van siempre delante de las vuestras y no se pueden quitar.',
      link: 'Condiciones de uso de Numinia · v{version}',
    },
    own: {
      label: 'Las vuestras',
      inForce: 'En vigor: versión {version}',
      none: 'Todavía no habéis publicado normas propias: solo rigen las de Numinia. Añadid la primera y publicadla.',
      noneRead: 'Esta comunidad todavía no ha publicado normas propias: solo rigen las de Numinia.',
      mandatory: 'Obligatoria',
      optional: 'Opcional',
      norm: 'Norma',
      data: 'Datos',
    },
    edit: {
      point: 'Punto {n}',
      titleLabel: 'Título',
      textLabel: 'Texto',
      mandatoryLabel: 'Obligatoria u opcional',
      kindLabel: 'Tipo',
      kindHint:
        'Norma: una regla del espacio. Datos: un permiso sobre datos de la persona (informe de sesión, avisos, una IA que escucha).',
      dataNote: 'Los datos nunca pueden ser obligatorios: quien los rechaza entra igual.',
      remove: 'Quitar este punto',
      add: '+ Añadir una norma',
      full: 'Ya hay 20 puntos, el máximo.',
    },
    publish: {
      versionLabel: 'Versión nueva',
      versionHint: 'Un número que no hayáis usado, por ejemplo 1.1.',
      button: 'Publicar versión {version}',
      buttonBare: 'Publicar',
      note: 'Al publicar, quien vuelva verá solo lo que cambió. Las versiones publicadas no se borran.',
      publishing: 'Publicando…',
      done: 'Publicada la versión {version}.',
      failed: 'No se ha podido publicar. Inténtalo de nuevo.',
      problems: 'Revisa esto antes de publicar:',
      discard: 'Descartar cambios',
    },
    history: {
      title: 'Versiones publicadas',
      empty: 'Todavía no hay ninguna.',
      inForce: 'en vigor',
      points: '{count} puntos',
    },
  },
  en: {
    title: 'Rules of your spaces',
    lead: 'What anyone entering your worlds accepts. They apply to all your worlds and are read in the entry bubble, in VR too.',
    readOnly: 'Only people with the administrator role change these rules. You can read them.',
    loading: 'Reading the rules…',
    failed: 'We could not read the rules right now.',
    retry: 'Try again',
    fixed: {
      label: 'Numinia · always first · cannot be removed',
      text: 'Numinia’s rules always come before yours and cannot be removed.',
      link: 'Numinia Terms of Use · v{version}',
    },
    own: {
      label: 'Yours',
      inForce: 'In force: version {version}',
      none: 'You have not published rules of your own yet: only Numinia’s apply. Add the first one and publish it.',
      noneRead: 'This community has not published rules of its own yet: only Numinia’s apply.',
      mandatory: 'Mandatory',
      optional: 'Optional',
      norm: 'Rule',
      data: 'Data',
    },
    edit: {
      point: 'Point {n}',
      titleLabel: 'Title',
      textLabel: 'Text',
      mandatoryLabel: 'Mandatory or optional',
      kindLabel: 'Type',
      kindHint:
        'Rule: a rule of the space. Data: a permission over a person’s data (session report, notices, an AI that listens).',
      dataNote: 'Data can never be mandatory: whoever refuses it still gets in.',
      remove: 'Remove this point',
      add: '+ Add a rule',
      full: 'There are already 20 points, the most there can be.',
    },
    publish: {
      versionLabel: 'New version',
      versionHint: 'A number you have not used, for example 1.1.',
      button: 'Publish version {version}',
      buttonBare: 'Publish',
      note: 'When you publish, people who come back see only what changed. Published versions are never deleted.',
      publishing: 'Publishing…',
      done: 'Version {version} published.',
      failed: 'It could not be published. Try again.',
      problems: 'Check this before publishing:',
      discard: 'Discard changes',
    },
    history: {
      title: 'Published versions',
      empty: 'There are none yet.',
      inForce: 'in force',
      points: '{count} points',
    },
  },
  ja: {
    title: 'スペースのルール',
    lead: 'あなたのワールドに入る人が同意する内容です。すべてのワールドに適用され、入口のバブルで表示されます（VRでも）。',
    readOnly: 'このルールを変更できるのは管理者の役割を持つ人だけです。閲覧はできます。',
    loading: 'ルールを読み込んでいます…',
    failed: '今はルールを読み込めませんでした。',
    retry: '再試行',
    fixed: {
      label: 'Numinia · 常に先頭 · 削除不可',
      text: 'Numiniaのルールは常にあなたのルールより先に表示され、削除できません。',
      link: 'Numinia 利用規約 · v{version}',
    },
    own: {
      label: 'あなたのルール',
      inForce: '有効: バージョン {version}',
      none: 'まだ独自のルールを公開していません。今はNuminiaのルールだけが適用されます。最初のルールを追加して公開してください。',
      noneRead:
        'このコミュニティはまだ独自のルールを公開していません。Numiniaのルールだけが適用されます。',
      mandatory: '必須',
      optional: '任意',
      norm: 'ルール',
      data: 'データ',
    },
    edit: {
      point: '項目 {n}',
      titleLabel: 'タイトル',
      textLabel: '本文',
      mandatoryLabel: '必須か任意か',
      kindLabel: '種類',
      kindHint:
        'ルール: スペースの決まり事。データ: 個人のデータに関する許可（セッションレポート、お知らせ、聞き取るAI）。',
      dataNote: 'データは必須にできません。断っても入場できます。',
      remove: 'この項目を削除',
      add: '+ ルールを追加',
      full: '項目はすでに上限の20件です。',
    },
    publish: {
      versionLabel: '新しいバージョン',
      versionHint: '未使用の番号（例: 1.1）。',
      button: 'バージョン {version} を公開',
      buttonBare: '公開',
      note: '公開すると、戻ってきた人には変更点だけが表示されます。公開済みのバージョンは削除されません。',
      publishing: '公開しています…',
      done: 'バージョン {version} を公開しました。',
      failed: '公開できませんでした。もう一度お試しください。',
      problems: '公開前にこちらを確認してください:',
      discard: '変更を破棄',
    },
    history: {
      title: '公開済みのバージョン',
      empty: 'まだありません。',
      inForce: '有効',
      points: '{count} 項目',
    },
  },
  ko: {
    title: '공간의 규칙',
    lead: '여러분의 월드에 들어오는 사람이 동의하는 내용입니다. 모든 월드에 적용되며 입장 버블에서 보입니다(VR에서도).',
    readOnly: '관리자 역할이 있는 사람만 이 규칙을 바꿀 수 있습니다. 읽을 수는 있습니다.',
    loading: '규칙을 불러오는 중…',
    failed: '지금은 규칙을 불러오지 못했습니다.',
    retry: '다시 시도',
    fixed: {
      label: 'Numinia · 항상 맨 앞 · 삭제할 수 없음',
      text: 'Numinia의 규칙은 항상 여러분의 규칙보다 앞에 오며 삭제할 수 없습니다.',
      link: 'Numinia 이용약관 · v{version}',
    },
    own: {
      label: '우리 규칙',
      inForce: '시행 중: 버전 {version}',
      none: '아직 자체 규칙을 게시하지 않았습니다. 지금은 Numinia의 규칙만 적용됩니다. 첫 규칙을 추가하고 게시하세요.',
      noneRead: '이 커뮤니티는 아직 자체 규칙을 게시하지 않았습니다. Numinia의 규칙만 적용됩니다.',
      mandatory: '필수',
      optional: '선택',
      norm: '규칙',
      data: '데이터',
    },
    edit: {
      point: '항목 {n}',
      titleLabel: '제목',
      textLabel: '내용',
      mandatoryLabel: '필수 또는 선택',
      kindLabel: '유형',
      kindHint: '규칙: 공간의 규칙. 데이터: 개인 데이터에 대한 허가(세션 보고서, 알림, 듣는 AI).',
      dataNote: '데이터는 필수가 될 수 없습니다. 거부해도 입장할 수 있습니다.',
      remove: '이 항목 삭제',
      add: '+ 규칙 추가',
      full: '항목이 이미 최대인 20개입니다.',
    },
    publish: {
      versionLabel: '새 버전',
      versionHint: '쓰지 않은 번호(예: 1.1).',
      button: '버전 {version} 게시',
      buttonBare: '게시',
      note: '게시하면 다시 오는 사람에게는 바뀐 내용만 보입니다. 게시된 버전은 삭제되지 않습니다.',
      publishing: '게시하는 중…',
      done: '버전 {version}을(를) 게시했습니다.',
      failed: '게시하지 못했습니다. 다시 시도하세요.',
      problems: '게시하기 전에 확인하세요:',
      discard: '변경 취소',
    },
    history: {
      title: '게시된 버전',
      empty: '아직 없습니다.',
      inForce: '시행 중',
      points: '{count}개 항목',
    },
  },
  'pt-br': {
    title: 'Normas dos seus espaços',
    lead: 'O que aceita quem entra nos seus mundos. Valem para todos os seus mundos e são lidas na bolha de entrada, também em VR.',
    readOnly: 'Só quem tem o papel de administrador altera estas normas. Você pode lê-las.',
    loading: 'Lendo as normas…',
    failed: 'Não foi possível ler as normas agora.',
    retry: 'Tentar de novo',
    fixed: {
      label: 'Numinia · sempre na frente · não podem ser removidas',
      text: 'As normas da Numinia vêm sempre antes das suas e não podem ser removidas.',
      link: 'Termos de Uso da Numinia · v{version}',
    },
    own: {
      label: 'As suas',
      inForce: 'Em vigor: versão {version}',
      none: 'Vocês ainda não publicaram normas próprias: só valem as da Numinia. Adicione a primeira e publique.',
      noneRead: 'Esta comunidade ainda não publicou normas próprias: só valem as da Numinia.',
      mandatory: 'Obrigatória',
      optional: 'Opcional',
      norm: 'Norma',
      data: 'Dados',
    },
    edit: {
      point: 'Ponto {n}',
      titleLabel: 'Título',
      textLabel: 'Texto',
      mandatoryLabel: 'Obrigatória ou opcional',
      kindLabel: 'Tipo',
      kindHint:
        'Norma: uma regra do espaço. Dados: uma permissão sobre dados da pessoa (relatório de sessão, avisos, uma IA que escuta).',
      dataNote: 'Dados nunca podem ser obrigatórios: quem os recusa entra mesmo assim.',
      remove: 'Remover este ponto',
      add: '+ Adicionar uma norma',
      full: 'Já há 20 pontos, o máximo.',
    },
    publish: {
      versionLabel: 'Versão nova',
      versionHint: 'Um número que ainda não usaram, por exemplo 1.1.',
      button: 'Publicar versão {version}',
      buttonBare: 'Publicar',
      note: 'Ao publicar, quem voltar verá só o que mudou. As versões publicadas não são apagadas.',
      publishing: 'Publicando…',
      done: 'Versão {version} publicada.',
      failed: 'Não foi possível publicar. Tente de novo.',
      problems: 'Revise isto antes de publicar:',
      discard: 'Descartar alterações',
    },
    history: {
      title: 'Versões publicadas',
      empty: 'Ainda não há nenhuma.',
      inForce: 'em vigor',
      points: '{count} pontos',
    },
  },
};
