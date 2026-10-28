/**
 * The worlds room's words (LAP › Worlds), five locales. The room's frame
 * (title, intro, refusal) stays in lap.ts with the rest of the LAP; these
 * are the console's own: figures, filters, views, cards, the machines, the
 * wizard, the signed actions and the history. `{name}` placeholders are
 * filled by `fill()` in lib/worlds.ts.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { FollowedVersionKind, ImportRule, RequestKind, VersionProblem } from '../lib/fleet';
import type { ComingWords } from '../lib/worlds';

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
  readonly allHomes: string;
  readonly homeFilter: string;
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
  /** A world being changed, on its card: what is happening now, as a verb. */
  readonly phases: {
    readonly creating: string;
    readonly stopping: string;
    readonly starting: string;
    readonly deleting: string;
    /** A world from its zip: the zip on its way, then its machine checking it. */
    readonly uploading: string;
    readonly importing: string;
    /** A world moving to another build of its engine. */
    readonly updating: string;
    /** A version being published: the world is down for a few seconds. */
    readonly switching: string;
  };
  /** In place of a busy card's buttons. */
  readonly busyNote: string;
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
    readonly uploading: string;
    readonly importing: string;
    readonly updating: string;
    readonly switching: string;
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
    /** A running world's labelled door: the card says «Enter», not only an icon. */
    readonly enter: string;
    readonly stop: string;
    readonly start: string;
    readonly delete: string;
    readonly download: string;
    readonly newWorld: string;
    /** Opens the system's file picker for a world's zip. */
    readonly importZip: string;
    /** Moves a world of the Numinia Engine to its newest build. */
    readonly update: string;
    /** Holds a world on another build, with a reason; the machine's updates leave it alone. */
    readonly pin: string;
    /** Lets a held world follow the fleet's build again. */
    readonly unpin: string;
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
    /** The commit it was installed from: `{r}`, seven hex digits. */
    readonly recipe: string;
    /**
     * What its recipe updater says (lib/fleet.ts `recipeState`): each machine
     * follows `main` of numinia-assets by itself; the room only reports it.
     */
    readonly selfUpdate: {
      /** It does not update itself yet: `{m}`; the last line to run on it follows. */
      readonly manual: string;
      readonly current: string;
      readonly updating: string;
      readonly resting: string;
      /** It stopped on a recipe that failed: `{why}`, the machine's reason (or `haltedSome`). */
      readonly halted: string;
      readonly haltedSome: string;
      /** It would not install the newest recipe: `{why}`, the machine's reason. */
      readonly refused: string;
      readonly frozen: string;
      /** Held on one recipe: `{r}`, seven hex digits. */
      readonly held: string;
      readonly checking: string;
      /** The machine that takes each recipe first. */
      readonly canary: string;
    };
    /** Whether its reconciler keeps up: `{m}` machine, then `{t}` ago, `{n}` requests. */
    readonly slow: string;
    readonly failing: string;
    readonly silent: string;
    readonly lastRun: string;
    readonly waiting: string;
    /** A world it is deleting, gone from the list: `{d}` its address. */
    readonly freeing: string;
    /** The engines its door says it runs: `{e}`. */
    readonly engines: string;
  };
  /** The fleet's engine banner above the machines. */
  readonly fleetEngine: {
    /** Heading. */
    readonly title: string;
    /** The newest build: `{b}` its build string. */
    readonly current: string;
    /** Nobody is behind. */
    readonly upToDate: string;
    /** `{n}` the count of worlds behind it. */
    readonly behind: string;
    /** One laggard's line: `{id}`, `{m}` machine, `{b}` build. */
    readonly laggard: string;
    /** Its machine does not take updates. */
    readonly manual: string;
    /** `{n}` the count of worlds of another engine, left out. */
    readonly otherEngine: string;
    /** No release published yet. */
    readonly none: string;
    /** Worlds held on a build: `{n}` the count. */
    readonly pinned: string;
    /** One held world: `{id}`, `{m}` machine, `{b}` build, `{r}` the reason it was held. */
    readonly pinnedLine: string;
    /** A laggard that is held on purpose: `{id}`, `{m}`, `{b}`, `{r}`. */
    readonly laggardPinned: string;
    /** A laggard whose last update failed: `{id}`, `{m}`, `{b}`, `{e}` its machine's words. */
    readonly laggardFailed: string;
    /** A machine stopped its updates: `{m}`, `{r}` the reason it gave. */
    readonly halted: string;
    /** A machine stopped its updates and gave no reason: `{m}`. */
    readonly haltedNoReason: string;
    /** A machine's last pass of the self-updating timer: `{m}`, `{a}` what it did, `{when}` the time. */
    readonly lastPass: string;
    /** On a world's card, when it is held: `{b}` build, `{r}` reason. */
    readonly cardPinned: string;
  };
  /** One signed request on its way: `{m}` is the machine. */
  readonly steps: {
    readonly signing: string;
    readonly sending: string;
    readonly preparing: string;
  };
  /** Why a signed request did not go through: `{m}` machine, `{w}` wallet, `{rule}`, `{code}`. */
  readonly problems: {
    readonly noWallet: string;
    /** Under noWallet: opens Session in another tab. */
    readonly noWalletLink: string;
    readonly otherWallet: string;
    readonly declined: string;
    readonly notOracle: string;
    readonly expired: string;
    readonly replayed: string;
    readonly exists: string;
    readonly addressTaken: string;
    readonly stillDeleting: string;
    readonly missing: string;
    readonly addressMismatch: string;
    readonly refused: string;
    readonly otherMachine: string;
    readonly slowDown: string;
    readonly noAdminCode: string;
    /** That world is still being created, or its code changed: the machine takes one at a time. */
    readonly busy: string;
    readonly origin: string;
    readonly unreachable: string;
    readonly machine: string;
    readonly late: string;
    /** A new world or an update names an engine the machine does not run, or another engine than its own. */
    readonly unknownEngine: string;
    readonly engineMismatch: string;
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
    /** `{w}` the world that has the name. */
    readonly nameTaken: string;
    readonly nameFreeing: string;
    /** `{d}` the address. */
    readonly addressFreeing: string;
    readonly addressTaken: string;
    readonly legacyMove: string;
    readonly dnsChecking: string;
    readonly dnsMachine: string;
    readonly dnsElsewhere: string;
    readonly dnsNone: string;
    readonly dnsUnknown: string;
    /** The room will write the address's record itself (DNS desk): nobody has one yet. */
    readonly dnsCreate: string;
    /** The fleet's own record points at another machine: the room will move it. */
    readonly dnsMove: string;
    readonly dnsWriting: string;
    readonly dnsWriteFailed: string;
    readonly imageLabel: string;
    readonly imageHint: string;
    /** The engine step: the engines the chosen machine runs, `{m}`. */
    readonly engineLabel: string;
    readonly engineHint: string;
    /** The Numinia Engine has no published release yet: the option stays off. */
    readonly engineNoRelease: string;
    readonly memoryLabel: string;
    readonly cpusLabel: string;
    readonly uploadLabel: string;
    readonly confirmIntro: string;
    /** «Poder y saldo» (MVL-B): whether the new world starts running or not. */
    readonly powerLabel: string;
    readonly powerOn: string;
    readonly powerOff: string;
    readonly powerHint: string;
    /** The organization whose prepaid balance pays for it, asked only when it starts on. */
    readonly orgLabel: string;
    readonly orgNone: string;
    readonly orgLoading: string;
    readonly orgFailed: string;
    readonly balanceChecking: string;
    /** `{org}` the organization's name. */
    readonly balanceBlocked: string;
    readonly balanceOk: string;
    readonly topUpLink: string;
    readonly invalid: string;
    readonly next: string;
    readonly back: string;
    readonly cancel: string;
    /** Empties the wizard: the draft is kept otherwise, even when it is closed. */
    readonly restart: string;
    readonly create: string;
    readonly resultTitle: string;
    readonly resultNote: string;
    readonly done: string;
    readonly close: string;
  };
  /**
   * Each world's own admin code, on its card: shown, or changed, with one
   * signature. `{t}` the world's title, `{m}` its machine, `{code}` the code.
   */
  readonly code: {
    readonly label: string;
    readonly show: string;
    readonly rotate: string;
    readonly showTitle: string;
    readonly rotateTitle: string;
    readonly showIntro: string;
    /** Changing the code of a running world: it restarts. */
    readonly rotateIntro: string;
    /** Changing the code of a stopped world: it takes it when it starts. */
    readonly rotateStopped: string;
    readonly showConfirm: string;
    readonly rotateConfirm: string;
    /** Above the code: also the wizard's last screen, for a world just created. */
    readonly shown: string;
    readonly rotated: string;
    readonly rotatedNote: string;
    readonly rotatedStopped: string;
    readonly chat: string;
    /** Before signing, when the machine's door says no recipe: it does not know these requests yet. */
    readonly notYet: string;
  };
  /**
   * Card t_a856c570 (2026-10-18): renaming an existing world (or server)
   * from its card. `{t}` the world's current title.
   */
  readonly rename: {
    readonly label: string;
    readonly title: string;
    readonly fieldLabel: string;
    readonly save: string;
    readonly cancel: string;
    readonly forbidden: string;
    readonly failed: string;
    readonly saved: string;
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
    /** Another build of its engine: `{from}` and `{to}` are the builds. */
    readonly updateTitle: string;
    readonly updateIntro: string;
    readonly updateConfirm: string;
    /** Hold a world on a build: `{t}` its name, `{b}` its build now. */
    readonly pinTitle: string;
    readonly pinIntro: string;
    readonly pinBuild: string;
    readonly pinBuildHint: string;
    readonly pinBadBuild: string;
    readonly pinReason: string;
    readonly pinConfirm: string;
    /** Let it follow the fleet again: `{t}`, `{b}` the build it is held on, `{r}` the reason. */
    readonly unpinTitle: string;
    readonly unpinIntro: string;
    /** What the reason line starts with, to be kept or changed. */
    readonly unpinReasonDefault: string;
    readonly unpinConfirm: string;
    /** Before signing, when the machine is not obeying: `{m}`. */
    readonly notObeying: string;
  };
  /** A ready copy: `{f}` file name, `{s}` size, `{h}` fingerprint, `{when}` expiry. */
  readonly copy: {
    readonly ready: string;
    readonly save: string;
    readonly fingerprint: string;
    readonly expires: string;
  };
  /**
   * A world brought back from its zip (ImportWorld): picked or dropped, read
   * here, signed once, uploaded from its card, born stopped. `{m}` the
   * machine, `{w}` the world, `{f}` a file, `{s}`/`{max}` sizes, `{n}` a
   * count, `{p}` per cent.
   */
  readonly import: {
    /** No machine's door says it takes zips. */
    readonly noMachine: string;
    /** The overlay while a file is dragged over the room. */
    readonly dropTitle: string;
    readonly dropNote: string;
    readonly dropCap: string;
    readonly dropOne: string;
    readonly title: string;
    readonly stepPlace: string;
    readonly stepSign: string;
    readonly reading: string;
    /** What the zip is: `{d}` the copy's date. */
    readonly copyOf: string;
    readonly copyOfUndated: string;
    readonly folder: string;
    readonly engineImage: string;
    readonly keysNote: string;
    readonly machineLabel: string;
    /** The engine, one line: `{b}` its build. */
    readonly engineNote: string;
    /** `{b}` the exact byte count. */
    readonly zipLine: string;
    /** `{h}` the short fingerprint. */
    readonly fingerprint: string;
    readonly hashing: string;
    /** The zip could not be read to make its fingerprint. */
    readonly unreadable: string;
    readonly signNote: string;
    readonly sign: string;
    readonly pickAnother: string;
    /** On the world's card: `{sent}` of `{total}`. */
    readonly uploading: string;
    readonly keepOpen: string;
    readonly stop: string;
    readonly checking: string;
    readonly cutPill: string;
    readonly cut: string;
    readonly stopped: string;
    readonly retry: string;
    readonly discard: string;
    /** After a reload: the same zip again, or not the same zip. */
    readonly halfDone: string;
    readonly pickSame: string;
    readonly notSame: string;
    /** A zip on its way that this tab is not sending. */
    readonly elsewhere: string;
    readonly failedPill: string;
    /** The notice when it lands off-screen. */
    readonly landed: string;
    readonly landedClose: string;
    /** A landed world's reason line, on its card. */
    readonly fromZip: string;
    /** A Numinia Engine world's zip: `{v}` its version, `{n}` its files. */
    readonly engineWorld: string;
    readonly engineKeysNote: string;
    /** No machine that takes zips runs the Numinia Engine. */
    readonly noEngineMachine: string;
    /** No published Numinia Engine build to order it with. */
    readonly engineNoRelease: string;
    /** The engine's own one line why it would not read the zip: `{why}`. */
    readonly engineRefused: string;
    /** Before signing: what the room's own reading found, with its details (`{r}` a ratio). */
    readonly before: {
      readonly empty: string;
      readonly several: string;
      readonly folder: string;
      readonly tooManyFiles: string;
      readonly fileTooBig: string;
      readonly ratio: string;
      readonly unpackedTooBig: string;
      readonly unexpected: string;
      /** A Numinia Engine zip whose `mundo.json` is not the engine's export manifest: not JSON… */
      readonly mundoUnreadable: string;
      /** …another schema (`{s}` the `esquema` it declared)… */
      readonly mundoSchema: string;
      /** …another schema, none declared… */
      readonly mundoSchemaNone: string;
      /** …no list of files… */
      readonly mundoNoFiles: string;
      /** …or `{n}` of them. */
      readonly mundoSeveral: string;
    };
    /** Each rule a machine names, in Pablo's words: `{m}`, `{f}` the zip's name, `{s}` its size, `{max}` its machine's cap. */
    readonly rules: Readonly<Record<ImportRule, string>>;
    /** After a machine's rule, the zip entry it names: `{f}`. */
    readonly entry: string;
    /** The dialog's title when the zip goes into a world that is here as a version. */
    readonly versionTitle: string;
    /** What to do with a zip when a world of the fleet could take it as a version. */
    readonly versionLabel: string;
    /** The choice that brings the zip as a world of its own. */
    readonly versionNew: string;
    /** The choice to bring it into an existing world: `{t}` its name, `{d}` its address. */
    readonly versionOption: string;
    /** What the zip does not choose: the machine, the address and the limits are the world's. */
    readonly versionOwn: string;
    /** The world has one version: the zip becomes the second. */
    readonly versionOne: string;
    /** The world has two: `{n}` the unpublished version's number, which the zip's replaces. */
    readonly versionTwo: string;
    /** The one signature: `{m}` the machine, `{w}` the world. */
    readonly versionSignNote: string;
    /** The button that signs it. */
    readonly versionSign: string;
  };
  /**
   * A world's versions on its card (ADR: one is published, one may wait beside it).
   * `{n}` a version's number, `{p}` the published one's, `{s}` a size, `{w}` the
   * world, `{m}` its machine, `{state}` and `{rule}` what a machine says.
   */
  readonly versions: {
    readonly title: string;
    readonly label: string;
    /** The mark on the version people visit. */
    readonly published: string;
    /** How a version came to be; a copy names the one it was copied from (`{n}`). */
    readonly origin: { readonly created: string; readonly zip: string; readonly copy: string };
    /** `{s}` the size, approximate. */
    readonly size: string;
    readonly sizeNote: string;
    readonly download: string;
    readonly duplicate: string;
    readonly publish: string;
    readonly delete: string;
    /** Opens the zip dialog with this world chosen: the zip becomes a version of it. */
    readonly importZip: string;
    /** Under the block: with one version, and with two. */
    readonly noteOne: string;
    readonly noteTwo: string;
    /** A version on its way (describeComing): `{state}` is one of the three below, `{p}` per cent. */
    readonly coming: ComingWords;
    /** A request of this tab the machine took and has not finished. */
    readonly following: Readonly<Record<FollowedVersionKind, string>>;
    /** The notice when it finished. */
    readonly done: Readonly<Record<FollowedVersionKind, string>>;
    /** A machine failed after taking the request, with a rule the room has no words for. */
    readonly failed: string;
    readonly close: string;
    readonly dialog: {
      readonly publishTitle: string;
      readonly publishIntro: string;
      readonly publishKeep: string;
      readonly publishStopped: string;
      readonly publishConfirm: string;
      readonly deleteTitle: string;
      readonly deleteIntro: string;
      readonly deleteCopyFirst: string;
      readonly downloadFirst: string;
      readonly deleteConfirm: string;
      readonly duplicateTitle: string;
      readonly duplicateIntro: string;
      readonly duplicateConfirm: string;
      readonly downloadTitle: string;
      readonly downloadIntro: string;
    };
    /** Every refusal of a version request, in plain words: `{m}` the machine. */
    readonly problems: Readonly<Record<VersionProblem, string>>;
  };
  readonly history: {
    readonly title: string;
    readonly empty: string;
    readonly failed: string;
    /** How long the machine took: `{t}`. */
    readonly took: string;
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
    allHomes: 'Todas las organizaciones',
    homeFilter: 'Organización',
    views: { label: 'Vista', cards: 'Tarjetas', list: 'Lista', servers: 'Por servidor' },
    status: {
      running: 'En marcha',
      stopped: 'Parado',
      unreachable: 'No responde',
      unknown: 'Sin comprobar',
      changing: 'En curso',
    },
    phases: {
      creating: 'Creando…',
      stopping: 'Parando…',
      starting: 'Arrancando…',
      deleting: 'Borrando…',
      uploading: 'Subiendo…',
      importing: 'Revisando…',
      updating: 'Actualizando…',
      switching: 'Cambiando de versión…',
    },
    busyNote: 'Suele tardar un minuto.',
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
      uploading: 'su zip está llegando a su máquina',
      importing: 'su máquina está revisando su zip',
      updating: 'su máquina lo está pasando a otra versión del motor',
      switching:
        'su máquina está cambiando de versión · la gente que esté dentro sale unos segundos',
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
      enter: 'Entrar',
      stop: 'Parar',
      start: 'Arrancar',
      delete: 'Borrar',
      download: 'Descargar',
      newWorld: 'Nuevo mundo',
      importZip: 'Traer de un zip',
      update: 'Actualizar',
      pin: 'Fijar a otra versión',
      unpin: 'Quitar el fijado',
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
      recipe: 'receta {r}',
      selfUpdate: {
        manual:
          '{m} aún no se actualiza sola: necesita una última instalación. Entra una vez en ella y ejecuta esta línea; después sigue sola cada receta nueva.',
        current: 'Se actualiza sola · al día.',
        updating: 'Se actualiza sola · actualizándose a la receta nueva.',
        resting:
          'Se actualiza sola · esperando reposo: toma la receta nueva cuando lleve un rato publicada.',
        halted:
          'Parada: {why}. No vuelve a probar esa receta; la siguiente que se publique la desbloquea.',
        haltedSome: 'la receta nueva falló al instalarse',
        refused: 'Parada: no instala la receta nueva ({why}).',
        frozen:
          'Congelada: se queda en su receta y no se actualiza hasta que alguien la descongele en la máquina.',
        held: 'Sujeta a la receta {r}: no sigue las nuevas hasta que alguien la suelte en la máquina.',
        checking: 'Se actualiza sola · aún no ha mirado si hay receta nueva.',
        canary: 'Máquina de prueba (canario): estrena cada receta antes que las demás.',
      },
      slow: '{m} va con retraso.',
      failing: '{m} no obedece: no pudo aplicar los cambios. Lo reintenta cada minuto.',
      silent: '{m} no obedece: no da señales. Si sigue así, avisa a Ursa.',
      lastRun: 'Su último trabajo terminó hace {t}.',
      waiting: 'Peticiones en espera: {n}.',
      freeing: 'Borrando {d}…',
      engines: 'motores: {e}',
    },
    fleetEngine: {
      title: 'Motor de la flota',
      current: 'Versión vigente: {b}',
      upToDate: 'Toda la flota al día.',
      behind: 'Mundos por detrás: {n}',
      laggard: '{id} · {m} · {b}',
      manual: 'Su máquina no actualiza sola.',
      otherEngine: 'Mundos con otro motor: {n} (no cuentan como rezagados).',
      none: 'Aún no hay versión publicada.',
      pinned: 'Mundos fijados a una versión: {n}',
      pinnedLine: '{id} · {m} · {b} (fijado: {r})',
      laggardPinned: '{id} · {m} · {b} (fijado: {r})',
      laggardFailed: '{id} · {m} · {b} (falló: {e})',
      halted: '{m} ha parado las actualizaciones: {r}',
      haltedNoReason: '{m} ha parado las actualizaciones.',
      lastPass: 'Última pasada de {m}: {a}, {when}.',
      cardPinned: 'Fijado en {b}: {r}',
    },
    steps: {
      signing: 'Tu cartera te pide firmar…',
      sending: 'Enviando la petición a {m}…',
      preparing: '{m} está preparando el zip…',
    },
    problems: {
      noWallet:
        'No encuentro en este navegador la cartera con la que entraste; tu sesión sigue abierta. Conéctala en Sesión y vuelve a firmar aquí.',
      noWalletLink: 'Abrir Sesión en otra pestaña',
      otherWallet:
        'La cartera conectada ({w}) no es la de tu sesión. Cambia de cuenta en la cartera o vuelve a entrar.',
      declined: 'Has cancelado la firma: no se ha enviado nada.',
      notOracle:
        '{m} no tiene tu cartera en su lista de Oráculos. Ejecuta en la máquina su línea de arranque con tu cartera.',
      expired: 'La firma llegó caducada: revisa la hora de tu ordenador y repite.',
      replayed: 'Esa petición ya se había enviado.',
      exists: 'Ya hay un mundo con ese nombre en {m}.',
      addressTaken: 'Esa dirección ya es de otro mundo de {m}.',
      stillDeleting:
        '{m} aún está borrando un mundo con ese nombre o esa dirección. Prueba en un minuto.',
      missing: 'Ese mundo ya no está en {m}; recarga la sala.',
      addressMismatch: 'La dirección no coincide con la del mundo; recarga la sala.',
      refused:
        '{m} no acepta esa orden: el motor, la dirección o los límites se salen de sus reglas.',
      otherMachine: 'Esa petición era para otra máquina.',
      slowDown: 'Demasiadas peticiones seguidas: espera un par de minutos.',
      noAdminCode: '{m} todavía no tiene un código de administración para ese mundo.',
      busy: '{m} todavía está creando ese mundo o cambiando su código: espera un minuto y vuelve a intentarlo.',
      origin: '{m} no acepta peticiones desde esta página.',
      unreachable: 'No se pudo hablar con {m}: no responde.',
      machine: '{m} lo intentó y no pudo ({rule}).',
      late: '{m} lo ha recibido, pero aún no ha terminado. Mira la sala en un minuto.',
      unknownEngine: '{m} no ejecuta ese motor: elige Hyperfy o el Numinia Engine.',
      engineMismatch: 'Esa versión es de otro motor: un mundo solo pasa a otra versión del suyo.',
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
      nameTaken: 'Ya hay un mundo que se llama {w}: elige otro nombre.',
      nameFreeing:
        '{w} se está liberando: su máquina aún borra el mundo anterior. Prueba en un minuto.',
      addressFreeing:
        '{d} se está liberando: su máquina aún borra el mundo anterior. Prueba en un minuto.',
      addressTaken: '{d} ya es la dirección de {w}: elige otro nombre.',
      legacyMove:
        '{d} es hoy {w}, en la máquina antigua. Al crearlo aquí pasará a {m}: copia antes sus datos y apunta su registro DNS a {m}.',
      dnsChecking: 'Mirando a dónde apunta {d}…',
      dnsMachine: '{d} ya apunta a {m}: listo.',
      dnsElsewhere: '{d} ya apunta a otra máquina: elige otro nombre.',
      dnsNone:
        '{d} aún no existe en el DNS: crea un registro A hacia {m} (solo DNS); hasta entonces el mundo no se abrirá.',
      dnsUnknown: 'No se pudo comprobar a dónde apunta {d}; revísalo si el mundo no se abre.',
      dnsCreate:
        '{d} aún no tiene registro: la sala lo creará hacia {m} (solo DNS) al crear el mundo.',
      dnsMove:
        '{d} tiene un registro de la flota hacia otra máquina: la sala lo moverá a {m} al crear el mundo.',
      dnsWriting: 'Creando el registro DNS de {d} hacia {m}…',
      dnsWriteFailed:
        'No se pudo crear el registro DNS de {d} ({code}). No se ha pedido nada a {m}: inténtalo de nuevo.',
      imageLabel: 'Motor',
      imageHint: 'Una versión fijada del motor: etiqueta sha- o digest, nunca latest.',
      engineLabel: 'Motor',
      engineHint: 'Los motores que ejecuta {m}. La versión queda fijada en la orden.',
      engineNoRelease: 'aún no hay versión publicada del motor',
      memoryLabel: 'Memoria',
      cpusLabel: 'CPU',
      uploadLabel: 'Subida máxima (MB)',
      confirmIntro:
        'Tu cartera te pedirá firmar esta petición. La máquina comprueba la firma y crea el mundo; nadie más tiene que aprobar nada.',
      powerLabel: '¿Arranca al crearse?',
      powerOn: 'Encendido',
      powerOff: 'Apagado',
      powerHint:
        'Encendido gasta saldo desde ya: hace falta elegir qué organización lo paga y que tenga saldo. Apagado no comprueba ni gasta saldo.',
      orgLabel: 'Organización que lo paga',
      orgNone: 'Elige una organización',
      orgLoading: 'Leyendo las organizaciones…',
      orgFailed: 'No se pudieron leer las organizaciones.',
      balanceChecking: 'Comprobando el saldo…',
      balanceBlocked:
        '«{org}» no tiene saldo suficiente para arrancar un mundo ahora. Recarga su saldo antes de encenderlo.',
      balanceOk: 'Saldo suficiente: puede arrancar encendido.',
      topUpLink: 'Recargar saldo',
      invalid: 'Revisa: {fields}.',
      next: 'Siguiente',
      back: 'Atrás',
      cancel: 'Cancelar',
      restart: 'Empezar de nuevo',
      create: 'Firmar y crear',
      resultTitle: '{t} está naciendo',
      resultNote:
        '{m} ha creado el mundo. Se abre en {d} en cuanto arranque, en menos de un minuto.',
      done: 'Hecho',
      close: 'Cerrar',
    },
    code: {
      label: 'Código de administración',
      show: 'Mostrar',
      rotate: 'Cambiar código',
      showTitle: 'Código de administración de {t}',
      rotateTitle: 'Cambiar el código de {t}',
      showIntro:
        'Solo vale para {t}: cada mundo tiene el suyo. Tu cartera te pedirá firmar para verlo.',
      rotateIntro:
        'La máquina hace un código nuevo para {t} y reinicia el mundo: quien esté dentro se desconecta unos segundos. El código de ahora deja de valer, pero quien ya se hizo administrador con él lo sigue siendo: el mundo lo recuerda.',
      rotateStopped:
        '{t} está parado: el código nuevo valdrá en cuanto arranque. El de ahora deja de valer, pero quien ya se hizo administrador con él lo sigue siendo: el mundo lo recuerda.',
      showConfirm: 'Firmar y ver',
      rotateConfirm: 'Firmar y cambiar',
      shown: 'Código de administración de {t}:',
      rotated: 'Código nuevo de {t}:',
      rotatedNote: '{m} reinicia {t} en menos de un minuto; desde entonces solo vale este código.',
      rotatedStopped: '{t} está parado: este código valdrá en cuanto arranque.',
      chat: 'En el chat del mundo escribe /admin {code} y quedarás como administrador en ese navegador.',
      notYet:
        '{m} todavía no da un código por mundo: relanza su línea (en Máquinas) y vuelve a intentarlo.',
    },
    rename: {
      label: 'Cambiar nombre',
      title: 'Cambiar el nombre de {t}',
      fieldLabel: 'Nuevo nombre',
      save: 'Guardar',
      cancel: 'Cancelar',
      forbidden: 'Solo la casa puede cambiar el nombre.',
      failed: 'No se pudo guardar el nombre ({detail}).',
      saved: 'Nombre guardado.',
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
      typeToConfirm: 'Para confirmar, escribe su dirección:',
      stopConfirm: 'Firmar y parar',
      startConfirm: 'Firmar y arrancar',
      deleteConfirm: 'Firmar y borrar',
      downloadConfirm: 'Firmar y preparar',
      updateTitle: 'Actualizar {t}',
      updateIntro:
        '{t} pasa de la versión {from} a la {to} del Numinia Engine. La máquina descarga la nueva, guarda el mundo y lo reinicia con ella: quien esté dentro se desconecta unos segundos. Sus datos y su aventura se quedan.',
      updateConfirm: 'Firmar y actualizar',
      pinTitle: 'Fijar {t} a otra versión',
      pinIntro:
        '{t} se queda en la versión que elijas y las actualizaciones de la flota no la mueven. La máquina descarga esa versión, guarda el mundo y lo reinicia con ella: quien esté dentro se desconecta unos segundos.',
      pinBuild: 'Versión',
      pinBuildHint: 'Una versión de su motor (ahora: {b})',
      pinBadBuild:
        'No es una versión de su motor. Escribe sha- y las cifras de la versión, o la imagen entera.',
      pinReason: 'Motivo (una línea, obligatorio)',
      pinConfirm: 'Firmar y fijar',
      unpinTitle: 'Quitar el fijado de {t}',
      unpinIntro:
        '{t} vuelve a seguir la versión de la flota: la próxima pasada de su máquina la actualizará. Ahora está fijado en {b}: {r}',
      unpinReasonDefault: 'Vuelve a seguir la flota',
      unpinConfirm: 'Firmar y quitar el fijado',
      notObeying: '{m} no obedece ahora mismo: tu petición esperará en su cola hasta que vuelva.',
    },
    copy: {
      ready: 'Listo: {f} · {s}',
      save: 'Descargar el zip',
      fingerprint: 'Huella SHA-256: {h}',
      expires: 'El enlace caduca: {when}.',
    },
    import: {
      noMachine: 'Ninguna máquina responde: ahora no se pueden traer mundos.',
      dropTitle: 'Suelta el zip para traer un mundo',
      dropNote: 'Nada se sube hasta que firmes.',
      dropCap: 'un solo .zip · hasta {max}',
      dropOne: 'Suelta un solo zip',
      title: 'Traer un mundo',
      stepPlace: 'Lugar',
      stepSign: 'Firmar',
      reading: 'Leyendo el zip…',
      copyOf: 'Copia de {w} del {d} · {s}',
      copyOfUndated: 'Copia de {w} · {s}',
      folder: 'Carpeta de un mundo · db.sqlite y {n} archivos · {s}',
      engineImage: 'Lleva también una imagen del motor ({s}) que no se usa: subirá igual.',
      keysNote:
        'Del zip se usan su base de datos y sus archivos; sus claves y su docker-compose no: {m} hace claves nuevas.',
      machineLabel: 'Máquina',
      engineNote: '{b} · el motor de la flota',
      zipLine: 'Zip: {f} · {s} ({b} bytes)',
      fingerprint: 'Huella: {h}',
      hashing: 'Calculando la huella del zip… {p} %',
      unreadable: 'No se pudo leer el zip: elige el archivo otra vez.',
      signNote:
        'Tu cartera te pedirá firmar el mundo, su dirección, la máquina, el motor, el tamaño exacto del zip y su huella. {m} solo aceptará este zip.',
      sign: 'Firmar y subir',
      pickAnother: 'Elegir otro zip',
      uploading: 'Subiendo a {m} · {sent} de {total}',
      keepOpen: 'No cierres esta pestaña hasta que termine.',
      stop: 'Detener la subida',
      checking: '{m} está revisando el zip.',
      cutPill: 'Subida cortada',
      cut: 'Se cortó la conexión con {m} a los {sent} de {total}.',
      stopped: 'Detuviste la subida a los {sent} de {total}.',
      retry: 'Volver a subir',
      discard: 'Descartar',
      halfDone: 'La subida quedó a medias. Elige otra vez el mismo zip.',
      pickSame: 'Elegir el zip',
      notSame: 'Ese no es el mismo zip: su huella no coincide.',
      entry: 'Archivo: {f}.',
      versionTitle: 'Subir un zip como versión',
      versionLabel: 'Qué hacer con este zip',
      versionNew: 'Traerlo como un mundo nuevo',
      versionOption: 'Subirlo como versión nueva de {t} ({d})',
      versionOwn:
        'La máquina, la dirección y los límites son los del mundo: el zip solo trae una versión.',
      versionOne: 'El mundo sigue como está; el zip llega como segunda versión, sin publicar.',
      versionTwo:
        'La versión {n} (la no publicada) se sustituye por la del zip cuando el zip esté comprobado. La publicada no se toca.',
      versionSignNote:
        'Una sola firma: {m} guarda el zip como versión nueva de {w}. El mundo sigue encendido; para que la gente la visite, la publicas luego desde su tarjeta.',
      versionSign: 'Firmar y subir el zip',
      elsewhere:
        'Lo está subiendo otra pestaña, o la subida quedó a medias: si nadie la termina, {m} la descarta en menos de una hora.',
      failedPill: 'No se pudo traer',
      landed: '{w} ya está en {m}, parado.',
      landedClose: 'Cerrar',
      fromZip: 'traído de un zip',
      engineWorld: 'Mundo del Numinia Engine ({v}) · {n} archivos · {s}',
      engineKeysNote:
        'Del zip se usa el mundo (datos, aventura y entorno); nunca lleva claves: {m} hace claves nuevas.',
      noEngineMachine: 'Ninguna máquina que traiga zips ejecuta todavía el Numinia Engine.',
      engineNoRelease:
        'Aún no hay versión publicada del motor: este zip todavía no se puede traer.',
      engineRefused: 'El motor de {m} no lee este zip: {why}',
      before: {
        empty: 'El archivo está vacío.',
        several: 'Has soltado {n} archivos: trae uno solo.',
        folder: 'Eso es una carpeta: comprímela en un zip.',
        tooManyFiles: 'El zip trae {n} archivos y {m} acepta hasta {max}.',
        fileTooBig: '{f} pesa {s}: más de lo que {m} acepta por archivo ({max}).',
        ratio: 'El zip crecería demasiado al abrirlo (×{r}): así son las «bombas zip». No se abre.',
        unpackedTooBig: 'Abierto ocuparía {s}, más de lo que {m} acepta ({max}).',
        unexpected: 'El zip trae algo que un mundo no lleva: {f}.',
        mundoUnreadable:
          'El mundo.json de este zip no se puede leer: no es un JSON válido. Descarga el zip del mundo desde la sala (o ejecuta la `copia` del motor) y trae ese.',
        mundoSchema:
          'El mundo.json de este zip declara «{s}», un esquema que el motor no lee (numinia-engine/mundo@1 o @2). Descarga el zip del mundo desde la sala (o ejecuta la `copia` del motor) y trae ese.',
        mundoSchemaNone:
          'El mundo.json de este zip no declara ningún esquema del motor (numinia-engine/mundo@1 o @2). Descarga el zip del mundo desde la sala (o ejecuta la `copia` del motor) y trae ese.',
        mundoNoFiles:
          'El mundo.json de este zip no es una exportación del motor: no trae la lista de ficheros. Descarga el zip del mundo desde la sala (o ejecuta la `copia` del motor) y trae ese.',
        mundoSeveral:
          'El zip trae {n} mundo.json y el motor lee uno solo. Deja un mundo por zip y vuelve a comprimirlo.',
      },
      rules: {
        'zip-too-big': 'El zip pesa {s} y {m} acepta hasta {max}.',
        'no-room': '{m} no tiene sitio para este zip. Borra un mundo o elige otra máquina.',
        'slot-expired': 'La subida caducó. Vuelve a firmar para subirlo.',
        'wrong-size': 'La subida llegó incompleta: vuelve a subirlo.',
        cut: 'La subida llegó incompleta: vuelve a subirlo.',
        fingerprint:
          'Lo que llegó no es el zip que firmaste: la huella no coincide. Vuelve a subirlo.',
        'not-a-zip': '«{f}» no es un zip.',
        encrypted: 'El zip tiene contraseña: guárdalo sin ella.',
        'too-many-files': 'El zip trae más archivos de los que {m} acepta.',
        'zip-slip':
          'El zip trae rutas que salen de su carpeta («..» o «/»): {m} no lo abre, por seguridad.',
        link: 'El zip trae enlaces en vez de archivos: {m} no lo abre, por seguridad.',
        'file-too-big': 'Un archivo del zip pesa más de lo que {m} acepta por archivo.',
        ratio: 'El zip crecería demasiado al abrirlo: así son las «bombas zip». No se abre.',
        'unpacked-too-big': 'Abierto ocuparía más de lo que {m} acepta.',
        'not-a-world':
          'En el zip no hay un mundo: falta db.sqlite (Hyperfy) o mundo.json (Numinia Engine).',
        unexpected: 'El zip trae algo que un mundo no lleva.',
        'db-open':
          'La base de datos se copió con el mundo en marcha: descárgalo con Descargar o páralo antes de comprimirlo.',
        manifest:
          'Un archivo no coincide con su huella en world.json: el zip se estropeó o lo cambiaron. Descárgalo otra vez.',
        'db-broken': 'La base de datos del zip está dañada: no pasa la comprobación.',
        'db-foreign': 'db.sqlite no es la base de datos de un mundo: no tiene sus tablas.',
        'engine-refused': 'El motor de {m} no lee este zip.',
      },
    },
    versions: {
      title: 'Versiones',
      label: 'Versión {n}',
      published: 'Publicada',
      origin: { created: 'creada aquí', zip: 'desde un zip', copy: 'copia de la versión {n}' },
      size: '≈ {s}',
      sizeNote:
        'Tamaño medido al hacerla o al publicar. La publicada sigue creciendo mientras se usa, por eso es aproximado.',
      download: 'Descargar',
      duplicate: 'Duplicar',
      publish: 'Publicar esta',
      delete: 'Borrar',
      importZip: 'Subir un zip como versión',
      noteOne:
        'Puedes tener dos versiones: duplica esta para probar cambios sin tocar la publicada.',
      noteTwo: 'La gente solo entra en la publicada. La otra espera aquí.',
      coming: {
        importing: 'Llegando una versión nueva… {state}',
        duplicating: 'Duplicando…',
        uploading: 'subiendo {p} %',
        waiting: 'esperando turno',
        working: 'preparándola',
      },
      following: {
        PublishVersion: 'Publicando… el mundo se apaga unos segundos y vuelve solo.',
        DuplicateVersion: 'Duplicando…',
        DeleteVersion: 'Borrando…',
        ImportVersion: 'Llegando el zip como versión nueva… el mundo sigue encendido.',
      },
      done: {
        PublishVersion: 'Ya está publicada la versión {n} de {w}.',
        DuplicateVersion:
          'Hecha la copia de {w}: es la versión {n}. Para que la gente la visite, publícala.',
        DeleteVersion: 'Borrada la versión {n} de {w}.',
        ImportVersion:
          'La versión {n} ya está en el mundo, sin publicar. Públicala desde su tarjeta cuando quieras.',
      },
      failed: 'La máquina {m} no pudo terminar el cambio de versión ({rule}).',
      close: 'Cerrar',
      dialog: {
        publishTitle: 'Publicar la versión {n}',
        publishIntro:
          'La gente que esté dentro sale unos segundos; el mundo se apaga, cambia de versión y vuelve solo. La dirección, las claves y el código de administración no cambian. Los rangos y usuarios son los de esa versión.',
        publishKeep: 'La versión publicada ahora (la {p}) se queda guardada como la otra.',
        publishStopped: 'El mundo está apagado y seguirá apagado.',
        publishConfirm: 'Firmar y publicar',
        deleteTitle: 'Borrar la versión {n}',
        deleteIntro: 'Se borra para siempre. La publicada no se toca.',
        deleteCopyFirst: '¿Quieres conservarla? Descárgala antes.',
        downloadFirst: 'Descargar la versión {n}',
        deleteConfirm: 'Firmar y borrar',
        duplicateTitle: 'Duplicar la versión publicada',
        duplicateIntro:
          'Se hace una copia exacta; la gente sigue dentro mientras tanto. La copia no se puede visitar hasta que la publiques.',
        duplicateConfirm: 'Firmar y duplicar',
        downloadTitle: 'Descargar la versión {n}',
        downloadIntro:
          'La máquina prepara un zip con esa versión, tal como está ahora, y te lo ofrece cuando esté listo. El enlace dura un día. No se toca nada del mundo.',
      },
      problems: {
        'no-version':
          'Esa versión ya no existe (quizá otra persona la borró). Se vuelve a leer la lista.',
        published: 'La versión publicada no se puede borrar: publica la otra antes.',
        'already-published': 'Esa versión ya es la publicada.',
        'only-version': 'Es la única versión del mundo: no se puede borrar.',
        full: 'El mundo ya tiene dos versiones, que es el máximo. Borra una antes de añadir otra.',
        'switch-stuck':
          'El cambio de versión se quedó a medias; el mundo sigue apagado para no arrancar con datos equivocados. Avisa a la casa.',
        'not-a-folder': 'La carpeta de esa versión no está como debería estar. Avisa a la casa.',
        'versions-unreadable':
          'La máquina {m} no puede leer las versiones de este mundo. Avisa a la casa.',
        'versions-unwritable':
          'La máquina {m} no puede guardar el cambio de versiones. Avisa a la casa.',
        'not-removed': 'La máquina {m} no pudo borrar la versión del todo. Avisa a la casa.',
        busy: 'Este mundo está ocupado con otro cambio; prueba en un momento.',
        missing: 'Ese mundo ya no está en {m}; recarga la sala.',
        'still-deleting': 'Ese mundo se está borrando.',
        'no-room': 'La máquina {m} no tiene sitio para otra versión.',
        'engine-refused': 'El motor del mundo no pudo hacer la copia. Avisa a la casa.',
      },
    },
    history: {
      title: 'Lo que han hecho las máquinas',
      empty: 'Las máquinas todavía no han hecho nada.',
      failed: 'falló',
      took: 'en {t}',
      kinds: {
        CreateWorld: 'creó',
        DeleteWorld: 'borró',
        StopWorld: 'paró',
        StartWorld: 'arrancó',
        DownloadWorld: 'copió',
        ShowAdminCode: 'mostró el código de la máquina',
        ShowWorldCode: 'mostró el código de {w}',
        RotateWorldCode: 'cambió el código de {w}',
        ImportWorld: 'trajo {w}',
        UpdateWorld: 'actualizó {w}',
        FleetRelease: 'publicó una versión del motor',
        PinWorld: 'fijó {w}',
        DuplicateVersion: 'duplicó una versión de {w}',
        PublishVersion: 'cambió la versión publicada de {w}',
        DeleteVersion: 'borró una versión guardada de {w}',
        DownloadVersion: 'descargó una versión de {w}',
        ImportVersion: 'subió un zip como versión de {w}',
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
    allHomes: 'All organizations',
    homeFilter: 'Organization',
    views: { label: 'View', cards: 'Cards', list: 'List', servers: 'By server' },
    status: {
      running: 'Running',
      stopped: 'Stopped',
      unreachable: 'Not answering',
      unknown: 'Unchecked',
      changing: 'In progress',
    },
    phases: {
      creating: 'Creating…',
      stopping: 'Stopping…',
      starting: 'Starting…',
      deleting: 'Deleting…',
      uploading: 'Uploading…',
      importing: 'Checking…',
      updating: 'Updating…',
      switching: 'Switching version…',
    },
    busyNote: 'This usually takes about a minute.',
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
      uploading: 'its zip is reaching its machine',
      importing: 'its machine is checking its zip',
      updating: 'its machine is moving it to another engine build',
      switching: 'its machine is switching versions · people inside leave for a few seconds',
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
      enter: 'Enter',
      stop: 'Stop',
      start: 'Start',
      delete: 'Delete',
      download: 'Download',
      newWorld: 'New world',
      importZip: 'Bring from a zip',
      update: 'Update',
      pin: 'Pin to another version',
      unpin: 'Remove the pin',
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
      recipe: 'recipe {r}',
      selfUpdate: {
        manual:
          '{m} does not update itself yet: it needs one last install. Log in to it once and run this line; from then on it takes every new recipe by itself.',
        current: 'Updates itself · up to date.',
        updating: 'Updates itself · taking the new recipe.',
        resting:
          'Updates itself · waiting for the rest: it takes the new recipe once it has been out a while.',
        halted:
          'Stopped: {why}. It will not try that recipe again; the next one published lifts the stop.',
        haltedSome: 'the new recipe failed to install',
        refused: 'Stopped: it will not install the new recipe ({why}).',
        frozen:
          'Frozen: it stays on its recipe and does not update until someone unfreezes it on the machine.',
        held: 'Held on recipe {r}: it does not take new ones until someone lets it go on the machine.',
        checking: 'Updates itself · it has not looked for a new recipe yet.',
        canary: 'Test machine (canary): it takes each recipe before the others.',
      },
      slow: '{m} is running late.',
      failing: '{m} is not obeying: it could not apply the changes. It tries again every minute.',
      silent: '{m} is not obeying: no sign of life. If this goes on, tell Ursa.',
      lastRun: 'Its last job ended {t} ago.',
      waiting: 'Requests waiting: {n}.',
      freeing: 'Deleting {d}…',
      engines: 'engines: {e}',
    },
    fleetEngine: {
      title: 'Fleet engine',
      current: 'Current version: {b}',
      upToDate: 'The whole fleet is up to date.',
      behind: 'Worlds behind: {n}',
      laggard: '{id} · {m} · {b}',
      manual: 'Its machine does not take updates.',
      otherEngine: 'Worlds on another engine: {n} (not counted as behind).',
      none: 'No version published yet.',
      pinned: 'Worlds pinned to a version: {n}',
      pinnedLine: '{id} · {m} · {b} (pinned: {r})',
      laggardPinned: '{id} · {m} · {b} (pinned: {r})',
      laggardFailed: '{id} · {m} · {b} (failed: {e})',
      halted: '{m} has stopped its updates: {r}',
      haltedNoReason: '{m} has stopped its updates.',
      lastPass: 'Last pass of {m}: {a}, {when}.',
      cardPinned: 'Pinned to {b}: {r}',
    },
    steps: {
      signing: 'Your wallet asks you to sign…',
      sending: 'Sending the request to {m}…',
      preparing: '{m} is preparing the zip…',
    },
    problems: {
      noWallet:
        'This browser does not have the wallet you signed in with; your session is still open. Connect it in Session and sign here again.',
      noWalletLink: 'Open Session in another tab',
      otherWallet:
        'The connected wallet ({w}) is not your session’s. Switch accounts in the wallet or sign in again.',
      declined: 'You cancelled the signature: nothing was sent.',
      notOracle:
        '{m} does not list your wallet as an Oracle. Run the machine’s bootstrap line on it with your wallet.',
      expired: 'The signature arrived expired: check your computer’s clock and try again.',
      replayed: 'That request had already been sent.',
      exists: '{m} already has a world with that name.',
      addressTaken: 'That address already belongs to another world on {m}.',
      stillDeleting:
        '{m} is still deleting a world with that name or address. Try again in a minute.',
      missing: 'That world is no longer on {m}; reload the room.',
      addressMismatch: 'The address does not match the world’s; reload the room.',
      refused:
        '{m} does not accept that order: the engine, the address or the limits are outside its rules.',
      otherMachine: 'That request was for another machine.',
      slowDown: 'Too many requests in a row: wait a couple of minutes.',
      noAdminCode: '{m} has no admin code for that world yet.',
      busy: '{m} is still creating that world or changing its code: wait a minute and try again.',
      origin: '{m} does not accept requests from this page.',
      unreachable: 'Could not reach {m}: it is not answering.',
      machine: '{m} tried and could not ({rule}).',
      late: '{m} received it but has not finished yet. Look at the room in a minute.',
      unknownEngine: '{m} does not run that engine: choose Hyperfy or the Numinia Engine.',
      engineMismatch:
        'That build is of another engine: a world only moves to another build of its own.',
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
      nameTaken: 'There is already a world called {w}: choose another name.',
      nameFreeing:
        '{w} is being freed: its machine is still deleting the previous world. Try again in a minute.',
      addressFreeing:
        '{d} is being freed: its machine is still deleting the previous world. Try again in a minute.',
      addressTaken: '{d} is already the address of {w}: choose another name.',
      legacyMove:
        '{d} is {w} today, on the old machine. Creating it here moves it to {m}: copy its data first and point its DNS record at {m}.',
      dnsChecking: 'Looking up where {d} points…',
      dnsMachine: '{d} already points at {m}: ready.',
      dnsElsewhere: '{d} already points at another machine: choose another name.',
      dnsNone:
        '{d} is not in DNS yet: create an A record to {m} (DNS only); until then the world will not open.',
      dnsUnknown: 'Could not check where {d} points; check it if the world does not open.',
      dnsCreate:
        '{d} has no record yet: the room will create it towards {m} (DNS only) when it creates the world.',
      dnsMove:
        '{d} has a fleet record towards another machine: the room will move it to {m} when it creates the world.',
      dnsWriting: 'Creating the DNS record of {d} towards {m}…',
      dnsWriteFailed:
        'Could not create the DNS record of {d} ({code}). Nothing was asked of {m}: try again.',
      imageLabel: 'Engine',
      imageHint: 'A pinned engine build: a sha- tag or a digest, never latest.',
      engineLabel: 'Engine',
      engineHint: 'The engines {m} runs. The build is pinned in the order.',
      engineNoRelease: 'no engine version has been published yet',
      memoryLabel: 'Memory',
      cpusLabel: 'CPU',
      uploadLabel: 'Largest upload (MB)',
      confirmIntro:
        'Your wallet will ask you to sign this request. The machine checks the signature and creates the world; nobody else has to approve anything.',
      powerLabel: 'Starts running?',
      powerOn: 'On',
      powerOff: 'Off',
      powerHint:
        'On spends balance from the start: pick which organization pays for it, and it needs balance. Off checks and spends nothing.',
      orgLabel: 'Organization that pays for it',
      orgNone: 'Choose an organization',
      orgLoading: 'Reading the organizations…',
      orgFailed: 'The organizations could not be read.',
      balanceChecking: 'Checking the balance…',
      balanceBlocked:
        '«{org}» has no balance to start a world now. Top up its balance before turning it on.',
      balanceOk: 'Enough balance: it can start on.',
      topUpLink: 'Top up balance',
      invalid: 'Check: {fields}.',
      next: 'Next',
      back: 'Back',
      cancel: 'Cancel',
      restart: 'Start again',
      create: 'Sign and create',
      resultTitle: '{t} is being born',
      resultNote:
        '{m} has created the world. It opens at {d} as soon as it starts, in under a minute.',
      done: 'Done',
      close: 'Close',
    },
    code: {
      label: 'Admin code',
      show: 'Show',
      rotate: 'Change code',
      showTitle: 'Admin code of {t}',
      rotateTitle: 'Change the code of {t}',
      showIntro:
        'It only works for {t}: each world has its own. Your wallet will ask you to sign to see it.',
      rotateIntro:
        'The machine makes a new code for {t} and restarts the world: anyone inside is disconnected for a few seconds. The current code stops working, but whoever already became an admin with it stays one: the world remembers.',
      rotateStopped:
        '{t} is stopped: the new code works as soon as it starts. The current one stops working, but whoever already became an admin with it stays one: the world remembers.',
      showConfirm: 'Sign and see',
      rotateConfirm: 'Sign and change',
      shown: 'Admin code of {t}:',
      rotated: 'New code of {t}:',
      rotatedNote: '{m} restarts {t} within a minute; from then on only this code works.',
      rotatedStopped: '{t} is stopped: this code works as soon as it starts.',
      chat: 'Type /admin {code} in the world’s chat and you are its admin in that browser.',
      notYet:
        '{m} does not give a code per world yet: run its line again (under Machines) and try once more.',
    },
    rename: {
      label: 'Rename',
      title: 'Rename {t}',
      fieldLabel: 'New name',
      save: 'Save',
      cancel: 'Cancel',
      forbidden: 'Only the house may rename it.',
      failed: 'Could not save the name ({detail}).',
      saved: 'Name saved.',
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
      typeToConfirm: 'To confirm, type its address:',
      stopConfirm: 'Sign and stop',
      startConfirm: 'Sign and start',
      deleteConfirm: 'Sign and delete',
      downloadConfirm: 'Sign and prepare',
      updateTitle: 'Update {t}',
      updateIntro:
        '{t} moves from build {from} to build {to} of the Numinia Engine. The machine fetches the new build, saves the world and restarts it with it: anyone inside is disconnected for a few seconds. Its data and its adventure stay.',
      updateConfirm: 'Sign and update',
      pinTitle: 'Pin {t} to another version',
      pinIntro:
        "{t} stays on the version you choose and the fleet's updates do not move it. The machine fetches that version, saves the world and restarts it on it: whoever is inside is disconnected for a few seconds.",
      pinBuild: 'Version',
      pinBuildHint: 'A version of its engine (now: {b})',
      pinBadBuild:
        "That is not a version of its engine. Write sha- and the version's digits, or the whole image.",
      pinReason: 'Reason (one line, required)',
      pinConfirm: 'Sign and pin',
      unpinTitle: 'Remove the pin from {t}',
      unpinIntro:
        "{t} follows the fleet's version again: its machine's next pass will update it. It is pinned to {b} now: {r}",
      unpinReasonDefault: 'Follows the fleet again',
      unpinConfirm: 'Sign and remove the pin',
      notObeying:
        '{m} is not obeying right now: your request will wait in its queue until it comes back.',
    },
    copy: {
      ready: 'Ready: {f} · {s}',
      save: 'Download the zip',
      fingerprint: 'SHA-256 fingerprint: {h}',
      expires: 'The link expires: {when}.',
    },
    import: {
      noMachine: 'No machine is answering: worlds cannot be brought back right now.',
      dropTitle: 'Drop the zip to bring a world back',
      dropNote: 'Nothing is uploaded until you sign.',
      dropCap: 'one .zip · up to {max}',
      dropOne: 'Drop a single zip',
      title: 'Bring a world back',
      stepPlace: 'Place',
      stepSign: 'Sign',
      reading: 'Reading the zip…',
      copyOf: 'Copy of {w} from {d} · {s}',
      copyOfUndated: 'Copy of {w} · {s}',
      folder: 'A world’s folder · db.sqlite and {n} files · {s}',
      engineImage:
        'It also carries an engine image ({s}) that is not used: it will be uploaded all the same.',
      keysNote:
        'Only the zip’s database and files are used; its keys and its docker-compose are not: {m} makes new keys.',
      machineLabel: 'Machine',
      engineNote: '{b} · the fleet’s engine',
      zipLine: 'Zip: {f} · {s} ({b} bytes)',
      fingerprint: 'Fingerprint: {h}',
      hashing: 'Computing the zip’s fingerprint… {p} %',
      unreadable: 'The zip could not be read: choose the file again.',
      signNote:
        'Your wallet will ask you to sign the world, its address, the machine, the engine, the zip’s exact size and its fingerprint. {m} will take this zip and no other.',
      sign: 'Sign and upload',
      pickAnother: 'Choose another zip',
      uploading: 'Uploading to {m} · {sent} of {total}',
      keepOpen: 'Do not close this tab until it finishes.',
      stop: 'Stop the upload',
      checking: '{m} is checking the zip.',
      cutPill: 'Upload cut',
      cut: 'The connection with {m} dropped at {sent} of {total}.',
      stopped: 'You stopped the upload at {sent} of {total}.',
      retry: 'Upload again',
      discard: 'Discard',
      halfDone: 'The upload was left half done. Choose the same zip again.',
      pickSame: 'Choose the zip',
      notSame: 'That is not the same zip: its fingerprint does not match.',
      entry: 'File: {f}.',
      versionTitle: 'Upload a zip as a version',
      versionLabel: 'What to do with this zip',
      versionNew: 'Bring it as a new world',
      versionOption: 'Upload it as a new version of {t} ({d})',
      versionOwn:
        'The machine, the address and the limits are the world’s: the zip only brings a version.',
      versionOne: 'The world stays as it is; the zip arrives as a second version, unpublished.',
      versionTwo:
        'Version {n} (the unpublished one) is replaced by the zip’s once the zip has been checked. The published one is not touched.',
      versionSignNote:
        'One signature: {m} stores the zip as a new version of {w}. The world keeps running; to let people visit it, you publish it later from its card.',
      versionSign: 'Sign and upload the zip',
      elsewhere:
        'Another tab is uploading it, or it was left half done: if nobody finishes it, {m} drops it within the hour.',
      failedPill: 'Could not bring it back',
      landed: '{w} is now on {m}, stopped.',
      landedClose: 'Close',
      fromZip: 'brought back from a zip',
      engineWorld: 'Numinia Engine world ({v}) · {n} files · {s}',
      engineKeysNote:
        'The world is taken from the zip (data, adventure and environment); it never carries keys: {m} makes new ones.',
      noEngineMachine: 'No machine that takes zips runs the Numinia Engine yet.',
      engineNoRelease:
        'No engine version has been published yet: this zip cannot be brought back yet.',
      engineRefused: 'The engine on {m} does not read this zip: {why}',
      before: {
        empty: 'The file is empty.',
        several: 'You dropped {n} files: bring just one.',
        folder: 'That is a folder: zip it first.',
        tooManyFiles: 'The zip carries {n} files and {m} takes up to {max}.',
        fileTooBig: '{f} weighs {s}: more than {m} takes per file ({max}).',
        ratio:
          'The zip would grow too much when opened (×{r}): that is what “zip bombs” do. It is not opened.',
        unpackedTooBig: 'Opened, it would take {s}, more than {m} accepts ({max}).',
        unexpected: 'The zip carries something a world does not: {f}.',
        mundoUnreadable:
          'This zip’s mundo.json cannot be read: it is not valid JSON. Download the world’s zip from the room (or run the engine’s `copia`) and bring that one.',
        mundoSchema:
          'This zip’s mundo.json declares “{s}”, a schema the engine does not read (numinia-engine/mundo@1 or @2). Download the world’s zip from the room (or run the engine’s `copia`) and bring that one.',
        mundoSchemaNone:
          'This zip’s mundo.json declares no engine schema (numinia-engine/mundo@1 or @2). Download the world’s zip from the room (or run the engine’s `copia`) and bring that one.',
        mundoNoFiles:
          'This zip’s mundo.json is not an export of the engine: it has no list of files. Download the world’s zip from the room (or run the engine’s `copia`) and bring that one.',
        mundoSeveral:
          'The zip carries {n} mundo.json files and the engine reads just one. Keep one world per zip and zip it again.',
      },
      rules: {
        'zip-too-big': 'The zip weighs {s} and {m} takes up to {max}.',
        'no-room': '{m} has no room for this zip. Delete a world or choose another machine.',
        'slot-expired': 'The upload expired. Sign again to upload it.',
        'wrong-size': 'The upload arrived incomplete: upload it again.',
        cut: 'The upload arrived incomplete: upload it again.',
        fingerprint:
          'What arrived is not the zip you signed: the fingerprint does not match. Upload it again.',
        'not-a-zip': '“{f}” is not a zip.',
        encrypted: 'The zip has a password: save it without one.',
        'too-many-files': 'The zip carries more files than {m} takes.',
        'zip-slip':
          'The zip carries paths that leave its folder (“..” or “/”): {m} will not open it, for safety.',
        link: 'The zip carries links instead of files: {m} will not open it, for safety.',
        'file-too-big': 'A file in the zip weighs more than {m} takes per file.',
        ratio:
          'The zip would grow too much when opened: that is what “zip bombs” do. It is not opened.',
        'unpacked-too-big': 'Opened, it would take more than {m} accepts.',
        'not-a-world':
          'There is no world in the zip: db.sqlite (Hyperfy) or mundo.json (Numinia Engine) is missing.',
        unexpected: 'The zip carries something a world does not.',
        'db-open':
          'The database was copied while the world was running: get it with Download, or stop the world before zipping it.',
        manifest:
          'A file does not match its fingerprint in world.json: the zip was damaged or changed. Download it again.',
        'db-broken': 'The zip’s database is damaged: it fails the check.',
        'db-foreign': 'db.sqlite is not a world’s database: it lacks its tables.',
        'engine-refused': 'The engine on {m} does not read this zip.',
      },
    },
    versions: {
      title: 'Versions',
      label: 'Version {n}',
      published: 'Published',
      origin: { created: 'made here', zip: 'from a zip', copy: 'copy of version {n}' },
      size: '≈ {s}',
      sizeNote:
        'Size measured when it was made or published. The published one keeps growing while it is used, so this is approximate.',
      download: 'Download',
      duplicate: 'Duplicate',
      publish: 'Publish this one',
      delete: 'Delete',
      importZip: 'Upload a zip as a version',
      noteOne:
        'You can keep two versions: duplicate this one to try changes without touching the published one.',
      noteTwo: 'People only enter the published one. The other waits here.',
      coming: {
        importing: 'A new version is arriving… {state}',
        duplicating: 'Duplicating…',
        uploading: 'uploading {p} %',
        waiting: 'waiting its turn',
        working: 'getting it ready',
      },
      following: {
        PublishVersion:
          'Publishing… the world goes off for a few seconds and comes back by itself.',
        DuplicateVersion: 'Duplicating…',
        DeleteVersion: 'Deleting…',
        ImportVersion: 'The zip is arriving as a new version… the world keeps running.',
      },
      done: {
        PublishVersion: 'Version {n} of {w} is now published.',
        DuplicateVersion:
          'The copy of {w} is made: it is version {n}. Publish it for people to visit it.',
        DeleteVersion: 'Version {n} of {w} is deleted.',
        ImportVersion:
          'Version {n} is now in the world, unpublished. Publish it from its card whenever you like.',
      },
      failed: 'Machine {m} could not finish the version change ({rule}).',
      close: 'Close',
      dialog: {
        publishTitle: 'Publish version {n}',
        publishIntro:
          'People inside are put out for a few seconds; the world goes off, switches version and comes back by itself. The address, the keys and the admin code do not change. Ranks and users are those of that version.',
        publishKeep: 'The version published now (version {p}) is kept as the other one.',
        publishStopped: 'The world is off and will stay off.',
        publishConfirm: 'Sign and publish',
        deleteTitle: 'Delete version {n}',
        deleteIntro: 'It is deleted for good. The published one is not touched.',
        deleteCopyFirst: 'Want to keep it? Download it first.',
        downloadFirst: 'Download version {n}',
        deleteConfirm: 'Sign and delete',
        duplicateTitle: 'Duplicate the published version',
        duplicateIntro:
          'An exact copy is made; people stay inside meanwhile. The copy cannot be visited until you publish it.',
        duplicateConfirm: 'Sign and duplicate',
        downloadTitle: 'Download version {n}',
        downloadIntro:
          'The machine prepares a zip of that version as it is now and offers it when it is ready. The link lasts a day. Nothing in the world is touched.',
      },
      problems: {
        'no-version':
          'That version no longer exists (maybe someone else deleted it). The list is read again.',
        published: 'The published version cannot be deleted: publish the other one first.',
        'already-published': 'That version is already the published one.',
        'only-version': 'It is the world’s only version: it cannot be deleted.',
        full: 'The world already has two versions, the most it can keep. Delete one before adding another.',
        'switch-stuck':
          'The version change was left half-way; the world stays off so it does not start on the wrong data. Tell the house.',
        'not-a-folder': 'That version’s folder is not as it should be. Tell the house.',
        'versions-unreadable': 'Machine {m} cannot read this world’s versions. Tell the house.',
        'versions-unwritable': 'Machine {m} cannot save the version change. Tell the house.',
        'not-removed': 'Machine {m} could not delete the version completely. Tell the house.',
        busy: 'This world is busy with another change; try again in a moment.',
        missing: 'That world is no longer on {m}; reload the room.',
        'still-deleting': 'That world is being deleted.',
        'no-room': 'Machine {m} has no room for another version.',
        'engine-refused': 'The world’s engine could not make the copy. Tell the house.',
      },
    },
    history: {
      title: 'What the machines did',
      empty: 'The machines have done nothing yet.',
      failed: 'failed',
      took: 'in {t}',
      kinds: {
        CreateWorld: 'created',
        DeleteWorld: 'deleted',
        StopWorld: 'stopped',
        StartWorld: 'started',
        DownloadWorld: 'copied',
        ShowAdminCode: 'showed the machine’s code',
        ShowWorldCode: 'showed the code of {w}',
        RotateWorldCode: 'changed the code of {w}',
        ImportWorld: 'brought back {w}',
        UpdateWorld: 'updated {w}',
        FleetRelease: 'published an engine release',
        PinWorld: 'pinned {w}',
        DuplicateVersion: 'duplicated a version of {w}',
        PublishVersion: 'changed the published version of {w}',
        DeleteVersion: 'deleted a stored version of {w}',
        DownloadVersion: 'downloaded a version of {w}',
        ImportVersion: 'uploaded a zip as a version of {w}',
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
    allHomes: 'すべての組織',
    homeFilter: '組織',
    views: { label: '表示', cards: 'カード', list: 'リスト', servers: 'サーバー別' },
    status: {
      running: '稼働中',
      stopped: '停止中',
      unreachable: '応答なし',
      unknown: '未確認',
      changing: '処理中',
    },
    phases: {
      creating: '作成中…',
      stopping: '停止中…',
      starting: '起動中…',
      deleting: '削除中…',
      uploading: 'アップロード中…',
      importing: '確認中…',
      updating: '更新中…',
      switching: 'バージョン切り替え中…',
    },
    busyNote: 'ふつうは 1 分ほどかかります。',
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
      uploading: 'zip がマシンに届いているところ',
      importing: 'マシンが zip を確認中',
      updating: 'マシンがエンジンの別のビルドへ移行中',
      switching: 'マシンがバージョンを切り替え中 · 中にいる人は数秒間退出します',
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
      enter: '入る',
      stop: '停止',
      start: '起動',
      delete: '削除',
      download: 'ダウンロード',
      newWorld: '新しいワールド',
      importZip: 'zip から戻す',
      update: '更新',
      pin: '別のバージョンに固定',
      unpin: '固定を解除',
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
      recipe: 'レシピ {r}',
      selfUpdate: {
        manual:
          '{m} はまだ自動で更新されません。最後に一度だけインストールが必要です。マシンに一度ログインしてこの行を実行してください。以後は新しいレシピを自動で取り込みます。',
        current: '自動更新 · 最新です。',
        updating: '自動更新 · 新しいレシピに更新中です。',
        resting: '自動更新 · 待機中:新しいレシピは公開からしばらく経ってから取り込みます。',
        halted:
          '停止中:{why}。そのレシピは再試行しません。次に公開されるレシピで停止が解除されます。',
        haltedSome: '新しいレシピのインストールに失敗しました',
        refused: '停止中:新しいレシピをインストールしません({why})。',
        frozen: '凍結中:今のレシピのままで、マシン上で誰かが解除するまで更新しません。',
        held: 'レシピ {r} に固定中:マシン上で誰かが解除するまで新しいレシピを取り込みません。',
        checking: '自動更新 · まだ新しいレシピを確認していません。',
        canary: 'テスト用マシン(カナリア):各レシピをほかより先に取り込みます。',
      },
      slow: '{m} は遅れています。',
      failing:
        '{m} は指示どおりに動いていません：変更を適用できませんでした。1 分ごとに再試行します。',
      silent:
        '{m} は指示どおりに動いていません：応答がありません。続くようなら Ursa に知らせてください。',
      lastRun: '最後の作業が終わったのは {t} 前です。',
      waiting: '待機中のリクエスト：{n}。',
      freeing: '{d} を削除中…',
      engines: 'エンジン：{e}',
    },
    fleetEngine: {
      title: 'フリートのエンジン',
      current: '最新バージョン：{b}',
      upToDate: 'フリート全体が最新です。',
      behind: '遅れているワールド：{n}',
      laggard: '{id} · {m} · {b}',
      manual: 'このマシンは更新を受け付けません。',
      otherEngine: '別のエンジンのワールド：{n}（遅れには数えません）。',
      none: '公開されたバージョンはまだありません。',
      pinned: 'バージョンに固定されたワールド: {n}',
      pinnedLine: '{id} · {m} · {b}(固定: {r})',
      laggardPinned: '{id} · {m} · {b}(固定: {r})',
      laggardFailed: '{id} · {m} · {b}(失敗: {e})',
      halted: '{m} は更新を停止しました: {r}',
      haltedNoReason: '{m} は更新を停止しました。',
      lastPass: '{m} の直近の実行: {a}、{when}。',
      cardPinned: '{b} に固定: {r}',
    },
    steps: {
      signing: 'ウォレットが署名を求めています…',
      sending: '{m} にリクエストを送信中…',
      preparing: '{m} が zip を準備中…',
    },
    problems: {
      noWallet:
        'ログインに使ったウォレットがこのブラウザにありません。セッションは開いたままです。「セッション」で接続して、ここでもう一度署名してください。',
      noWalletLink: '別のタブで「セッション」を開く',
      otherWallet:
        '接続中のウォレット（{w}）はセッションのものではありません。ウォレットのアカウントを切り替えるか、ログインし直してください。',
      declined: '署名をキャンセルしました。何も送信されていません。',
      notOracle:
        '{m} はあなたのウォレットをオラクルとして登録していません。あなたのウォレットを付けてマシンの起動行を実行してください。',
      expired: '署名の期限が切れていました。コンピューターの時刻を確認してもう一度お試しください。',
      replayed: 'そのリクエストはすでに送信済みです。',
      exists: '{m} にはすでにその名前のワールドがあります。',
      addressTaken: 'そのアドレスは {m} の別のワールドが使っています。',
      stillDeleting:
        '{m} はその名前かアドレスのワールドをまだ削除しています。1 分後にもう一度お試しください。',
      missing: 'そのワールドはもう {m} にありません。ルームを再読み込みしてください。',
      addressMismatch: 'アドレスがワールドのものと一致しません。ルームを再読み込みしてください。',
      refused:
        '{m} はそのオーダーを受け付けません。エンジン、アドレス、または上限がルールの範囲外です。',
      otherMachine: 'そのリクエストは別のマシン宛てでした。',
      slowDown: 'リクエストが続きすぎています。数分お待ちください。',
      noAdminCode: '{m} にはまだそのワールドの管理コードがありません。',
      busy: '{m} はそのワールドをまだ作成中か、コードを変更中です。1 分ほど待ってから、もう一度お試しください。',
      origin: '{m} はこのページからのリクエストを受け付けません。',
      unreachable: '{m} と通信できませんでした。応答がありません。',
      machine: '{m} は試みましたが、できませんでした（{rule}）。',
      late: '{m} は受け取りましたが、まだ終わっていません。1 分後にルームを確認してください。',
      unknownEngine:
        '{m} はそのエンジンを実行しません：Hyperfy か Numinia Engine を選んでください。',
      engineMismatch:
        'そのビルドは別のエンジンのものです：ワールドは自分のエンジンの別のビルドにしか移れません。',
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
      nameTaken: '{w} という名前のワールドがすでにあります。別の名前を選んでください。',
      nameFreeing:
        '{w} は解放中です：そのマシンが前のワールドをまだ削除しています。1 分後にお試しください。',
      addressFreeing:
        '{d} は解放中です：そのマシンが前のワールドをまだ削除しています。1 分後にお試しください。',
      addressTaken: '{d} はすでに {w} のアドレスです。別の名前を選んでください。',
      legacyMove:
        '{d} は現在、旧マシン上の {w} です。ここで作成すると {m} に移ります。先にデータをコピーし、DNS レコードを {m} に向けてください。',
      dnsChecking: '{d} の向き先を確認中…',
      dnsMachine: '{d} はすでに {m} を指しています。準備完了。',
      dnsElsewhere: '{d} は別のマシンを指しています。別の名前を選んでください。',
      dnsNone:
        '{d} はまだ DNS にありません。{m} への A レコード（DNS のみ）を作成してください。それまでワールドは開きません。',
      dnsUnknown: '{d} の向き先を確認できませんでした。ワールドが開かない場合は確認してください。',
      dnsCreate:
        '{d} にはまだレコードがありません。ワールド作成時にルームが {m} 向けに作成します(DNS のみ)。',
      dnsMove:
        '{d} には別のマシン向けのフリートのレコードがあります。ワールド作成時にルームが {m} へ移します。',
      dnsWriting: '{d} の DNS レコードを {m} 向けに作成しています…',
      dnsWriteFailed:
        '{d} の DNS レコードを作成できませんでした({code})。{m} には何も依頼していません。もう一度お試しください。',
      imageLabel: 'エンジン',
      imageHint: '固定されたエンジンのビルド：sha- タグかダイジェスト。latest は不可。',
      engineLabel: 'エンジン',
      engineHint: '{m} が実行するエンジン。ビルドはオーダーに固定されます。',
      engineNoRelease: 'エンジンの公開版はまだありません',
      memoryLabel: 'メモリ',
      cpusLabel: 'CPU',
      uploadLabel: '最大アップロード (MB)',
      confirmIntro:
        'ウォレットがこのリクエストへの署名を求めます。マシンが署名を確認してワールドを作成します。ほかの誰の承認も要りません。',
      powerLabel: '作成時に起動しますか？',
      powerOn: 'オン',
      powerOff: 'オフ',
      powerHint:
        'オンにすると最初から残高を使います：支払う組織を選び、残高が必要です。オフは残高を確認も消費もしません。',
      orgLabel: '支払う組織',
      orgNone: '組織を選んでください',
      orgLoading: '組織を読み込み中…',
      orgFailed: '組織を読み込めませんでした。',
      balanceChecking: '残高を確認中…',
      balanceBlocked:
        '「{org}」には今ワールドを起動する残高がありません。起動する前に残高を補充してください。',
      balanceOk: '残高は十分です：オンで起動できます。',
      topUpLink: '残高を補充する',
      invalid: '確認してください：{fields}。',
      next: '次へ',
      back: '戻る',
      cancel: 'キャンセル',
      restart: '最初からやり直す',
      create: '署名して作成',
      resultTitle: '{t} が誕生しています',
      resultNote: '{m} がワールドを作成しました。起動しだい、1 分以内に {d} で開きます。',
      done: '完了',
      close: '閉じる',
    },
    code: {
      label: '管理コード',
      show: '表示',
      rotate: 'コードを変更',
      showTitle: '{t} の管理コード',
      rotateTitle: '{t} のコードを変更',
      showIntro:
        '{t} だけで使えるコードです。ワールドごとに別のコードがあります。表示するにはウォレットで署名します。',
      rotateIntro:
        'マシンが {t} の新しいコードを作り、ワールドを再起動します。中にいる人は数秒間切断されます。今のコードは使えなくなりますが、すでにそのコードで管理者になった人は管理者のままです（ワールドが覚えています）。',
      rotateStopped:
        '{t} は停止中です。新しいコードは起動したときから有効になります。今のコードは使えなくなりますが、すでにそのコードで管理者になった人は管理者のままです（ワールドが覚えています）。',
      showConfirm: '署名して表示',
      rotateConfirm: '署名して変更',
      shown: '{t} の管理コード：',
      rotated: '{t} の新しいコード：',
      rotatedNote: '{m} が 1 分以内に {t} を再起動します。それ以降はこのコードだけが有効です。',
      rotatedStopped: '{t} は停止中です。このコードは起動したときから有効になります。',
      chat: 'ワールドのチャットで /admin {code} と入力すると、そのブラウザで管理者になります。',
      notYet:
        '{m} はまだワールドごとのコードを出せません。「マシン」にあるその行をもう一度実行してから、やり直してください。',
    },
    rename: {
      label: '名前を変更',
      title: '{t} の名前を変更',
      fieldLabel: '新しい名前',
      save: '保存',
      cancel: 'キャンセル',
      forbidden: '名前を変更できるのはハウスだけです。',
      failed: '名前を保存できませんでした（{detail}）。',
      saved: '名前を保存しました。',
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
      typeToConfirm: '確認のため、アドレスを入力してください：',
      stopConfirm: '署名して停止',
      startConfirm: '署名して起動',
      deleteConfirm: '署名して削除',
      downloadConfirm: '署名して準備',
      updateTitle: '{t} を更新',
      updateIntro:
        '{t} は Numinia Engine のビルド {from} から {to} に移ります。マシンが新しいビルドを取得し、ワールドを保存して再起動します：中にいる人は数秒切断されます。データとアドベンチャーはそのまま残ります。',
      updateConfirm: '署名して更新',
      pinTitle: '{t} を別のバージョンに固定',
      pinIntro:
        '{t} は選んだバージョンに留まり、フリートの更新では動きません。マシンがそのバージョンを取得し、ワールドを保存してそのバージョンで再起動します。中にいる人は数秒間切断されます。',
      pinBuild: 'バージョン',
      pinBuildHint: 'このワールドのエンジンのバージョン(現在: {b})',
      pinBadBuild:
        'このワールドのエンジンのバージョンではありません。sha- とバージョンの数字、またはイメージ全体を入力してください。',
      pinReason: '理由(1行、必須)',
      pinConfirm: '署名して固定',
      unpinTitle: '{t} の固定を解除',
      unpinIntro:
        '{t} はフリートのバージョンに再び従います。マシンの次の実行で更新されます。現在 {b} に固定されています: {r}',
      unpinReasonDefault: 'フリートに再び従う',
      unpinConfirm: '署名して固定を解除',
      notObeying: '{m} はいま指示どおりに動いていません：リクエストは戻るまでキューで待ちます。',
    },
    copy: {
      ready: '準備完了：{f} · {s}',
      save: 'zip をダウンロード',
      fingerprint: 'SHA-256 フィンガープリント：{h}',
      expires: 'リンクの有効期限：{when}。',
    },
    import: {
      noMachine: '応答するマシンがありません。今はワールドを戻せません。',
      dropTitle: 'zip をドロップしてワールドを戻す',
      dropNote: '署名するまで何もアップロードされません。',
      dropCap: '.zip 1 つ · 最大 {max}',
      dropOne: 'zip を 1 つだけドロップしてください',
      title: 'ワールドを戻す',
      stepPlace: '場所',
      stepSign: '署名',
      reading: 'zip を読んでいます…',
      copyOf: '{w} のコピー（{d}）· {s}',
      copyOfUndated: '{w} のコピー · {s}',
      folder: 'ワールドのフォルダ · db.sqlite とファイル {n} 個 · {s}',
      engineImage:
        '使われないエンジンのイメージ（{s}）も含まれています。そのままアップロードされます。',
      keysNote:
        'zip からはデータベースとファイルだけを使い、鍵と docker-compose は使いません。{m} が新しい鍵を作ります。',
      machineLabel: 'マシン',
      engineNote: '{b} · フリートのエンジン',
      zipLine: 'zip：{f} · {s}（{b} バイト）',
      fingerprint: 'フィンガープリント：{h}',
      hashing: 'zip のフィンガープリントを計算中… {p} %',
      unreadable: 'zip を読めませんでした。ファイルをもう一度選んでください。',
      signNote:
        'ウォレットが、ワールド、アドレス、マシン、エンジン、zip の正確なサイズとフィンガープリントへの署名を求めます。{m} はこの zip だけを受け付けます。',
      sign: '署名してアップロード',
      pickAnother: '別の zip を選ぶ',
      uploading: '{m} にアップロード中 · {sent} / {total}',
      keepOpen: '終わるまでこのタブを閉じないでください。',
      stop: 'アップロードを止める',
      checking: '{m} が zip を確認しています。',
      cutPill: 'アップロード中断',
      cut: '{m} との接続が {sent} / {total} の時点で切れました。',
      stopped: '{sent} / {total} の時点でアップロードを止めました。',
      retry: 'もう一度アップロード',
      discard: '破棄',
      halfDone: 'アップロードが途中で止まっています。同じ zip をもう一度選んでください。',
      pickSame: 'zip を選ぶ',
      notSame: '同じ zip ではありません。フィンガープリントが一致しません。',
      entry: 'ファイル：{f}',
      versionTitle: 'zip をバージョンとして追加',
      versionLabel: 'この zip をどうしますか',
      versionNew: '新しいワールドとして持ってくる',
      versionOption: '{t}（{d}）の新しいバージョンとして追加する',
      versionOwn:
        'マシン、アドレス、上限はワールドのものです。zip が持ってくるのはバージョンだけです。',
      versionOne: 'ワールドはそのままです。zip は 2 つ目のバージョンとして、未公開のまま届きます。',
      versionTwo:
        'zip の確認が済むと、バージョン {n}（未公開のほう）が zip の内容に置き換わります。公開中のバージョンには触れません。',
      versionSignNote:
        '署名は 1 回だけです。{m} が zip を {w} の新しいバージョンとして保管します。ワールドは動いたままです。みんなが訪れられるようにするには、あとでカードから公開してください。',
      versionSign: '署名して zip を追加',
      elsewhere:
        '別のタブがアップロード中か、途中で止まっています。誰も終えなければ、{m} が 1 時間以内に破棄します。',
      failedPill: '戻せませんでした',
      landed: '{w} は {m} に戻りました（停止中）。',
      landedClose: '閉じる',
      fromZip: 'zip から戻したワールド',
      engineWorld: 'Numinia Engine のワールド（{v}）· {n} ファイル · {s}',
      engineKeysNote:
        'zip からはワールド（データ、アドベンチャー、環境）を使います。鍵は入っていません：{m} が新しい鍵を作ります。',
      noEngineMachine: 'zip を受け付けるマシンで Numinia Engine を実行するものはまだありません。',
      engineNoRelease: 'エンジンの公開版がまだありません：この zip はまだ戻せません。',
      engineRefused: '{m} のエンジンはこの zip を読めません：{why}',
      before: {
        empty: 'ファイルが空です。',
        several: '{n} 個のファイルがドロップされました。1 つだけにしてください。',
        folder: 'それはフォルダです。zip に圧縮してください。',
        tooManyFiles: 'zip には {n} 個のファイルがあり、{m} が受け付けるのは {max} 個までです。',
        fileTooBig: '{f} は {s} あり、{m} が 1 ファイルあたりに受け付ける {max} を超えています。',
        ratio: '展開すると大きくなりすぎます（×{r}）。「zip 爆弾」の手口です。開きません。',
        unpackedTooBig: '展開すると {s} になり、{m} が受け付ける {max} を超えます。',
        unexpected: 'zip にワールドには含まれないものがあります：{f}',
        mundoUnreadable:
          'この zip の mundo.json は読めません。有効な JSON ではありません。ルームからワールドの zip をダウンロードする（またはエンジンの `copia` を実行する）ことで得た zip を使ってください。',
        mundoSchema:
          'この zip の mundo.json は「{s}」を宣言していますが、エンジンはこのスキーマを読めません（numinia-engine/mundo@1 または @2）。ルームからワールドの zip をダウンロードする（またはエンジンの `copia` を実行する）ことで得た zip を使ってください。',
        mundoSchemaNone:
          'この zip の mundo.json にはエンジンのスキーマが宣言されていません（numinia-engine/mundo@1 または @2）。ルームからワールドの zip をダウンロードする（またはエンジンの `copia` を実行する）ことで得た zip を使ってください。',
        mundoNoFiles:
          'この zip の mundo.json はエンジンのエクスポートではありません。ファイルの一覧がありません。ルームからワールドの zip をダウンロードする（またはエンジンの `copia` を実行する）ことで得た zip を使ってください。',
        mundoSeveral:
          'zip に mundo.json が {n} 個あります。エンジンが読めるのは 1 つだけです。zip 1 つにつきワールドは 1 つにして、圧縮し直してください。',
      },
      rules: {
        'zip-too-big': 'zip は {s} で、{m} が受け付けるのは {max} までです。',
        'no-room':
          '{m} にはこの zip を置く場所がありません。ワールドを削除するか、別のマシンを選んでください。',
        'slot-expired':
          'アップロードの期限が切れました。もう一度署名してアップロードしてください。',
        'wrong-size': 'アップロードが不完全なまま届きました。もう一度アップロードしてください。',
        cut: 'アップロードが不完全なまま届きました。もう一度アップロードしてください。',
        fingerprint:
          '届いたのは署名した zip ではありません。フィンガープリントが一致しません。もう一度アップロードしてください。',
        'not-a-zip': '「{f}」は zip ではありません。',
        encrypted: 'zip にパスワードがかかっています。パスワードなしで保存してください。',
        'too-many-files': 'zip のファイル数が {m} の上限を超えています。',
        'zip-slip':
          'zip にフォルダの外へ出るパス（「..」や「/」）があります。安全のため {m} は開きません。',
        link: 'zip にファイルではなくリンクがあります。安全のため {m} は開きません。',
        'file-too-big':
          'zip の中に、{m} が 1 ファイルあたりに受け付けるサイズを超えるファイルがあります。',
        ratio: '展開すると大きくなりすぎます。「zip 爆弾」の手口です。開きません。',
        'unpacked-too-big': '展開すると {m} が受け付ける容量を超えます。',
        'not-a-world':
          'zip にワールドがありません。db.sqlite（Hyperfy）か mundo.json（Numinia Engine）がありません。',
        unexpected: 'zip にワールドには含まれないものがあります。',
        'db-open':
          'ワールドの稼働中にデータベースがコピーされています。「ダウンロード」で取得するか、停止してから圧縮してください。',
        manifest:
          'world.json のフィンガープリントと一致しないファイルがあります。zip が壊れたか変更されています。もう一度ダウンロードしてください。',
        'db-broken': 'zip のデータベースが壊れています。検査に通りません。',
        'db-foreign':
          'db.sqlite はワールドのデータベースではありません。必要なテーブルがありません。',
        'engine-refused': '{m} のエンジンはこの zip を読めません。',
      },
    },
    versions: {
      title: 'バージョン',
      label: 'バージョン {n}',
      published: '公開中',
      origin: { created: 'ここで作成', zip: 'zip から', copy: 'バージョン {n} のコピー' },
      size: '約 {s}',
      sizeNote:
        '作成時または公開時に測ったサイズです。公開中のものは使われるうちに大きくなるため、おおよその値です。',
      download: 'ダウンロード',
      duplicate: '複製',
      publish: 'これを公開',
      delete: '削除',
      importZip: 'zip をバージョンとして追加',
      noteOne:
        'バージョンは 2 つまで持てます。公開中のものに触れずに変更を試すには、これを複製してください。',
      noteTwo: '人が入れるのは公開中のバージョンだけです。もう一方はここで待機します。',
      coming: {
        importing: '新しいバージョンが届いています… {state}',
        duplicating: '複製中…',
        uploading: 'アップロード中 {p} %',
        waiting: '順番待ち',
        working: '準備中',
      },
      following: {
        PublishVersion: '公開中… ワールドは数秒間停止し、自動で戻ります。',
        DuplicateVersion: '複製中…',
        DeleteVersion: '削除中…',
        ImportVersion: 'zip を新しいバージョンとして受け取っています…ワールドは動いたままです。',
      },
      done: {
        PublishVersion: '{w} のバージョン {n} を公開しました。',
        DuplicateVersion:
          '{w} のコピーができました（バージョン {n}）。人が訪れるには公開してください。',
        DeleteVersion: '{w} のバージョン {n} を削除しました。',
        ImportVersion:
          'バージョン {n} がワールドに入りました（未公開）。好きなときにカードから公開してください。',
      },
      failed: 'マシン {m} はバージョンの切り替えを完了できませんでした（{rule}）。',
      close: '閉じる',
      dialog: {
        publishTitle: 'バージョン {n} を公開',
        publishIntro:
          '中にいる人は数秒間退出します。ワールドは停止し、バージョンを切り替えて、自動で戻ります。アドレス、キー、管理コードは変わりません。ランクとユーザーはそのバージョンのものになります。',
        publishKeep: 'いま公開中のバージョン（バージョン {p}）は、もう一方として保存されます。',
        publishStopped: 'ワールドは停止中で、停止したままです。',
        publishConfirm: '署名して公開',
        deleteTitle: 'バージョン {n} を削除',
        deleteIntro: '完全に削除されます。公開中のバージョンには触れません。',
        deleteCopyFirst: '残しておきたい場合は、先にダウンロードしてください。',
        downloadFirst: 'バージョン {n} をダウンロード',
        deleteConfirm: '署名して削除',
        duplicateTitle: '公開中のバージョンを複製',
        duplicateIntro:
          'まったく同じコピーを作ります。その間も人は中にいられます。コピーは公開するまで訪れることができません。',
        duplicateConfirm: '署名して複製',
        downloadTitle: 'バージョン {n} をダウンロード',
        downloadIntro:
          'マシンがそのバージョンの現在の状態を zip にまとめ、準備できたらお渡しします。リンクは 1 日有効です。ワールドには何も手を加えません。',
      },
      problems: {
        'no-version':
          'そのバージョンはもうありません（他の人が削除したのかもしれません）。一覧を読み込み直します。',
        published: '公開中のバージョンは削除できません。先にもう一方を公開してください。',
        'already-published': 'そのバージョンはすでに公開中です。',
        'only-version': 'このワールドの唯一のバージョンなので、削除できません。',
        full: 'このワールドにはすでに最大の 2 つのバージョンがあります。追加する前に 1 つ削除してください。',
        'switch-stuck':
          'バージョンの切り替えが途中で止まりました。誤ったデータで起動しないよう、ワールドは停止したままです。運営にお知らせください。',
        'not-a-folder':
          'そのバージョンのフォルダーが正しい状態ではありません。運営にお知らせください。',
        'versions-unreadable':
          'マシン {m} はこのワールドのバージョンを読み取れません。運営にお知らせください。',
        'versions-unwritable':
          'マシン {m} はバージョンの変更を保存できません。運営にお知らせください。',
        'not-removed':
          'マシン {m} はバージョンを完全には削除できませんでした。運営にお知らせください。',
        busy: 'このワールドは別の変更の処理中です。少し待ってからお試しください。',
        missing: 'そのワールドはもう {m} にありません。ルームを読み込み直してください。',
        'still-deleting': 'そのワールドは削除中です。',
        'no-room': 'マシン {m} にはもう 1 つバージョンを置く空きがありません。',
        'engine-refused': 'ワールドのエンジンがコピーを作れませんでした。運営にお知らせください。',
      },
    },
    history: {
      title: 'マシンの作業履歴',
      empty: 'マシンはまだ何もしていません。',
      failed: '失敗',
      took: '（{t}）',
      kinds: {
        CreateWorld: '作成',
        DeleteWorld: '削除',
        StopWorld: '停止',
        StartWorld: '起動',
        DownloadWorld: 'コピー',
        ShowAdminCode: 'マシンのコードを表示',
        ShowWorldCode: '{w} のコードを表示',
        RotateWorldCode: '{w} のコードを変更',
        ImportWorld: '{w} を zip から戻した',
        UpdateWorld: '{w} を更新した',
        FleetRelease: 'エンジンのリリースを公開した',
        PinWorld: '{w} を固定した',
        DuplicateVersion: '{w} のバージョンを複製した',
        PublishVersion: '{w} の公開バージョンを切り替えた',
        DeleteVersion: '{w} の保管中のバージョンを削除した',
        DownloadVersion: '{w} のバージョンをダウンロードした',
        ImportVersion: '{w} のバージョンとして zip をアップロードした',
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
    allHomes: '모든 조직',
    homeFilter: '조직',
    views: { label: '보기', cards: '카드', list: '목록', servers: '서버별' },
    status: {
      running: '실행 중',
      stopped: '정지됨',
      unreachable: '응답 없음',
      unknown: '미확인',
      changing: '진행 중',
    },
    phases: {
      creating: '만드는 중…',
      stopping: '정지하는 중…',
      starting: '시작하는 중…',
      deleting: '삭제하는 중…',
      uploading: '업로드하는 중…',
      importing: '확인하는 중…',
      updating: '업데이트하는 중…',
      switching: '버전 전환하는 중…',
    },
    busyNote: '보통 1분 정도 걸립니다.',
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
      uploading: 'zip이 머신에 도착하는 중',
      importing: '머신이 zip을 확인하는 중',
      updating: '머신이 다른 엔진 빌드로 옮기는 중',
      switching: '머신이 버전을 전환하는 중 · 안에 있는 사람은 몇 초간 나갑니다',
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
      enter: '입장',
      stop: '정지',
      start: '시작',
      delete: '삭제',
      download: '다운로드',
      newWorld: '새 월드',
      importZip: 'zip에서 가져오기',
      update: '업데이트',
      pin: '다른 버전으로 고정',
      unpin: '고정 해제',
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
      recipe: '레시피 {r}',
      selfUpdate: {
        manual:
          '{m}은(는) 아직 스스로 업데이트하지 않습니다. 마지막으로 한 번 설치가 필요합니다. 머신에 한 번 로그인해 이 줄을 실행하세요. 그 뒤로는 새 레시피를 스스로 받습니다.',
        current: '스스로 업데이트 · 최신입니다.',
        updating: '스스로 업데이트 · 새 레시피로 업데이트 중입니다.',
        resting: '스스로 업데이트 · 대기 중: 새 레시피가 공개되고 잠시 지난 뒤에 받습니다.',
        halted:
          '멈춤: {why}. 그 레시피는 다시 시도하지 않습니다. 다음에 공개되는 레시피가 멈춤을 풉니다.',
        haltedSome: '새 레시피 설치에 실패했습니다',
        refused: '멈춤: 새 레시피를 설치하지 않습니다({why}).',
        frozen: '동결됨: 지금 레시피에 머물며, 누군가 머신에서 풀기 전까지 업데이트하지 않습니다.',
        held: '레시피 {r}에 고정됨: 누군가 머신에서 풀기 전까지 새 레시피를 받지 않습니다.',
        checking: '스스로 업데이트 · 아직 새 레시피를 확인하지 않았습니다.',
        canary: '테스트 머신(카나리아): 각 레시피를 다른 머신보다 먼저 받습니다.',
      },
      slow: '{m}이(가) 늦어지고 있습니다.',
      failing:
        '{m}이(가) 명령을 따르지 않습니다: 변경을 적용하지 못했습니다. 1분마다 다시 시도합니다.',
      silent:
        '{m}이(가) 명령을 따르지 않습니다: 아무 신호가 없습니다. 계속되면 Ursa에게 알려 주세요.',
      lastRun: '마지막 작업은 {t} 전에 끝났습니다.',
      waiting: '대기 중인 요청: {n}.',
      freeing: '{d} 삭제 중…',
      engines: '엔진: {e}',
    },
    fleetEngine: {
      title: '플릿 엔진',
      current: '현재 버전: {b}',
      upToDate: '플릿 전체가 최신입니다.',
      behind: '뒤처진 월드: {n}',
      laggard: '{id} · {m} · {b}',
      manual: '이 머신은 업데이트를 받지 않습니다.',
      otherEngine: '다른 엔진의 월드: {n}(뒤처짐에 포함하지 않음).',
      none: '게시된 버전이 아직 없습니다.',
      pinned: '버전에 고정된 월드: {n}',
      pinnedLine: '{id} · {m} · {b} (고정: {r})',
      laggardPinned: '{id} · {m} · {b} (고정: {r})',
      laggardFailed: '{id} · {m} · {b} (실패: {e})',
      halted: '{m}이(가) 업데이트를 멈췄습니다: {r}',
      haltedNoReason: '{m}이(가) 업데이트를 멈췄습니다.',
      lastPass: '{m}의 마지막 실행: {a}, {when}.',
      cardPinned: '{b}에 고정: {r}',
    },
    steps: {
      signing: '지갑이 서명을 요청합니다…',
      sending: '{m}(으)로 요청을 보내는 중…',
      preparing: '{m}이(가) zip을 준비하는 중…',
    },
    problems: {
      noWallet:
        '로그인할 때 쓴 지갑이 이 브라우저에 없습니다. 세션은 아직 열려 있습니다. 세션에서 연결한 뒤 여기서 다시 서명하세요.',
      noWalletLink: '다른 탭에서 세션 열기',
      otherWallet:
        '연결된 지갑({w})이 세션의 지갑이 아닙니다. 지갑에서 계정을 바꾸거나 다시 로그인하세요.',
      declined: '서명을 취소했습니다. 아무것도 보내지 않았습니다.',
      notOracle:
        '{m}의 오라클 목록에 당신의 지갑이 없습니다. 당신의 지갑으로 머신의 시작 줄을 실행하세요.',
      expired: '서명이 만료된 채 도착했습니다. 컴퓨터 시계를 확인하고 다시 시도하세요.',
      replayed: '그 요청은 이미 보냈습니다.',
      exists: '{m}에 이미 그 이름의 월드가 있습니다.',
      addressTaken: '그 주소는 이미 {m}의 다른 월드가 쓰고 있습니다.',
      stillDeleting:
        '{m}이(가) 그 이름이나 주소의 월드를 아직 삭제하고 있습니다. 1분 뒤에 다시 시도하세요.',
      missing: '그 월드는 더 이상 {m}에 없습니다. 방을 새로 고치세요.',
      addressMismatch: '주소가 월드의 주소와 맞지 않습니다. 방을 새로 고치세요.',
      refused: '{m}은(는) 그 주문을 받지 않습니다. 엔진, 주소 또는 한도가 규칙을 벗어납니다.',
      otherMachine: '그 요청은 다른 머신용이었습니다.',
      slowDown: '요청이 너무 연달아 왔습니다. 몇 분 기다리세요.',
      noAdminCode: '{m}에는 아직 그 월드의 관리 코드가 없습니다.',
      busy: '{m}이(가) 아직 그 월드를 만들거나 코드를 바꾸는 중입니다. 1분쯤 기다린 뒤 다시 시도하세요.',
      origin: '{m}은(는) 이 페이지의 요청을 받지 않습니다.',
      unreachable: '{m}에 연결할 수 없습니다. 응답이 없습니다.',
      machine: '{m}이(가) 시도했지만 할 수 없었습니다 ({rule}).',
      late: '{m}이(가) 받았지만 아직 끝나지 않았습니다. 1분 뒤에 방을 보세요.',
      unknownEngine: '{m}은(는) 그 엔진을 실행하지 않습니다. Hyperfy나 Numinia Engine을 고르세요.',
      engineMismatch:
        '그 빌드는 다른 엔진의 것입니다. 월드는 자기 엔진의 다른 빌드로만 옮길 수 있습니다.',
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
      nameTaken: '{w}(이)라는 월드가 이미 있습니다. 다른 이름을 고르세요.',
      nameFreeing:
        '{w}은(는) 비워지는 중입니다: 그 머신이 이전 월드를 아직 삭제하고 있습니다. 1분 뒤에 시도하세요.',
      addressFreeing:
        '{d}은(는) 비워지는 중입니다: 그 머신이 이전 월드를 아직 삭제하고 있습니다. 1분 뒤에 시도하세요.',
      addressTaken: '{d}은(는) 이미 {w}의 주소입니다. 다른 이름을 고르세요.',
      legacyMove:
        '{d}은(는) 지금 옛 머신의 {w}입니다. 여기서 만들면 {m}(으)로 옮겨집니다. 먼저 데이터를 복사하고 DNS 레코드를 {m}(으)로 돌리세요.',
      dnsChecking: '{d}이(가) 가리키는 곳을 확인하는 중…',
      dnsMachine: '{d}은(는) 이미 {m}을(를) 가리킵니다. 준비 완료.',
      dnsElsewhere: '{d}은(는) 다른 머신을 가리킵니다. 다른 이름을 고르세요.',
      dnsNone:
        '{d}은(는) 아직 DNS에 없습니다. {m}(으)로 향하는 A 레코드(DNS 전용)를 만드세요. 그때까지 월드는 열리지 않습니다.',
      dnsUnknown: '{d}이(가) 가리키는 곳을 확인하지 못했습니다. 월드가 열리지 않으면 확인하세요.',
      dnsCreate:
        '{d}에는 아직 레코드가 없습니다. 월드를 만들 때 룸이 {m}을(를) 가리키도록 만듭니다(DNS 전용).',
      dnsMove:
        '{d}에는 다른 머신을 가리키는 플릿 레코드가 있습니다. 월드를 만들 때 룸이 {m}(으)로 옮깁니다.',
      dnsWriting: '{d}의 DNS 레코드를 {m}(으)로 만드는 중…',
      dnsWriteFailed:
        '{d}의 DNS 레코드를 만들지 못했습니다({code}). {m}에는 아무것도 요청하지 않았습니다. 다시 시도하세요.',
      imageLabel: '엔진',
      imageHint: '고정된 엔진 빌드: sha- 태그나 다이제스트, latest는 안 됩니다.',
      engineLabel: '엔진',
      engineHint: '{m}이(가) 실행하는 엔진. 빌드는 주문에 고정됩니다.',
      engineNoRelease: '아직 공개된 엔진 버전이 없습니다',
      memoryLabel: '메모리',
      cpusLabel: 'CPU',
      uploadLabel: '최대 업로드 (MB)',
      confirmIntro:
        '지갑이 이 요청에 서명하라고 합니다. 머신이 서명을 확인하고 월드를 만듭니다. 다른 누구의 승인도 필요 없습니다.',
      powerLabel: '만들 때 바로 켜나요?',
      powerOn: '켜짐',
      powerOff: '꺼짐',
      powerHint:
        '켜짐은 처음부터 잔액을 씁니다: 비용을 낼 조직을 고르고, 잔액이 있어야 합니다. 꺼짐은 잔액을 확인하거나 쓰지 않습니다.',
      orgLabel: '비용을 내는 조직',
      orgNone: '조직을 선택하세요',
      orgLoading: '조직을 불러오는 중…',
      orgFailed: '조직을 불러올 수 없습니다.',
      balanceChecking: '잔액 확인 중…',
      balanceBlocked: '«{org}»에는 지금 월드를 켤 잔액이 없습니다. 켜기 전에 잔액을 충전하세요.',
      balanceOk: '잔액이 충분합니다: 켜진 채로 시작할 수 있습니다.',
      topUpLink: '잔액 충전하기',
      invalid: '확인하세요: {fields}.',
      next: '다음',
      back: '뒤로',
      cancel: '취소',
      restart: '처음부터 다시',
      create: '서명하고 만들기',
      resultTitle: '{t}이(가) 태어나는 중',
      resultNote: '{m}이(가) 월드를 만들었습니다. 시작되는 대로 1분 안에 {d}에서 열립니다.',
      done: '완료',
      close: '닫기',
    },
    code: {
      label: '관리 코드',
      show: '보기',
      rotate: '코드 변경',
      showTitle: '{t}의 관리 코드',
      rotateTitle: '{t}의 코드 변경',
      showIntro:
        '{t}에서만 쓰는 코드입니다. 월드마다 코드가 따로 있습니다. 보려면 지갑으로 서명합니다.',
      rotateIntro:
        '머신이 {t}의 새 코드를 만들고 월드를 다시 시작합니다. 안에 있는 사람은 몇 초 동안 연결이 끊깁니다. 지금 코드는 더 이상 쓸 수 없지만, 이미 그 코드로 관리자가 된 사람은 계속 관리자입니다. 월드가 기억합니다.',
      rotateStopped:
        '{t}은(는) 정지되어 있습니다. 새 코드는 시작하는 순간부터 쓸 수 있습니다. 지금 코드는 더 이상 쓸 수 없지만, 이미 그 코드로 관리자가 된 사람은 계속 관리자입니다. 월드가 기억합니다.',
      showConfirm: '서명하고 보기',
      rotateConfirm: '서명하고 변경',
      shown: '{t}의 관리 코드:',
      rotated: '{t}의 새 코드:',
      rotatedNote:
        '{m}이(가) 1분 안에 {t}을(를) 다시 시작합니다. 그때부터는 이 코드만 쓸 수 있습니다.',
      rotatedStopped: '{t}은(는) 정지되어 있습니다. 이 코드는 시작하는 순간부터 쓸 수 있습니다.',
      chat: '월드 채팅에 /admin {code}을(를) 입력하면 그 브라우저에서 관리자가 됩니다.',
      notYet:
        '{m}은(는) 아직 월드마다 코드를 주지 못합니다. 머신 목록에 있는 그 줄을 다시 실행한 뒤 다시 시도하세요.',
    },
    rename: {
      label: '이름 변경',
      title: '{t} 이름 변경',
      fieldLabel: '새 이름',
      save: '저장',
      cancel: '취소',
      forbidden: '하우스만 이름을 변경할 수 있습니다.',
      failed: '이름을 저장하지 못했습니다 ({detail}).',
      saved: '이름을 저장했습니다.',
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
      typeToConfirm: '확인하려면 주소를 입력하세요:',
      stopConfirm: '서명하고 정지',
      startConfirm: '서명하고 시작',
      deleteConfirm: '서명하고 삭제',
      downloadConfirm: '서명하고 준비',
      updateTitle: '{t} 업데이트',
      updateIntro:
        '{t}은(는) Numinia Engine 빌드 {from}에서 {to}(으)로 옮깁니다. 머신이 새 빌드를 받고, 월드를 저장한 뒤 새 빌드로 다시 시작합니다. 안에 있는 사람은 몇 초 동안 연결이 끊깁니다. 데이터와 어드벤처는 그대로 남습니다.',
      updateConfirm: '서명하고 업데이트',
      pinTitle: '{t}을(를) 다른 버전으로 고정',
      pinIntro:
        '{t}은(는) 고른 버전에 머물며 플릿의 업데이트로 움직이지 않습니다. 머신이 그 버전을 받아 월드를 저장하고 그 버전으로 다시 시작합니다. 안에 있는 사람은 몇 초간 연결이 끊깁니다.',
      pinBuild: '버전',
      pinBuildHint: '이 월드 엔진의 버전 (현재: {b})',
      pinBadBuild:
        '이 월드 엔진의 버전이 아닙니다. sha-와 버전 숫자, 또는 이미지 전체를 입력하세요.',
      pinReason: '이유 (한 줄, 필수)',
      pinConfirm: '서명하고 고정',
      unpinTitle: '{t}의 고정 해제',
      unpinIntro:
        '{t}은(는) 다시 플릿의 버전을 따릅니다. 머신의 다음 실행에서 업데이트됩니다. 지금은 {b}에 고정되어 있습니다: {r}',
      unpinReasonDefault: '다시 플릿을 따름',
      unpinConfirm: '서명하고 고정 해제',
      notObeying:
        '{m}이(가) 지금 명령을 따르지 않습니다: 요청은 돌아올 때까지 대기열에서 기다립니다.',
    },
    copy: {
      ready: '준비 완료: {f} · {s}',
      save: 'zip 다운로드',
      fingerprint: 'SHA-256 지문: {h}',
      expires: '링크 만료: {when}.',
    },
    import: {
      noMachine: '응답하는 머신이 없습니다. 지금은 월드를 가져올 수 없습니다.',
      dropTitle: 'zip을 놓아 월드를 가져오세요',
      dropNote: '서명하기 전에는 아무것도 업로드되지 않습니다.',
      dropCap: '.zip 하나 · 최대 {max}',
      dropOne: 'zip을 하나만 놓으세요',
      title: '월드 가져오기',
      stepPlace: '위치',
      stepSign: '서명',
      reading: 'zip을 읽는 중…',
      copyOf: '{w}의 사본 ({d}) · {s}',
      copyOfUndated: '{w}의 사본 · {s}',
      folder: '월드 폴더 · db.sqlite와 파일 {n}개 · {s}',
      engineImage: '사용하지 않는 엔진 이미지({s})도 들어 있습니다. 그대로 업로드됩니다.',
      keysNote:
        'zip에서는 데이터베이스와 파일만 사용하고, 키와 docker-compose는 사용하지 않습니다. {m}이(가) 새 키를 만듭니다.',
      machineLabel: '머신',
      engineNote: '{b} · 플릿의 엔진',
      zipLine: 'zip: {f} · {s} ({b}바이트)',
      fingerprint: '지문: {h}',
      hashing: 'zip의 지문을 계산하는 중… {p}%',
      unreadable: 'zip을 읽을 수 없습니다. 파일을 다시 선택하세요.',
      signNote:
        '지갑이 월드, 주소, 머신, 엔진, zip의 정확한 크기와 지문에 서명하라고 요청합니다. {m}은(는) 이 zip만 받습니다.',
      sign: '서명하고 업로드',
      pickAnother: '다른 zip 선택',
      uploading: '{m}에 업로드하는 중 · {sent} / {total}',
      keepOpen: '끝날 때까지 이 탭을 닫지 마세요.',
      stop: '업로드 중지',
      checking: '{m}이(가) zip을 확인하고 있습니다.',
      cutPill: '업로드 끊김',
      cut: '{m}과(와)의 연결이 {sent} / {total} 지점에서 끊겼습니다.',
      stopped: '{sent} / {total} 지점에서 업로드를 중지했습니다.',
      retry: '다시 업로드',
      discard: '버리기',
      halfDone: '업로드가 중간에 멈췄습니다. 같은 zip을 다시 선택하세요.',
      pickSame: 'zip 선택',
      notSame: '같은 zip이 아닙니다. 지문이 일치하지 않습니다.',
      entry: '파일: {f}',
      versionTitle: 'zip을 버전으로 올리기',
      versionLabel: '이 zip을 어떻게 할까요',
      versionNew: '새 월드로 가져오기',
      versionOption: '{t}({d})의 새 버전으로 올리기',
      versionOwn: '머신, 주소, 한도는 월드의 것입니다. zip은 버전만 가져옵니다.',
      versionOne: '월드는 그대로 두고, zip은 공개하지 않은 두 번째 버전으로 들어옵니다.',
      versionTwo:
        'zip 확인이 끝나면 버전 {n}(공개되지 않은 버전)이 zip의 내용으로 바뀝니다. 공개된 버전은 건드리지 않습니다.',
      versionSignNote:
        '서명은 한 번뿐입니다. {m}이(가) zip을 {w}의 새 버전으로 보관합니다. 월드는 계속 켜져 있습니다. 사람들이 방문하게 하려면 나중에 카드에서 공개하세요.',
      versionSign: '서명하고 zip 올리기',
      elsewhere:
        '다른 탭에서 업로드하는 중이거나 중간에 멈췄습니다. 아무도 끝내지 않으면 {m}이(가) 1시간 안에 버립니다.',
      failedPill: '가져오지 못함',
      landed: '{w}이(가) {m}에 왔습니다. 정지 상태입니다.',
      landedClose: '닫기',
      fromZip: 'zip에서 가져옴',
      engineWorld: 'Numinia Engine 월드({v}) · 파일 {n}개 · {s}',
      engineKeysNote:
        'zip에서는 월드(데이터, 어드벤처, 환경)를 씁니다. 키는 들어 있지 않습니다. {m}이(가) 새 키를 만듭니다.',
      noEngineMachine: 'zip을 받는 머신 중 Numinia Engine을 실행하는 머신이 아직 없습니다.',
      engineNoRelease: '아직 공개된 엔진 버전이 없습니다. 이 zip은 아직 가져올 수 없습니다.',
      engineRefused: '{m}의 엔진이 이 zip을 읽지 못합니다: {why}',
      before: {
        empty: '파일이 비어 있습니다.',
        several: '파일 {n}개를 놓았습니다. 하나만 가져오세요.',
        folder: '폴더입니다. zip으로 압축하세요.',
        tooManyFiles: 'zip에 파일이 {n}개 있고, {m}은(는) {max}개까지 받습니다.',
        fileTooBig: '{f}은(는) {s}로, {m}이(가) 파일 하나당 받는 {max}보다 큽니다.',
        ratio: '열면 너무 커집니다(×{r}). “zip 폭탄”의 방식입니다. 열지 않습니다.',
        unpackedTooBig: '열면 {s}가 되어 {m}이(가) 받는 {max}를 넘습니다.',
        unexpected: 'zip에 월드에 없는 것이 들어 있습니다: {f}',
        mundoUnreadable:
          '이 zip의 mundo.json을 읽을 수 없습니다. 올바른 JSON이 아닙니다. 룸에서 월드의 zip을 내려받거나(또는 엔진의 `copia`를 실행해) 그 zip을 가져오세요.',
        mundoSchema:
          '이 zip의 mundo.json은 “{s}”을(를) 선언하는데, 엔진이 읽지 못하는 스키마입니다(numinia-engine/mundo@1 또는 @2). 룸에서 월드의 zip을 내려받거나(또는 엔진의 `copia`를 실행해) 그 zip을 가져오세요.',
        mundoSchemaNone:
          '이 zip의 mundo.json에는 엔진의 스키마가 선언되어 있지 않습니다(numinia-engine/mundo@1 또는 @2). 룸에서 월드의 zip을 내려받거나(또는 엔진의 `copia`를 실행해) 그 zip을 가져오세요.',
        mundoNoFiles:
          '이 zip의 mundo.json은 엔진의 내보내기가 아닙니다. 파일 목록이 없습니다. 룸에서 월드의 zip을 내려받거나(또는 엔진의 `copia`를 실행해) 그 zip을 가져오세요.',
        mundoSeveral:
          'zip에 mundo.json이 {n}개 있는데, 엔진은 하나만 읽습니다. zip 하나에 월드 하나만 담아 다시 압축하세요.',
      },
      rules: {
        'zip-too-big': 'zip은 {s}이고, {m}은(는) {max}까지 받습니다.',
        'no-room': '{m}에 이 zip을 둘 공간이 없습니다. 월드를 삭제하거나 다른 머신을 선택하세요.',
        'slot-expired': '업로드 기한이 지났습니다. 다시 서명해 업로드하세요.',
        'wrong-size': '업로드가 완전히 도착하지 않았습니다. 다시 업로드하세요.',
        cut: '업로드가 완전히 도착하지 않았습니다. 다시 업로드하세요.',
        fingerprint:
          '도착한 것은 서명한 zip이 아닙니다. 지문이 일치하지 않습니다. 다시 업로드하세요.',
        'not-a-zip': '“{f}”은(는) zip이 아닙니다.',
        encrypted: 'zip에 비밀번호가 있습니다. 비밀번호 없이 저장하세요.',
        'too-many-files': 'zip의 파일 수가 {m}이(가) 받는 한도를 넘습니다.',
        'zip-slip':
          'zip에 폴더 밖으로 나가는 경로(“..” 또는 “/”)가 있습니다. 안전을 위해 {m}은(는) 열지 않습니다.',
        link: 'zip에 파일 대신 링크가 있습니다. 안전을 위해 {m}은(는) 열지 않습니다.',
        'file-too-big': 'zip 안에 {m}이(가) 파일 하나당 받는 크기보다 큰 파일이 있습니다.',
        ratio: '열면 너무 커집니다. “zip 폭탄”의 방식입니다. 열지 않습니다.',
        'unpacked-too-big': '열면 {m}이(가) 받는 용량을 넘습니다.',
        'not-a-world':
          'zip에 월드가 없습니다. db.sqlite(Hyperfy)나 mundo.json(Numinia Engine)이 없습니다.',
        unexpected: 'zip에 월드에 없는 것이 들어 있습니다.',
        'db-open':
          '월드가 실행 중일 때 데이터베이스가 복사되었습니다. 다운로드로 받거나, 월드를 정지한 뒤 압축하세요.',
        manifest:
          'world.json의 지문과 맞지 않는 파일이 있습니다. zip이 손상되었거나 바뀌었습니다. 다시 다운로드하세요.',
        'db-broken': 'zip의 데이터베이스가 손상되었습니다. 검사를 통과하지 못합니다.',
        'db-foreign': 'db.sqlite는 월드의 데이터베이스가 아닙니다. 필요한 테이블이 없습니다.',
        'engine-refused': '{m}의 엔진이 이 zip을 읽지 못합니다.',
      },
    },
    versions: {
      title: '버전',
      label: '버전 {n}',
      published: '게시됨',
      origin: { created: '여기서 만듦', zip: 'zip에서', copy: '버전 {n}의 사본' },
      size: '약 {s}',
      sizeNote:
        '만들 때 또는 게시할 때 잰 크기입니다. 게시된 버전은 쓰는 동안 계속 커지므로 대략적인 값입니다.',
      download: '다운로드',
      duplicate: '복제',
      publish: '이 버전 게시',
      delete: '삭제',
      importZip: 'zip을 버전으로 올리기',
      noteOne:
        '버전은 두 개까지 둘 수 있습니다. 게시된 버전을 건드리지 않고 변경을 시험하려면 이것을 복제하세요.',
      noteTwo: '사람들은 게시된 버전에만 들어옵니다. 다른 버전은 여기서 기다립니다.',
      coming: {
        importing: '새 버전이 도착하는 중… {state}',
        duplicating: '복제하는 중…',
        uploading: '업로드 중 {p} %',
        waiting: '차례를 기다리는 중',
        working: '준비하는 중',
      },
      following: {
        PublishVersion: '게시하는 중… 월드가 몇 초간 꺼졌다가 저절로 돌아옵니다.',
        DuplicateVersion: '복제하는 중…',
        DeleteVersion: '삭제하는 중…',
        ImportVersion: 'zip이 새 버전으로 도착하는 중… 월드는 계속 켜져 있습니다.',
      },
      done: {
        PublishVersion: '{w}의 버전 {n}을(를) 게시했습니다.',
        DuplicateVersion: '{w}의 사본이 만들어졌습니다(버전 {n}). 사람들이 방문하려면 게시하세요.',
        DeleteVersion: '{w}의 버전 {n}을(를) 삭제했습니다.',
        ImportVersion: '버전 {n}이(가) 월드에 들어왔습니다(공개 전). 원할 때 카드에서 공개하세요.',
      },
      failed: '머신 {m}이(가) 버전 전환을 끝내지 못했습니다({rule}).',
      close: '닫기',
      dialog: {
        publishTitle: '버전 {n} 게시',
        publishIntro:
          '안에 있는 사람은 몇 초간 나갑니다. 월드가 꺼지고 버전을 바꾼 뒤 저절로 돌아옵니다. 주소, 키, 관리 코드는 바뀌지 않습니다. 등급과 사용자는 그 버전의 것입니다.',
        publishKeep: '지금 게시된 버전(버전 {p})은 다른 버전으로 보관됩니다.',
        publishStopped: '월드가 꺼져 있으며 계속 꺼진 채로 있습니다.',
        publishConfirm: '서명하고 게시',
        deleteTitle: '버전 {n} 삭제',
        deleteIntro: '영구히 삭제됩니다. 게시된 버전은 건드리지 않습니다.',
        deleteCopyFirst: '보관하고 싶나요? 먼저 다운로드하세요.',
        downloadFirst: '버전 {n} 다운로드',
        deleteConfirm: '서명하고 삭제',
        duplicateTitle: '게시된 버전 복제',
        duplicateIntro:
          '똑같은 사본을 만듭니다. 그동안 사람들은 안에 그대로 있을 수 있습니다. 사본은 게시하기 전에는 방문할 수 없습니다.',
        duplicateConfirm: '서명하고 복제',
        downloadTitle: '버전 {n} 다운로드',
        downloadIntro:
          '머신이 그 버전의 현재 상태를 zip으로 준비해 두었다가 준비되면 제공합니다. 링크는 하루 동안 유효합니다. 월드는 전혀 건드리지 않습니다.',
      },
      problems: {
        'no-version':
          '그 버전은 더 이상 없습니다(다른 사람이 삭제했을 수 있습니다). 목록을 다시 읽습니다.',
        published: '게시된 버전은 삭제할 수 없습니다. 먼저 다른 버전을 게시하세요.',
        'already-published': '그 버전은 이미 게시되어 있습니다.',
        'only-version': '월드의 유일한 버전이라 삭제할 수 없습니다.',
        full: '월드에 이미 최대인 두 버전이 있습니다. 하나를 삭제한 뒤 추가하세요.',
        'switch-stuck':
          '버전 전환이 중간에 멈췄습니다. 잘못된 데이터로 시작하지 않도록 월드는 꺼진 채로 있습니다. 운영진에게 알려 주세요.',
        'not-a-folder': '그 버전의 폴더가 올바른 상태가 아닙니다. 운영진에게 알려 주세요.',
        'versions-unreadable':
          '머신 {m}이(가) 이 월드의 버전을 읽을 수 없습니다. 운영진에게 알려 주세요.',
        'versions-unwritable':
          '머신 {m}이(가) 버전 변경을 저장할 수 없습니다. 운영진에게 알려 주세요.',
        'not-removed': '머신 {m}이(가) 버전을 완전히 삭제하지 못했습니다. 운영진에게 알려 주세요.',
        busy: '이 월드는 다른 변경을 처리하는 중입니다. 잠시 뒤에 다시 시도하세요.',
        missing: '그 월드는 더 이상 {m}에 없습니다. 룸을 새로 고치세요.',
        'still-deleting': '그 월드는 삭제되는 중입니다.',
        'no-room': '머신 {m}에는 버전을 하나 더 둘 공간이 없습니다.',
        'engine-refused': '월드의 엔진이 사본을 만들지 못했습니다. 운영진에게 알려 주세요.',
      },
    },
    history: {
      title: '머신이 한 일',
      empty: '머신이 아직 아무것도 하지 않았습니다.',
      failed: '실패',
      took: '({t})',
      kinds: {
        CreateWorld: '만듦',
        DeleteWorld: '삭제함',
        StopWorld: '정지함',
        StartWorld: '시작함',
        DownloadWorld: '복사함',
        ShowAdminCode: '머신 코드 표시',
        ShowWorldCode: '{w}의 코드 표시',
        RotateWorldCode: '{w}의 코드 변경',
        ImportWorld: '{w}을(를) zip에서 가져옴',
        UpdateWorld: '{w} 업데이트함',
        FleetRelease: '엔진 릴리스를 게시함',
        PinWorld: '{w} 고정함',
        DuplicateVersion: '{w}의 버전을 복제함',
        PublishVersion: '{w}의 게시 버전을 바꿈',
        DeleteVersion: '{w}의 보관 중인 버전을 삭제함',
        DownloadVersion: '{w}의 버전을 다운로드함',
        ImportVersion: '{w}의 버전으로 zip을 업로드함',
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
    allHomes: 'Todas as organizações',
    homeFilter: 'Organização',
    views: { label: 'Visão', cards: 'Cartões', list: 'Lista', servers: 'Por servidor' },
    status: {
      running: 'Em execução',
      stopped: 'Parado',
      unreachable: 'Não responde',
      unknown: 'Não verificado',
      changing: 'Em curso',
    },
    phases: {
      creating: 'Criando…',
      stopping: 'Parando…',
      starting: 'Iniciando…',
      deleting: 'Apagando…',
      uploading: 'Enviando…',
      importing: 'Revisando…',
      updating: 'Atualizando…',
      switching: 'Trocando de versão…',
    },
    busyNote: 'Costuma levar um minuto.',
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
      uploading: 'o zip está chegando à máquina',
      importing: 'a máquina está revisando o zip',
      updating: 'a máquina está passando o mundo para outra versão do motor',
      switching: 'a máquina está trocando de versão · quem está dentro sai por alguns segundos',
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
      enter: 'Entrar',
      stop: 'Parar',
      start: 'Iniciar',
      delete: 'Apagar',
      download: 'Baixar',
      newWorld: 'Novo mundo',
      importZip: 'Trazer de um zip',
      update: 'Atualizar',
      pin: 'Fixar noutra versão',
      unpin: 'Tirar a fixação',
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
      recipe: 'receita {r}',
      selfUpdate: {
        manual:
          '{m} ainda não se atualiza sozinha: precisa de uma última instalação. Entre nela uma vez e rode esta linha; depois disso ela pega cada receita nova sozinha.',
        current: 'Atualiza-se sozinha · em dia.',
        updating: 'Atualiza-se sozinha · atualizando para a receita nova.',
        resting:
          'Atualiza-se sozinha · esperando o repouso: pega a receita nova quando ela estiver publicada há um tempo.',
        halted:
          'Parada: {why}. Ela não tenta essa receita de novo; a próxima publicada desbloqueia.',
        haltedSome: 'a receita nova falhou ao instalar',
        refused: 'Parada: não instala a receita nova ({why}).',
        frozen:
          'Congelada: fica na receita que tem e não se atualiza até alguém descongelá-la na máquina.',
        held: 'Presa à receita {r}: não pega as novas até alguém soltá-la na máquina.',
        checking: 'Atualiza-se sozinha · ainda não olhou se há receita nova.',
        canary: 'Máquina de teste (canário): estreia cada receita antes das outras.',
      },
      slow: '{m} está atrasada.',
      failing: '{m} não obedece: não conseguiu aplicar as mudanças. Tenta de novo a cada minuto.',
      silent: '{m} não obedece: não dá sinais. Se continuar assim, avise a Ursa.',
      lastRun: 'Seu último trabalho terminou há {t}.',
      waiting: 'Pedidos em espera: {n}.',
      freeing: 'Apagando {d}…',
      engines: 'motores: {e}',
    },
    fleetEngine: {
      title: 'Motor da frota',
      current: 'Versão vigente: {b}',
      upToDate: 'Toda a frota está em dia.',
      behind: 'Mundos atrasados: {n}',
      laggard: '{id} · {m} · {b}',
      manual: 'A máquina dele não atualiza.',
      otherEngine: 'Mundos com outro motor: {n} (não contam como atrasados).',
      none: 'Ainda não há versão publicada.',
      pinned: 'Mundos fixados a uma versão: {n}',
      pinnedLine: '{id} · {m} · {b} (fixado: {r})',
      laggardPinned: '{id} · {m} · {b} (fixado: {r})',
      laggardFailed: '{id} · {m} · {b} (falhou: {e})',
      halted: '{m} parou as atualizações: {r}',
      haltedNoReason: '{m} parou as atualizações.',
      lastPass: 'Última passagem de {m}: {a}, {when}.',
      cardPinned: 'Fixado em {b}: {r}',
    },
    steps: {
      signing: 'Sua carteira pede que você assine…',
      sending: 'Enviando o pedido para {m}…',
      preparing: '{m} está preparando o zip…',
    },
    problems: {
      noWallet:
        'Não encontro neste navegador a carteira com que você entrou; sua sessão continua aberta. Conecte-a em Sessão e assine aqui de novo.',
      noWalletLink: 'Abrir Sessão em outra aba',
      otherWallet:
        'A carteira conectada ({w}) não é a da sua sessão. Troque de conta na carteira ou entre de novo.',
      declined: 'Você cancelou a assinatura: nada foi enviado.',
      notOracle:
        '{m} não tem a sua carteira na lista de Oráculos. Rode na máquina a linha de arranque com a sua carteira.',
      expired: 'A assinatura chegou vencida: confira o relógio do seu computador e repita.',
      replayed: 'Esse pedido já tinha sido enviado.',
      exists: 'Já existe um mundo com esse nome em {m}.',
      addressTaken: 'Esse endereço já é de outro mundo de {m}.',
      stillDeleting:
        '{m} ainda está apagando um mundo com esse nome ou endereço. Tente de novo em um minuto.',
      missing: 'Esse mundo já não está em {m}; recarregue a sala.',
      addressMismatch: 'O endereço não coincide com o do mundo; recarregue a sala.',
      refused: '{m} não aceita essa ordem: o motor, o endereço ou os limites saem das suas regras.',
      otherMachine: 'Esse pedido era para outra máquina.',
      slowDown: 'Pedidos demais seguidos: espere uns minutos.',
      noAdminCode: '{m} ainda não tem código de administração para esse mundo.',
      busy: '{m} ainda está criando esse mundo ou trocando o código dele: espere um minuto e tente de novo.',
      origin: '{m} não aceita pedidos a partir desta página.',
      unreachable: 'Não foi possível falar com {m}: não responde.',
      machine: '{m} tentou e não conseguiu ({rule}).',
      late: '{m} recebeu, mas ainda não terminou. Olhe a sala daqui a um minuto.',
      unknownEngine: '{m} não roda esse motor: escolha Hyperfy ou o Numinia Engine.',
      engineMismatch: 'Essa versão é de outro motor: um mundo só passa para outra versão do seu.',
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
      nameTaken: 'Já existe um mundo chamado {w}: escolha outro nome.',
      nameFreeing:
        '{w} está sendo liberado: sua máquina ainda apaga o mundo anterior. Tente em um minuto.',
      addressFreeing:
        '{d} está sendo liberado: sua máquina ainda apaga o mundo anterior. Tente em um minuto.',
      addressTaken: '{d} já é o endereço de {w}: escolha outro nome.',
      legacyMove:
        '{d} é hoje {w}, na máquina antiga. Criá-lo aqui o leva para {m}: copie antes os seus dados e aponte o seu registro DNS para {m}.',
      dnsChecking: 'Verificando para onde {d} aponta…',
      dnsMachine: '{d} já aponta para {m}: pronto.',
      dnsElsewhere: '{d} já aponta para outra máquina: escolha outro nome.',
      dnsNone:
        '{d} ainda não existe no DNS: crie um registro A para {m} (só DNS); até lá o mundo não abre.',
      dnsUnknown: 'Não foi possível verificar para onde {d} aponta; confira se o mundo não abrir.',
      dnsCreate:
        '{d} ainda não tem registro: a sala vai criá-lo para {m} (só DNS) ao criar o mundo.',
      dnsMove:
        '{d} tem um registro da frota para outra máquina: a sala vai movê-lo para {m} ao criar o mundo.',
      dnsWriting: 'Criando o registro DNS de {d} para {m}…',
      dnsWriteFailed:
        'Não foi possível criar o registro DNS de {d} ({code}). Nada foi pedido a {m}: tente de novo.',
      imageLabel: 'Motor',
      imageHint: 'Uma versão fixa do motor: etiqueta sha- ou digest, nunca latest.',
      engineLabel: 'Motor',
      engineHint: 'Os motores que {m} roda. A versão fica fixada na ordem.',
      engineNoRelease: 'ainda não há versão publicada do motor',
      memoryLabel: 'Memória',
      cpusLabel: 'CPU',
      uploadLabel: 'Envio máximo (MB)',
      confirmIntro:
        'Sua carteira vai pedir que você assine este pedido. A máquina confere a assinatura e cria o mundo; ninguém mais precisa aprovar nada.',
      powerLabel: 'Começa ligado?',
      powerOn: 'Ligado',
      powerOff: 'Desligado',
      powerHint:
        'Ligado gasta saldo desde já: é preciso escolher qual organização paga e que ela tenha saldo. Desligado não confere nem gasta saldo.',
      orgLabel: 'Organização que paga',
      orgNone: 'Escolha uma organização',
      orgLoading: 'Lendo as organizações…',
      orgFailed: 'Não foi possível ler as organizações.',
      balanceChecking: 'Conferindo o saldo…',
      balanceBlocked:
        '«{org}» não tem saldo suficiente para ligar um mundo agora. Recarregue o saldo antes de ligá-lo.',
      balanceOk: 'Saldo suficiente: pode começar ligado.',
      topUpLink: 'Recarregar saldo',
      invalid: 'Revise: {fields}.',
      next: 'Seguinte',
      back: 'Voltar',
      cancel: 'Cancelar',
      restart: 'Começar de novo',
      create: 'Assinar e criar',
      resultTitle: '{t} está nascendo',
      resultNote: '{m} criou o mundo. Ele abre em {d} assim que arrancar, em menos de um minuto.',
      done: 'Feito',
      close: 'Fechar',
    },
    code: {
      label: 'Código de administração',
      show: 'Mostrar',
      rotate: 'Trocar código',
      showTitle: 'Código de administração de {t}',
      rotateTitle: 'Trocar o código de {t}',
      showIntro:
        'Só vale para {t}: cada mundo tem o seu. Sua carteira vai pedir que você assine para vê-lo.',
      rotateIntro:
        'A máquina cria um código novo para {t} e reinicia o mundo: quem estiver dentro é desconectado por alguns segundos. O código atual deixa de valer, mas quem já virou administrador com ele continua sendo: o mundo lembra.',
      rotateStopped:
        '{t} está parado: o código novo vale assim que ele for iniciado. O atual deixa de valer, mas quem já virou administrador com ele continua sendo: o mundo lembra.',
      showConfirm: 'Assinar e ver',
      rotateConfirm: 'Assinar e trocar',
      shown: 'Código de administração de {t}:',
      rotated: 'Código novo de {t}:',
      rotatedNote: '{m} reinicia {t} em menos de um minuto; a partir daí só vale este código.',
      rotatedStopped: '{t} está parado: este código vale assim que ele for iniciado.',
      chat: 'No chat do mundo escreva /admin {code} e você fica como administrador nesse navegador.',
      notYet:
        '{m} ainda não dá um código por mundo: rode a linha dela de novo (em Máquinas) e tente outra vez.',
    },
    rename: {
      label: 'Renomear',
      title: 'Renomear {t}',
      fieldLabel: 'Novo nome',
      save: 'Salvar',
      cancel: 'Cancelar',
      forbidden: 'Só a casa pode renomear.',
      failed: 'Não foi possível salvar o nome ({detail}).',
      saved: 'Nome salvo.',
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
      typeToConfirm: 'Para confirmar, escreva o endereço:',
      stopConfirm: 'Assinar e parar',
      startConfirm: 'Assinar e iniciar',
      deleteConfirm: 'Assinar e apagar',
      downloadConfirm: 'Assinar e preparar',
      updateTitle: 'Atualizar {t}',
      updateIntro:
        '{t} passa da versão {from} para a {to} do Numinia Engine. A máquina baixa a nova, salva o mundo e o reinicia com ela: quem estiver dentro se desconecta por alguns segundos. Os dados e a aventura ficam.',
      updateConfirm: 'Assinar e atualizar',
      pinTitle: 'Fixar {t} noutra versão',
      pinIntro:
        '{t} fica na versão que escolheres e as atualizações da frota não a movem. A máquina baixa essa versão, guarda o mundo e reinicia-o com ela: quem estiver dentro desconecta-se alguns segundos.',
      pinBuild: 'Versão',
      pinBuildHint: 'Uma versão do motor dele (agora: {b})',
      pinBadBuild:
        'Não é uma versão do motor dele. Escreve sha- e os dígitos da versão, ou a imagem inteira.',
      pinReason: 'Motivo (uma linha, obrigatório)',
      pinConfirm: 'Assinar e fixar',
      unpinTitle: 'Tirar a fixação de {t}',
      unpinIntro:
        '{t} volta a seguir a versão da frota: a próxima passagem da máquina atualiza-o. Agora está fixado em {b}: {r}',
      unpinReasonDefault: 'Volta a seguir a frota',
      unpinConfirm: 'Assinar e tirar a fixação',
      notObeying: '{m} não obedece agora: seu pedido vai esperar na fila até ela voltar.',
    },
    copy: {
      ready: 'Pronto: {f} · {s}',
      save: 'Baixar o zip',
      fingerprint: 'Impressão SHA-256: {h}',
      expires: 'O link vence: {when}.',
    },
    import: {
      noMachine: 'Nenhuma máquina responde: agora não é possível trazer mundos.',
      dropTitle: 'Solte o zip para trazer um mundo',
      dropNote: 'Nada é enviado até você assinar.',
      dropCap: 'um só .zip · até {max}',
      dropOne: 'Solte um só zip',
      title: 'Trazer um mundo',
      stepPlace: 'Lugar',
      stepSign: 'Assinar',
      reading: 'Lendo o zip…',
      copyOf: 'Cópia de {w} de {d} · {s}',
      copyOfUndated: 'Cópia de {w} · {s}',
      folder: 'Pasta de um mundo · db.sqlite e {n} arquivos · {s}',
      engineImage:
        'Também traz uma imagem do motor ({s}) que não é usada: será enviada mesmo assim.',
      keysNote:
        'Do zip usam-se o banco de dados e os arquivos; as chaves e o docker-compose, não: {m} cria chaves novas.',
      machineLabel: 'Máquina',
      engineNote: '{b} · o motor da frota',
      zipLine: 'Zip: {f} · {s} ({b} bytes)',
      fingerprint: 'Impressão: {h}',
      hashing: 'Calculando a impressão do zip… {p} %',
      unreadable: 'Não foi possível ler o zip: escolha o arquivo de novo.',
      signNote:
        'Sua carteira vai pedir que você assine o mundo, o endereço, a máquina, o motor, o tamanho exato do zip e a sua impressão. {m} só aceitará este zip.',
      sign: 'Assinar e enviar',
      pickAnother: 'Escolher outro zip',
      uploading: 'Enviando para {m} · {sent} de {total}',
      keepOpen: 'Não feche esta aba até terminar.',
      stop: 'Parar o envio',
      checking: '{m} está revisando o zip.',
      cutPill: 'Envio interrompido',
      cut: 'A conexão com {m} caiu aos {sent} de {total}.',
      stopped: 'Você parou o envio aos {sent} de {total}.',
      retry: 'Enviar de novo',
      discard: 'Descartar',
      halfDone: 'O envio ficou pela metade. Escolha de novo o mesmo zip.',
      pickSame: 'Escolher o zip',
      notSame: 'Esse não é o mesmo zip: a impressão não confere.',
      entry: 'Arquivo: {f}.',
      versionTitle: 'Subir um zip como versão',
      versionLabel: 'O que fazer com este zip',
      versionNew: 'Trazer como um mundo novo',
      versionOption: 'Subir como versão nova de {t} ({d})',
      versionOwn: 'A máquina, o endereço e os limites são os do mundo: o zip traz só uma versão.',
      versionOne: 'O mundo continua como está; o zip chega como segunda versão, sem publicar.',
      versionTwo:
        'A versão {n} (a não publicada) é substituída pela do zip quando o zip for verificado. A publicada não é tocada.',
      versionSignNote:
        'Uma só assinatura: {m} guarda o zip como versão nova de {w}. O mundo continua ligado; para a galera visitar, você publica depois pelo cartão dele.',
      versionSign: 'Assinar e subir o zip',
      elsewhere:
        'Outra aba está enviando, ou o envio ficou pela metade: se ninguém o terminar, {m} o descarta em menos de uma hora.',
      failedPill: 'Não foi possível trazer',
      landed: '{w} já está em {m}, parado.',
      landedClose: 'Fechar',
      fromZip: 'trazido de um zip',
      engineWorld: 'Mundo do Numinia Engine ({v}) · {n} arquivos · {s}',
      engineKeysNote:
        'Do zip se usa o mundo (dados, aventura e ambiente); ele nunca leva chaves: {m} faz chaves novas.',
      noEngineMachine: 'Nenhuma máquina que recebe zips roda o Numinia Engine ainda.',
      engineNoRelease:
        'Ainda não há versão publicada do motor: este zip ainda não pode ser trazido.',
      engineRefused: 'O motor de {m} não lê este zip: {why}',
      before: {
        empty: 'O arquivo está vazio.',
        several: 'Você soltou {n} arquivos: traga só um.',
        folder: 'Isso é uma pasta: compacte-a em um zip.',
        tooManyFiles: 'O zip traz {n} arquivos e {m} aceita até {max}.',
        fileTooBig: '{f} pesa {s}: mais do que {m} aceita por arquivo ({max}).',
        ratio:
          'O zip cresceria demais ao ser aberto (×{r}): é assim que funcionam as “bombas zip”. Não é aberto.',
        unpackedTooBig: 'Aberto, ocuparia {s}, mais do que {m} aceita ({max}).',
        unexpected: 'O zip traz algo que um mundo não leva: {f}.',
        mundoUnreadable:
          'O mundo.json deste zip não pode ser lido: não é um JSON válido. Baixe o zip do mundo na sala (ou rode a `copia` do motor) e traga esse.',
        mundoSchema:
          'O mundo.json deste zip declara “{s}”, um esquema que o motor não lê (numinia-engine/mundo@1 ou @2). Baixe o zip do mundo na sala (ou rode a `copia` do motor) e traga esse.',
        mundoSchemaNone:
          'O mundo.json deste zip não declara nenhum esquema do motor (numinia-engine/mundo@1 ou @2). Baixe o zip do mundo na sala (ou rode a `copia` do motor) e traga esse.',
        mundoNoFiles:
          'O mundo.json deste zip não é uma exportação do motor: não traz a lista de ficheiros. Baixe o zip do mundo na sala (ou rode a `copia` do motor) e traga esse.',
        mundoSeveral:
          'O zip traz {n} mundo.json e o motor lê só um. Deixe um mundo por zip e compacte de novo.',
      },
      rules: {
        'zip-too-big': 'O zip pesa {s} e {m} aceita até {max}.',
        'no-room': '{m} não tem espaço para este zip. Apague um mundo ou escolha outra máquina.',
        'slot-expired': 'O envio expirou. Assine de novo para enviá-lo.',
        'wrong-size': 'O envio chegou incompleto: envie de novo.',
        cut: 'O envio chegou incompleto: envie de novo.',
        fingerprint:
          'O que chegou não é o zip que você assinou: a impressão não confere. Envie de novo.',
        'not-a-zip': '“{f}” não é um zip.',
        encrypted: 'O zip tem senha: salve-o sem ela.',
        'too-many-files': 'O zip traz mais arquivos do que {m} aceita.',
        'zip-slip':
          'O zip traz caminhos que saem da sua pasta (“..” ou “/”): {m} não o abre, por segurança.',
        link: 'O zip traz links em vez de arquivos: {m} não o abre, por segurança.',
        'file-too-big': 'Um arquivo do zip pesa mais do que {m} aceita por arquivo.',
        ratio:
          'O zip cresceria demais ao ser aberto: é assim que funcionam as “bombas zip”. Não é aberto.',
        'unpacked-too-big': 'Aberto, ocuparia mais do que {m} aceita.',
        'not-a-world':
          'Não há um mundo no zip: falta o db.sqlite (Hyperfy) ou o mundo.json (Numinia Engine).',
        unexpected: 'O zip traz algo que um mundo não leva.',
        'db-open':
          'O banco de dados foi copiado com o mundo em funcionamento: baixe-o com Baixar ou pare-o antes de compactá-lo.',
        manifest:
          'Um arquivo não confere com a sua impressão em world.json: o zip se danificou ou foi alterado. Baixe-o de novo.',
        'db-broken': 'O banco de dados do zip está danificado: não passa na verificação.',
        'db-foreign': 'db.sqlite não é o banco de dados de um mundo: faltam as suas tabelas.',
        'engine-refused': 'O motor de {m} não lê este zip.',
      },
    },
    versions: {
      title: 'Versões',
      label: 'Versão {n}',
      published: 'Publicada',
      origin: { created: 'criada aqui', zip: 'de um zip', copy: 'cópia da versão {n}' },
      size: '≈ {s}',
      sizeNote:
        'Tamanho medido quando foi feita ou publicada. A publicada continua crescendo enquanto é usada, por isso é aproximado.',
      download: 'Baixar',
      duplicate: 'Duplicar',
      publish: 'Publicar esta',
      delete: 'Apagar',
      importZip: 'Subir um zip como versão',
      noteOne:
        'Você pode ter duas versões: duplique esta para testar mudanças sem mexer na publicada.',
      noteTwo: 'As pessoas só entram na publicada. A outra espera aqui.',
      coming: {
        importing: 'Chegando uma versão nova… {state}',
        duplicating: 'Duplicando…',
        uploading: 'enviando {p} %',
        waiting: 'esperando a vez',
        working: 'preparando',
      },
      following: {
        PublishVersion: 'Publicando… o mundo desliga por alguns segundos e volta sozinho.',
        DuplicateVersion: 'Duplicando…',
        DeleteVersion: 'Apagando…',
        ImportVersion: 'O zip está chegando como versão nova… o mundo continua ligado.',
      },
      done: {
        PublishVersion: 'A versão {n} de {w} já está publicada.',
        DuplicateVersion:
          'A cópia de {w} está pronta: é a versão {n}. Para as pessoas a visitarem, publique-a.',
        DeleteVersion: 'A versão {n} de {w} foi apagada.',
        ImportVersion:
          'A versão {n} já está no mundo, sem publicar. Publique pelo cartão dela quando quiser.',
      },
      failed: 'A máquina {m} não conseguiu terminar a troca de versão ({rule}).',
      close: 'Fechar',
      dialog: {
        publishTitle: 'Publicar a versão {n}',
        publishIntro:
          'Quem estiver dentro sai por alguns segundos; o mundo desliga, troca de versão e volta sozinho. O endereço, as chaves e o código de administração não mudam. Os cargos e usuários são os dessa versão.',
        publishKeep: 'A versão publicada agora (a {p}) fica guardada como a outra.',
        publishStopped: 'O mundo está desligado e continuará desligado.',
        publishConfirm: 'Assinar e publicar',
        deleteTitle: 'Apagar a versão {n}',
        deleteIntro: 'Ela é apagada para sempre. A publicada não é tocada.',
        deleteCopyFirst: 'Quer guardá-la? Baixe antes.',
        downloadFirst: 'Baixar a versão {n}',
        deleteConfirm: 'Assinar e apagar',
        duplicateTitle: 'Duplicar a versão publicada',
        duplicateIntro:
          'Faz-se uma cópia exata; as pessoas continuam dentro enquanto isso. A cópia não pode ser visitada até você publicá-la.',
        duplicateConfirm: 'Assinar e duplicar',
        downloadTitle: 'Baixar a versão {n}',
        downloadIntro:
          'A máquina prepara um zip dessa versão como está agora e o oferece quando estiver pronto. O link dura um dia. Nada no mundo é tocado.',
      },
      problems: {
        'no-version':
          'Essa versão não existe mais (talvez outra pessoa a tenha apagado). A lista é lida de novo.',
        published: 'A versão publicada não pode ser apagada: publique a outra antes.',
        'already-published': 'Essa versão já é a publicada.',
        'only-version': 'É a única versão do mundo: não pode ser apagada.',
        full: 'O mundo já tem duas versões, o máximo. Apague uma antes de acrescentar outra.',
        'switch-stuck':
          'A troca de versão ficou pela metade; o mundo continua desligado para não iniciar com dados errados. Avise a casa.',
        'not-a-folder': 'A pasta dessa versão não está como deveria. Avise a casa.',
        'versions-unreadable':
          'A máquina {m} não consegue ler as versões deste mundo. Avise a casa.',
        'versions-unwritable':
          'A máquina {m} não consegue salvar a mudança de versões. Avise a casa.',
        'not-removed': 'A máquina {m} não conseguiu apagar a versão por completo. Avise a casa.',
        busy: 'Este mundo está ocupado com outra mudança; tente de novo daqui a pouco.',
        missing: 'Esse mundo não está mais em {m}; recarregue a sala.',
        'still-deleting': 'Esse mundo está sendo apagado.',
        'no-room': 'A máquina {m} não tem espaço para outra versão.',
        'engine-refused': 'O motor do mundo não conseguiu fazer a cópia. Avise a casa.',
      },
    },
    history: {
      title: 'O que as máquinas fizeram',
      empty: 'As máquinas ainda não fizeram nada.',
      failed: 'falhou',
      took: 'em {t}',
      kinds: {
        CreateWorld: 'criou',
        DeleteWorld: 'apagou',
        StopWorld: 'parou',
        StartWorld: 'iniciou',
        DownloadWorld: 'copiou',
        ShowAdminCode: 'mostrou o código da máquina',
        ShowWorldCode: 'mostrou o código de {w}',
        RotateWorldCode: 'trocou o código de {w}',
        ImportWorld: 'trouxe {w}',
        UpdateWorld: 'atualizou {w}',
        FleetRelease: 'publicou uma versão do motor',
        PinWorld: 'fixou {w}',
        DuplicateVersion: 'duplicou uma versão de {w}',
        PublishVersion: 'trocou a versão publicada de {w}',
        DeleteVersion: 'apagou uma versão guardada de {w}',
        DownloadVersion: 'baixou uma versão de {w}',
        ImportVersion: 'enviou um zip como versão de {w}',
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
