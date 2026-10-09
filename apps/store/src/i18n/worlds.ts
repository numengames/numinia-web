/**
 * The worlds room's words (LAP › Worlds), five locales. The room's frame
 * (title, intro, refusal) stays in lap.ts with the rest of the LAP; these
 * are the console's own: figures, filters, views, cards, the wizard, the
 * change dialogs and the history. `{name}` placeholders are filled by
 * `fill()` in lib/worlds.ts.
 */

import type { SupportedLocale } from '@numinia/domain';

export interface WorldsRoomMessages {
  readonly loading: string;
  readonly failed: string;
  readonly retry: string;
  readonly empty: string;
  readonly noMatch: string;
  readonly keyless: string;
  readonly stats: {
    readonly total: string;
    readonly running: string;
    readonly stopped: string;
    readonly problems: string;
  };
  readonly search: string;
  readonly allStates: string;
  readonly allServers: string;
  readonly serverFilter: string;
  readonly views: {
    readonly label: string;
    readonly cards: string;
    readonly list: string;
    readonly servers: string;
  };
  readonly status: {
    readonly running: string;
    readonly stopped: string;
    readonly unreachable: string;
    readonly unknown: string;
    readonly requested: string;
  };
  readonly reasons: {
    readonly users: string;
    readonly uptime: string;
    readonly engine: string;
    readonly timeout: string;
    readonly network: string;
    readonly http: string;
    readonly shape: string;
    readonly stopped: string;
    readonly requested: string;
    readonly unknown: string;
  };
  readonly badges: {
    readonly missingCard: string;
    readonly pending: string;
    readonly legacy: string;
    readonly legacyNote: string;
  };
  readonly fields: {
    readonly world: string;
    readonly address: string;
    readonly server: string;
    readonly build: string;
    readonly limits: string;
    readonly state: string;
  };
  readonly actions: {
    readonly open: string;
    readonly stop: string;
    readonly start: string;
    readonly close: string;
    readonly newWorld: string;
    readonly more: string;
    readonly less: string;
    readonly order: string;
  };
  readonly unplaced: string;
  readonly coverAlt: string;
  readonly wizard: {
    readonly title: string;
    readonly stepCard: string;
    readonly stepPlace: string;
    readonly stepEngine: string;
    readonly stepConfirm: string;
    readonly cardIntro: string;
    readonly cardNone: string;
    readonly idLabel: string;
    readonly idHint: string;
    readonly cardLabel: string;
    readonly cardHint: string;
    readonly serverLabel: string;
    readonly serverHint: string;
    readonly domainLabel: string;
    readonly domainHint: string;
    readonly imageLabel: string;
    readonly imageHint: string;
    readonly memoryLabel: string;
    readonly cpusLabel: string;
    readonly uploadLabel: string;
    readonly confirmIntro: string;
    readonly invalid: string;
    readonly next: string;
    readonly back: string;
    readonly cancel: string;
    readonly propose: string;
    readonly proposing: string;
    readonly resultTitle: string;
    readonly resultPr: string;
    readonly resultAfter: string;
    readonly manualTitle: string;
    readonly manualNote: string;
    readonly manualEdit: string;
    readonly openGithub: string;
    readonly done: string;
    readonly error: string;
    readonly pendingExists: string;
  };
  readonly change: {
    readonly stopTitle: string;
    readonly startTitle: string;
    readonly closeTitle: string;
    readonly stopIntro: string;
    readonly startIntro: string;
    readonly closeIntro: string;
    readonly closeSteps: readonly string[];
    readonly typeToConfirm: string;
    readonly confirm: string;
  };
  readonly history: {
    readonly title: string;
    readonly empty: string;
    readonly all: string;
  };
  readonly invalidTitle: string;
  readonly fieldNames: {
    readonly id: string;
    readonly card: string;
    readonly server: string;
    readonly domain: string;
    readonly image: string;
    readonly memory: string;
    readonly cpus: string;
    readonly upload: string;
    readonly other: string;
  };
}

