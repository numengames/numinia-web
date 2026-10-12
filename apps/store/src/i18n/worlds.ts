/**
 * The worlds room's words (LAP › Worlds), five locales. The room's frame
 * (title, intro, refusal) stays in lap.ts with the rest of the LAP; these
 * are the console's own: figures, filters, views, cards, the machines, the
 * wizard, the signed actions and the history. `{name}` placeholders are
 * filled by `fill()` in lib/worlds.ts.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { RequestKind } from '../lib/fleet';

export interface WorldsRoomMessages {
  readonly loading: string;
  readonly failed: string;
  readonly retry: string;
  readonly empty: string;
  readonly noMatch: string;
  /** No machine's door answers: nothing can be created right now. */
  readonly noMachine: string;
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
    readonly changing: string;
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
    readonly creating: string;
    readonly stopping: string;
    readonly starting: string;
    readonly deleting: string;
    readonly unknown: string;
  };
  readonly badges: {
    readonly missingCard: string;
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
    readonly delete: string;
    readonly download: string;
    readonly newWorld: string;
    readonly more: string;
    readonly less: string;
  };
  readonly unplaced: string;
  readonly coverAlt: string;
  /** The fleet's machines, each through its door. */
  readonly machines: {
    readonly title: string;
    readonly open: string;
    readonly closed: string;
    /** Above the bootstrap line, which carries the Oracle's own wallet. */
    readonly connect: string;
    readonly copy: string;
    readonly copied: string;
    readonly adminCode: string;
  };
  /** One signed request on its way: `{m}` is the machine. */
  readonly steps: {
    readonly signing: string;
    readonly sending: string;
    readonly working: string;
    readonly preparing: string;
  };
  /** Why a signed request did not go through: `{m}` machine, `{w}` wallet, `{rule}`, `{code}`. */
  readonly problems: {
    readonly noWallet: string;
    readonly otherWallet: string;
    readonly declined: string;
    readonly notOracle: string;
    readonly expired: string;
    readonly replayed: string;
    readonly exists: string;
    readonly addressTaken: string;
    readonly missing: string;
    readonly addressMismatch: string;
    readonly refused: string;
    readonly otherMachine: string;
    readonly slowDown: string;
    readonly noAdminCode: string;
    readonly origin: string;
    readonly unreachable: string;
    readonly machine: string;
    readonly late: string;
    readonly generic: string;
  };
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
    readonly serverLabel: string;
    readonly serverHint: string;
    readonly domainLabel: string;
    readonly domainHint: string;
    readonly zoneLabel: string;
    readonly labelInvalid: string;
    readonly addressTaken: string;
    readonly legacyMove: string;
    readonly dnsChecking: string;
    readonly dnsMachine: string;
    readonly dnsElsewhere: string;
    readonly dnsNone: string;
    readonly dnsUnknown: string;
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
    /** Empties the wizard: the draft is kept otherwise, even when it is closed. */
    readonly restart: string;
    readonly create: string;
    readonly resultTitle: string;
    readonly resultNote: string;
    readonly openWorld: string;
    readonly done: string;
  };
  /** The machine's admin code, shown to a signed Oracle. */
  readonly code: {
    readonly title: string;
    readonly intro: string;
    readonly confirm: string;
    readonly shown: string;
    readonly chat: string;
  };
  readonly change: {
    readonly stopTitle: string;
    readonly startTitle: string;
    readonly deleteTitle: string;
    readonly downloadTitle: string;
    readonly stopIntro: string;
    readonly startIntro: string;
    readonly deleteWarning: string;
    /** `{d}` is the world's address. */
    readonly deleteSteps: readonly string[];
    readonly deleteCopyFirst: string;
    readonly downloadFirst: string;
    readonly downloadIntro: string;
    readonly typeToConfirm: string;
    readonly stopConfirm: string;
    readonly startConfirm: string;
    readonly deleteConfirm: string;
    readonly downloadConfirm: string;
    readonly stopped: string;
    readonly started: string;
    readonly deleted: string;
  };
  /** A ready copy: `{f}` file name, `{s}` size, `{h}` fingerprint, `{when}` expiry. */
  readonly copy: {
    readonly ready: string;
    readonly save: string;
    readonly fingerprint: string;
    readonly expires: string;
  };
  readonly history: {
    readonly title: string;
    readonly empty: string;
    readonly failed: string;
    readonly kinds: Readonly<Record<RequestKind, string>>;
  };
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
    failed: 'No se pudo leer la flota ({detail}).',
    retry: 'Reintentar',
    empty: 'Todavía no hay mundos en la flota. Crea el primero con «Nuevo mundo».',
    noMatch: 'Ningún mundo coincide con los filtros.',
    noMachine: 'Ninguna máquina responde ahora mismo: no se pueden crear mundos.',
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
      changing: 'Cambiando',
    },
    reasons: {
      users: '{n} dentro',
      uptime: 'encendido hace {t}',
      engine: 'motor {c}',
      timeout: 'no contestó en 3 s',
      network: 'no se pudo conectar',
      http: 'respondió {s}',
      shape: 'contestó algo que no es un mundo',
      stopped: 'parado',
      creating: 'su máquina lo está creando',
      stopping: 'su máquina lo está parando',
      starting: 'su máquina lo está arrancando',
      deleting: 'su máquina lo está borrando',
      unknown: 'todavía sin comprobar',
    },
    badges: {
      missingCard: 'Sin ficha',
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
      delete: 'Borrar',
      download: 'Descargar',
      newWorld: 'Nuevo mundo',
      more: 'Ver {n} más',
      less: 'Ver menos',
    },
    unplaced: 'Sin lugar conocido',
    coverAlt: 'Carátula de {t}',
    machines: {
      title: 'Máquinas',
      open: '{m} responde',
      closed: '{m} no responde ({why}).',
      connect:
        'Si es nueva, o todavía no conoce tu cartera, entra una vez en ella y ejecuta esta línea; lleva tu cartera dentro:',
      copy: 'Copiar',
      copied: 'Copiado',
      adminCode: 'Código de administración',
    },
    steps: {
      signing: 'Tu cartera te pide firmar…',
      sending: 'Enviando la petición a {m}…',
      working: '{m} lo está haciendo…',
      preparing: '{m} está preparando el zip…',
    },
    problems: {
      noWallet:
        'No encuentro en este navegador la cartera con la que entraste. Vuelve a Sesión, conéctala y repite.',
      otherWallet:
        'La cartera conectada ({w}) no es la de tu sesión. Cambia de cuenta en la cartera o vuelve a entrar.',
      declined: 'Has cancelado la firma: no se ha enviado nada.',
      notOracle:
        '{m} no tiene tu cartera en su lista de Oráculos. Ejecuta en la máquina su línea de arranque con tu cartera.',
      expired: 'La firma llegó caducada: revisa la hora de tu ordenador y repite.',
      replayed: 'Esa petición ya se había enviado.',
      exists: 'Ya hay un mundo con ese nombre en {m}.',
      addressTaken: 'Esa dirección ya es de otro mundo de {m}.',
      missing: 'Ese mundo ya no está en {m}; recarga la sala.',
      addressMismatch: 'La dirección no coincide con la del mundo; recarga la sala.',
      refused:
        '{m} no acepta esa orden: el motor, la dirección o los límites se salen de sus reglas.',
      otherMachine: 'Esa petición era para otra máquina.',
      slowDown: 'Demasiadas peticiones seguidas: espera un par de minutos.',
      noAdminCode: '{m} todavía no tiene código de administración.',
      origin: '{m} no acepta peticiones desde esta página.',
      unreachable: 'No se pudo hablar con {m}: no responde.',
      machine: '{m} lo intentó y no pudo ({rule}).',
      late: '{m} lo ha recibido, pero aún no ha terminado. Mira la sala en un minuto.',
      generic: '{m} no aceptó la petición ({code}).',
    },
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
      idHint: 'Minúsculas, números y guiones. Nombra a la vez el mundo y su ficha en la Summa.',
      cardLabel: 'Ficha en la Summa',
      serverLabel: 'Servidor',
      serverHint: 'La máquina de la flota donde correrá el mundo.',
      domainLabel: 'Dirección',
      domainHint: 'El nombre y la zona: el mundo se abrirá en esa dirección.',
      zoneLabel: 'Zona',
      labelInvalid: 'Una sola palabra: minúsculas, números y guiones, sin puntos.',
      addressTaken: '{d} ya es la dirección de {w}: elige otro nombre.',
      legacyMove:
        '{d} es hoy {w}, en la máquina antigua. Al crearlo aquí pasará a {m}: copia antes sus datos y apunta su registro DNS a {m}.',
      dnsChecking: 'Mirando a dónde apunta {d}…',
      dnsMachine: '{d} ya apunta a {m}: listo.',
      dnsElsewhere: '{d} ya apunta a otra máquina: elige otro nombre.',
      dnsNone:
        '{d} aún no existe en el DNS: crea un registro A hacia {m} (solo DNS); hasta entonces el mundo no se abrirá.',
      dnsUnknown: 'No se pudo comprobar a dónde apunta {d}; revísalo si el mundo no se abre.',
      imageLabel: 'Motor',
      imageHint: 'Una versión fijada del motor: etiqueta sha- o digest, nunca latest.',
      memoryLabel: 'Memoria',
      cpusLabel: 'CPU',
      uploadLabel: 'Subida máxima (MB)',
      confirmIntro:
        'Tu cartera te pedirá firmar esta petición. La máquina comprueba la firma y crea el mundo; nadie más tiene que aprobar nada.',
      invalid: 'Revisa: {fields}.',
      next: 'Siguiente',
      back: 'Atrás',
      cancel: 'Cancelar',
      restart: 'Empezar de nuevo',
      create: 'Firmar y crear',
      resultTitle: '{t} está naciendo',
      resultNote:
        '{m} ha creado el mundo. Se abre en {d} en cuanto arranque, en menos de un minuto.',
      openWorld: 'Abrir el mundo',
      done: 'Hecho',
    },
    code: {
      title: 'Código de administración de {m}',
      intro: 'Es el mismo para todos los mundos de {m}. Tu cartera te pedirá firmar para verlo.',
      confirm: 'Firmar y ver',
      shown: 'Código de administración:',
      chat: 'En el chat del mundo escribe /admin {code} y quedarás como administrador en ese navegador.',
    },
    change: {
      stopTitle: 'Parar {t}',
      startTitle: 'Arrancar {t}',
      deleteTitle: 'Borrar {t}',
      downloadTitle: 'Descargar {t}',
      stopIntro:
        'La máquina apaga el mundo. Sus datos se quedan: puedes volver a arrancarlo cuando quieras.',
      startIntro: 'La máquina lo vuelve a encender, con sus datos.',
      deleteWarning: 'Esto no se puede deshacer.',
      deleteSteps: [
        'la máquina apaga el mundo y deja de servir {d};',
        'se borran su base de datos, sus archivos, sus claves y las copias que había en la máquina;',
        'su ficha en la Summa se queda.',
      ],
      deleteCopyFirst: '¿Quieres conservarlo? Descarga antes una copia.',
      downloadFirst: 'Descargar una copia',
      downloadIntro:
        'La máquina prepara un zip con el mundo entero: su base de datos y sus archivos, un docker-compose para abrirlo en tu ordenador (localhost:3000) con claves nuevas, y una guía. El enlace dura un día.',
      typeToConfirm: 'Escribe {id} para confirmar.',
      stopConfirm: 'Firmar y parar',
      startConfirm: 'Firmar y arrancar',
      deleteConfirm: 'Borrar para siempre',
      downloadConfirm: 'Firmar y preparar',
      stopped: '{t} está parado.',
      started: '{t} vuelve a estar en marcha.',
      deleted: '{t} ya no existe.',
    },
    copy: {
      ready: 'Listo: {f} · {s}',
      save: 'Descargar el zip',
      fingerprint: 'Huella SHA-256: {h}',
      expires: 'El enlace caduca: {when}.',
    },
    history: {
      title: 'Lo que han hecho las máquinas',
      empty: 'Las máquinas todavía no han hecho nada.',
      failed: 'falló',
      kinds: {
        CreateWorld: 'creó',
        DeleteWorld: 'borró',
        StopWorld: 'paró',
        StartWorld: 'arrancó',
        DownloadWorld: 'copió',
        ShowAdminCode: 'mostró el código',
      },
    },
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
    failed: 'The fleet could not be read ({detail}).',
    retry: 'Try again',
    empty: 'No worlds in the fleet yet. Create the first one with “New world”.',
    noMatch: 'No world matches the filters.',
    noMachine: 'No machine is answering right now: worlds cannot be created.',
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
      changing: 'Changing',
    },
    reasons: {
      users: '{n} inside',
      uptime: 'up for {t}',
      engine: 'engine {c}',
      timeout: 'no answer within 3 s',
      network: 'could not connect',
      http: 'answered {s}',
      shape: 'answered something that is not a world',
      stopped: 'stopped',
      creating: 'its machine is creating it',
      stopping: 'its machine is stopping it',
      starting: 'its machine is starting it',
      deleting: 'its machine is deleting it',
      unknown: 'not checked yet',
    },
    badges: {
      missingCard: 'No card',
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
      delete: 'Delete',
      download: 'Download',
      newWorld: 'New world',
      more: 'Show {n} more',
      less: 'Show less',
    },
    unplaced: 'No known place',
    coverAlt: 'Cover of {t}',
    machines: {
      title: 'Machines',
      open: '{m} is answering',
      closed: '{m} is not answering ({why}).',
      connect:
        'If it is new, or does not know your wallet yet, log in to it once and run this line; it carries your wallet:',
      copy: 'Copy',
      copied: 'Copied',
      adminCode: 'Admin code',
    },
    steps: {
      signing: 'Your wallet asks you to sign…',
      sending: 'Sending the request to {m}…',
      working: '{m} is doing it…',
      preparing: '{m} is preparing the zip…',
    },
    problems: {
      noWallet:
        'The wallet you signed in with is not connected in this browser. Go back to Session, connect it and try again.',
      otherWallet:
        'The connected wallet ({w}) is not your session’s. Switch accounts in the wallet or sign in again.',
      declined: 'You cancelled the signature: nothing was sent.',
      notOracle:
        '{m} does not list your wallet as an Oracle. Run the machine’s bootstrap line on it with your wallet.',
      expired: 'The signature arrived expired: check your computer’s clock and try again.',
      replayed: 'That request had already been sent.',
      exists: '{m} already has a world with that name.',
      addressTaken: 'That address already belongs to another world on {m}.',
      missing: 'That world is no longer on {m}; reload the room.',
      addressMismatch: 'The address does not match the world’s; reload the room.',
      refused:
        '{m} does not accept that order: the engine, the address or the limits are outside its rules.',
      otherMachine: 'That request was for another machine.',
      slowDown: 'Too many requests in a row: wait a couple of minutes.',
      noAdminCode: '{m} has no admin code yet.',
      origin: '{m} does not accept requests from this page.',
      unreachable: 'Could not reach {m}: it is not answering.',
      machine: '{m} tried and could not ({rule}).',
      late: '{m} received it but has not finished yet. Look at the room in a minute.',
      generic: '{m} did not accept the request ({code}).',
    },
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
      idHint:
        'Lowercase letters, digits and hyphens. It names the world and its card in the Summa alike.',
      cardLabel: 'Card in the Summa',
      serverLabel: 'Server',
      serverHint: 'The fleet machine the world will run on.',
      domainLabel: 'Address',
      domainHint: 'A name and a zone: the world opens at that address.',
      zoneLabel: 'Zone',
      labelInvalid: 'One word: lowercase letters, digits and hyphens, no dots.',
      addressTaken: '{d} is already the address of {w}: choose another name.',
      legacyMove:
        '{d} is {w} today, on the old machine. Creating it here moves it to {m}: copy its data first and point its DNS record at {m}.',
      dnsChecking: 'Looking up where {d} points…',
      dnsMachine: '{d} already points at {m}: ready.',
      dnsElsewhere: '{d} already points at another machine: choose another name.',
      dnsNone:
        '{d} is not in DNS yet: create an A record to {m} (DNS only); until then the world will not open.',
      dnsUnknown: 'Could not check where {d} points; check it if the world does not open.',
      imageLabel: 'Engine',
      imageHint: 'A pinned engine build: a sha- tag or a digest, never latest.',
      memoryLabel: 'Memory',
      cpusLabel: 'CPU',
      uploadLabel: 'Largest upload (MB)',
      confirmIntro:
        'Your wallet will ask you to sign this request. The machine checks the signature and creates the world; nobody else has to approve anything.',
      invalid: 'Check: {fields}.',
      next: 'Next',
      back: 'Back',
      cancel: 'Cancel',
      restart: 'Start again',
      create: 'Sign and create',
      resultTitle: '{t} is being born',
      resultNote:
        '{m} has created the world. It opens at {d} as soon as it starts, in under a minute.',
      openWorld: 'Open the world',
      done: 'Done',
    },
    code: {
      title: 'Admin code of {m}',
      intro: 'It is the same for every world on {m}. Your wallet will ask you to sign to see it.',
      confirm: 'Sign and see',
      shown: 'Admin code:',
      chat: 'Type /admin {code} in the world’s chat and you are its admin in that browser.',
    },
    change: {
      stopTitle: 'Stop {t}',
      startTitle: 'Start {t}',
      deleteTitle: 'Delete {t}',
      downloadTitle: 'Download {t}',
      stopIntro:
        'The machine switches the world off. Its data stays: you can start it again whenever you like.',
      startIntro: 'The machine switches it on again, with its data.',
      deleteWarning: 'This cannot be undone.',
      deleteSteps: [
        'the machine switches the world off and stops serving {d};',
        'its database, its files, its keys and the copies on the machine are deleted;',
        'its card in the Summa stays.',
      ],
      deleteCopyFirst: 'Want to keep it? Download a copy first.',
      downloadFirst: 'Download a copy',
      downloadIntro:
        'The machine prepares a zip with the whole world: its database and files, a docker-compose to open it on your computer (localhost:3000) with fresh keys, and a short guide. The link lasts a day.',
      typeToConfirm: 'Type {id} to confirm.',
      stopConfirm: 'Sign and stop',
      startConfirm: 'Sign and start',
      deleteConfirm: 'Delete forever',
      downloadConfirm: 'Sign and prepare',
      stopped: '{t} is stopped.',
      started: '{t} is running again.',
      deleted: '{t} no longer exists.',
    },
    copy: {
      ready: 'Ready: {f} · {s}',
      save: 'Download the zip',
      fingerprint: 'SHA-256 fingerprint: {h}',
      expires: 'The link expires: {when}.',
    },
    history: {
      title: 'What the machines did',
      empty: 'The machines have done nothing yet.',
      failed: 'failed',
      kinds: {
        CreateWorld: 'created',
        DeleteWorld: 'deleted',
        StopWorld: 'stopped',
        StartWorld: 'started',
        DownloadWorld: 'copied',
        ShowAdminCode: 'showed the code',
      },
    },
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
    failed: 'フリートを読み込めませんでした（{detail}）。',
    retry: '再試行',
    empty:
      'フリートにはまだワールドがありません。「新しいワールド」で最初のワールドを作成してください。',
    noMatch: 'フィルターに一致するワールドはありません。',
    noMachine: '現在応答しているマシンがありません。ワールドを作成できません。',
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
      changing: '変更中',
    },
    reasons: {
      users: '{n} 人が滞在中',
      uptime: '起動から {t}',
      engine: 'エンジン {c}',
      timeout: '3 秒以内に応答なし',
      network: '接続できませんでした',
      http: '{s} を返しました',
      shape: 'ワールドではない応答でした',
      stopped: '停止中',
      creating: 'マシンが作成中',
      stopping: 'マシンが停止中',
      starting: 'マシンが起動中',
      deleting: 'マシンが削除中',
      unknown: 'まだ確認していません',
    },
    badges: {
      missingCard: 'カードなし',
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
      delete: '削除',
      download: 'ダウンロード',
      newWorld: '新しいワールド',
      more: 'さらに {n} 件',
      less: '表示を減らす',
    },
    unplaced: '場所不明',
    coverAlt: '{t} のカバー',
    machines: {
      title: 'マシン',
      open: '{m} は応答しています',
      closed: '{m} は応答していません（{why}）。',
      connect:
        '新しいマシンの場合、またはまだあなたのウォレットを知らない場合は、一度ログインしてこの行を実行してください（あなたのウォレットが含まれています）：',
      copy: 'コピー',
      copied: 'コピーしました',
      adminCode: '管理コード',
    },
    steps: {
      signing: 'ウォレットが署名を求めています…',
      sending: '{m} にリクエストを送信中…',
      working: '{m} が処理中…',
      preparing: '{m} が zip を準備中…',
    },
    problems: {
      noWallet:
        'ログインに使ったウォレットがこのブラウザで接続されていません。セッションに戻って接続し、もう一度お試しください。',
      otherWallet:
        '接続中のウォレット（{w}）はセッションのものではありません。ウォレットのアカウントを切り替えるか、ログインし直してください。',
      declined: '署名をキャンセルしました。何も送信されていません。',
      notOracle:
        '{m} はあなたのウォレットをオラクルとして登録していません。あなたのウォレットを付けてマシンの起動行を実行してください。',
      expired: '署名の期限が切れていました。コンピューターの時刻を確認してもう一度お試しください。',
      replayed: 'そのリクエストはすでに送信済みです。',
      exists: '{m} にはすでにその名前のワールドがあります。',
      addressTaken: 'そのアドレスは {m} の別のワールドが使っています。',
      missing: 'そのワールドはもう {m} にありません。ルームを再読み込みしてください。',
      addressMismatch: 'アドレスがワールドのものと一致しません。ルームを再読み込みしてください。',
      refused:
        '{m} はそのオーダーを受け付けません。エンジン、アドレス、または上限がルールの範囲外です。',
      otherMachine: 'そのリクエストは別のマシン宛てでした。',
      slowDown: 'リクエストが続きすぎています。数分お待ちください。',
      noAdminCode: '{m} にはまだ管理コードがありません。',
      origin: '{m} はこのページからのリクエストを受け付けません。',
      unreachable: '{m} と通信できませんでした。応答がありません。',
      machine: '{m} は試みましたが、できませんでした（{rule}）。',
      late: '{m} は受け取りましたが、まだ終わっていません。1 分後にルームを確認してください。',
      generic: '{m} はリクエストを受け付けませんでした（{code}）。',
    },
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
      idHint: '小文字・数字・ハイフン。ワールド名であり、スンマのカード名でもあります。',
      cardLabel: 'スンマのカード',
      serverLabel: 'サーバー',
      serverHint: 'ワールドを動かすフリートのマシン。',
      domainLabel: 'アドレス',
      domainHint: '名前とゾーン。ワールドはそのアドレスで開きます。',
      zoneLabel: 'ゾーン',
      labelInvalid: '1 語のみ：小文字・数字・ハイフン。ドットは使えません。',
      addressTaken: '{d} はすでに {w} のアドレスです。別の名前を選んでください。',
      legacyMove:
        '{d} は現在、旧マシン上の {w} です。ここで作成すると {m} に移ります。先にデータをコピーし、DNS レコードを {m} に向けてください。',
      dnsChecking: '{d} の向き先を確認中…',
      dnsMachine: '{d} はすでに {m} を指しています。準備完了。',
      dnsElsewhere: '{d} は別のマシンを指しています。別の名前を選んでください。',
      dnsNone:
        '{d} はまだ DNS にありません。{m} への A レコード（DNS のみ）を作成してください。それまでワールドは開きません。',
      dnsUnknown: '{d} の向き先を確認できませんでした。ワールドが開かない場合は確認してください。',
      imageLabel: 'エンジン',
      imageHint: '固定されたエンジンのビルド：sha- タグかダイジェスト。latest は不可。',
      memoryLabel: 'メモリ',
      cpusLabel: 'CPU',
      uploadLabel: '最大アップロード (MB)',
      confirmIntro:
        'ウォレットがこのリクエストへの署名を求めます。マシンが署名を確認してワールドを作成します。ほかの誰の承認も要りません。',
      invalid: '確認してください：{fields}。',
      next: '次へ',
      back: '戻る',
      cancel: 'キャンセル',
      restart: '最初からやり直す',
      create: '署名して作成',
      resultTitle: '{t} が誕生しています',
      resultNote: '{m} がワールドを作成しました。起動しだい、1 分以内に {d} で開きます。',
      openWorld: 'ワールドを開く',
      done: '完了',
    },
    code: {
      title: '{m} の管理コード',
      intro: '{m} のすべてのワールドで共通です。表示するにはウォレットで署名します。',
      confirm: '署名して表示',
      shown: '管理コード：',
      chat: 'ワールドのチャットで /admin {code} と入力すると、そのブラウザで管理者になります。',
    },
    change: {
      stopTitle: '{t} を停止',
      startTitle: '{t} を起動',
      deleteTitle: '{t} を削除',
      downloadTitle: '{t} をダウンロード',
      stopIntro: 'マシンがワールドを停止します。データは残り、いつでも再び起動できます。',
      startIntro: 'マシンがデータそのままで再び起動します。',
      deleteWarning: 'この操作は元に戻せません。',
      deleteSteps: [
        'マシンがワールドを停止し、{d} の提供をやめます。',
        'データベース、ファイル、鍵、マシン上のコピーが削除されます。',
        'スンマのカードは残ります。',
      ],
      deleteCopyFirst: '残しておきたい場合は、先にコピーをダウンロードしてください。',
      downloadFirst: 'コピーをダウンロード',
      downloadIntro:
        'マシンがワールド全体の zip を用意します：データベースとファイル、新しい鍵でパソコン上（localhost:3000）で開くための docker-compose、短いガイド。リンクの有効期限は 1 日です。',
      typeToConfirm: '確認のため {id} と入力してください。',
      stopConfirm: '署名して停止',
      startConfirm: '署名して起動',
      deleteConfirm: '完全に削除',
      downloadConfirm: '署名して準備',
      stopped: '{t} は停止しました。',
      started: '{t} は再び稼働中です。',
      deleted: '{t} はもう存在しません。',
    },
    copy: {
      ready: '準備完了：{f} · {s}',
      save: 'zip をダウンロード',
      fingerprint: 'SHA-256 フィンガープリント：{h}',
      expires: 'リンクの有効期限：{when}。',
    },
    history: {
      title: 'マシンの作業履歴',
      empty: 'マシンはまだ何もしていません。',
      failed: '失敗',
      kinds: {
        CreateWorld: '作成',
        DeleteWorld: '削除',
        StopWorld: '停止',
        StartWorld: '起動',
        DownloadWorld: 'コピー',
        ShowAdminCode: 'コード表示',
      },
    },
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
    failed: '플릿을 읽을 수 없습니다 ({detail}).',
    retry: '다시 시도',
    empty: '아직 플릿에 월드가 없습니다. “새 월드”로 첫 월드를 만드세요.',
    noMatch: '필터에 맞는 월드가 없습니다.',
    noMachine: '지금 응답하는 머신이 없습니다. 월드를 만들 수 없습니다.',
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
      changing: '변경 중',
    },
    reasons: {
      users: '{n}명 접속 중',
      uptime: '{t} 동안 켜짐',
      engine: '엔진 {c}',
      timeout: '3초 안에 응답 없음',
      network: '연결할 수 없음',
      http: '{s} 응답',
      shape: '월드가 아닌 응답',
      stopped: '정지됨',
      creating: '머신이 만드는 중',
      stopping: '머신이 정지하는 중',
      starting: '머신이 시작하는 중',
      deleting: '머신이 삭제하는 중',
      unknown: '아직 확인하지 않음',
    },
    badges: {
      missingCard: '카드 없음',
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
      delete: '삭제',
      download: '다운로드',
      newWorld: '새 월드',
      more: '{n}개 더 보기',
      less: '접기',
    },
    unplaced: '알려진 장소 없음',
    coverAlt: '{t}의 커버',
    machines: {
      title: '머신',
      open: '{m} 응답 중',
      closed: '{m} 응답 없음 ({why}).',
      connect:
        '새 머신이거나 아직 당신의 지갑을 모른다면, 한 번 접속해서 이 줄을 실행하세요. 당신의 지갑이 들어 있습니다:',
      copy: '복사',
      copied: '복사됨',
      adminCode: '관리 코드',
    },
    steps: {
      signing: '지갑이 서명을 요청합니다…',
      sending: '{m}(으)로 요청을 보내는 중…',
      working: '{m}이(가) 처리하는 중…',
      preparing: '{m}이(가) zip을 준비하는 중…',
    },
    problems: {
      noWallet:
        '로그인할 때 쓴 지갑이 이 브라우저에 연결되어 있지 않습니다. 세션으로 돌아가 연결한 뒤 다시 시도하세요.',
      otherWallet:
        '연결된 지갑({w})이 세션의 지갑이 아닙니다. 지갑에서 계정을 바꾸거나 다시 로그인하세요.',
      declined: '서명을 취소했습니다. 아무것도 보내지 않았습니다.',
      notOracle:
        '{m}의 오라클 목록에 당신의 지갑이 없습니다. 당신의 지갑으로 머신의 시작 줄을 실행하세요.',
      expired: '서명이 만료된 채 도착했습니다. 컴퓨터 시계를 확인하고 다시 시도하세요.',
      replayed: '그 요청은 이미 보냈습니다.',
      exists: '{m}에 이미 그 이름의 월드가 있습니다.',
      addressTaken: '그 주소는 이미 {m}의 다른 월드가 쓰고 있습니다.',
      missing: '그 월드는 더 이상 {m}에 없습니다. 방을 새로 고치세요.',
      addressMismatch: '주소가 월드의 주소와 맞지 않습니다. 방을 새로 고치세요.',
      refused: '{m}은(는) 그 주문을 받지 않습니다. 엔진, 주소 또는 한도가 규칙을 벗어납니다.',
      otherMachine: '그 요청은 다른 머신용이었습니다.',
      slowDown: '요청이 너무 연달아 왔습니다. 몇 분 기다리세요.',
      noAdminCode: '{m}에는 아직 관리 코드가 없습니다.',
      origin: '{m}은(는) 이 페이지의 요청을 받지 않습니다.',
      unreachable: '{m}에 연결할 수 없습니다. 응답이 없습니다.',
      machine: '{m}이(가) 시도했지만 할 수 없었습니다 ({rule}).',
      late: '{m}이(가) 받았지만 아직 끝나지 않았습니다. 1분 뒤에 방을 보세요.',
      generic: '{m}이(가) 요청을 받지 않았습니다 ({code}).',
    },
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
      idHint: '소문자, 숫자, 하이픈. 월드 이름이자 숨마 카드 이름입니다.',
      cardLabel: '숨마의 카드',
      serverLabel: '서버',
      serverHint: '월드가 실행될 플릿의 머신.',
      domainLabel: '주소',
      domainHint: '이름과 존: 월드는 그 주소에서 열립니다.',
      zoneLabel: '존',
      labelInvalid: '한 단어만: 소문자, 숫자, 하이픈. 점은 쓸 수 없습니다.',
      addressTaken: '{d}은(는) 이미 {w}의 주소입니다. 다른 이름을 고르세요.',
      legacyMove:
        '{d}은(는) 지금 옛 머신의 {w}입니다. 여기서 만들면 {m}(으)로 옮겨집니다. 먼저 데이터를 복사하고 DNS 레코드를 {m}(으)로 돌리세요.',
      dnsChecking: '{d}이(가) 가리키는 곳을 확인하는 중…',
      dnsMachine: '{d}은(는) 이미 {m}을(를) 가리킵니다. 준비 완료.',
      dnsElsewhere: '{d}은(는) 다른 머신을 가리킵니다. 다른 이름을 고르세요.',
      dnsNone:
        '{d}은(는) 아직 DNS에 없습니다. {m}(으)로 향하는 A 레코드(DNS 전용)를 만드세요. 그때까지 월드는 열리지 않습니다.',
      dnsUnknown: '{d}이(가) 가리키는 곳을 확인하지 못했습니다. 월드가 열리지 않으면 확인하세요.',
      imageLabel: '엔진',
      imageHint: '고정된 엔진 빌드: sha- 태그나 다이제스트, latest는 안 됩니다.',
      memoryLabel: '메모리',
      cpusLabel: 'CPU',
      uploadLabel: '최대 업로드 (MB)',
      confirmIntro:
        '지갑이 이 요청에 서명하라고 합니다. 머신이 서명을 확인하고 월드를 만듭니다. 다른 누구의 승인도 필요 없습니다.',
      invalid: '확인하세요: {fields}.',
      next: '다음',
      back: '뒤로',
      cancel: '취소',
      restart: '처음부터 다시',
      create: '서명하고 만들기',
      resultTitle: '{t}이(가) 태어나는 중',
      resultNote: '{m}이(가) 월드를 만들었습니다. 시작되는 대로 1분 안에 {d}에서 열립니다.',
      openWorld: '월드 열기',
      done: '완료',
    },
    code: {
      title: '{m}의 관리 코드',
      intro: '{m}의 모든 월드에 같은 코드입니다. 보려면 지갑으로 서명합니다.',
      confirm: '서명하고 보기',
      shown: '관리 코드:',
      chat: '월드 채팅에 /admin {code}을(를) 입력하면 그 브라우저에서 관리자가 됩니다.',
    },
    change: {
      stopTitle: '{t} 정지',
      startTitle: '{t} 시작',
      deleteTitle: '{t} 삭제',
      downloadTitle: '{t} 다운로드',
      stopIntro: '머신이 월드를 끕니다. 데이터는 남으며 언제든 다시 시작할 수 있습니다.',
      startIntro: '머신이 데이터 그대로 다시 켭니다.',
      deleteWarning: '이 작업은 되돌릴 수 없습니다.',
      deleteSteps: [
        '머신이 월드를 끄고 {d} 제공을 멈춥니다.',
        '데이터베이스, 파일, 키, 머신에 있던 사본이 삭제됩니다.',
        '숨마의 카드는 남습니다.',
      ],
      deleteCopyFirst: '보관하고 싶나요? 먼저 사본을 다운로드하세요.',
      downloadFirst: '사본 다운로드',
      downloadIntro:
        '머신이 월드 전체를 담은 zip을 준비합니다: 데이터베이스와 파일, 새 키로 컴퓨터(localhost:3000)에서 여는 docker-compose, 짧은 안내서. 링크는 하루 동안 유효합니다.',
      typeToConfirm: '확인하려면 {id}을(를) 입력하세요.',
      stopConfirm: '서명하고 정지',
      startConfirm: '서명하고 시작',
      deleteConfirm: '영구 삭제',
      downloadConfirm: '서명하고 준비',
      stopped: '{t}이(가) 정지되었습니다.',
      started: '{t}이(가) 다시 실행 중입니다.',
      deleted: '{t}은(는) 더 이상 없습니다.',
    },
    copy: {
      ready: '준비 완료: {f} · {s}',
      save: 'zip 다운로드',
      fingerprint: 'SHA-256 지문: {h}',
      expires: '링크 만료: {when}.',
    },
    history: {
      title: '머신이 한 일',
      empty: '머신이 아직 아무것도 하지 않았습니다.',
      failed: '실패',
      kinds: {
        CreateWorld: '만듦',
        DeleteWorld: '삭제함',
        StopWorld: '정지함',
        StartWorld: '시작함',
        DownloadWorld: '복사함',
        ShowAdminCode: '코드 표시',
      },
    },
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
    failed: 'Não foi possível ler a frota ({detail}).',
    retry: 'Tentar de novo',
    empty: 'Ainda não há mundos na frota. Crie o primeiro com “Novo mundo”.',
    noMatch: 'Nenhum mundo corresponde aos filtros.',
    noMachine: 'Nenhuma máquina está respondendo agora: não é possível criar mundos.',
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
      changing: 'Mudando',
    },
    reasons: {
      users: '{n} dentro',
      uptime: 'ligado há {t}',
      engine: 'motor {c}',
      timeout: 'sem resposta em 3 s',
      network: 'não foi possível conectar',
      http: 'respondeu {s}',
      shape: 'respondeu algo que não é um mundo',
      stopped: 'parado',
      creating: 'sua máquina está criando',
      stopping: 'sua máquina está parando',
      starting: 'sua máquina está iniciando',
      deleting: 'sua máquina está apagando',
      unknown: 'ainda não verificado',
    },
    badges: {
      missingCard: 'Sem ficha',
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
      delete: 'Apagar',
      download: 'Baixar',
      newWorld: 'Novo mundo',
      more: 'Ver mais {n}',
      less: 'Ver menos',
    },
    unplaced: 'Sem lugar conhecido',
    coverAlt: 'Capa de {t}',
    machines: {
      title: 'Máquinas',
      open: '{m} responde',
      closed: '{m} não responde ({why}).',
      connect:
        'Se for nova, ou ainda não conhecer a sua carteira, entre nela uma vez e rode esta linha; ela leva a sua carteira:',
      copy: 'Copiar',
      copied: 'Copiado',
      adminCode: 'Código de administração',
    },
    steps: {
      signing: 'Sua carteira pede que você assine…',
      sending: 'Enviando o pedido para {m}…',
      working: '{m} está fazendo…',
      preparing: '{m} está preparando o zip…',
    },
    problems: {
      noWallet:
        'A carteira com que você entrou não está conectada neste navegador. Volte a Sessão, conecte-a e repita.',
      otherWallet:
        'A carteira conectada ({w}) não é a da sua sessão. Troque de conta na carteira ou entre de novo.',
      declined: 'Você cancelou a assinatura: nada foi enviado.',
      notOracle:
        '{m} não tem a sua carteira na lista de Oráculos. Rode na máquina a linha de arranque com a sua carteira.',
      expired: 'A assinatura chegou vencida: confira o relógio do seu computador e repita.',
      replayed: 'Esse pedido já tinha sido enviado.',
      exists: 'Já existe um mundo com esse nome em {m}.',
      addressTaken: 'Esse endereço já é de outro mundo de {m}.',
      missing: 'Esse mundo já não está em {m}; recarregue a sala.',
      addressMismatch: 'O endereço não coincide com o do mundo; recarregue a sala.',
      refused: '{m} não aceita essa ordem: o motor, o endereço ou os limites saem das suas regras.',
      otherMachine: 'Esse pedido era para outra máquina.',
      slowDown: 'Pedidos demais seguidos: espere uns minutos.',
      noAdminCode: '{m} ainda não tem código de administração.',
      origin: '{m} não aceita pedidos a partir desta página.',
      unreachable: 'Não foi possível falar com {m}: não responde.',
      machine: '{m} tentou e não conseguiu ({rule}).',
      late: '{m} recebeu, mas ainda não terminou. Olhe a sala daqui a um minuto.',
      generic: '{m} não aceitou o pedido ({code}).',
    },
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
      idHint: 'Minúsculas, números e hífens. Nomeia ao mesmo tempo o mundo e a sua ficha na Summa.',
      cardLabel: 'Ficha na Summa',
      serverLabel: 'Servidor',
      serverHint: 'A máquina da frota onde o mundo vai rodar.',
      domainLabel: 'Endereço',
      domainHint: 'Um nome e uma zona: o mundo abre nesse endereço.',
      zoneLabel: 'Zona',
      labelInvalid: 'Uma só palavra: minúsculas, números e hífens, sem pontos.',
      addressTaken: '{d} já é o endereço de {w}: escolha outro nome.',
      legacyMove:
        '{d} é hoje {w}, na máquina antiga. Criá-lo aqui o leva para {m}: copie antes os seus dados e aponte o seu registro DNS para {m}.',
      dnsChecking: 'Verificando para onde {d} aponta…',
      dnsMachine: '{d} já aponta para {m}: pronto.',
      dnsElsewhere: '{d} já aponta para outra máquina: escolha outro nome.',
      dnsNone:
        '{d} ainda não existe no DNS: crie um registro A para {m} (só DNS); até lá o mundo não abre.',
      dnsUnknown: 'Não foi possível verificar para onde {d} aponta; confira se o mundo não abrir.',
      imageLabel: 'Motor',
      imageHint: 'Uma versão fixa do motor: etiqueta sha- ou digest, nunca latest.',
      memoryLabel: 'Memória',
      cpusLabel: 'CPU',
      uploadLabel: 'Envio máximo (MB)',
      confirmIntro:
        'Sua carteira vai pedir que você assine este pedido. A máquina confere a assinatura e cria o mundo; ninguém mais precisa aprovar nada.',
      invalid: 'Revise: {fields}.',
      next: 'Seguinte',
      back: 'Voltar',
      cancel: 'Cancelar',
      restart: 'Começar de novo',
      create: 'Assinar e criar',
      resultTitle: '{t} está nascendo',
      resultNote: '{m} criou o mundo. Ele abre em {d} assim que arrancar, em menos de um minuto.',
      openWorld: 'Abrir o mundo',
      done: 'Feito',
    },
    code: {
      title: 'Código de administração de {m}',
      intro:
        'É o mesmo para todos os mundos de {m}. Sua carteira vai pedir que você assine para vê-lo.',
      confirm: 'Assinar e ver',
      shown: 'Código de administração:',
      chat: 'No chat do mundo escreva /admin {code} e você fica como administrador nesse navegador.',
    },
    change: {
      stopTitle: 'Parar {t}',
      startTitle: 'Iniciar {t}',
      deleteTitle: 'Apagar {t}',
      downloadTitle: 'Baixar {t}',
      stopIntro:
        'A máquina desliga o mundo. Os dados ficam: você pode iniciá-lo de novo quando quiser.',
      startIntro: 'A máquina o liga de novo, com os seus dados.',
      deleteWarning: 'Isto não pode ser desfeito.',
      deleteSteps: [
        'a máquina desliga o mundo e deixa de servir {d};',
        'apagam-se a sua base de dados, os seus arquivos, as suas chaves e as cópias que havia na máquina;',
        'a sua ficha na Summa fica.',
      ],
      deleteCopyFirst: 'Quer guardá-lo? Baixe antes uma cópia.',
      downloadFirst: 'Baixar uma cópia',
      downloadIntro:
        'A máquina prepara um zip com o mundo inteiro: sua base de dados e seus arquivos, um docker-compose para abri-lo no seu computador (localhost:3000) com chaves novas, e um guia. O link dura um dia.',
      typeToConfirm: 'Escreva {id} para confirmar.',
      stopConfirm: 'Assinar e parar',
      startConfirm: 'Assinar e iniciar',
      deleteConfirm: 'Apagar para sempre',
      downloadConfirm: 'Assinar e preparar',
      stopped: '{t} está parado.',
      started: '{t} voltou a rodar.',
      deleted: '{t} já não existe.',
    },
    copy: {
      ready: 'Pronto: {f} · {s}',
      save: 'Baixar o zip',
      fingerprint: 'Impressão SHA-256: {h}',
      expires: 'O link vence: {when}.',
    },
    history: {
      title: 'O que as máquinas fizeram',
      empty: 'As máquinas ainda não fizeram nada.',
      failed: 'falhou',
      kinds: {
        CreateWorld: 'criou',
        DeleteWorld: 'apagou',
        StopWorld: 'parou',
        StartWorld: 'iniciou',
        DownloadWorld: 'copiou',
        ShowAdminCode: 'mostrou o código',
      },
    },
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
