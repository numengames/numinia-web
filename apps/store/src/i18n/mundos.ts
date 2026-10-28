/**
 * «Mundos ↔ organizaciones»'s words (cut 4, 2026-10-16), five locales: the
 * Worlds room's placement dialog (the house puts each world in exactly one
 * organization), the panel's «Sedes» screen (the organization's worlds) and a
 * world's own page. Screen words: «sede» for an organization's world, «mundo»
 * for the world itself, «comunidad» never «grupo»; the house is «la casa».
 * `{name}` placeholders are filled by `fill()` (lib/accounts.ts).
 *
 * Read on the server only: each page hands its island the one part and the
 * one locale it needs.
 */

import type { SupportedLocale } from '@numinia/domain';
import { ORG_CHOICE_WORDS, type OrgChoiceMessages } from './org-choices';

/** A count in its two forms (languages without plurals repeat one). */
export interface Counted {
  readonly one: string;
  readonly other: string;
}

/** What the Worlds room adds: each world's organization and the house's placement. */
export interface PlacementMessages extends OrgChoiceMessages {
  /** A world's organization, as its label says it. */
  readonly homeLabel: string;
  readonly unplaced: string;
  /** The link from a world to its own page. */
  readonly openPage: string;
  /** «Elegir {w}»: a row's checkbox, for screen readers. */
  readonly select: string;
  readonly assign: string;
  /** «Asignar {w} a una organización»: the row's button, for screen readers. */
  readonly assignLabel: string;
  /** The bulk button, with how many rows are chosen. */
  readonly assignChosen: string;
  readonly chosen: Counted;
  readonly clear: string;
  /** Chooses every world the filters show: «Elegir los {n} que se ven». */
  readonly selectShown: string;
  /** The house's button that opens the organization (the sede) of every community. */
  readonly openAll: string;
  /** Its tooltip: what it does and that it is safe to press twice. */
  readonly openAllTip: string;
  /** «{n} comunidades abiertas»: what it answers. */
  readonly openedAll: Counted;
  readonly openAllFailed: string;
  /** The dialog's title for one world and for several. */
  readonly titleOne: string;
  readonly titleMany: string;
  readonly orgLabel: string;
  readonly loading: string;
  readonly noOrgs: string;
  readonly save: string;
  readonly cancel: string;
  /** What the dialog says it will do to a world that already has an organization. */
  readonly moves: string;
  readonly placed: Counted;
  readonly failed: string;
  readonly forbidden: string;
  readonly unknownOrg: string;
  /** The list of placements did not load: rows show no organization. */
  readonly homesFailed: string;
}

/** The panel's «Sedes». */
export interface VenuesMessages {
  readonly loading: string;
  readonly failed: string;
  readonly forbidden: string;
  readonly retry: string;
  readonly empty: string;
  readonly emptyNote: string;
  readonly count: Counted;
  /** «Abrir la página de {w}», the link's accessible name. */
  readonly open: string;
  readonly openLabel: string;
  readonly address: string;
  /** Under the world's name, for a member: how many people may enter (`{n}`; `one` for a single person). */
  readonly enterers: { readonly one: string; readonly other: string };
  /** «Entrar»: the row's link into the world, with the pass when the person has one. */
  readonly enter: string;
  /** «Entrar en {w}», the link's accessible name. */
  readonly enterLabel: string;
  readonly enterFailed: string;
}

/** The «IA» section of a world's page (the world's HTTP door for outside AI agents). */
export interface WorldAiMessages {
  readonly title: string;
  readonly note: string;
  readonly loading: string;
  readonly empty: string;
  readonly invite: string;
  readonly listLabel: string;
  /** What an AI may do, as a row says it. */
  readonly talk: string;
  readonly build: string;
  /** Presence: connected right now, not connected, just added and not yet in. */
  readonly on: string;
  readonly off: string;
  readonly waiting: string;
  readonly remove: string;
  /** `{name}`: the row's button, for screen readers. */
  readonly removeLabel: string;
  readonly removeAsk: string;
  readonly removeYes: string;
  readonly removeNo: string;
  readonly removing: string;
  /**
   * «Add an AI» opens on two paths: A, an AI that lives in this world and
   * thinks with the world's own key (the default); B, your own agent from
   * outside (`dialog`, the three steps). The key never comes through here:
   * the person only reads whether the machine can think.
   */
  readonly fork: {
    readonly title: string;
    readonly question: string;
    readonly hereTitle: string;
    readonly hereNote: string;
    readonly ownTitle: string;
    readonly ownNote: string;
    /** «This machine can think:» then `thinkingYes`, `thinkingNo` or `thinkingUnknown`. */
    readonly thinkingLabel: string;
    readonly thinkingYes: string;
    readonly thinkingNo: string;
    readonly thinkingUnknown: string;
    /** Under «no»: who gives the machine a key, and where. */
    readonly thinkingNoNote: string;
    /** Path A until the world's door takes inhabitants from numinia.com. */
    readonly hereSoon: string;
  };
  readonly dialog: {
    readonly title: string;
    /** `{n}` of 3. */
    readonly step: string;
    readonly nameLabel: string;
    readonly nameHint: string;
    /** `{max}` in `long`. */
    readonly nameProblems: {
      readonly empty: string;
      readonly long: string;
      readonly chars: string;
      readonly taken: string;
    };
    readonly abilityLabel: string;
    readonly abilityTalk: string;
    readonly abilityBuild: string;
    readonly next: string;
    readonly back: string;
    readonly cancel: string;
    readonly commandTitle: string;
    readonly commandNote: string;
    readonly copy: string;
    readonly copied: string;
    readonly keyLabel: string;
    readonly keyInvalid: string;
    readonly add: string;
    readonly adding: string;
  };
  /** One plain sentence per way the door can fail (lib/world-door.ts DoorFailure). */
  readonly failures: {
    readonly unreachable: string;
    readonly disabled: string;
    readonly expired: string;
    readonly 'no-pass': string;
    readonly forbidden: string;
    readonly duplicate: string;
    readonly 'too-big': string;
    readonly starting: string;
    readonly invalid: string;
    readonly 'not-found': string;
    readonly other: string;
  };
}

/**
 * The «Funciones de este mundo» block of a world's page (w7): the world's own words
 * (numinia-engine features/funciones/frases.es.ts) in the panel's five locales; ja, ko and pt-br
 * are working translations that still want a native reading. `{name}` is the function's name.
 */
export interface WorldFunctionsMessages {
  readonly title: string;
  readonly note: string;
  readonly loading: string;
  /** «Normas de entrada» is the engine's `puerta`: Numinia's terms and the community's rules, one door. */
  readonly names: Readonly<Record<'normas' | 'dardos' | 'pesca', string>>;
  readonly helps: Readonly<Record<'normas' | 'dardos' | 'pesca', string>>;
  readonly on: string;
  readonly off: string;
  /** The server fixes the function: the switch is disabled and says this. */
  readonly fixed: string;
  readonly saving: string;
  readonly doneOn: string;
  readonly doneOff: string;
  /** What only this block can say; the rest of the failures are the «IA» section's own sentences. */
  readonly failures: {
    /** The world answers 404 on `/funciones`: an engine from before the door. */
    readonly unsupported: string;
    readonly fixed: string;
    readonly forbidden: string;
  };
}