export const WORLDS_UI: Readonly<Record<SupportedLocale, WorldsRoomMessages>> = {
  es: {
    loading: 'Leyendo la flota…',
    failed: 'No se pudo leer el libro de órdenes ({detail}).',
    retry: 'Reintentar',
    empty:
      'Todavía no hay mundos en la flota. Cada mundo nace con su ficha en la Summa y su orden en numinia-assets.',
    noMatch: 'Ningún mundo coincide con los filtros.',
    keyless:
      'La sala aún no tiene llave para abrir propuestas: cada cambio se abre en GitHub, con tu cuenta.',
    stats: { total: 'Total', running: 'En marcha', stopped: 'Parados', problems: 'Con problemas' },
    search: 'Buscar por nombre, dirección o servidor…',
    allStates: 'Todos',
    allServers: 'Todos los servidores',
    serverFilter: 'Servidor',
    views: { label: 'Vista', cards: 'Tarjetas', list: 'Lista', servers: 'Por servidor' },
    status: {
      running: 'En marcha',
      stopped: 'Parado',
      unreachable: 'No responde',
      unknown: 'Sin comprobar',
      requested: 'Pedido',
    },
    reasons: {
      users: '{n} dentro',
      uptime: 'encendido hace {t}',
      engine: 'motor {c}',
      timeout: 'no contestó en 3 s',
      network: 'no se pudo conectar',
      http: 'respondió {s}',
      shape: 'contestó algo que no es un mundo',
      stopped: 'parado por su orden',
      requested: 'pedido en la propuesta #{n}',
      unknown: 'todavía sin comprobar',
    },
    badges: {
      missingCard: 'Sin ficha',
      pending: 'Cambio pedido · #{n}',
      legacy: 'Legado',
      legacyNote:
        'Corre en la máquina antigua, montada a mano antes de la flota: la sala lo vigila, pero no lo cambia.',
    },
    fields: {
      world: 'Mundo',
      address: 'Dirección',
      server: 'Servidor',
      build: 'Motor',
      limits: 'Límites',
      state: 'Estado',
    },
    actions: {
      open: 'Abrir',
      stop: 'Parar',
      start: 'Arrancar',
      close: 'Cerrar',
      newWorld: 'Nuevo mundo',
      more: 'Ver {n} más',
      less: 'Ver menos',
      order: 'Ver la orden',
    },
    unplaced: 'Sin servidor todavía',
    coverAlt: 'Carátula de {t}',
    wizard: {
      title: 'Nuevo mundo',
      stepCard: 'Ficha',
      stepPlace: 'Lugar',
      stepEngine: 'Motor',
      stepConfirm: 'Confirmar',
      cardIntro:
        'Cada mundo tiene su ficha en la Summa: dice qué es y lleva la carátula, la misma imagen que verá quien entre mientras carga.',
      cardNone:
        'La Summa todavía no tiene fichas de mundos: escribe el nombre que tendrá la ficha.',
      idLabel: 'Nombre del mundo',
      idHint: 'Minúsculas, números y guiones. Es también el nombre del fichero de la orden.',
      cardLabel: 'Ficha en la Summa',
      cardHint: 'El nombre del fichero de la ficha en objects/, sin .md.',
      serverLabel: 'Servidor',
      serverHint: 'El alias del servidor, nunca su IP.',
      domainLabel: 'Dirección',
      domainHint: 'Debe apuntar al servidor antes de que el mundo arranque.',
      imageLabel: 'Motor',
      imageHint: 'Una versión fijada del motor: etiqueta sha- o digest, nunca latest.',
      memoryLabel: 'Memoria',
      cpusLabel: 'CPU',
      uploadLabel: 'Subida máxima (MB)',
      confirmIntro: 'Esta es la orden que se propondrá en el libro de la flota:',
      invalid: 'Revisa: {fields}.',
      next: 'Siguiente',
      back: 'Atrás',
      cancel: 'Cancelar',
      propose: 'Proponer',
      proposing: 'Abriendo la propuesta…',
      resultTitle: 'Propuesta abierta',
      resultPr: 'Pull request #{n}',
      resultAfter:
        'Cuando se apruebe, el servidor de la flota la leerá y hará el cambio. La sala lo mostrará en cuanto ocurra.',
      manualTitle: 'Ábrelo en GitHub',
      manualNote:
        'GitHub abrirá el cambio ya escrito; elige «Create a new branch and start a pull request» para proponerlo.',
      manualEdit:
        'GitHub abrirá la orden: cambia «state» a «{state}» y elige «Create a new branch and start a pull request».',
      openGithub: 'Abrir en GitHub',
      done: 'Hecho',
      error: 'No se pudo abrir la propuesta ({detail}).',
      pendingExists: 'Ya hay una propuesta abierta para este mundo.',
    },
    change: {
      stopTitle: 'Parar {t}',
      startTitle: 'Arrancar {t}',
      closeTitle: 'Cerrar {t}',
      stopIntro:
        'Se propondrá cambiar su orden a «parado». Al aprobarse, el servidor apaga el mundo; sus datos, su copia y su ficha se quedan.',
      startIntro:
        'Se propondrá cambiar su orden a «en marcha». Al aprobarse, el servidor lo vuelve a encender.',
      closeIntro: 'Se propondrá quitar su orden de la flota. Al aprobarse:',
      closeSteps: [
        'el servidor apaga el mundo y deja de servir su dirección;',
        'su ficha en la Summa, sus copias y sus datos se quedan: no se borra nada;',
        'volver a abrirlo es proponer una orden nueva.',
      ],
      typeToConfirm: 'Escribe {id} para confirmar.',
      confirm: 'Proponer',
    },
    history: {
      title: 'Historial de la flota',
      empty: 'El libro de órdenes aún no tiene historia.',
      all: 'Todo el historial en GitHub',
    },
    invalidTitle: 'Órdenes que no cumplen la regla del depósito',
    fieldNames: {
      id: 'nombre',
      card: 'ficha',
      server: 'servidor',
      domain: 'dirección',
      image: 'motor',
      memory: 'memoria',
      cpus: 'CPU',
      upload: 'subida máxima',
      other: 'el formato de la orden',
    },
  },
  en: {
    loading: 'Reading the fleet…',
    failed: 'The order book could not be read ({detail}).',
    retry: 'Try again',
    empty:
      'No worlds in the fleet yet. Each world is born with its card in the Summa and its order in numinia-assets.',
    noMatch: 'No world matches the filters.',
    keyless:
      'The room has no key to open proposals yet: each change opens on GitHub, under your own account.',
    stats: { total: 'Total', running: 'Running', stopped: 'Stopped', problems: 'Problems' },
    search: 'Search by name, address or server…',
    allStates: 'All',
    allServers: 'All servers',
    serverFilter: 'Server',
    views: { label: 'View', cards: 'Cards', list: 'List', servers: 'By server' },
    status: {
      running: 'Running',
      stopped: 'Stopped',
      unreachable: 'Not answering',
      unknown: 'Unchecked',
      requested: 'Requested',
    },
    reasons: {
      users: '{n} inside',
      uptime: 'up for {t}',
      engine: 'engine {c}',
      timeout: 'no answer within 3 s',
      network: 'could not connect',
      http: 'answered {s}',
      shape: 'answered something that is not a world',
      stopped: 'stopped by its order',
      requested: 'requested in proposal #{n}',
      unknown: 'not checked yet',
    },
    badges: {
      missingCard: 'No card',
      pending: 'Change requested · #{n}',
      legacy: 'Legacy',
      legacyNote:
        'Runs on the old machine, set up by hand before the fleet: the room watches it but does not change it.',
    },
    fields: {
      world: 'World',
      address: 'Address',
      server: 'Server',
      build: 'Engine',
      limits: 'Limits',
      state: 'State',
    },
    actions: {
      open: 'Open',
      stop: 'Stop',
      start: 'Start',
      close: 'Close',
      newWorld: 'New world',
      more: 'Show {n} more',
      less: 'Show less',
      order: 'See the order',
    },
    unplaced: 'No server yet',
    coverAlt: 'Cover of {t}',
    wizard: {
      title: 'New world',
      stepCard: 'Card',
      stepPlace: 'Place',
      stepEngine: 'Engine',
      stepConfirm: 'Confirm',
      cardIntro:
        'Every world has its card in the Summa: it says what the world is and carries the cover, the same picture people see while it loads.',
      cardNone: 'The Summa has no world cards yet: type the name the card will have.',
      idLabel: 'World name',
      idHint: 'Lowercase letters, digits and hyphens. It also names the order file.',
      cardLabel: 'Card in the Summa',
      cardHint: 'The card’s file name in objects/, without .md.',
      serverLabel: 'Server',
      serverHint: 'The server’s alias, never its IP.',
      domainLabel: 'Address',
      domainHint: 'It must point at the server before the world starts.',
      imageLabel: 'Engine',
      imageHint: 'A pinned engine build: a sha- tag or a digest, never latest.',
      memoryLabel: 'Memory',
      cpusLabel: 'CPU',
      uploadLabel: 'Largest upload (MB)',
      confirmIntro: 'This is the order that will be proposed in the fleet’s book:',
      invalid: 'Check: {fields}.',
      next: 'Next',
      back: 'Back',
      cancel: 'Cancel',
      propose: 'Propose',
      proposing: 'Opening the proposal…',
      resultTitle: 'Proposal opened',
      resultPr: 'Pull request #{n}',
      resultAfter:
        'Once approved, the fleet’s server reads it and makes the change. The room shows it as soon as it happens.',
      manualTitle: 'Open it on GitHub',
      manualNote:
        'GitHub opens the change already written; choose “Create a new branch and start a pull request” to propose it.',
      manualEdit:
        'GitHub opens the order: change “state” to “{state}” and choose “Create a new branch and start a pull request”.',
      openGithub: 'Open on GitHub',
      done: 'Done',
      error: 'The proposal could not be opened ({detail}).',
      pendingExists: 'This world already has an open proposal.',
    },
    change: {
      stopTitle: 'Stop {t}',
      startTitle: 'Start {t}',
      closeTitle: 'Close {t}',
      stopIntro:
        'This proposes setting its order to “stopped”. Once approved, the server switches the world off; its data, copy and card stay.',
      startIntro:
        'This proposes setting its order to “running”. Once approved, the server switches it on again.',
      closeIntro: 'This proposes removing its order from the fleet. Once approved:',
      closeSteps: [
        'the server switches the world off and stops serving its address;',
        'its card in the Summa, its copies and its data stay: nothing is deleted;',
        'reopening it means proposing a new order.',
      ],
      typeToConfirm: 'Type {id} to confirm.',
      confirm: 'Propose',
    },
    history: {
      title: 'Fleet history',
      empty: 'The order book has no history yet.',
      all: 'Full history on GitHub',
    },
    invalidTitle: 'Orders that break the depot’s rule',
    fieldNames: {
      id: 'name',
      card: 'card',
      server: 'server',
      domain: 'address',
      image: 'engine',
      memory: 'memory',
      cpus: 'CPU',
      upload: 'largest upload',
      other: 'the order’s format',
    },
  },
  ja: {
    loading: 'フリートを読み込み中…',
    failed: 'オーダーブックを読み込めませんでした（{detail}）。',
    retry: '再試行',
    empty:
      'フリートにはまだワールドがありません。各ワールドはスンマのカードと numinia-assets のオーダーから生まれます。',
    noMatch: 'フィルターに一致するワールドはありません。',
    keyless:
      'この部屋にはまだ提案を開く鍵がありません。変更はあなたのアカウントで GitHub 上に開かれます。',
    stats: { total: '合計', running: '稼働中', stopped: '停止中', problems: '問題あり' },
    search: '名前・アドレス・サーバーで検索…',
    allStates: 'すべて',
    allServers: 'すべてのサーバー',
    serverFilter: 'サーバー',
    views: { label: '表示', cards: 'カード', list: 'リスト', servers: 'サーバー別' },
    status: {
      running: '稼働中',
      stopped: '停止中',
      unreachable: '応答なし',
      unknown: '未確認',
      requested: '申請中',
    },
    reasons: {
      users: '{n} 人が滞在中',
      uptime: '起動から {t}',
      engine: 'エンジン {c}',
      timeout: '3 秒以内に応答なし',
      network: '接続できませんでした',
      http: '{s} を返しました',
      shape: 'ワールドではない応答でした',
      stopped: 'オーダーにより停止',
      requested: '提案 #{n} で申請中',
      unknown: 'まだ確認していません',
    },
    badges: {
      missingCard: 'カードなし',
      pending: '変更申請中 · #{n}',
      legacy: 'レガシー',
      legacyNote:
        'フリート以前に手作業で構築した旧マシンで稼働中。このルームは見守るだけで、変更はしません。',
    },
    fields: {
      world: 'ワールド',
      address: 'アドレス',
      server: 'サーバー',
      build: 'エンジン',
      limits: '上限',
      state: '状態',
    },
    actions: {
      open: '開く',
      stop: '停止',
      start: '起動',
      close: '閉じる',
      newWorld: '新しいワールド',
      more: 'さらに {n} 件',
      less: '表示を減らす',
      order: 'オーダーを見る',
    },
    unplaced: 'サーバー未定',
    coverAlt: '{t} のカバー',
    wizard: {
      title: '新しいワールド',
      stepCard: 'カード',
      stepPlace: '場所',
      stepEngine: 'エンジン',
      stepConfirm: '確認',
      cardIntro:
        '各ワールドはスンマにカードを持ちます。何のワールドかを示し、読み込み中に表示されるのと同じカバー画像を持ちます。',
      cardNone: 'スンマにはまだワールドのカードがありません。カードの名前を入力してください。',
      idLabel: 'ワールド名',
      idHint: '小文字・数字・ハイフン。オーダーファイルの名前にもなります。',
      cardLabel: 'スンマのカード',
      cardHint: 'objects/ にあるカードのファイル名（.md なし）。',
      serverLabel: 'サーバー',
      serverHint: 'サーバーの別名。IP は書きません。',
      domainLabel: 'アドレス',
      domainHint: 'ワールドの起動前にサーバーを指している必要があります。',
      imageLabel: 'エンジン',
      imageHint: '固定されたエンジンのビルド：sha- タグかダイジェスト。latest は不可。',
      memoryLabel: 'メモリ',
      cpusLabel: 'CPU',
      uploadLabel: '最大アップロード (MB)',
      confirmIntro: 'フリートの台帳に提案されるオーダーはこちらです：',
      invalid: '確認してください：{fields}。',
      next: '次へ',
      back: '戻る',
      cancel: 'キャンセル',
      propose: '提案する',
      proposing: '提案を作成中…',
      resultTitle: '提案を作成しました',
      resultPr: 'プルリクエスト #{n}',
      resultAfter:
        '承認されるとフリートのサーバーがそれを読み、変更を実行します。部屋にはすぐに反映されます。',
      manualTitle: 'GitHub で開く',
      manualNote:
        'GitHub が変更を書き込んだ状態で開きます。「Create a new branch and start a pull request」を選んで提案してください。',
      manualEdit:
        'GitHub がオーダーを開きます。「state」を「{state}」に変え、「Create a new branch and start a pull request」を選んでください。',
      openGithub: 'GitHub で開く',
      done: '完了',
      error: '提案を作成できませんでした（{detail}）。',
      pendingExists: 'このワールドにはすでに未処理の提案があります。',
    },
    change: {
      stopTitle: '{t} を停止',
      startTitle: '{t} を起動',
      closeTitle: '{t} を閉じる',
      stopIntro:
        'オーダーを「停止」にする提案をします。承認されるとサーバーがワールドを止めます。データ、コピー、カードは残ります。',
      startIntro: 'オーダーを「稼働」にする提案をします。承認されるとサーバーが再び起動します。',
      closeIntro: 'フリートからオーダーを外す提案をします。承認されると：',
      closeSteps: [
        'サーバーがワールドを止め、アドレスの提供をやめます。',
        'スンマのカード、コピー、データは残ります。何も削除されません。',
        '再開するには新しいオーダーを提案します。',
      ],
      typeToConfirm: '確認のため {id} と入力してください。',
      confirm: '提案する',
    },
    history: {
      title: 'フリートの履歴',
      empty: 'オーダーブックにはまだ履歴がありません。',
      all: 'GitHub ですべての履歴を見る',
    },
    invalidTitle: '保管庫のルールに合わないオーダー',
    fieldNames: {
      id: '名前',
      card: 'カード',
      server: 'サーバー',
      domain: 'アドレス',
      image: 'エンジン',
      memory: 'メモリ',
      cpus: 'CPU',
      upload: '最大アップロード',
      other: 'オーダーの形式',
    },
  },
  ko: {
    loading: '플릿을 읽는 중…',
    failed: '주문 장부를 읽을 수 없습니다 ({detail}).',
    retry: '다시 시도',
    empty:
      '아직 플릿에 월드가 없습니다. 각 월드는 숨마의 카드와 numinia-assets의 주문으로 태어납니다.',
    noMatch: '필터에 맞는 월드가 없습니다.',
    keyless:
      '이 방에는 아직 제안을 열 열쇠가 없습니다. 각 변경은 당신의 계정으로 GitHub에서 열립니다.',
    stats: { total: '전체', running: '실행 중', stopped: '정지됨', problems: '문제 있음' },
    search: '이름, 주소, 서버로 검색…',
    allStates: '전체',
    allServers: '모든 서버',
    serverFilter: '서버',
    views: { label: '보기', cards: '카드', list: '목록', servers: '서버별' },
    status: {
      running: '실행 중',
      stopped: '정지됨',
      unreachable: '응답 없음',
      unknown: '미확인',
      requested: '요청됨',
    },
    reasons: {
      users: '{n}명 접속 중',
      uptime: '{t} 동안 켜짐',
      engine: '엔진 {c}',
      timeout: '3초 안에 응답 없음',
      network: '연결할 수 없음',
      http: '{s} 응답',
      shape: '월드가 아닌 응답',
      stopped: '주문에 따라 정지됨',
      requested: '제안 #{n}에서 요청됨',
      unknown: '아직 확인하지 않음',
    },
    badges: {
      missingCard: '카드 없음',
      pending: '변경 요청됨 · #{n}',
      legacy: '레거시',
      legacyNote:
        '플릿 이전에 수작업으로 구성한 이전 서버에서 실행 중입니다. 이 방은 지켜보기만 하고 바꾸지 않습니다.',
    },
    fields: {
      world: '월드',
      address: '주소',
      server: '서버',
      build: '엔진',
      limits: '한도',
      state: '상태',
    },
    actions: {
      open: '열기',
      stop: '정지',
      start: '시작',
      close: '닫기',
      newWorld: '새 월드',
      more: '{n}개 더 보기',
      less: '접기',
      order: '주문 보기',
    },
    unplaced: '아직 서버 없음',
    coverAlt: '{t}의 커버',
    wizard: {
      title: '새 월드',
      stepCard: '카드',
      stepPlace: '장소',
      stepEngine: '엔진',
      stepConfirm: '확인',
      cardIntro:
        '모든 월드는 숨마에 카드가 있습니다. 월드가 무엇인지 말하고, 로딩 중에 보이는 것과 같은 커버 이미지를 담습니다.',
      cardNone: '숨마에 아직 월드 카드가 없습니다. 카드가 가질 이름을 입력하세요.',
      idLabel: '월드 이름',
      idHint: '소문자, 숫자, 하이픈. 주문 파일의 이름이기도 합니다.',
      cardLabel: '숨마의 카드',
      cardHint: 'objects/에 있는 카드 파일 이름(.md 제외).',
      serverLabel: '서버',
      serverHint: '서버의 별칭. IP는 쓰지 않습니다.',
      domainLabel: '주소',
      domainHint: '월드가 시작되기 전에 서버를 가리켜야 합니다.',
      imageLabel: '엔진',
      imageHint: '고정된 엔진 빌드: sha- 태그나 다이제스트, latest는 안 됩니다.',
      memoryLabel: '메모리',
      cpusLabel: 'CPU',
      uploadLabel: '최대 업로드 (MB)',
      confirmIntro: '플릿 장부에 제안될 주문입니다:',
      invalid: '확인하세요: {fields}.',
      next: '다음',
      back: '뒤로',
      cancel: '취소',
      propose: '제안하기',
      proposing: '제안을 여는 중…',
      resultTitle: '제안을 열었습니다',
      resultPr: '풀 리퀘스트 #{n}',
      resultAfter: '승인되면 플릿 서버가 이를 읽고 변경을 실행합니다. 방에는 바로 반영됩니다.',
      manualTitle: 'GitHub에서 열기',
      manualNote:
        'GitHub가 변경을 미리 작성한 채로 엽니다. “Create a new branch and start a pull request”를 골라 제안하세요.',
      manualEdit:
        'GitHub가 주문을 엽니다. “state”를 “{state}”(으)로 바꾸고 “Create a new branch and start a pull request”를 고르세요.',
      openGithub: 'GitHub에서 열기',
      done: '완료',
      error: '제안을 열 수 없습니다 ({detail}).',
      pendingExists: '이 월드에는 이미 열린 제안이 있습니다.',
    },
    change: {
      stopTitle: '{t} 정지',
      startTitle: '{t} 시작',
      closeTitle: '{t} 닫기',
      stopIntro:
        '주문을 “정지”로 바꾸는 제안을 합니다. 승인되면 서버가 월드를 끕니다. 데이터, 사본, 카드는 남습니다.',
      startIntro: '주문을 “실행”으로 바꾸는 제안을 합니다. 승인되면 서버가 다시 켭니다.',
      closeIntro: '플릿에서 주문을 빼는 제안을 합니다. 승인되면:',
      closeSteps: [
        '서버가 월드를 끄고 주소 제공을 멈춥니다.',
        '숨마의 카드, 사본, 데이터는 남습니다. 아무것도 지우지 않습니다.',
        '다시 열려면 새 주문을 제안합니다.',
      ],
      typeToConfirm: '확인하려면 {id}을(를) 입력하세요.',
      confirm: '제안하기',
    },
    history: {
      title: '플릿 기록',
      empty: '주문 장부에 아직 기록이 없습니다.',
      all: 'GitHub에서 전체 기록 보기',
    },
    invalidTitle: '보관소 규칙에 맞지 않는 주문',
    fieldNames: {
      id: '이름',
      card: '카드',
      server: '서버',
      domain: '주소',
      image: '엔진',
      memory: '메모리',
      cpus: 'CPU',
      upload: '최대 업로드',
      other: '주문 형식',
    },
  },
  'pt-br': {
    loading: 'Lendo a frota…',
    failed: 'Não foi possível ler o livro de ordens ({detail}).',
    retry: 'Tentar de novo',
    empty:
      'Ainda não há mundos na frota. Cada mundo nasce com sua ficha na Summa e sua ordem em numinia-assets.',
    noMatch: 'Nenhum mundo corresponde aos filtros.',
    keyless:
      'A sala ainda não tem chave para abrir propostas: cada mudança abre no GitHub, com a sua conta.',
    stats: {
      total: 'Total',
      running: 'Em execução',
      stopped: 'Parados',
      problems: 'Com problemas',
    },
    search: 'Buscar por nome, endereço ou servidor…',
    allStates: 'Todos',
    allServers: 'Todos os servidores',
    serverFilter: 'Servidor',
    views: { label: 'Visão', cards: 'Cartões', list: 'Lista', servers: 'Por servidor' },
    status: {
      running: 'Em execução',
      stopped: 'Parado',
      unreachable: 'Não responde',
      unknown: 'Não verificado',
      requested: 'Pedido',
    },
    reasons: {
      users: '{n} dentro',
      uptime: 'ligado há {t}',
      engine: 'motor {c}',
      timeout: 'sem resposta em 3 s',
      network: 'não foi possível conectar',
      http: 'respondeu {s}',
      shape: 'respondeu algo que não é um mundo',
      stopped: 'parado pela sua ordem',
      requested: 'pedido na proposta #{n}',
      unknown: 'ainda não verificado',
    },
    badges: {
      missingCard: 'Sem ficha',
      pending: 'Mudança pedida · #{n}',
      legacy: 'Legado',
      legacyNote:
        'Roda na máquina antiga, montada à mão antes da frota: a sala o acompanha, mas não o altera.',
    },
    fields: {
      world: 'Mundo',
      address: 'Endereço',
      server: 'Servidor',
      build: 'Motor',
      limits: 'Limites',
      state: 'Estado',
    },
    actions: {
      open: 'Abrir',
      stop: 'Parar',
      start: 'Iniciar',
      close: 'Fechar',
      newWorld: 'Novo mundo',
      more: 'Ver mais {n}',
      less: 'Ver menos',
      order: 'Ver a ordem',
    },
    unplaced: 'Ainda sem servidor',
    coverAlt: 'Capa de {t}',
    wizard: {
      title: 'Novo mundo',
      stepCard: 'Ficha',
      stepPlace: 'Lugar',
      stepEngine: 'Motor',
      stepConfirm: 'Confirmar',
      cardIntro:
        'Cada mundo tem sua ficha na Summa: diz o que ele é e leva a capa, a mesma imagem que quem entra vê enquanto carrega.',
      cardNone: 'A Summa ainda não tem fichas de mundos: escreva o nome que a ficha terá.',
      idLabel: 'Nome do mundo',
      idHint: 'Minúsculas, números e hífens. Também é o nome do arquivo da ordem.',
      cardLabel: 'Ficha na Summa',
      cardHint: 'O nome do arquivo da ficha em objects/, sem .md.',
      serverLabel: 'Servidor',
      serverHint: 'O apelido do servidor, nunca o seu IP.',
      domainLabel: 'Endereço',
      domainHint: 'Deve apontar para o servidor antes de o mundo iniciar.',
      imageLabel: 'Motor',
      imageHint: 'Uma versão fixa do motor: etiqueta sha- ou digest, nunca latest.',
      memoryLabel: 'Memória',
      cpusLabel: 'CPU',
      uploadLabel: 'Envio máximo (MB)',
      confirmIntro: 'Esta é a ordem que será proposta no livro da frota:',
      invalid: 'Revise: {fields}.',
      next: 'Seguinte',
      back: 'Voltar',
      cancel: 'Cancelar',
      propose: 'Propor',
      proposing: 'Abrindo a proposta…',
      resultTitle: 'Proposta aberta',
      resultPr: 'Pull request #{n}',
      resultAfter:
        'Quando for aprovada, o servidor da frota a lê e faz a mudança. A sala mostra assim que acontecer.',
      manualTitle: 'Abra no GitHub',
      manualNote:
        'O GitHub abre a mudança já escrita; escolha “Create a new branch and start a pull request” para propô-la.',
      manualEdit:
        'O GitHub abre a ordem: mude “state” para “{state}” e escolha “Create a new branch and start a pull request”.',
      openGithub: 'Abrir no GitHub',
      done: 'Feito',
      error: 'Não foi possível abrir a proposta ({detail}).',
      pendingExists: 'Este mundo já tem uma proposta aberta.',
    },
    change: {
      stopTitle: 'Parar {t}',
      startTitle: 'Iniciar {t}',
      closeTitle: 'Fechar {t}',
      stopIntro:
        'Será proposto mudar sua ordem para “parado”. Ao ser aprovada, o servidor desliga o mundo; seus dados, sua cópia e sua ficha ficam.',
      startIntro:
        'Será proposto mudar sua ordem para “em execução”. Ao ser aprovada, o servidor o liga de novo.',
      closeIntro: 'Será proposto tirar sua ordem da frota. Ao ser aprovada:',
      closeSteps: [
        'o servidor desliga o mundo e deixa de servir seu endereço;',
        'sua ficha na Summa, suas cópias e seus dados ficam: nada é apagado;',
        'reabri-lo é propor uma ordem nova.',
      ],
      typeToConfirm: 'Escreva {id} para confirmar.',
      confirm: 'Propor',
    },
    history: {
      title: 'Histórico da frota',
      empty: 'O livro de ordens ainda não tem histórico.',
      all: 'Todo o histórico no GitHub',
    },
    invalidTitle: 'Ordens que não cumprem a regra do depósito',
    fieldNames: {
      id: 'nome',
      card: 'ficha',
      server: 'servidor',
      domain: 'endereço',
      image: 'motor',
      memory: 'memória',
      cpus: 'CPU',
      upload: 'envio máximo',
      other: 'o formato da ordem',
    },
  },
};