/** A world's own page. */
export interface WorldPageMessages {
  readonly loading: string;
  readonly missingTitle: string;
  readonly missing: string;
  readonly failed: string;
  readonly retry: string;
  readonly eyebrow: string;
  readonly homeLabel: string;
  readonly unplaced: string;
  readonly unplacedNote: string;
  readonly manage: {
    readonly title: string;
    readonly note: string;
    readonly venues: string;
    readonly members: string;
    readonly balance: string;
  };
  /** «Quién entra»: read from the organization's roles, for people in it and the house. */
  readonly enters: {
    readonly title: string;
    readonly everyone: string;
    readonly roles: string;
    readonly owners: string;
    readonly people: string;
    /** `{n}`: the people the list does not show. */
    readonly more: string;
    readonly none: string;
  };
  readonly back: string;
  /** «Entrar», the page's primary button, and what it says while it works. */
  readonly enter: string;
  readonly entering: string;
  /** Under the button, for a member: «{org}» is the organization's name. */
  readonly enterMember: string;
  /** Under the button, for everyone else. */
  readonly enterGuest: string;
  readonly enterFailed: string;
  /** «IA», for whoever manages the world: the AIs that come in through the world's door. */
  readonly ai: WorldAiMessages;
  /** «Funciones de este mundo», for whoever manages the world: switches that talk to the world's `/funciones` door (w7). */
  readonly functions: WorldFunctionsMessages;
  /** The world's own page as the wireframe draws it (cut K): hero, lead, facts, encounters, machine, community. */
  readonly own: WorldOwnMessages;
}

/** The world's page, v3 cut K. `{x}` is the community's name; `{machine}` the machine's. */
interface WorldOwnMessages {
  /** Under «Entrar» in the hero. */
  readonly heroLine: string;
  /** «Compartir» and its toasts. */
  readonly share: string;
  readonly shareCopied: string;
  readonly shareFailed: string;
  /** «Gestionarlo»: scrolls to the «Administración» block. */
  readonly manageAct: string;
  /** After the lead: whose the world is. */
  readonly leadKept: string;
  readonly leadHome: string;
  readonly facts: {
    readonly inside: string;
    readonly keeper: string;
    readonly enters: string;
  };
  readonly encounters: {
    readonly title: string;
    readonly none: string;
    /** Link to the community's calendar when there is none. */
    readonly calendar: string;
    readonly toCalendar: string;
  };
  readonly machine: {
    readonly title: string;
    readonly runsOn: string;
  };
  readonly community: {
    readonly keptForCity: string;
    readonly home: string;
  };
}

export interface MundosMessages {
  readonly placement: PlacementMessages;
  readonly venues: VenuesMessages;
  readonly page: WorldPageMessages;
}

export const MUNDOS_UI: Readonly<Record<SupportedLocale, MundosMessages>> = {
  es: {
    placement: {
      ...ORG_CHOICE_WORDS.es,
      homeLabel: 'Organización',
      unplaced: 'Sin organización',
      openPage: 'Ver su página',
      select: 'Elegir {w}',
      assign: 'Asignar a una organización',
      assignLabel: 'Asignar {w} a una organización',
      assignChosen: 'Asignar a una organización ({n})',
      chosen: { one: '{n} mundo elegido', other: '{n} mundos elegidos' },
      clear: 'Quitar la selección',
      selectShown: 'Elegir los {n} que se ven',
      openAll: 'Abrir todas las comunidades',
      openAllTip:
        'Abre la sede de cada comunidad y hace a la casa administradora de todas. Se puede repetir sin riesgo.',
      openedAll: { one: '{n} comunidad abierta', other: '{n} comunidades abiertas' },
      openAllFailed: 'No se han podido abrir las comunidades.',
      titleOne: 'Asignar «{w}» a una organización',
      titleMany: 'Asignar {n} mundos a una organización',
      orgLabel: 'Organización',
      loading: 'Leyendo las organizaciones…',
      noOrgs: 'No hay organizaciones a las que asignar mundos.',
      save: 'Asignar',
      cancel: 'Cancelar',
      moves:
        'Cada mundo pertenece a una sola organización: la que lo paga es la que lo administra. Si ya tenía una, pasa a esta.',
      placed: {
        one: '{n} mundo asignado a {org}.',
        other: '{n} mundos asignados a {org}.',
      },
      failed: 'No se pudo asignar. Inténtalo de nuevo.',
      forbidden: 'Solo la casa asigna mundos a organizaciones.',
      unknownOrg: 'Esa organización ya no existe.',
      homesFailed: 'No se pudo leer a qué organización pertenece cada mundo.',
    },
    venues: {
      loading: 'Leyendo las sedes…',
      failed: 'No se pudieron leer las sedes de esta organización.',
      forbidden: 'Solo quien forma parte de la organización ve sus sedes.',
      retry: 'Reintentar',
      empty: 'Esta organización todavía no tiene sedes.',
      emptyNote:
        'Un mundo pasa a ser sede de una organización cuando la casa se lo asigna. Cuando lo haga, aparecerá aquí.',
      count: { one: '{n} sede', other: '{n} sedes' },
      open: 'Abrir la página',
      openLabel: 'Abrir la página de {w}',
      address: 'Mundo',
      enterers: { one: 'Puede entrar 1 persona', other: 'Pueden entrar {n} personas' },
      enter: 'Entrar',
      enterLabel: 'Entrar en {w}',
      enterFailed: 'No se pudo abrir el mundo. Inténtalo de nuevo.',
    },
    page: {
      loading: 'Leyendo el mundo…',
      missingTitle: 'No hay ningún mundo con ese nombre',
      missing: 'Quizá se escribió mal la dirección o el mundo ya no existe.',
      failed: 'No se pudo leer el mundo.',
      retry: 'Reintentar',
      eyebrow: 'Mundo',
      homeLabel: 'Comunidad',
      unplaced: 'Sin comunidad',
      unplacedNote: 'La casa todavía no lo ha asignado a ninguna comunidad.',
      manage: {
        title: 'Administración',
        note: 'Formas parte de la comunidad de este mundo: la que lo paga es la que lo administra.',
        venues: 'Sedes de la comunidad',
        members: 'Miembros',
        balance: 'Saldo y consumo',
      },
      enters: {
        title: 'Quién entra',
        everyone: 'Entra cualquier persona de la comunidad.',
        roles: 'Entran quienes tienen alguno de estos roles:',
        owners: 'Los titulares entran siempre.',
        people: 'Gente que puede entrar',
        more: '… y {n} más',
        none: 'Nadie, de momento.',
      },
      back: 'Volver al inicio',
      enter: 'Entrar',
      entering: 'Entrando…',
      enterMember: 'Entras con tu nombre y tus roles de {org}',
      enterGuest: 'Entras como invitado',
      enterFailed: 'No se pudo abrir el mundo. Inténtalo de nuevo.',
      own: {
        heroLine:
          'Entras con tu nombre y tu avatar. Lo que puedes hacer dentro lo dicen tus roles.',
        share: 'Compartir',
        shareCopied: 'Enlace copiado',
        shareFailed: 'No se pudo copiar el enlace.',
        manageAct: 'Gestionarlo',
        leadKept: 'Es de todos; lo cuida {x}.',
        leadHome: 'Es la sede de {x}.',
        facts: { inside: 'Dentro ahora', keeper: 'Quién lo cuida', enters: 'Quién entra' },
        encounters: {
          title: 'Encuentros aquí',
          none: 'Ningún encuentro anunciado aquí todavía.',
          calendar: 'Ver el calendario de {x}',
          toCalendar: 'A mi calendario',
        },
        machine: { title: 'Su máquina', runsOn: 'Corre en {machine}' },
        community: { keptForCity: 'Lo cuida para la ciudad', home: 'Su sede' },
      },
      ai: {
        title: 'IA',
        note: 'Las IAs que entran en este mundo. Solo ves esta sección porque puedes administrarlo.',
        loading: 'Leyendo las IAs…',
        empty:
          'Este mundo aún no tiene IAs. Una IA entra como una persona más: mira, habla y, si tú quieres, construye.',
        invite: 'Añadir una IA',
        listLabel: 'IAs de este mundo',
        talk: 'Puede mirar y hablar',
        build: 'Puede también construir',
        on: 'conectada',
        off: 'dormida',
        waiting: 'esperando',
        remove: 'Quitar',
        removeLabel: 'Quitar a {name}',
        removeAsk: '¿Quitar a {name}? Ya no podrá entrar en este mundo.',
        removeYes: 'Sí, quitar',
        removeNo: 'No, dejarla',
        removing: 'Quitando…',
        fork: {
          title: 'Añadir una IA',
          question: '¿Dónde va a pensar?',
          hereTitle: 'Darle una mente aquí',
          hereNote:
            'Vive en este mundo: saluda a quien se acerca, habla y, si quieres, construye. Piensa con la clave del propio mundo.',
          ownTitle: 'Conectar tu propio agente',
          ownNote:
            'Una IA que ya tienes (Hermes, Claude…) entra desde su ordenador con una llave propia.',
          thinkingLabel: 'Esta máquina puede pensar:',
          thinkingYes: 'sí',
          thinkingNo: 'no',
          thinkingUnknown: 'todavía no lo dice',
          thinkingNoNote:
            'Quien cuida la máquina le pone una clave en el propio ordenador del mundo. Esa clave nunca pasa por numinia.com ni por tu navegador.',
          hereSoon:
            'Pronto le darás aquí nombre y carácter: este mundo aún no recibe habitantes desde numinia.com.',
        },
        dialog: {
          title: 'Invitar a una IA',
          step: 'Paso {n} de 3',
          nameLabel: '¿Cómo se llama?',
          nameHint: 'Es el nombre que verán las personas en el mundo.',
          nameProblems: {
            empty: 'Escribe un nombre.',
            long: 'Ese nombre es demasiado largo (máximo {max} caracteres).',
            chars: 'Usa solo letras, números, espacios, punto, guion o guion bajo.',
            taken: 'Ya hay una IA con ese nombre. Elige otro.',
          },
          abilityLabel: '¿Qué puede hacer?',
          abilityTalk: 'Solo mirar y hablar',
          abilityBuild: 'Mirar, hablar y también construir',
          next: 'Siguiente',
          back: 'Atrás',
          cancel: 'Cancelar',
          commandTitle: 'Su llave',
          commandNote:
            'Ejecuta esta línea en el ordenador donde vive tu IA, dentro de la carpeta numinia-engine. Crea su llave en ese ordenador (la privada no sale de allí) y te enseña una línea que empieza por ed25519:',
          copy: 'Copiar',
          copied: 'Copiado',
          keyLabel: 'Pega aquí esa línea (la clave pública)',
          keyInvalid:
            'Esa línea no es una clave pública: debe ser ed25519: seguido de 43 letras o números.',
          add: 'Añadir',
          adding: 'Añadiendo…',
        },
        failures: {
          unreachable: 'El mundo no responde. Arráncalo y vuelve a intentarlo.',
          disabled: 'Este mundo aún no acepta IAs desde numinia.com (necesita el motor nuevo).',
          expired: 'Tu permiso ha caducado y no se ha podido renovar. Recarga la página.',
          'no-pass':
            'numinia.com no te ha dado permiso para hablar con el mundo. Recarga la página e inténtalo de nuevo.',
          forbidden:
            'Tu permiso no deja gestionar las IAs de este mundo: hace falta poder administrar la organización.',
          duplicate: 'Ya hay una IA con ese nombre en este mundo. Elige otro nombre.',
          'too-big': 'Lo que enviaste es demasiado grande. Prueba con un nombre más corto.',
          starting: 'El mundo está arrancando. Espera un momento y vuelve a intentarlo.',
          invalid: 'El mundo no acepta esos datos.',
          'not-found': 'Esa IA ya no está en este mundo.',
          other: 'Algo ha salido mal. Inténtalo de nuevo.',
        },
      },
      functions: {
        title: 'Funciones de este mundo',
        note: 'Lo que se puede hacer en este mundo. Solo ves esta sección porque puedes administrarlo; el cambio se guarda en el mundo y llega a quien está dentro.',
        loading: 'Leyendo las funciones…',
        names: { normas: 'Normas de entrada', dardos: 'Dardos', pesca: 'Pesca' },
        helps: {
          normas:
            'Términos de Numinia y normas de la comunidad: quien entra las acepta antes de moverse',
          dardos: 'Apagados, nadie tira y las dianas desaparecen.',
          pesca: 'Apagada, nadie pesca y no se ve el agua de pesca.',
        },
        on: 'encendida',
        off: 'apagada',
        fixed: 'Lo fija el servidor',
        saving: 'Cambiando…',
        doneOn: '{name}: encendida.',
        doneOff: '{name}: apagada.',
        failures: {
          unsupported:
            'Este mundo aún no permite cambiarlo desde aquí (necesita el motor 0.49 o más)',
          fixed: '{name}: la fija el servidor, el interruptor no la cambia.',
          forbidden:
            'Tu permiso no deja cambiar las funciones de este mundo: hace falta poder administrar la organización.',
        },
      },
    },
  },
  en: {
    placement: {
      ...ORG_CHOICE_WORDS.en,
      homeLabel: 'Organization',
      unplaced: 'No organization',
      openPage: 'See its page',
      select: 'Choose {w}',
      assign: 'Assign to an organization',
      assignLabel: 'Assign {w} to an organization',
      assignChosen: 'Assign to an organization ({n})',
      chosen: { one: '{n} world chosen', other: '{n} worlds chosen' },
      clear: 'Clear the selection',
      selectShown: 'Choose the {n} shown',
      openAll: 'Open all communities',
      openAllTip:
        'Opens the home of every community and makes the house an administrator of each. Safe to press again.',
      openedAll: { one: '{n} community open', other: '{n} communities open' },
      openAllFailed: 'The communities could not be opened.',
      titleOne: 'Assign “{w}” to an organization',
      titleMany: 'Assign {n} worlds to an organization',
      orgLabel: 'Organization',
      loading: 'Reading the organizations…',
      noOrgs: 'There are no organizations to assign worlds to.',
      save: 'Assign',
      cancel: 'Cancel',
      moves:
        'Each world belongs to one organization only: the one that pays for it is the one that administers it. If it already had one, it moves to this one.',
      placed: {
        one: '{n} world assigned to {org}.',
        other: '{n} worlds assigned to {org}.',
      },
      failed: 'Could not assign. Try again.',
      forbidden: 'Only the house assigns worlds to organizations.',
      unknownOrg: 'That organization no longer exists.',
      homesFailed: 'Could not read which organization each world belongs to.',
    },
    venues: {
      loading: 'Reading the homes…',
      failed: "Could not read this organization's homes.",
      forbidden: 'Only people in the organization see its homes.',
      retry: 'Try again',
      empty: 'This organization has no homes yet.',
      emptyNote:
        'A world becomes an organization’s home when the house assigns it. Once it does, it will show up here.',
      count: { one: '{n} home', other: '{n} homes' },
      open: 'Open the page',
      openLabel: 'Open the page of {w}',
      address: 'World',
      enterers: { one: 'One person may enter', other: '{n} people may enter' },
      enter: 'Enter',
      enterLabel: 'Enter {w}',
      enterFailed: 'Could not open the world. Try again.',
    },
    page: {
      loading: 'Reading the world…',
      missingTitle: 'There is no world with that name',
      missing: 'The address may be misspelled, or the world no longer exists.',
      failed: 'Could not read the world.',
      retry: 'Try again',
      eyebrow: 'World',
      homeLabel: 'Community',
      unplaced: 'No community',
      unplacedNote: 'The house has not assigned it to a community yet.',
      manage: {
        title: 'Administration',
        note: 'You are in this world’s community: the one that pays for it is the one that administers it.',
        venues: "The community's homes",
        members: 'Members',
        balance: 'Balance and usage',
      },
      enters: {
        title: 'Who may enter',
        everyone: 'Anyone in the community may enter.',
        roles: 'Whoever has one of these roles may enter:',
        owners: 'Owners can always enter.',
        people: 'People who may enter',
        more: '… and {n} more',
        none: 'Nobody yet.',
      },
      back: 'Back to the start',
      enter: 'Enter',
      entering: 'Entering…',
      enterMember: 'You go in with your name and your roles in {org}',
      enterGuest: 'You go in as a guest',
      enterFailed: 'Could not open the world. Try again.',
      own: {
        heroLine:
          'You go in with your name and your avatar. What you can do inside, your roles say.',
        share: 'Share',
        shareCopied: 'Link copied',
        shareFailed: 'Could not copy the link.',
        manageAct: 'Manage it',
        leadKept: 'It is everyone’s; {x} keeps it.',
        leadHome: 'It is the home of {x}.',
        facts: { inside: 'Inside now', keeper: 'Who keeps it', enters: 'Who goes in' },
        encounters: {
          title: 'Encounters here',
          none: 'No encounter announced here yet.',
          calendar: 'See the calendar of {x}',
          toCalendar: 'To my calendar',
        },
        machine: { title: 'Its machine', runsOn: 'Runs on {machine}' },
        community: { keptForCity: 'Keeps it for the city', home: 'Its home' },
      },
      ai: {
        title: 'AI',
        note: 'The AIs that come into this world. You see this section because you can administer it.',
        loading: 'Reading the AIs…',
        empty:
          'This world has no AIs yet. An AI comes in like any other person: it looks, talks and, if you let it, builds.',
        invite: 'Add an AI',
        listLabel: 'AIs in this world',
        talk: 'Can look and talk',
        build: 'Can also build',
        on: 'connected',
        off: 'asleep',
        waiting: 'waiting',
        remove: 'Remove',
        removeLabel: 'Remove {name}',
        removeAsk: 'Remove {name}? It will no longer be able to enter this world.',
        removeYes: 'Yes, remove',
        removeNo: 'No, keep it',
        removing: 'Removing…',
        fork: {
          title: 'Add an AI',
          question: 'Where will it think?',
          hereTitle: 'Give it a mind here',
          hereNote:
            'It lives in this world: it greets whoever comes near, talks and, if you want, builds. It thinks with the world’s own key.',
          ownTitle: 'Connect your own agent',
          ownNote:
            'An AI you already have (Hermes, Claude…) comes in from its own computer with a key of its own.',
          thinkingLabel: 'This machine can think:',
          thinkingYes: 'yes',
          thinkingNo: 'no',
          thinkingUnknown: 'it does not say yet',
          thinkingNoNote:
            'Whoever looks after the machine puts a key on the world’s own computer. That key never goes through numinia.com or your browser.',
          hereSoon:
            'Soon you will give it a name and a character here: this world does not take inhabitants from numinia.com yet.',
        },
        dialog: {
          title: 'Invite an AI',
          step: 'Step {n} of 3',
          nameLabel: 'What is it called?',
          nameHint: 'The name people will see in the world.',
          nameProblems: {
            empty: 'Write a name.',
            long: 'That name is too long ({max} characters at most).',
            chars: 'Use only letters, numbers, spaces, dot, hyphen or underscore.',
            taken: 'There is already an AI with that name. Pick another.',
          },
          abilityLabel: 'What can it do?',
          abilityTalk: 'Only look and talk',
          abilityBuild: 'Look, talk and also build',
          next: 'Next',
          back: 'Back',
          cancel: 'Cancel',
          commandTitle: 'Its key',
          commandNote:
            'Run this line on the computer where your AI lives, inside the numinia-engine folder. It makes the key on that computer (the private half never leaves it) and shows you a line that starts with ed25519:',
          copy: 'Copy',
          copied: 'Copied',
          keyLabel: 'Paste that line here (the public key)',
          keyInvalid:
            'That line is not a public key: it must be ed25519: followed by 43 letters or numbers.',
          add: 'Add',
          adding: 'Adding…',
        },
        failures: {
          unreachable: 'The world does not answer. Start it and try again.',
          disabled:
            'This world does not accept AIs from numinia.com yet (it needs the new engine).',
          expired: 'Your permission has expired and could not be renewed. Reload the page.',
          'no-pass':
            'numinia.com did not give you permission to talk to the world. Reload the page and try again.',
          forbidden:
            'Your permission does not let you manage this world’s AIs: you need to be able to administer the organization.',
          duplicate: 'There is already an AI with that name in this world. Pick another name.',
          'too-big': 'What you sent is too large. Try a shorter name.',
          starting: 'The world is starting up. Wait a moment and try again.',
          invalid: 'The world does not accept that data.',
          'not-found': 'That AI is no longer in this world.',
          other: 'Something went wrong. Try again.',
        },
      },
      functions: {
        title: 'Features of this world',
        note: 'What can be done in this world. You only see this section because you can manage it; the change is saved in the world and reaches whoever is inside.',
        loading: 'Reading the features…',
        names: { normas: 'Conditions of entry', dardos: 'Darts', pesca: 'Fishing' },
        helps: {
          normas:
            "Numinia's terms and the community's rules: whoever enters accepts them before moving",
          dardos: 'When off, nobody throws and the boards go.',
          pesca: 'When off, nobody fishes and the ponds go.',
        },
        on: 'on',
        off: 'off',
        fixed: 'Set by the server',
        saving: 'Changing…',
        doneOn: '{name}: on.',
        doneOff: '{name}: off.',
        failures: {
          unsupported: 'This world cannot be changed from here yet (it needs engine 0.49 or later)',
          fixed: '{name}: set by the server, the switch does not change it.',
          forbidden:
            'Your permission does not let you change this world’s features: you need to be able to manage the organization.',
        },
      },
    },
  },
  ja: {
    placement: {
      ...ORG_CHOICE_WORDS.ja,
      homeLabel: '組織',
      unplaced: '組織なし',
      openPage: 'ページを見る',
      select: '{w}を選ぶ',
      assign: '組織に割り当てる',
      assignLabel: '{w}を組織に割り当てる',
      assignChosen: '組織に割り当てる（{n}）',
      chosen: { one: '{n}件のワールドを選択中', other: '{n}件のワールドを選択中' },
      clear: '選択を解除',
      selectShown: '表示中の{n}件を選ぶ',
      openAll: 'すべてのコミュニティを開く',
      openAllTip:
        'すべてのコミュニティの拠点を開き、ハウスをそれぞれの管理者にします。もう一度押しても問題ありません。',
      openedAll: {
        one: '{n}件のコミュニティを開きました',
        other: '{n}件のコミュニティを開きました',
      },
      openAllFailed: 'コミュニティを開けませんでした。',
      titleOne: '「{w}」を組織に割り当てる',
      titleMany: '{n}件のワールドを組織に割り当てる',
      orgLabel: '組織',
      loading: '組織を読み込み中…',
      noOrgs: 'ワールドを割り当てられる組織がありません。',
      save: '割り当てる',
      cancel: 'キャンセル',
      moves:
        'ワールドは1つの組織だけに属します。料金を支払う組織が管理する組織です。すでに組織があれば、この組織に移ります。',
      placed: {
        one: '{n}件のワールドを{org}に割り当てました。',
        other: '{n}件のワールドを{org}に割り当てました。',
      },
      failed: '割り当てできませんでした。もう一度お試しください。',
      forbidden: 'ワールドを組織に割り当てられるのはハウスだけです。',
      unknownOrg: 'その組織はもう存在しません。',
      homesFailed: '各ワールドの所属組織を読み込めませんでした。',
    },
    venues: {
      loading: '拠点を読み込み中…',
      failed: 'この組織の拠点を読み込めませんでした。',
      forbidden: '組織のメンバーだけが拠点を見られます。',
      retry: '再試行',
      empty: 'この組織にはまだ拠点がありません。',
      emptyNote:
        'ワールドは、ハウスが割り当てるとその組織の拠点になります。割り当てられるとここに表示されます。',
      count: { one: '拠点 {n}件', other: '拠点 {n}件' },
      open: 'ページを開く',
      openLabel: '{w}のページを開く',
      address: 'ワールド',
      enterers: { one: '1人が入れます', other: '{n}人が入れます' },
      enter: '入る',
      enterLabel: '{w}に入る',
      enterFailed: 'ワールドを開けませんでした。もう一度お試しください。',
    },
    page: {
      loading: 'ワールドを読み込み中…',
      missingTitle: 'その名前のワールドはありません',
      missing: 'アドレスが間違っているか、ワールドがもう存在しません。',
      failed: 'ワールドを読み込めませんでした。',
      retry: '再試行',
      eyebrow: 'ワールド',
      homeLabel: 'コミュニティ',
      unplaced: 'コミュニティなし',
      unplacedNote: 'ハウスはまだこのワールドをコミュニティに割り当てていません。',
      manage: {
        title: '管理',
        note: 'あなたはこのワールドのコミュニティに所属しています。料金を支払うコミュニティが管理するコミュニティです。',
        venues: 'コミュニティの拠点',
        members: 'メンバー',
        balance: '残高と利用',
      },
      enters: {
        title: '入れる人',
        everyone: 'コミュニティの全員が入れます。',
        roles: '次のロールを持つ人が入れます：',
        owners: 'オーナーはいつでも入れます。',
        people: '入れる人たち',
        more: '…ほか{n}人',
        none: 'まだ誰もいません。',
      },
      back: 'トップへ戻る',
      enter: '入る',
      entering: '入っています…',
      enterMember: '{org}での名前とロールで入ります',
      enterGuest: 'ゲストとして入ります',
      enterFailed: 'ワールドを開けませんでした。もう一度お試しください。',
      own: {
        heroLine: '自分の名前とアバターで入ります。中でできることはロールが決めます。',
        share: '共有',
        shareCopied: 'リンクをコピーしました',
        shareFailed: 'リンクをコピーできませんでした。',
        manageAct: '管理する',
        leadKept: 'みんなのものです。{x}が管理しています。',
        leadHome: '{x}の拠点です。',
        facts: { inside: '今いる人', keeper: '管理者', enters: '入れる人' },
        encounters: {
          title: 'ここでの集い',
          none: 'ここでの集いはまだ告知されていません。',
          calendar: '{x}のカレンダーを見る',
          toCalendar: 'カレンダーへ',
        },
        machine: { title: 'そのマシン', runsOn: '{machine}で動いています' },
        community: { keptForCity: '都市のために管理', home: 'その拠点' },
      },
      ai: {
        title: 'AI',
        note: 'このワールドに入るAIです。管理できる人にだけ、このセクションが表示されます。',
        loading: 'AIを読み込み中…',
        empty:
          'このワールドにはまだAIがいません。AIは他の人と同じように入ります。見て、話して、許可すれば建てることもできます。',
        invite: 'AIを追加する',
        listLabel: 'このワールドのAI',
        talk: '見る・話すことができます',
        build: '建てることもできます',
        on: '接続中',
        off: '待機中',
        waiting: '接続待ち',
        remove: '削除',
        removeLabel: '{name}を削除',
        removeAsk: '{name}を削除しますか？ このワールドには入れなくなります。',
        removeYes: '削除する',
        removeNo: 'やめる',
        removing: '削除中…',
        fork: {
          title: 'AIを追加する',
          question: 'どこで考えますか？',
          hereTitle: 'ここで心を与える',
          hereNote:
            'このワールドに住み、近づいた人にあいさつし、話し、望めば建てることもします。ワールド自身のキーで考えます。',
          ownTitle: '自分のエージェントをつなぐ',
          ownNote:
            'すでに持っているAI（Hermes、Claudeなど）が、自分のコンピューターから自分のキーで入ります。',
          thinkingLabel: 'このマシンは考えられる：',
          thinkingYes: 'はい',
          thinkingNo: 'いいえ',
          thinkingUnknown: 'まだ分かりません',
          thinkingNoNote:
            'マシンを管理する人が、ワールドのコンピューター上でキーを設定します。そのキーが numinia.com やブラウザを通ることはありません。',
          hereSoon:
            'まもなく、ここで名前と性格を決められるようになります。このワールドはまだ numinia.com から住人を受け付けていません。',
        },
        dialog: {
          title: 'AIを招待する',
          step: 'ステップ {n} / 3',
          nameLabel: '名前は？',
          nameHint: 'ワールドで人に見える名前です。',
          nameProblems: {
            empty: '名前を入力してください。',
            long: '名前が長すぎます（最大{max}文字）。',
            chars: '文字・数字・スペース・ピリオド・ハイフン・アンダースコアだけ使えます。',
            taken: 'その名前のAIはすでにいます。別の名前にしてください。',
          },
          abilityLabel: '何ができますか？',
          abilityTalk: '見る・話すだけ',
          abilityBuild: '見る・話す・建てる',
          next: '次へ',
          back: '戻る',
          cancel: 'キャンセル',
          commandTitle: 'AIのキー',
          commandNote:
            'AIが動いているコンピューターで、numinia-engine フォルダの中でこの1行を実行してください。そのコンピューター上でキーを作ります（秘密鍵はそこから出ません）。ed25519: で始まる1行が表示されます。',
          copy: 'コピー',
          copied: 'コピーしました',
          keyLabel: 'その1行（公開鍵）をここに貼り付け',
          keyInvalid: '公開鍵ではありません。ed25519: に続けて英数字43文字にしてください。',
          add: '追加',
          adding: '追加中…',
        },
        failures: {
          unreachable: 'ワールドが応答しません。起動してからもう一度お試しください。',
          disabled:
            'このワールドはまだ numinia.com からのAIを受け付けません（新しいエンジンが必要です）。',
          expired: '権限の期限が切れ、更新できませんでした。ページを再読み込みしてください。',
          'no-pass':
            'numinia.com からワールドと話す権限を受け取れませんでした。ページを再読み込みしてもう一度お試しください。',
          forbidden: 'このワールドのAIを管理する権限がありません。組織を管理できる必要があります。',
          duplicate: 'このワールドには同じ名前のAIがすでにいます。別の名前にしてください。',
          'too-big': '送った内容が大きすぎます。名前を短くしてください。',
          starting: 'ワールドが起動中です。少し待ってからもう一度お試しください。',
          invalid: 'ワールドがそのデータを受け付けませんでした。',
          'not-found': 'そのAIはもうこのワールドにいません。',
          other: '問題が起きました。もう一度お試しください。',
        },
      },
      functions: {
        title: 'このワールドの機能',
        note: 'このワールドでできることです。管理できる人にだけ、このセクションが表示されます。変更はワールドに保存され、中にいる人にも届きます。',
        loading: '機能を読み込み中…',
        names: { normas: '入場ルール', dardos: 'ダーツ', pesca: '釣り' },
        helps: {
          normas: 'Numiniaの規約とコミュニティのルール：入る人は、動く前にそれらに同意します',
          dardos: 'オフにすると、誰も投げられず、的も消えます。',
          pesca: 'オフにすると、誰も釣りができず、釣り用の水辺も見えなくなります。',
        },
        on: 'オン',
        off: 'オフ',
        fixed: 'サーバーが固定しています',
        saving: '変更中…',
        doneOn: '{name}：オン。',
        doneOff: '{name}：オフ。',
        failures: {
          unsupported: 'このワールドは、まだここから変更できません（エンジン0.49以降が必要です）',
          fixed: '{name}：サーバーが固定しているため、スイッチでは変更できません。',
          forbidden:
            'このワールドの機能を変更する権限がありません。組織を管理できる必要があります。',
        },
      },
    },
  },
  ko: {
    placement: {
      ...ORG_CHOICE_WORDS.ko,
      homeLabel: '조직',
      unplaced: '조직 없음',
      openPage: '페이지 보기',
      select: '{w} 선택',
      assign: '조직에 배정',
      assignLabel: '{w}을(를) 조직에 배정',
      assignChosen: '조직에 배정 ({n})',
      chosen: { one: '월드 {n}개 선택됨', other: '월드 {n}개 선택됨' },
      clear: '선택 해제',
      selectShown: '표시된 {n}개 선택',
      openAll: '모든 커뮤니티 열기',
      openAllTip:
        '모든 커뮤니티의 거점을 열고 하우스를 각각의 관리자로 만듭니다. 다시 눌러도 안전합니다.',
      openedAll: { one: '커뮤니티 {n}개 열림', other: '커뮤니티 {n}개 열림' },
      openAllFailed: '커뮤니티를 열지 못했습니다.',
      titleOne: '“{w}”을(를) 조직에 배정',
      titleMany: '월드 {n}개를 조직에 배정',
      orgLabel: '조직',
      loading: '조직을 읽는 중…',
      noOrgs: '월드를 배정할 수 있는 조직이 없습니다.',
      save: '배정',
      cancel: '취소',
      moves:
        '월드는 하나의 조직에만 속합니다. 비용을 내는 조직이 관리하는 조직입니다. 이미 조직이 있다면 이 조직으로 옮겨집니다.',
      placed: {
        one: '월드 {n}개를 {org}에 배정했습니다.',
        other: '월드 {n}개를 {org}에 배정했습니다.',
      },
      failed: '배정하지 못했습니다. 다시 시도해 주세요.',
      forbidden: '월드를 조직에 배정할 수 있는 것은 하우스뿐입니다.',
      unknownOrg: '그 조직은 더 이상 없습니다.',
      homesFailed: '각 월드가 속한 조직을 읽지 못했습니다.',
    },
    venues: {
      loading: '거점을 읽는 중…',
      failed: '이 조직의 거점을 읽지 못했습니다.',
      forbidden: '조직의 구성원만 거점을 볼 수 있습니다.',
      retry: '다시 시도',
      empty: '이 조직에는 아직 거점이 없습니다.',
      emptyNote:
        '하우스가 월드를 배정하면 그 월드가 조직의 거점이 됩니다. 배정되면 여기에 표시됩니다.',
      count: { one: '거점 {n}개', other: '거점 {n}개' },
      open: '페이지 열기',
      openLabel: '{w} 페이지 열기',
      address: '월드',
      enterers: { one: '1명이 입장할 수 있습니다', other: '{n}명이 입장할 수 있습니다' },
      enter: '입장',
      enterLabel: '{w} 입장',
      enterFailed: '월드를 열 수 없습니다. 다시 시도해 주세요.',
    },
    page: {
      loading: '월드를 읽는 중…',
      missingTitle: '그 이름의 월드가 없습니다',
      missing: '주소가 잘못되었거나 월드가 더 이상 없습니다.',
      failed: '월드를 읽지 못했습니다.',
      retry: '다시 시도',
      eyebrow: '월드',
      homeLabel: '커뮤니티',
      unplaced: '커뮤니티 없음',
      unplacedNote: '하우스가 아직 이 월드를 커뮤니티에 배정하지 않았습니다.',
      manage: {
        title: '관리',
        note: '당신은 이 월드의 커뮤니티에 속해 있습니다. 비용을 내는 커뮤니티가 관리하는 커뮤니티입니다.',
        venues: '커뮤니티의 거점',
        members: '구성원',
        balance: '잔액과 사용량',
      },
      enters: {
        title: '입장할 수 있는 사람',
        everyone: '커뮤니티의 모든 사람이 입장할 수 있습니다.',
        roles: '다음 역할을 가진 사람이 입장할 수 있습니다:',
        owners: '소유자는 언제나 입장할 수 있습니다.',
        people: '입장할 수 있는 사람들',
        more: '… 외 {n}명',
        none: '아직 아무도 없습니다.',
      },
      back: '처음으로',
      enter: '입장',
      entering: '입장하는 중…',
      enterMember: '{org}에서의 이름과 역할로 입장합니다',
      enterGuest: '게스트로 입장합니다',
      enterFailed: '월드를 열 수 없습니다. 다시 시도해 주세요.',
      own: {
        heroLine: '내 이름과 아바타로 들어갑니다. 안에서 할 수 있는 일은 역할이 정합니다.',
        share: '공유',
        shareCopied: '링크를 복사했습니다',
        shareFailed: '링크를 복사할 수 없습니다.',
        manageAct: '관리하기',
        leadKept: '모두의 것입니다. {x}이(가) 관리합니다.',
        leadHome: '{x}의 거점입니다.',
        facts: { inside: '지금 안에', keeper: '관리하는 곳', enters: '들어갈 수 있는 사람' },
        encounters: {
          title: '이곳의 모임',
          none: '아직 이곳에 예고된 모임이 없습니다.',
          calendar: '{x}의 달력 보기',
          toCalendar: '내 달력에',
        },
        machine: { title: '그 머신', runsOn: '{machine}에서 실행 중' },
        community: { keptForCity: '도시를 위해 관리', home: '그 거점' },
      },
      ai: {
        title: 'AI',
        note: '이 월드에 들어오는 AI입니다. 이 월드를 관리할 수 있는 사람에게만 이 섹션이 보입니다.',
        loading: 'AI를 읽는 중…',
        empty:
          '이 월드에는 아직 AI가 없습니다. AI는 다른 사람처럼 들어옵니다. 보고, 말하고, 허락하면 만들기도 합니다.',
        invite: 'AI 추가하기',
        listLabel: '이 월드의 AI',
        talk: '보고 말할 수 있음',
        build: '만들 수도 있음',
        on: '접속 중',
        off: '잠든 상태',
        waiting: '기다리는 중',
        remove: '제거',
        removeLabel: '{name} 제거',
        removeAsk: '{name}을(를) 제거할까요? 더 이상 이 월드에 들어올 수 없습니다.',
        removeYes: '네, 제거',
        removeNo: '아니요, 그대로 두기',
        removing: '제거 중…',
        fork: {
          title: 'AI 추가하기',
          question: '어디에서 생각하나요?',
          hereTitle: '여기에서 마음을 주기',
          hereNote:
            '이 월드에 살면서 다가오는 사람에게 인사하고, 대화하고, 원하면 만들기도 합니다. 월드 자체의 키로 생각합니다.',
          ownTitle: '내 에이전트 연결하기',
          ownNote: '이미 가지고 있는 AI(Hermes, Claude 등)가 자기 컴퓨터에서 자기 키로 들어옵니다.',
          thinkingLabel: '이 머신은 생각할 수 있음:',
          thinkingYes: '예',
          thinkingNo: '아니요',
          thinkingUnknown: '아직 알 수 없음',
          thinkingNoNote:
            '머신을 관리하는 사람이 월드의 컴퓨터에 키를 넣어 줍니다. 그 키는 numinia.com이나 브라우저를 거치지 않습니다.',
          hereSoon:
            '곧 여기에서 이름과 성격을 정할 수 있습니다. 이 월드는 아직 numinia.com에서 주민을 받지 않습니다.',
        },
        dialog: {
          title: 'AI 초대하기',
          step: '{n}/3단계',
          nameLabel: '이름이 무엇인가요?',
          nameHint: '월드에서 사람들에게 보이는 이름입니다.',
          nameProblems: {
            empty: '이름을 입력하세요.',
            long: '이름이 너무 깁니다(최대 {max}자).',
            chars: '글자, 숫자, 공백, 마침표, 하이픈, 밑줄만 쓸 수 있습니다.',
            taken: '같은 이름의 AI가 이미 있습니다. 다른 이름을 고르세요.',
          },
          abilityLabel: '무엇을 할 수 있나요?',
          abilityTalk: '보고 말하기만',
          abilityBuild: '보고, 말하고, 만들기도',
          next: '다음',
          back: '뒤로',
          cancel: '취소',
          commandTitle: 'AI의 키',
          commandNote:
            'AI가 있는 컴퓨터에서 numinia-engine 폴더 안에 이 한 줄을 실행하세요. 그 컴퓨터에서 키를 만들고(개인 키는 그곳을 떠나지 않습니다) ed25519: 로 시작하는 한 줄을 보여 줍니다.',
          copy: '복사',
          copied: '복사됨',
          keyLabel: '그 한 줄(공개 키)을 여기에 붙여넣기',
          keyInvalid: '공개 키가 아닙니다. ed25519: 뒤에 영문자·숫자 43자가 와야 합니다.',
          add: '추가',
          adding: '추가 중…',
        },
        failures: {
          unreachable: '월드가 응답하지 않습니다. 월드를 시작한 뒤 다시 시도하세요.',
          disabled: '이 월드는 아직 numinia.com의 AI를 받지 않습니다(새 엔진이 필요합니다).',
          expired: '권한이 만료되었고 갱신하지 못했습니다. 페이지를 새로고침하세요.',
          'no-pass':
            'numinia.com에서 월드와 대화할 권한을 받지 못했습니다. 페이지를 새로고침하고 다시 시도하세요.',
          forbidden: '이 월드의 AI를 관리할 권한이 없습니다. 조직을 관리할 수 있어야 합니다.',
          duplicate: '이 월드에 같은 이름의 AI가 이미 있습니다. 다른 이름을 고르세요.',
          'too-big': '보낸 내용이 너무 큽니다. 더 짧은 이름을 써 보세요.',
          starting: '월드가 시작하는 중입니다. 잠시 기다린 뒤 다시 시도하세요.',
          invalid: '월드가 그 데이터를 받아들이지 않습니다.',
          'not-found': '그 AI는 더 이상 이 월드에 없습니다.',
          other: '문제가 생겼습니다. 다시 시도하세요.',
        },
      },
      functions: {
        title: '이 월드의 기능',
        note: '이 월드에서 할 수 있는 것들입니다. 이 월드를 관리할 수 있는 사람에게만 이 섹션이 보입니다. 변경 사항은 월드에 저장되고 안에 있는 사람에게도 전달됩니다.',
        loading: '기능을 읽는 중…',
        names: { normas: '입장 규칙', dardos: '다트', pesca: '낚시' },
        helps: {
          normas: 'Numinia의 약관과 커뮤니티 규칙: 들어오는 사람은 움직이기 전에 이를 수락합니다',
          dardos: '끄면 아무도 던질 수 없고 과녁도 사라집니다.',
          pesca: '끄면 아무도 낚시할 수 없고 낚시용 물도 보이지 않습니다.',
        },
        on: '켜짐',
        off: '꺼짐',
        fixed: '서버가 고정함',
        saving: '변경하는 중…',
        doneOn: '{name}: 켜짐.',
        doneOff: '{name}: 꺼짐.',
        failures: {
          unsupported: '이 월드는 아직 여기에서 바꿀 수 없습니다(엔진 0.49 이상이 필요합니다)',
          fixed: '{name}: 서버가 고정해 두어 스위치로 바꿀 수 없습니다.',
          forbidden: '이 월드의 기능을 바꿀 권한이 없습니다. 조직을 관리할 수 있어야 합니다.',
        },
      },
    },
  },
  'pt-br': {
    placement: {
      ...ORG_CHOICE_WORDS['pt-br'],
      homeLabel: 'Organização',
      unplaced: 'Sem organização',
      openPage: 'Ver a página',
      select: 'Escolher {w}',
      assign: 'Atribuir a uma organização',
      assignLabel: 'Atribuir {w} a uma organização',
      assignChosen: 'Atribuir a uma organização ({n})',
      chosen: { one: '{n} mundo escolhido', other: '{n} mundos escolhidos' },
      clear: 'Limpar a seleção',
      selectShown: 'Escolher os {n} exibidos',
      openAll: 'Abrir todas as comunidades',
      openAllTip:
        'Abre a sede de cada comunidade e torna a casa administradora de todas. Pode repetir sem risco.',
      openedAll: { one: '{n} comunidade aberta', other: '{n} comunidades abertas' },
      openAllFailed: 'Não foi possível abrir as comunidades.',
      titleOne: 'Atribuir “{w}” a uma organização',
      titleMany: 'Atribuir {n} mundos a uma organização',
      orgLabel: 'Organização',
      loading: 'Lendo as organizações…',
      noOrgs: 'Não há organizações para atribuir mundos.',
      save: 'Atribuir',
      cancel: 'Cancelar',
      moves:
        'Cada mundo pertence a uma só organização: a que o paga é a que o administra. Se já tinha uma, passa para esta.',
      placed: {
        one: '{n} mundo atribuído a {org}.',
        other: '{n} mundos atribuídos a {org}.',
      },
      failed: 'Não foi possível atribuir. Tente de novo.',
      forbidden: 'Só a casa atribui mundos a organizações.',
      unknownOrg: 'Essa organização não existe mais.',
      homesFailed: 'Não foi possível ler a que organização cada mundo pertence.',
    },
    venues: {
      loading: 'Lendo as sedes…',
      failed: 'Não foi possível ler as sedes desta organização.',
      forbidden: 'Só quem faz parte da organização vê as sedes dela.',
      retry: 'Tentar de novo',
      empty: 'Esta organização ainda não tem sedes.',
      emptyNote:
        'Um mundo passa a ser sede de uma organização quando a casa o atribui. Quando isso acontecer, ele aparecerá aqui.',
      count: { one: '{n} sede', other: '{n} sedes' },
      open: 'Abrir a página',
      openLabel: 'Abrir a página de {w}',
      address: 'Mundo',
      enterers: { one: 'Pode entrar 1 pessoa', other: 'Podem entrar {n} pessoas' },
      enter: 'Entrar',
      enterLabel: 'Entrar em {w}',
      enterFailed: 'Não foi possível abrir o mundo. Tente de novo.',
    },
    page: {
      loading: 'Lendo o mundo…',
      missingTitle: 'Não há nenhum mundo com esse nome',
      missing: 'O endereço pode estar errado ou o mundo não existe mais.',
      failed: 'Não foi possível ler o mundo.',
      retry: 'Tentar de novo',
      eyebrow: 'Mundo',
      homeLabel: 'Comunidade',
      unplaced: 'Sem comunidade',
      unplacedNote: 'A casa ainda não o atribuiu a nenhuma comunidade.',
      manage: {
        title: 'Administração',
        note: 'Você faz parte da comunidade deste mundo: a que o paga é a que o administra.',
        venues: 'Sedes da comunidade',
        members: 'Membros',
        balance: 'Saldo e consumo',
      },
      enters: {
        title: 'Quem entra',
        everyone: 'Qualquer pessoa da comunidade pode entrar.',
        roles: 'Entram quem tem algum destes papéis:',
        owners: 'Os titulares entram sempre.',
        people: 'Gente que pode entrar',
        more: '… e mais {n}',
        none: 'Ninguém, por enquanto.',
      },
      back: 'Voltar ao início',
      enter: 'Entrar',
      entering: 'Entrando…',
      enterMember: 'Você entra com seu nome e seus papéis em {org}',
      enterGuest: 'Você entra como convidado',
      enterFailed: 'Não foi possível abrir o mundo. Tente de novo.',
      own: {
        heroLine:
          'Você entra com seu nome e seu avatar. O que pode fazer lá dentro, seus papéis dizem.',
        share: 'Compartilhar',
        shareCopied: 'Link copiado',
        shareFailed: 'Não foi possível copiar o link.',
        manageAct: 'Gerenciar',
        leadKept: 'É de todos; {x} cuida dele.',
        leadHome: 'É a sede de {x}.',
        facts: { inside: 'Dentro agora', keeper: 'Quem cuida', enters: 'Quem entra' },
        encounters: {
          title: 'Encontros aqui',
          none: 'Nenhum encontro anunciado aqui ainda.',
          calendar: 'Ver o calendário de {x}',
          toCalendar: 'Ao meu calendário',
        },
        machine: { title: 'Sua máquina', runsOn: 'Roda em {machine}' },
        community: { keptForCity: 'Cuida dele para a cidade', home: 'Sua sede' },
      },
      ai: {
        title: 'IA',
        note: 'As IAs que entram neste mundo. Você vê esta seção porque pode administrá-lo.',
        loading: 'Lendo as IAs…',
        empty:
          'Este mundo ainda não tem IAs. Uma IA entra como uma pessoa qualquer: olha, fala e, se você deixar, constrói.',
        invite: 'Adicionar uma IA',
        listLabel: 'IAs deste mundo',
        talk: 'Pode olhar e falar',
        build: 'Pode também construir',
        on: 'conectada',
        off: 'dormindo',
        waiting: 'aguardando',
        remove: 'Remover',
        removeLabel: 'Remover {name}',
        removeAsk: 'Remover {name}? Ela não poderá mais entrar neste mundo.',
        removeYes: 'Sim, remover',
        removeNo: 'Não, manter',
        removing: 'Removendo…',
        fork: {
          title: 'Adicionar uma IA',
          question: 'Onde ela vai pensar?',
          hereTitle: 'Dar a ela uma mente aqui',
          hereNote:
            'Ela vive neste mundo: cumprimenta quem chega perto, conversa e, se você quiser, constrói. Pensa com a chave do próprio mundo.',
          ownTitle: 'Conectar seu próprio agente',
          ownNote:
            'Uma IA que você já tem (Hermes, Claude…) entra a partir do computador dela, com uma chave própria.',
          thinkingLabel: 'Esta máquina pode pensar:',
          thinkingYes: 'sim',
          thinkingNo: 'não',
          thinkingUnknown: 'ainda não diz',
          thinkingNoNote:
            'Quem cuida da máquina coloca uma chave no próprio computador do mundo. Essa chave nunca passa pelo numinia.com nem pelo seu navegador.',
          hereSoon:
            'Em breve você dará aqui nome e caráter: este mundo ainda não recebe habitantes do numinia.com.',
        },
        dialog: {
          title: 'Convidar uma IA',
          step: 'Passo {n} de 3',
          nameLabel: 'Como ela se chama?',
          nameHint: 'É o nome que as pessoas verão no mundo.',
          nameProblems: {
            empty: 'Escreva um nome.',
            long: 'Esse nome é longo demais (no máximo {max} caracteres).',
            chars: 'Use só letras, números, espaços, ponto, hífen ou sublinhado.',
            taken: 'Já existe uma IA com esse nome. Escolha outro.',
          },
          abilityLabel: 'O que ela pode fazer?',
          abilityTalk: 'Só olhar e falar',
          abilityBuild: 'Olhar, falar e também construir',
          next: 'Próximo',
          back: 'Voltar',
          cancel: 'Cancelar',
          commandTitle: 'A chave dela',
          commandNote:
            'Execute esta linha no computador onde sua IA vive, dentro da pasta numinia-engine. Ela cria a chave nesse computador (a privada não sai de lá) e mostra uma linha que começa com ed25519:',
          copy: 'Copiar',
          copied: 'Copiado',
          keyLabel: 'Cole aqui essa linha (a chave pública)',
          keyInvalid:
            'Essa linha não é uma chave pública: deve ser ed25519: seguido de 43 letras ou números.',
          add: 'Adicionar',
          adding: 'Adicionando…',
        },
        failures: {
          unreachable: 'O mundo não responde. Inicie-o e tente de novo.',
          disabled:
            'Este mundo ainda não aceita IAs a partir do numinia.com (precisa do motor novo).',
          expired: 'Sua permissão expirou e não foi possível renová-la. Recarregue a página.',
          'no-pass':
            'O numinia.com não lhe deu permissão para falar com o mundo. Recarregue a página e tente de novo.',
          forbidden:
            'Sua permissão não deixa gerenciar as IAs deste mundo: é preciso poder administrar a organização.',
          duplicate: 'Já existe uma IA com esse nome neste mundo. Escolha outro nome.',
          'too-big': 'O que você enviou é grande demais. Tente um nome mais curto.',
          starting: 'O mundo está iniciando. Espere um momento e tente de novo.',
          invalid: 'O mundo não aceita esses dados.',
          'not-found': 'Essa IA não está mais neste mundo.',
          other: 'Algo deu errado. Tente de novo.',
        },
      },
      functions: {
        title: 'Funções deste mundo',
        note: 'O que se pode fazer neste mundo. Você vê esta seção porque pode administrá-lo; a mudança fica salva no mundo e chega a quem está dentro.',
        loading: 'Lendo as funções…',
        names: { normas: 'Normas de entrada', dardos: 'Dardos', pesca: 'Pesca' },
        helps: {
          normas:
            'Termos da Numinia e normas da comunidade: quem entra as aceita antes de se mover',
          dardos: 'Desligados, ninguém joga e os alvos somem.',
          pesca: 'Desligada, ninguém pesca e a água de pesca some.',
        },
        on: 'ligada',
        off: 'desligada',
        fixed: 'Fixada pelo servidor',
        saving: 'Mudando…',
        doneOn: '{name}: ligada.',
        doneOff: '{name}: desligada.',
        failures: {
          unsupported:
            'Este mundo ainda não permite mudar isso por aqui (precisa do motor 0.49 ou mais novo)',
          fixed: '{name}: fixada pelo servidor, o interruptor não a muda.',
          forbidden:
            'Sua permissão não deixa mudar as funções deste mundo: é preciso poder administrar a organização.',
        },
      },
    },
  },
};
