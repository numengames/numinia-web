/**
 * «Saldo»'s words, five locales: your account and your organizations',
 * the balance that never expires, top-ups through Stripe in a new tab,
 * usage, movements and members, the way back from Stripe and «Referidos».
 * «organización» on this screen (the rest of the site says comunidad; the
 * naming is still open, so nothing else is renamed). `{name}` placeholders
 * are filled by `fill()` in lib/accounts.ts.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { DeskLogAct, LineLabel, SpendRange } from '../lib/accounts';

export interface TeamPanelMessages {
  readonly title: string;
  readonly lead: string;
  readonly noOrganization: string;
  readonly organization: string;
  /** The strip shown while the house enters the organization (alpha). */
  readonly house: string;
  readonly ownerStrip: string;
  readonly rolesTitle: string;
  readonly membersTitle: string;
  readonly logTitle: string;
  /** `{n}`: how many people hold the role. */
  readonly holders: string;
  readonly base: string;
  readonly apart: string;
  readonly owner: string;
  readonly you: string;
  readonly noRoles: string;
  readonly edit: string;
  readonly moveUp: string;
  readonly moveDown: string;
  readonly remove: string;
  /** `{name}`: the role about to be deleted. */
  readonly confirmRemove: string;
  readonly confirm: string;
  readonly cancel: string;
  readonly newRole: string;
  readonly name: string;
  readonly color: string;
  readonly noColor: string;
  readonly showApart: string;
  readonly permissions: string;
  readonly create: string;
  readonly save: string;
  /** Beside «Administrador» and «Gestionar roles»: giving them asks the wallet to sign. */
  readonly signatureNote: string;
  /** While the wallet is asked to sign an act (ORG-008). */
  readonly signing: string;
  /** The wallet did not sign: this browser remembers none, … */
  readonly noWallet: string;
  /** … the one connected is not the session's, … */
  readonly otherWallet: string;
  /** … or the person did not sign. */
  readonly declined: string;
  readonly give: string;
  /** The select's label: which role to give. */
  readonly giveLabel: string;
  /** `{role}` and `{who}`. */
  readonly take: string;
  readonly noRolesYet: string;
  readonly working: string;
  readonly showLog: string;
  readonly hideLog: string;
  readonly logEmpty: string;
  readonly logAct: Readonly<Record<DeskLogAct, string>>;
}

export interface SaldoMessages {
  /** The sidebar's entry and the page's tab. */
  readonly nav: string;
  readonly title: string;
  /** Meta description and lead of the page. */
  readonly lead: string;
  /** The page's own tabs: Saldo and Referidos. */
  readonly tabs: {
    readonly label: string;
    readonly saldo: string;
    readonly members: string;
    readonly referrals: string;
  };
  /** «Miembros y roles»: who is in an organization and what each role lets them do. */
  readonly panel: TeamPanelMessages;
  readonly signedOut: { readonly title: string; readonly text: string; readonly cta: string };
  readonly loading: string;
  /** No desk is bound to this site (503 not-bound). */
  readonly notBound: string;
  /** The till failed or did not answer. */
  readonly failed: string;
  readonly retry: string;
  readonly switcher: {
    readonly label: string;
    readonly personal: string;
    readonly newTeam: string;
    readonly newTeamName: string;
    readonly newTeamNote: string;
    readonly create: string;
    readonly cancel: string;
    readonly nameInvalid: string;
  };
  /** The roles, as a person reads them. */
  readonly roles: { readonly owner: string; readonly admin: string; readonly member: string };
  readonly balance: {
    readonly label: string;
    readonly low: string;
    readonly lowNote: string;
    readonly spent: string;
    /** `{range}`: «30 días». */
    readonly spentOf: string;
  };
  /**
   * The three cards at the top (cut «el dinero»): the balance and how long it
   * lasts, this month, the low-balance warning. `{n}`: a whole number.
   */
  readonly kpis: {
    /** At the pace of the 7 complete UTC days before today: about `{n}` days, one, less than one. */
    readonly runway: string;
    readonly runwayOne: string;
    readonly runwayLess: string;
    /** Nothing spent in those seven days. */
    readonly runwayStill: string;
    readonly month: string;
    /** The worlds a day of this month charged: `{n}`, one, none. */
    readonly monthWorlds: string;
    readonly monthWorldsOne: string;
    readonly monthWorldsNone: string;
    readonly low: string;
    /** The screen's own warning, under 10 €. */
    readonly lowWhen: string;
    /** `{n}`: keepDaysAtZero. */
    readonly lowKeep: string;
  };
  readonly topup: {
    readonly title: string;
    readonly note: string;
    /** Who sells the top-up and what the bank statement says (a buyer who does not recognise it may dispute). */
    readonly seller: string;
    readonly amounts: string;
    readonly pay: string;
    readonly opening: string;
    readonly opened: string;
    readonly openedNote: string;
    readonly blocked: string;
    readonly openLink: string;
    readonly notConfigured: string;
  };
  readonly usage: {
    readonly title: string;
    readonly ranges: Readonly<Record<SpendRange, string>>;
    readonly rangeLabel: string;
    readonly empty: string;
    /** `{total}`: the period's spend, for screen readers. */
    readonly chartDays: string;
    readonly chartMonths: string;
    /** The chart's heading: `{n}` days, or the twelve months. */
    readonly headDays: string;
    readonly headMonths: string;
    readonly closes: string;
    /** The legend: a world on, a world off. */
    readonly running: string;
    readonly stopped: string;
    /** A bar's title: `{when}`, `{total}` and its two halves `{running}` and `{stopped}`. */
    readonly bar: string;
    /** The table of worlds of the period: its name and columns. */
    readonly worlds: string;
    readonly world: string;
    readonly size: string;
    readonly daysRunning: string;
    readonly amount: string;
  };
  readonly lines: {
    readonly title: string;
    readonly head: string;
    /** Lines are never deleted: a correction is another line. */
    readonly never: string;
    readonly csv: string;
    readonly empty: string;
    readonly day: string;
    readonly what: string;
    readonly detail: string;
    readonly amount: string;
    /** The balance after each line. */
    readonly after: string;
    /** How that balance is counted: back from today's, exact for the 100 newest lines. */
    readonly afterNote: string;
    readonly labels: Readonly<Record<LineLabel, string>>;
    /** `{v}`: the VAT paid with a top-up. */
    readonly vat: string;
    /** `{world}` and `{size}` of a world's day. */
    readonly world: string;
    /** A world's day minutes: `{on}` and `{off}`, each written with `hours` or `hoursMinutes` (`{h}`, `{m}`). */
    readonly minutes: string;
    readonly hours: string;
    readonly hoursMinutes: string;
  };
  /** «Las reglas, a la vista»: the tariff in force, for the signed-in only. */
  readonly rules: {
    readonly label: string;
    readonly title: string;
    /** `{size}`, `{running}` and `{stopped}`: a size and its two prices a day. */
    readonly size: string;
    readonly topups: string;
    /** `{n}`: keepDaysAtZero. */
    readonly keep: string;
    /** `{n}`: noticeDaysForRise. */
    readonly notice: string;
    readonly personal: string;
    /** `{roles}`: the roles that hold the top-up. */
    readonly whoTopsUp: string;
    readonly whoTopsUpOwners: string;
    /** When the base role holds the top-up: every member tops up. */
    readonly everyone: string;
    /** `{date}`: the day the version in force started. */
    readonly since: string;
  };
  /** Instead of the old Team section: where an organization's people now are. `{link}` is the link. */
  readonly membersLink: { readonly text: string; readonly link: string };
  readonly team: {
    readonly title: string;
    readonly rename: string;
    readonly renameLabel: string;
    readonly save: string;
    readonly members: string;
    readonly wallet: string;
    readonly role: string;
    readonly since: string;
    readonly you: string;
    readonly add: string;
    readonly addLabel: string;
    readonly walletInvalid: string;
    readonly makeAdmin: string;
    readonly makeMember: string;
    readonly remove: string;
    /** `{who}`: the short wallet a button acts on. */
    readonly actionOn: string;
    readonly leave: string;
    readonly perMember: string;
    readonly perMemberEmpty: string;
  };
  /** The till's refusals in plain words. `needs`: `{act}` and `{holders}`; `needsOwners`: `{act}`. */
  readonly problems: {
    readonly notMember: string;
    readonly lastOwner: string;
    readonly ownRoles: string;
    readonly notBelow: string;
    readonly ownerOnly: string;
    readonly noAdminRole: string;
    readonly baseRole: string;
    readonly grantExceeds: string;
    readonly roleLimit: string;
    readonly ownersOnly: string;
    readonly alpha: string;
    readonly meanwhile: string;
    readonly needs: string;
    readonly needsOwners: string;
    readonly freshSignature: string;
    readonly signatureExpired: string;
    readonly signatureMismatch: string;
    readonly other: string;
  };
  readonly referrals: { readonly title: string; readonly soon: string; readonly text: string };
  readonly vuelta: {
    readonly title: string;
    readonly checking: string;
    readonly done: string;
    /** `{b}`: the balance after the top-up. */
    readonly balanceNow: string;
    readonly processing: string;
    readonly processingNote: string;
    readonly cancelled: string;
    readonly cancelledNote: string;
    readonly unknown: string;
    readonly back: string;
  };
}

export const SALDO_UI: Readonly<Record<SupportedLocale, SaldoMessages>> = {
  es: {
    nav: 'Saldo',
    title: 'Saldo',
    lead: 'Tu cuenta y la de tus organizaciones: el saldo no caduca, recargas cuando quieras y ves en qué se gasta.',
    tabs: {
      label: 'Secciones de Saldo',
      saldo: 'Saldo',
      members: 'Miembros y roles',
      referrals: 'Referidos',
    },
    signedOut: {
      title: 'Entra para ver tu saldo',
      text: 'Tu saldo y el de tus organizaciones van con tu cuenta. Inicia sesión y lo verás aquí.',
      cta: 'Iniciar sesión',
    },
    loading: 'Leyendo tu saldo…',
    notBound: 'La caja todavía no está conectada a esta web. Vuelve a intentarlo más tarde.',
    failed: 'La caja no ha respondido.',
    retry: 'Reintentar',
    switcher: {
      label: 'Cuenta',
      personal: 'Tu cuenta',
      newTeam: 'Nueva organización',
      newTeamName: 'Nombre de la organización',
      newTeamNote: 'Tendrá su propio saldo y tú serás quien la administra.',
      create: 'Crear',
      cancel: 'Cancelar',
      nameInvalid: 'Escribe un nombre de 1 a 60 caracteres.',
    },
    roles: { owner: 'Titular', admin: 'Admin', member: 'Miembro' },
    balance: {
      label: 'Saldo · no caduca',
      low: 'Saldo bajo',
      lowNote: 'Te queda menos de 10\u00a0€. Recarga para que tus sedes sigan abiertas.',
      spent: 'Gastado este periodo',
      spentOf: 'en los últimos {range}',
    },
    kpis: {
      runway: 'Te da para unos {n} días al ritmo de los últimos 7 días.',
      runwayOne: 'Te da para un día al ritmo de los últimos 7 días.',
      runwayLess: 'Te da para menos de un día al ritmo de los últimos 7 días.',
      runwayStill: 'Sin gasto estos días: el saldo no baja.',
      month: 'Este mes',
      monthWorlds: '{n} sedes con cargo',
      monthWorldsOne: '1 sede con cargo',
      monthWorldsNone: 'Ninguna sede con cargo',
      low: 'Aviso de saldo bajo',
      lowWhen: 'Esta pantalla te avisa cuando el saldo baja de 10\u00a0€.',
      lowKeep: 'Con el saldo a cero, las sedes se apagan y se guardan {n} días.',
    },
    topup: {
      title: 'Recarga',
      note: 'Elige cuánto añadir. El pago se hace en Stripe, en otra pestaña.',
      seller:
        'La recarga la vende Link (Stripe), que te enviará la factura. En tu extracto bancario aparecerá como LINK.COM* NUMEN GAMES.',
      amounts: 'Importe de la recarga',
      pay: 'Pagar con Stripe',
      opening: 'Abriendo Stripe…',
      opened: 'Se ha abierto Stripe en otra pestaña',
      openedNote: 'Cuando termines, vuelve aquí: el saldo se pone al día solo.',
      blocked: 'Tu navegador no ha dejado abrir la pestaña.',
      openLink: 'Abrir Stripe',
      notConfigured: 'Los pagos aún no están activados. Vuelve a intentarlo más tarde.',
    },
    usage: {
      title: 'Consumo',
      ranges: { '7d': '7 días', '30d': '30 días', '12m': '12 meses' },
      rangeLabel: 'Periodo',
      empty: 'En este periodo no se ha gastado nada: ninguna sede ha consumido saldo.',
      chartDays: 'Gasto por día: {total} en total',
      chartMonths: 'Gasto por mes: {total} en total',
      headDays: 'Cada día, los últimos {n}',
      headMonths: 'Cada mes, los últimos 12',
      closes: 'Cada día se cierra a medianoche UTC.',
      running: 'Sede encendida',
      stopped: 'Apagada',
      bar: '{when} · {total} — encendida {running} · apagada {stopped}',
      worlds: 'Cada sede en el periodo',
      world: 'Sede',
      size: 'Tamaño',
      daysRunning: 'Días encendida',
      amount: 'Importe del periodo',
    },
    lines: {
      title: 'Movimientos',
      head: 'Cada línea',
      never: 'Las líneas nunca se borran: si algo se corrige, se añade otra.',
      csv: 'Descargar (.csv)',
      empty: 'Todavía no hay movimientos en esta cuenta.',
      day: 'Día (UTC)',
      what: 'Qué',
      detail: 'Detalle',
      amount: 'Importe',
      after: 'Saldo',
      afterNote:
        'El saldo de cada línea se cuenta hacia atrás desde el de hoy, sobre las 100 líneas más recientes: para ellas es exacto.',
      labels: {
        topup: 'Recarga',
        world: 'Día de sede',
        adjustment: 'Ajuste',
        refund: 'Devolución',
      },
      vat: 'IVA {v}',
      world: '{world} · {size}',
      minutes: 'encendida {on} · apagada {off}',
      hours: '{h} h',
      hoursMinutes: '{h} h {m} min',
    },
    rules: {
      label: 'Las reglas, a la vista',
      title: 'Lo que cuesta y por qué',
      size: 'Una sede de {size}: {running} al día encendida y {stopped} apagada.',
      topups: 'Recargas de 10, 50 o 100 €. Sin suscripción: pagas lo que gastas.',
      keep: 'Con el saldo a cero, la sede se apaga y se guarda {n} días.',
      notice: 'Si la tarifa sube, la subida no empieza hasta {n} días después de anunciarse.',
      personal: 'Es tu cuenta personal: solo tú recargas y ves estos datos.',
      whoTopsUp: 'Recargan las personas titulares y estos roles: {roles}.',
      whoTopsUpOwners: 'Solo recargan las personas titulares.',
      everyone: 'Recargan todos los miembros de la organización.',
      since: 'Tarifa en vigor desde el {date}.',
    },
    membersLink: {
      text: 'Quién está en esta organización y qué deja hacer cada rol, en {link}.',
      link: 'Miembros y roles',
    },
    team: {
      title: 'Equipo',
      rename: 'Cambiar nombre',
      renameLabel: 'Nombre de la organización',
      save: 'Guardar',
      members: 'Miembros',
      wallet: 'Cartera',
      role: 'Papel',
      since: 'Desde',
      you: 'tú',
      add: 'Añadir',
      addLabel: 'Cartera de la persona (0x…)',
      walletInvalid: 'Escribe una cartera completa: 0x y 40 caracteres.',
      makeAdmin: 'Hacer admin',
      makeMember: 'Hacer miembro',
      remove: 'Quitar',
      actionOn: '{action}: {who}',
      leave: 'Salir',
      perMember: 'Consumo por miembro',
      perMemberEmpty: 'Cuando cada mundo tenga dueño veréis aquí cuánto gasta cada uno.',
    },
    problems: {
      notMember: 'No eres miembro de esta organización.',
      lastOwner: 'Una organización necesita al menos una persona titular.',
      ownRoles: 'No puedes cambiar tus propios roles: solo puedes salir de la organización.',
      notBelow:
        'Solo puedes actuar sobre roles y personas que estén por debajo de tu rol más alto.',
      ownerOnly: 'Solo una persona titular puede nombrar o quitar a otra titular.',
      noAdminRole: 'Todavía no hay en esta organización ningún rol con el permiso de administrar.',
      baseRole: 'Todo el mundo tiene el rol de base: no se da ni se quita.',
      grantExceeds: 'Solo puedes dar o quitar los permisos que tú tienes.',
      roleLimit: 'Ya no caben más roles en esta organización.',
      ownersOnly: 'Esto solo lo hacen las personas titulares de la organización.',
      alpha: 'Durante la alfa, ninguna organización cambia el acceso de la casa.',
      meanwhile:
        'La organización ha cambiado mientras tanto. Vuelve a mirarla e inténtalo otra vez.',
      needs:
        'Para hacerlo hace falta el permiso «{act}», que tienen las personas titulares y estos roles: {holders}.',
      needsOwners:
        'Para hacerlo hace falta el permiso «{act}», que solo tienen las personas titulares.',
      freshSignature:
        'Dar «Administrador» o «Gestionar roles» pide una firma nueva de tu cartera, y no ha llegado. No ha cambiado nada.',
      signatureExpired: 'La firma ha caducado: vale dos minutos. Vuelve a intentarlo.',
      signatureMismatch:
        'La firma no corresponde a este cambio o no es de tu cartera. No ha cambiado nada.',
      other: 'La caja no lo ha permitido.',
    },
    panel: {
      title: 'Miembros y roles',
      lead: 'Quién está en la organización y qué deja hacer cada rol. Cada cambio queda escrito en el registro.',
      noOrganization:
        'Todavía no estás en ninguna organización. Crea una desde Saldo y aquí podrás repartir roles.',
      organization: 'Organización',
      house:
        'Entras como la casa: ves y actúas con el permiso que la alfa le da a Numen Games. Cada paso queda en el registro.',
      ownerStrip: 'Eres titular: puedes todo menos lo que la casa se reserva.',
      rolesTitle: 'Roles',
      membersTitle: 'Gente',
      logTitle: 'Registro',
      holders: '{n} personas',
      base: 'Rol de base: lo tiene todo el mundo',
      apart: 'Sale aparte',
      owner: 'Titular',
      you: 'tú',
      noRoles: 'Nadie tiene este rol todavía.',
      edit: 'Editar',
      moveUp: 'Subir',
      moveDown: 'Bajar',
      remove: 'Borrar',
      confirmRemove: '¿Borrar el rol «{name}»? Quienes lo tienen lo pierden.',
      confirm: 'Sí, borrar',
      cancel: 'Cancelar',
      newRole: 'Nuevo rol',
      name: 'Nombre',
      color: 'Color',
      noColor: 'Sin color',
      showApart: 'Mostrar aparte en la lista de gente',
      permissions: 'Qué deja hacer',
      create: 'Crear rol',
      save: 'Guardar',
      signatureNote:
        'Dar «Administrador» o «Gestionar roles» te pide firmar con tu cartera en ese momento.',
      signing: 'Tu cartera te pide firmar este cambio…',
      noWallet:
        'Este navegador no recuerda tu cartera. Sal, vuelve a entrar con ella y repite el cambio.',
      otherWallet:
        'La cartera conectada no es la de tu sesión. Entra con la misma cartera y repite el cambio.',
      declined: 'No has firmado, así que no ha cambiado nada.',
      give: 'Dar',
      giveLabel: 'Rol que dar a {who}',
      take: 'Quitar el rol {role} a {who}',
      noRolesYet: 'Sin más roles que el de base.',
      working: 'Guardando…',
      showLog: 'Ver el registro',
      hideLog: 'Ocultar el registro',
      logEmpty: 'Todavía no hay cambios escritos.',
      logAct: {
        'organization-created': 'Organización creada',
        'organization-renamed': 'Organización renombrada',
        'member-added': 'Persona añadida',
        'member-removed': 'Persona quitada',
        'member-left': 'Persona que se va',
        'role-given': 'Rol dado',
        'role-taken': 'Rol quitado',
        'topup-started': 'Recarga empezada',
        'house-read': 'La casa ha mirado',
        'role-created': 'Rol creado',
        'role-edited': 'Rol editado',
        'role-moved': 'Rol movido',
        'role-deleted': 'Rol borrado',
        'settings-changed': 'Ajustes de la comunidad cambiados',
      },
    },
    referrals: {
      title: 'Referidos',
      soon: 'Próximamente',
      text: 'Aquí podrás invitar a otras personas a Numinia y ver qué saldo os ganáis por ello. Todavía no está listo: cuando lo esté, lo anunciaremos en Novedades.',
    },
    vuelta: {
      title: 'Recarga',
      checking: 'Comprobando el pago…',
      done: 'Recarga hecha · ya puedes cerrar esta pestaña',
      balanceNow: 'Saldo ahora: {b}',
      processing: 'Aún se está procesando',
      processingNote: 'Stripe todavía no lo ha confirmado. Lo volvemos a mirar en unos segundos.',
      cancelled: 'Cancelada',
      cancelledNote: 'No se ha cobrado nada. Puedes cerrar esta pestaña.',
      unknown: 'No encontramos esta recarga en tu cuenta.',
      back: 'Ir a Saldo',
    },
  },
  en: {
    nav: 'Balance',
    title: 'Balance',
    lead: "Your account and your organizations': the balance never expires, you top up when you like and see what it is spent on.",
    tabs: {
      label: 'Balance sections',
      saldo: 'Balance',
      members: 'Members and roles',
      referrals: 'Referrals',
    },
    signedOut: {
      title: 'Sign in to see your balance',
      text: "Your balance and your organizations' travel with your account. Sign in and you will see them here.",
      cta: 'Sign in',
    },
    loading: 'Reading your balance…',
    notBound: 'The till is not connected to this site yet. Try again later.',
    failed: 'The till did not answer.',
    retry: 'Try again',
    switcher: {
      label: 'Account',
      personal: 'Your account',
      newTeam: 'New organization',
      newTeamName: "Organization's name",
      newTeamNote: 'It will have its own balance, and you will run it.',
      create: 'Create',
      cancel: 'Cancel',
      nameInvalid: 'Write a name of 1 to 60 characters.',
    },
    roles: { owner: 'Holder', admin: 'Admin', member: 'Member' },
    balance: {
      label: 'Balance · never expires',
      low: 'Low balance',
      lowNote: 'Less than €10 left. Top up to keep your homes open.',
      spent: 'Spent this period',
      spentOf: 'over the last {range}',
    },
    kpis: {
      runway: 'Enough for about {n} days at the pace of the last 7 days.',
      runwayOne: 'Enough for one day at the pace of the last 7 days.',
      runwayLess: 'Enough for less than a day at the pace of the last 7 days.',
      runwayStill: 'Nothing spent these days: the balance is not going down.',
      month: 'This month',
      monthWorlds: '{n} homes charged',
      monthWorldsOne: '1 home charged',
      monthWorldsNone: 'No home charged',
      low: 'Low-balance warning',
      lowWhen: 'This screen warns you when the balance drops below €10.',
      lowKeep: 'With the balance at zero, homes are switched off and kept for {n} days.',
    },
    topup: {
      title: 'Top up',
      note: 'Choose how much to add. You pay on Stripe, in another tab.',
      seller:
        'The top-up is sold by Link (Stripe), which sends you the invoice. On your bank statement it will appear as LINK.COM* NUMEN GAMES.',
      amounts: 'Top-up amount',
      pay: 'Pay with Stripe',
      opening: 'Opening Stripe…',
      opened: 'Stripe opened in another tab',
      openedNote: 'When you are done, come back here: the balance updates by itself.',
      blocked: 'Your browser did not let the tab open.',
      openLink: 'Open Stripe',
      notConfigured: 'Payments are not switched on yet. Try again later.',
    },
    usage: {
      title: 'Usage',
      ranges: { '7d': '7 days', '30d': '30 days', '12m': '12 months' },
      rangeLabel: 'Period',
      empty: 'Nothing was spent in this period: no home used any balance.',
      chartDays: 'Spend per day: {total} in all',
      chartMonths: 'Spend per month: {total} in all',
      headDays: 'Each day, the last {n}',
      headMonths: 'Each month, the last 12',
      closes: 'Each day closes at midnight UTC.',
      running: 'Home on',
      stopped: 'Off',
      bar: '{when} · {total} — on {running} · off {stopped}',
      worlds: 'Each home in the period',
      world: 'Home',
      size: 'Size',
      daysRunning: 'Days on',
      amount: 'Amount for the period',
    },
    lines: {
      title: 'Movements',
      head: 'Every line',
      never: 'Lines are never deleted: if something is corrected, another one is added.',
      csv: 'Download (.csv)',
      empty: 'No movements on this account yet.',
      day: 'Day (UTC)',
      what: 'What',
      detail: 'Detail',
      amount: 'Amount',
      after: 'Balance',
      afterNote:
        "Each line's balance is counted back from today's over the 100 most recent lines: for them it is exact.",
      labels: { topup: 'Top-up', world: 'Home day', adjustment: 'Adjustment', refund: 'Refund' },
      vat: 'VAT {v}',
      world: '{world} · {size}',
      minutes: 'on {on} · off {off}',
      hours: '{h} h',
      hoursMinutes: '{h} h {m} min',
    },
    rules: {
      label: 'Rules in sight',
      title: 'What it costs and why',
      size: 'A {size} home: {running} a day on and {stopped} off.',
      topups: 'Top-ups of €10, €50 or €100. No subscription: you pay for what you use.',
      keep: 'With the balance at zero, the home is switched off and kept for {n} days.',
      notice:
        'If the tariff goes up, the rise does not start until {n} days after it is announced.',
      personal: 'It is your personal account: only you top it up and see these figures.',
      whoTopsUp: 'Topped up by the holders and these roles: {roles}.',
      whoTopsUpOwners: 'Only the holders top it up.',
      everyone: 'Topped up by every member of the organization.',
      since: 'Tariff in force since {date}.',
    },
    membersLink: {
      text: 'Who is in this organization and what each role allows, in {link}.',
      link: 'Members and roles',
    },
    team: {
      title: 'Team',
      rename: 'Rename',
      renameLabel: "Organization's name",
      save: 'Save',
      members: 'Members',
      wallet: 'Wallet',
      role: 'Role',
      since: 'Since',
      you: 'you',
      add: 'Add',
      addLabel: "The person's wallet (0x…)",
      walletInvalid: 'Write a whole wallet: 0x and 40 characters.',
      makeAdmin: 'Make admin',
      makeMember: 'Make member',
      remove: 'Remove',
      actionOn: '{action}: {who}',
      leave: 'Leave',
      perMember: 'Use per member',
      perMemberEmpty:
        'Once every world has an owner, you will see here how much each of you spends.',
    },
    problems: {
      notMember: 'You are not a member of this organization.',
      lastOwner: 'An organization keeps at least one owner.',
      ownRoles: 'You cannot change your own roles; you can only leave.',
      notBelow: 'You can only act on roles and people below your own highest role.',
      ownerOnly: 'Only an owner can name or remove another owner.',
      noAdminRole: 'No role in this organization has the administrator permission yet.',
      baseRole: 'Everyone has the base role: it is neither given nor taken away.',
      grantExceeds: 'You can only give or take away permissions you hold yourself.',
      roleLimit: 'This organization has no room for more roles.',
      ownersOnly: 'Only the owners of the organization can do this.',
      alpha: "During the alpha, no organization changes the house's access.",
      meanwhile: 'The organization changed in the meantime. Look at it again and retry.',
      needs:
        'This needs the “{act}” permission, which the owners have, and these roles: {holders}.',
      needsOwners: 'This needs the “{act}” permission, which only the owners have.',
      freshSignature:
        'Giving «Administrator» or «Manage roles» needs a fresh signature from your wallet, and none arrived. Nothing changed.',
      signatureExpired: 'The signature expired: it lasts two minutes. Try again.',
      signatureMismatch:
        'The signature does not match this change or is not from your wallet. Nothing changed.',
      other: 'The till did not allow it.',
    },
    panel: {
      title: 'Members and roles',
      lead: 'Who is in the organization and what each role lets them do. Every change is written in the log.',
      noOrganization:
        'You are not in any organization yet. Create one from Balance and you can hand out roles here.',
      organization: 'Organization',
      house:
        'You enter as the house: you see and act with the permission the alpha gives Numen Games. Every step goes in the log.',
      ownerStrip: 'You are an owner: you can do everything except what the house keeps.',
      rolesTitle: 'Roles',
      membersTitle: 'People',
      logTitle: 'Log',
      holders: '{n} people',
      base: 'Base role: everyone has it',
      apart: 'Shown apart',
      owner: 'Owner',
      you: 'you',
      noRoles: 'Nobody holds this role yet.',
      edit: 'Edit',
      moveUp: 'Move up',
      moveDown: 'Move down',
      remove: 'Delete',
      confirmRemove: 'Delete the role «{name}»? Those who hold it lose it.',
      confirm: 'Yes, delete',
      cancel: 'Cancel',
      newRole: 'New role',
      name: 'Name',
      color: 'Colour',
      noColor: 'No colour',
      showApart: 'Show apart in the list of people',
      permissions: 'What it allows',
      create: 'Create role',
      save: 'Save',
      signatureNote:
        'Giving «Administrator» or «Manage roles» asks you to sign with your wallet at that moment.',
      signing: 'Your wallet asks you to sign this change…',
      noWallet:
        'This browser does not remember your wallet. Sign out, come back in with it and make the change again.',
      otherWallet:
        'The connected wallet is not the one you signed in with. Come in with the same wallet and make the change again.',
      declined: 'You did not sign, so nothing changed.',
      give: 'Give',
      giveLabel: 'Role to give to {who}',
      take: 'Take the role {role} from {who}',
      noRolesYet: 'No roles besides the base one.',
      working: 'Saving…',
      showLog: 'Show the log',
      hideLog: 'Hide the log',
      logEmpty: 'No changes written yet.',
      logAct: {
        'organization-created': 'Organization created',
        'organization-renamed': 'Organization renamed',
        'member-added': 'Person added',
        'member-removed': 'Person removed',
        'member-left': 'Person left',
        'role-given': 'Role given',
        'role-taken': 'Role taken away',
        'topup-started': 'Top-up started',
        'house-read': 'The house looked',
        'role-created': 'Role created',
        'role-edited': 'Role edited',
        'role-moved': 'Role moved',
        'role-deleted': 'Role deleted',
        'settings-changed': 'Community settings changed',
      },
    },
    referrals: {
      title: 'Referrals',
      soon: 'Coming soon',
      text: 'Here you will be able to invite people to Numinia and see the balance you earn for it. It is not ready yet: we will announce it in Updates when it is.',
    },
    vuelta: {
      title: 'Top-up',
      checking: 'Checking the payment…',
      done: 'Top-up done · you can close this tab',
      balanceNow: 'Balance now: {b}',
      processing: 'Still processing',
      processingNote: 'Stripe has not confirmed it yet. We will look again in a few seconds.',
      cancelled: 'Cancelled',
      cancelledNote: 'Nothing was charged. You can close this tab.',
      unknown: 'We cannot find this top-up on your account.',
      back: 'Go to Balance',
    },
  },
  ja: {
    nav: '残高',
    title: '残高',
    lead: 'あなたのアカウントと所属する組織の残高。有効期限はなく、いつでもチャージでき、使い道も確認できます。',
    tabs: {
      label: '残高のセクション',
      saldo: '残高',
      members: 'メンバーとロール',
      referrals: '紹介',
    },
    signedOut: {
      title: 'ログインして残高を確認',
      text: 'あなたと組織の残高はアカウントに紐づいています。ログインするとここに表示されます。',
      cta: 'ログイン',
    },
    loading: '残高を読み込み中…',
    notBound: 'このサイトはまだレジにつながっていません。後でもう一度お試しください。',
    failed: 'レジが応答しませんでした。',
    retry: '再試行',
    switcher: {
      label: 'アカウント',
      personal: 'あなたのアカウント',
      newTeam: '新しい組織',
      newTeamName: '組織の名前',
      newTeamNote: '組織には専用の残高があり、あなたが管理者になります。',
      create: '作成',
      cancel: 'キャンセル',
      nameInvalid: '1〜60文字の名前を入力してください。',
    },
    roles: { owner: '名義人', admin: '管理者', member: 'メンバー' },
    balance: {
      label: '残高 · 有効期限なし',
      low: '残高わずか',
      lowNote: '残りが10ユーロ未満です。拠点を開いたままにするにはチャージしてください。',
      spent: '今期の利用額',
      spentOf: '直近{range}',
    },
    kpis: {
      runway: '直近7日間のペースで、あと約{n}日分です。',
      runwayOne: '直近7日間のペースで、あと1日分です。',
      runwayLess: '直近7日間のペースで、残りは1日分に足りません。',
      runwayStill: 'この数日は利用がないため、残高は減っていません。',
      month: '今月',
      monthWorlds: '請求のあった拠点：{n}',
      monthWorldsOne: '請求のあった拠点：1',
      monthWorldsNone: '請求のあった拠点はありません',
      low: '残高不足のお知らせ',
      lowWhen: '残高が10ユーロを下回ると、この画面でお知らせします。',
      lowKeep: '残高が0になると拠点は停止し、{n}日間保管されます。',
    },
    topup: {
      title: 'チャージ',
      note: '追加する金額を選んでください。支払いは別タブのStripeで行います。',
      seller:
        'チャージの販売者はLink（Stripe）で、請求書はLinkから届きます。銀行の明細には「LINK.COM* NUMEN GAMES」と表示されます。',
      amounts: 'チャージ金額',
      pay: 'Stripeで支払う',
      opening: 'Stripeを開いています…',
      opened: '別のタブでStripeを開きました',
      openedNote: '支払いが終わったらここに戻ってください。残高は自動で更新されます。',
      blocked: 'ブラウザがタブを開くのをブロックしました。',
      openLink: 'Stripeを開く',
      notConfigured: '支払いはまだ有効になっていません。後でもう一度お試しください。',
    },
    usage: {
      title: '利用状況',
      ranges: { '7d': '7日', '30d': '30日', '12m': '12か月' },
      rangeLabel: '期間',
      empty: 'この期間の利用はありません。残高を使った拠点はありません。',
      chartDays: '日ごとの利用額：合計{total}',
      chartMonths: '月ごとの利用額：合計{total}',
      headDays: '日ごと、直近{n}日',
      headMonths: '月ごと、直近12か月',
      closes: '1日はUTCの午前0時に締まります。',
      running: '稼働中の拠点',
      stopped: '停止中',
      bar: '{when} · {total} — 稼働 {running} · 停止 {stopped}',
      worlds: '期間中の各拠点',
      world: '拠点',
      size: 'サイズ',
      daysRunning: '稼働日数',
      amount: '期間の金額',
    },
    lines: {
      title: '取引履歴',
      head: 'すべての明細',
      never: '明細は削除されません。訂正があるときは、新しい明細が追加されます。',
      csv: 'ダウンロード（.csv）',
      empty: 'このアカウントにはまだ取引がありません。',
      day: '日（UTC）',
      what: '内容',
      detail: '詳細',
      amount: '金額',
      after: '残高',
      afterNote:
        '各明細の残高は、今日の残高から最新100件の明細をさかのぼって計算しています。その範囲では正確です。',
      labels: { topup: 'チャージ', world: '拠点の1日', adjustment: '調整', refund: '返金' },
      vat: 'VAT {v}',
      world: '{world} · {size}',
      minutes: '稼働 {on} · 停止 {off}',
      hours: '{h}時間',
      hoursMinutes: '{h}時間{m}分',
    },
    rules: {
      label: 'ルールを見える形で',
      title: '料金とその理由',
      size: '{size}の拠点：稼働中は1日{running}、停止中は{stopped}。',
      topups: 'チャージは10・50・100ユーロ。サブスクリプションはなく、使った分だけ支払います。',
      keep: '残高が0になると拠点は停止し、{n}日間保管されます。',
      notice: '料金が上がる場合、値上げは告知から{n}日後まで始まりません。',
      personal:
        'あなたの個人アカウントです。チャージできるのも、この数字を見られるのもあなただけです。',
      whoTopsUp: 'チャージできるのは所有者と次のロールです：{roles}。',
      whoTopsUpOwners: 'チャージできるのは所有者だけです。',
      everyone: 'この組織のメンバーなら誰でもチャージできます。',
      since: '{date}から適用中の料金です。',
    },
    membersLink: {
      text: 'この組織にいる人と各ロールでできることは、{link}にあります。',
      link: 'メンバーとロール',
    },
    team: {
      title: 'チーム',
      rename: '名前を変更',
      renameLabel: '組織の名前',
      save: '保存',
      members: 'メンバー',
      wallet: 'ウォレット',
      role: '役割',
      since: '参加日',
      you: 'あなた',
      add: '追加',
      addLabel: '相手のウォレット（0x…）',
      walletInvalid: '完全なウォレットを入力してください：0xと40文字。',
      makeAdmin: '管理者にする',
      makeMember: 'メンバーにする',
      remove: '外す',
      actionOn: '{action}：{who}',
      leave: '退出する',
      perMember: 'メンバーごとの利用',
      perMemberEmpty: 'すべてのワールドに持ち主が決まると、ここで各自の利用額が見られます。',
    },
    problems: {
      notMember: 'あなたはこの組織のメンバーではありません。',
      lastOwner: '組織には少なくとも1人のオーナーが必要です。',
      ownRoles: '自分のロールは変更できません。退出することだけができます。',
      notBelow: '自分の最上位ロールより下のロールとメンバーにだけ操作できます。',
      ownerOnly: 'オーナーを指名したり外したりできるのはオーナーだけです。',
      noAdminRole: 'この組織には、管理者の権限を持つロールがまだありません。',
      baseRole: '全員が基本ロールを持っています。付けたり外したりはできません。',
      grantExceeds: '付けたり外したりできるのは、自分が持っている権限だけです。',
      roleLimit: 'この組織にはこれ以上ロールを作れません。',
      ownersOnly: 'これは組織のオーナーだけができます。',
      alpha: 'アルファ版の間は、どの組織もハウスのアクセスを変更できません。',
      meanwhile: 'その間に組織が変更されました。もう一度見てからやり直してください。',
      needs: 'これには「{act}」の権限が必要です。オーナーと次のロールが持っています: {holders}。',
      needsOwners: 'これには「{act}」の権限が必要です。持っているのはオーナーだけです。',
      freshSignature:
        '「管理者」や「ロールの管理」を付与するにはウォレットの新しい署名が必要ですが、届きませんでした。何も変更されていません。',
      signatureExpired:
        '署名の有効期限が切れました（有効なのは2分間です）。もう一度お試しください。',
      signatureMismatch:
        '署名がこの変更のものではないか、あなたのウォレットのものではありません。何も変更されていません。',
      other: 'レジが許可しませんでした。',
    },
    panel: {
      title: 'メンバーとロール',
      lead: '組織にいる人と、各ロールでできること。変更はすべて記録に残ります。',
      noOrganization:
        'まだどの組織にも入っていません。残高から組織を作ると、ここでロールを配れます。',
      organization: '組織',
      house:
        '運営として入っています。アルファ版で Numen Games に与えられた権限で見て、操作します。すべて記録に残ります。',
      ownerStrip: 'あなたはオーナーです。運営が持つ権限以外はすべてできます。',
      rolesTitle: 'ロール',
      membersTitle: 'メンバー',
      logTitle: '記録',
      holders: '{n} 人',
      base: '基本ロール：全員が持っています',
      apart: '別枠で表示',
      owner: 'オーナー',
      you: 'あなた',
      noRoles: 'このロールを持つ人はまだいません。',
      edit: '編集',
      moveUp: '上へ',
      moveDown: '下へ',
      remove: '削除',
      confirmRemove: 'ロール「{name}」を削除しますか？持っている人はそれを失います。',
      confirm: '削除する',
      cancel: 'キャンセル',
      newRole: '新しいロール',
      name: '名前',
      color: '色',
      noColor: '色なし',
      showApart: 'メンバー一覧で別枠に表示する',
      permissions: 'できること',
      create: 'ロールを作成',
      save: '保存',
      signatureNote:
        '「管理者」や「ロールの管理」を付与するときは、その場でウォレットによる署名が必要です。',
      signing: 'ウォレットがこの変更への署名を求めています…',
      noWallet:
        'このブラウザはあなたのウォレットを覚えていません。いったんログアウトし、同じウォレットで入り直してから、もう一度変更してください。',
      otherWallet:
        '接続中のウォレットはセッションのものではありません。同じウォレットで入り直して、もう一度変更してください。',
      declined: '署名されなかったため、何も変更されていません。',
      give: '付与',
      giveLabel: '{who} に付与するロール',
      take: '{who} からロール {role} を外す',
      noRolesYet: '基本ロール以外のロールはありません。',
      working: '保存中…',
      showLog: '記録を見る',
      hideLog: '記録を隠す',
      logEmpty: 'まだ記録された変更はありません。',
      logAct: {
        'organization-created': '組織を作成',
        'organization-renamed': '組織名を変更',
        'member-added': 'メンバーを追加',
        'member-removed': 'メンバーを削除',
        'member-left': 'メンバーが退出',
        'role-given': 'ロールを付与',
        'role-taken': 'ロールを外した',
        'topup-started': 'チャージを開始',
        'house-read': '運営が確認',
        'role-created': 'ロールを作成',
        'role-edited': 'ロールを編集',
        'role-moved': 'ロールを移動',
        'role-deleted': 'ロールを削除',
        'settings-changed': 'コミュニティの設定を変更',
      },
    },
    referrals: {
      title: '紹介',
      soon: '近日公開',
      text: 'ここでNuminiaに人を招待し、それによって得られる残高を確認できるようになります。まだ準備中です。完成したら「アップデート」でお知らせします。',
    },
    vuelta: {
      title: 'チャージ',
      checking: '支払いを確認しています…',
      done: 'チャージ完了 · このタブは閉じて大丈夫です',
      balanceNow: '現在の残高：{b}',
      processing: 'まだ処理中です',
      processingNote: 'Stripeからの確認がまだです。数秒後にもう一度確認します。',
      cancelled: 'キャンセルされました',
      cancelledNote: '請求は発生していません。このタブは閉じて大丈夫です。',
      unknown: 'このチャージはあなたのアカウントに見つかりません。',
      back: '残高へ',
    },
  },
  ko: {
    nav: '잔액',
    title: '잔액',
    lead: '내 계정과 내가 속한 조직의 잔액. 만료되지 않으며, 원할 때 충전하고 어디에 쓰였는지 볼 수 있습니다.',
    tabs: {
      label: '잔액 섹션',
      saldo: '잔액',
      members: '구성원과 역할',
      referrals: '추천',
    },
    signedOut: {
      title: '로그인하고 잔액 보기',
      text: '내 잔액과 조직의 잔액은 계정에 연결되어 있습니다. 로그인하면 여기에서 볼 수 있습니다.',
      cta: '로그인',
    },
    loading: '잔액을 불러오는 중…',
    notBound: '이 사이트는 아직 계산대에 연결되지 않았습니다. 나중에 다시 시도해 주세요.',
    failed: '계산대가 응답하지 않았습니다.',
    retry: '다시 시도',
    switcher: {
      label: '계정',
      personal: '내 계정',
      newTeam: '새 조직',
      newTeamName: '조직 이름',
      newTeamNote: '조직은 자체 잔액을 가지며, 내가 관리자가 됩니다.',
      create: '만들기',
      cancel: '취소',
      nameInvalid: '1~60자의 이름을 입력해 주세요.',
    },
    roles: { owner: '명의자', admin: '관리자', member: '멤버' },
    balance: {
      label: '잔액 · 만료 없음',
      low: '잔액 부족',
      lowNote: '10유로 미만 남았습니다. 거점을 계속 열어 두려면 충전하세요.',
      spent: '이번 기간 사용액',
      spentOf: '최근 {range}',
    },
    kpis: {
      runway: '최근 7일의 속도라면 약 {n}일 동안 쓸 수 있습니다.',
      runwayOne: '최근 7일의 속도라면 하루 동안 쓸 수 있습니다.',
      runwayLess: '최근 7일의 속도라면 하루도 채 남지 않았습니다.',
      runwayStill: '요즘은 사용한 금액이 없어 잔액이 줄지 않습니다.',
      month: '이번 달',
      monthWorlds: '요금이 나간 거점 {n}곳',
      monthWorldsOne: '요금이 나간 거점 1곳',
      monthWorldsNone: '요금이 나간 거점이 없습니다',
      low: '잔액 부족 알림',
      lowWhen: '잔액이 10유로 아래로 내려가면 이 화면에서 알려 드립니다.',
      lowKeep: '잔액이 0이 되면 거점은 꺼지고 {n}일 동안 보관됩니다.',
    },
    topup: {
      title: '충전',
      note: '추가할 금액을 고르세요. 결제는 다른 탭의 Stripe에서 합니다.',
      seller:
        '충전은 Link(Stripe)가 판매하며, 영수증도 Link가 보냅니다. 은행 명세서에는 「LINK.COM* NUMEN GAMES」로 표시됩니다.',
      amounts: '충전 금액',
      pay: 'Stripe로 결제',
      opening: 'Stripe 여는 중…',
      opened: '다른 탭에서 Stripe가 열렸습니다',
      openedNote: '결제를 마치면 여기로 돌아오세요. 잔액은 자동으로 갱신됩니다.',
      blocked: '브라우저가 탭 열기를 막았습니다.',
      openLink: 'Stripe 열기',
      notConfigured: '결제가 아직 켜지지 않았습니다. 나중에 다시 시도해 주세요.',
    },
    usage: {
      title: '사용량',
      ranges: { '7d': '7일', '30d': '30일', '12m': '12개월' },
      rangeLabel: '기간',
      empty: '이 기간에는 사용한 금액이 없습니다. 잔액을 쓴 거점이 없습니다.',
      chartDays: '일별 사용액: 합계 {total}',
      chartMonths: '월별 사용액: 합계 {total}',
      headDays: '하루씩, 최근 {n}일',
      headMonths: '한 달씩, 최근 12개월',
      closes: '하루는 UTC 자정에 마감됩니다.',
      running: '켜진 거점',
      stopped: '꺼짐',
      bar: '{when} · {total} — 켜짐 {running} · 꺼짐 {stopped}',
      worlds: '기간 중 거점별',
      world: '거점',
      size: '크기',
      daysRunning: '켜진 날',
      amount: '기간 금액',
    },
    lines: {
      title: '거래 내역',
      head: '모든 내역',
      never: '내역은 지워지지 않습니다. 바로잡을 것이 있으면 새 내역이 추가됩니다.',
      csv: '다운로드(.csv)',
      empty: '이 계정에는 아직 거래 내역이 없습니다.',
      day: '날짜(UTC)',
      what: '내용',
      detail: '세부',
      amount: '금액',
      after: '잔액',
      afterNote:
        '각 내역의 잔액은 오늘 잔액에서 최근 100건을 거슬러 올라가며 계산합니다. 그 범위 안에서는 정확합니다.',
      labels: { topup: '충전', world: '거점의 하루', adjustment: '조정', refund: '환불' },
      vat: 'VAT {v}',
      world: '{world} · {size}',
      minutes: '켜짐 {on} · 꺼짐 {off}',
      hours: '{h}시간',
      hoursMinutes: '{h}시간 {m}분',
    },
    rules: {
      label: '한눈에 보는 규칙',
      title: '요금과 그 이유',
      size: '{size} 거점: 켜져 있으면 하루 {running}, 꺼져 있으면 {stopped}.',
      topups: '충전은 10·50·100유로. 구독은 없으며 쓴 만큼만 냅니다.',
      keep: '잔액이 0이 되면 거점은 꺼지고 {n}일 동안 보관됩니다.',
      notice: '요금이 오를 때는 공지 후 {n}일이 지나야 인상이 시작됩니다.',
      personal: '내 개인 계정입니다. 충전하고 이 내역을 보는 사람은 나뿐입니다.',
      whoTopsUp: '명의자와 다음 역할이 충전할 수 있습니다: {roles}.',
      whoTopsUpOwners: '명의자만 충전할 수 있습니다.',
      everyone: '이 조직의 멤버라면 누구나 충전할 수 있습니다.',
      since: '{date}부터 적용 중인 요금입니다.',
    },
    membersLink: {
      text: '이 조직에 누가 있고 역할마다 무엇을 할 수 있는지는 {link}에 있습니다.',
      link: '멤버와 역할',
    },
    team: {
      title: '팀',
      rename: '이름 바꾸기',
      renameLabel: '조직 이름',
      save: '저장',
      members: '멤버',
      wallet: '지갑',
      role: '역할',
      since: '참여일',
      you: '나',
      add: '추가',
      addLabel: '상대의 지갑 (0x…)',
      walletInvalid: '전체 지갑 주소를 입력해 주세요: 0x와 40자.',
      makeAdmin: '관리자로 지정',
      makeMember: '멤버로 지정',
      remove: '내보내기',
      actionOn: '{action}: {who}',
      leave: '나가기',
      perMember: '멤버별 사용량',
      perMemberEmpty: '모든 월드에 주인이 정해지면 여기에서 각자 얼마나 쓰는지 볼 수 있습니다.',
    },
    problems: {
      notMember: '이 조직의 멤버가 아닙니다.',
      lastOwner: '조직에는 소유자가 한 명 이상 있어야 합니다.',
      ownRoles: '자신의 역할은 바꿀 수 없습니다. 나갈 수만 있습니다.',
      notBelow: '자신의 가장 높은 역할보다 낮은 역할과 멤버에게만 할 수 있습니다.',
      ownerOnly: '소유자를 지정하거나 내보낼 수 있는 사람은 소유자뿐입니다.',
      noAdminRole: '이 조직에는 관리 권한을 가진 역할이 아직 없습니다.',
      baseRole: '모두가 기본 역할을 가지고 있습니다. 주거나 뺏을 수 없습니다.',
      grantExceeds: '자신이 가진 권한만 주거나 뺏을 수 있습니다.',
      roleLimit: '이 조직에는 더 이상 역할을 만들 수 없습니다.',
      ownersOnly: '조직의 소유자만 할 수 있습니다.',
      alpha: '알파 기간에는 어떤 조직도 하우스의 접근을 바꿀 수 없습니다.',
      meanwhile: '그사이 조직이 바뀌었습니다. 다시 확인하고 시도해 주세요.',
      needs: '“{act}” 권한이 필요합니다. 소유자와 다음 역할이 가지고 있습니다: {holders}.',
      needsOwners: '“{act}” 권한이 필요합니다. 소유자만 가지고 있습니다.',
      freshSignature:
        "'관리자'나 '역할 관리'를 부여하려면 지갑의 새 서명이 필요한데, 도착하지 않았습니다. 아무것도 바뀌지 않았습니다.",
      signatureExpired: '서명이 만료되었습니다(유효 시간 2분). 다시 시도해 주세요.',
      signatureMismatch:
        '서명이 이 변경에 대한 것이 아니거나 당신의 지갑 서명이 아닙니다. 아무것도 바뀌지 않았습니다.',
      other: '계산대가 허용하지 않았습니다.',
    },
    panel: {
      title: '구성원과 역할',
      lead: '조직에 누가 있는지, 각 역할로 무엇을 할 수 있는지 보여 줍니다. 모든 변경은 기록에 남습니다.',
      noOrganization:
        '아직 어떤 조직에도 속해 있지 않습니다. 잔액에서 조직을 만들면 여기서 역할을 나눌 수 있습니다.',
      organization: '조직',
      house:
        '운영진으로 들어왔습니다. 알파 단계에서 Numen Games에 주어진 권한으로 보고 행동합니다. 모든 단계가 기록에 남습니다.',
      ownerStrip: '당신은 소유자입니다. 운영진이 보유한 것 외에는 모두 할 수 있습니다.',
      rolesTitle: '역할',
      membersTitle: '사람',
      logTitle: '기록',
      holders: '{n}명',
      base: '기본 역할: 모두가 가지고 있습니다',
      apart: '따로 표시',
      owner: '소유자',
      you: '나',
      noRoles: '이 역할을 가진 사람이 아직 없습니다.',
      edit: '편집',
      moveUp: '위로',
      moveDown: '아래로',
      remove: '삭제',
      confirmRemove: '역할 «{name}»을(를) 삭제할까요? 이 역할을 가진 사람은 역할을 잃습니다.',
      confirm: '삭제',
      cancel: '취소',
      newRole: '새 역할',
      name: '이름',
      color: '색',
      noColor: '색 없음',
      showApart: '사람 목록에서 따로 표시',
      permissions: '할 수 있는 일',
      create: '역할 만들기',
      save: '저장',
      signatureNote: "'관리자'나 '역할 관리'를 부여할 때는 그 자리에서 지갑으로 서명해야 합니다.",
      signing: '지갑이 이 변경에 서명을 요청합니다…',
      noWallet:
        '이 브라우저가 지갑을 기억하지 못합니다. 로그아웃한 뒤 같은 지갑으로 다시 들어와 변경을 다시 해 주세요.',
      otherWallet:
        '연결된 지갑이 세션의 지갑이 아닙니다. 같은 지갑으로 들어와 변경을 다시 해 주세요.',
      declined: '서명하지 않아 아무것도 바뀌지 않았습니다.',
      give: '부여',
      giveLabel: '{who}에게 부여할 역할',
      take: '{who}에게서 역할 {role} 빼기',
      noRolesYet: '기본 역할 외에 다른 역할이 없습니다.',
      working: '저장 중…',
      showLog: '기록 보기',
      hideLog: '기록 숨기기',
      logEmpty: '아직 기록된 변경이 없습니다.',
      logAct: {
        'organization-created': '조직 생성',
        'organization-renamed': '조직 이름 변경',
        'member-added': '사람 추가',
        'member-removed': '사람 제거',
        'member-left': '사람이 나감',
        'role-given': '역할 부여',
        'role-taken': '역할 회수',
        'topup-started': '충전 시작',
        'house-read': '운영진이 확인',
        'role-created': '역할 생성',
        'role-edited': '역할 편집',
        'role-moved': '역할 이동',
        'role-deleted': '역할 삭제',
        'settings-changed': '커뮤니티 설정 변경',
      },
    },
    referrals: {
      title: '추천',
      soon: '곧 공개',
      text: '여기에서 다른 사람을 Numinia에 초대하고 그로 인해 받는 잔액을 확인할 수 있게 됩니다. 아직 준비 중이며, 준비되면 업데이트에서 알려 드립니다.',
    },
    vuelta: {
      title: '충전',
      checking: '결제를 확인하는 중…',
      done: '충전 완료 · 이 탭은 닫아도 됩니다',
      balanceNow: '현재 잔액: {b}',
      processing: '아직 처리 중입니다',
      processingNote: 'Stripe가 아직 확인하지 않았습니다. 몇 초 뒤에 다시 확인합니다.',
      cancelled: '취소됨',
      cancelledNote: '청구된 금액은 없습니다. 이 탭은 닫아도 됩니다.',
      unknown: '이 충전을 내 계정에서 찾을 수 없습니다.',
      back: '잔액으로',
    },
  },
  'pt-br': {
    nav: 'Saldo',
    title: 'Saldo',
    lead: 'Sua conta e a das suas organizações: o saldo não expira, você recarrega quando quiser e vê no que ele é gasto.',
    tabs: {
      label: 'Seções do Saldo',
      saldo: 'Saldo',
      members: 'Membros e papéis',
      referrals: 'Indicações',
    },
    signedOut: {
      title: 'Entre para ver seu saldo',
      text: 'Seu saldo e o das suas organizações ficam na sua conta. Entre e você os verá aqui.',
      cta: 'Entrar',
    },
    loading: 'Lendo seu saldo…',
    notBound: 'O caixa ainda não está conectado a este site. Tente de novo mais tarde.',
    failed: 'O caixa não respondeu.',
    retry: 'Tentar de novo',
    switcher: {
      label: 'Conta',
      personal: 'Sua conta',
      newTeam: 'Nova organização',
      newTeamName: 'Nome da organização',
      newTeamNote: 'Ela terá seu próprio saldo, e você será quem a administra.',
      create: 'Criar',
      cancel: 'Cancelar',
      nameInvalid: 'Escreva um nome de 1 a 60 caracteres.',
    },
    roles: { owner: 'Titular', admin: 'Admin', member: 'Membro' },
    balance: {
      label: 'Saldo · não expira',
      low: 'Saldo baixo',
      lowNote: 'Restam menos de 10\u00a0€. Recarregue para manter suas sedes abertas.',
      spent: 'Gasto neste período',
      spentOf: 'nos últimos {range}',
    },
    kpis: {
      runway: 'Dá para uns {n} dias no ritmo dos últimos 7 dias.',
      runwayOne: 'Dá para um dia no ritmo dos últimos 7 dias.',
      runwayLess: 'Dá para menos de um dia no ritmo dos últimos 7 dias.',
      runwayStill: 'Sem gasto nestes dias: o saldo não baixa.',
      month: 'Este mês',
      monthWorlds: '{n} sedes com cobrança',
      monthWorldsOne: '1 sede com cobrança',
      monthWorldsNone: 'Nenhuma sede com cobrança',
      low: 'Aviso de saldo baixo',
      lowWhen: 'Esta tela avisa quando o saldo fica abaixo de 10\u00a0€.',
      lowKeep: 'Com o saldo em zero, as sedes se desligam e ficam guardadas por {n} dias.',
    },
    topup: {
      title: 'Recarga',
      note: 'Escolha quanto adicionar. O pagamento é feito no Stripe, em outra aba.',
      seller:
        'A recarga é vendida pela Link (Stripe), que lhe envia a fatura. No extrato bancário aparecerá como LINK.COM* NUMEN GAMES.',
      amounts: 'Valor da recarga',
      pay: 'Pagar com Stripe',
      opening: 'Abrindo o Stripe…',
      opened: 'O Stripe foi aberto em outra aba',
      openedNote: 'Quando terminar, volte aqui: o saldo se atualiza sozinho.',
      blocked: 'Seu navegador não deixou abrir a aba.',
      openLink: 'Abrir o Stripe',
      notConfigured: 'Os pagamentos ainda não estão ativados. Tente de novo mais tarde.',
    },
    usage: {
      title: 'Consumo',
      ranges: { '7d': '7 dias', '30d': '30 dias', '12m': '12 meses' },
      rangeLabel: 'Período',
      empty: 'Nada foi gasto neste período: nenhuma sede consumiu saldo.',
      chartDays: 'Gasto por dia: {total} no total',
      chartMonths: 'Gasto por mês: {total} no total',
      headDays: 'Cada dia, os últimos {n}',
      headMonths: 'Cada mês, os últimos 12',
      closes: 'Cada dia fecha à meia-noite UTC.',
      running: 'Sede ligada',
      stopped: 'Desligada',
      bar: '{when} · {total} — ligada {running} · desligada {stopped}',
      worlds: 'Cada sede no período',
      world: 'Sede',
      size: 'Tamanho',
      daysRunning: 'Dias ligada',
      amount: 'Valor do período',
    },
    lines: {
      title: 'Movimentos',
      head: 'Cada linha',
      never: 'As linhas nunca são apagadas: se algo é corrigido, entra outra linha.',
      csv: 'Baixar (.csv)',
      empty: 'Ainda não há movimentos nesta conta.',
      day: 'Dia (UTC)',
      what: 'O quê',
      detail: 'Detalhe',
      amount: 'Valor',
      after: 'Saldo',
      afterNote:
        'O saldo de cada linha é contado de trás para a frente a partir do de hoje, sobre as 100 linhas mais recentes: para elas é exato.',
      labels: {
        topup: 'Recarga',
        world: 'Dia de sede',
        adjustment: 'Ajuste',
        refund: 'Devolução',
      },
      vat: 'IVA {v}',
      world: '{world} · {size}',
      minutes: 'ligada {on} · desligada {off}',
      hours: '{h} h',
      hoursMinutes: '{h} h {m} min',
    },
    rules: {
      label: 'As regras, à vista',
      title: 'O que custa e por quê',
      size: 'Uma sede de {size}: {running} por dia ligada e {stopped} desligada.',
      topups: 'Recargas de 10, 50 ou 100 €. Sem assinatura: você paga o que gasta.',
      keep: 'Com o saldo em zero, a sede se desliga e fica guardada por {n} dias.',
      notice: 'Se a tarifa subir, o aumento só começa {n} dias depois de anunciado.',
      personal: 'É a sua conta pessoal: só você recarrega e vê estes dados.',
      whoTopsUp: 'Recarregam as pessoas titulares e estes papéis: {roles}.',
      whoTopsUpOwners: 'Só as pessoas titulares recarregam.',
      everyone: 'Recarregam todos os membros da organização.',
      since: 'Tarifa em vigor desde {date}.',
    },
    membersLink: {
      text: 'Quem está nesta organização e o que cada papel permite, em {link}.',
      link: 'Membros e papéis',
    },
    team: {
      title: 'Equipe',
      rename: 'Mudar nome',
      renameLabel: 'Nome da organização',
      save: 'Salvar',
      members: 'Membros',
      wallet: 'Carteira',
      role: 'Papel',
      since: 'Desde',
      you: 'você',
      add: 'Adicionar',
      addLabel: 'Carteira da pessoa (0x…)',
      walletInvalid: 'Escreva uma carteira completa: 0x e 40 caracteres.',
      makeAdmin: 'Tornar admin',
      makeMember: 'Tornar membro',
      remove: 'Remover',
      actionOn: '{action}: {who}',
      leave: 'Sair',
      perMember: 'Consumo por membro',
      perMemberEmpty: 'Quando cada mundo tiver dono, vocês verão aqui quanto cada um gasta.',
    },
    problems: {
      notMember: 'Você não é membro desta organização.',
      lastOwner: 'Uma organização precisa de pelo menos uma pessoa titular.',
      ownRoles: 'Você não pode mudar seus próprios cargos: só pode sair da organização.',
      notBelow: 'Você só pode agir sobre cargos e pessoas abaixo do seu cargo mais alto.',
      ownerOnly: 'Só uma pessoa titular pode nomear ou remover outra titular.',
      noAdminRole: 'Esta organização ainda não tem nenhum cargo com a permissão de administrar.',
      baseRole: 'Todo mundo tem o cargo de base: ele não se dá nem se tira.',
      grantExceeds: 'Você só pode dar ou tirar as permissões que você mesmo tem.',
      roleLimit: 'Esta organização não comporta mais cargos.',
      ownersOnly: 'Isto só as pessoas titulares da organização fazem.',
      alpha: 'Durante a alfa, nenhuma organização muda o acesso da casa.',
      meanwhile: 'A organização mudou enquanto isso. Veja de novo e tente outra vez.',
      needs:
        'Para fazer isso é preciso a permissão «{act}», que as pessoas titulares têm, e estes cargos: {holders}.',
      needsOwners:
        'Para fazer isso é preciso a permissão «{act}», que só as pessoas titulares têm.',
      freshSignature:
        'Dar «Administrador» ou «Gerenciar papéis» precisa de uma nova assinatura da sua carteira, e ela não chegou. Nada mudou.',
      signatureExpired: 'A assinatura expirou: ela vale dois minutos. Tente de novo.',
      signatureMismatch:
        'A assinatura não corresponde a esta mudança ou não é da sua carteira. Nada mudou.',
      other: 'O caixa não permitiu.',
    },
    panel: {
      title: 'Membros e papéis',
      lead: 'Quem está na organização e o que cada papel permite. Toda mudança fica escrita no registro.',
      noOrganization:
        'Você ainda não está em nenhuma organização. Crie uma em Saldo e aqui você poderá distribuir papéis.',
      organization: 'Organização',
      house:
        'Você entra como a casa: vê e age com a permissão que a alfa dá à Numen Games. Cada passo fica no registro.',
      ownerStrip: 'Você é titular: pode tudo, menos o que a casa reserva.',
      rolesTitle: 'Papéis',
      membersTitle: 'Pessoas',
      logTitle: 'Registro',
      holders: '{n} pessoas',
      base: 'Papel de base: todo mundo tem',
      apart: 'Aparece à parte',
      owner: 'Titular',
      you: 'você',
      noRoles: 'Ninguém tem este papel ainda.',
      edit: 'Editar',
      moveUp: 'Subir',
      moveDown: 'Descer',
      remove: 'Apagar',
      confirmRemove: 'Apagar o papel «{name}»? Quem o tem o perde.',
      confirm: 'Sim, apagar',
      cancel: 'Cancelar',
      newRole: 'Novo papel',
      name: 'Nome',
      color: 'Cor',
      noColor: 'Sem cor',
      showApart: 'Mostrar à parte na lista de pessoas',
      permissions: 'O que permite',
      create: 'Criar papel',
      save: 'Salvar',
      signatureNote:
        'Dar «Administrador» ou «Gerenciar papéis» pede que você assine com sua carteira nesse momento.',
      signing: 'Sua carteira pede que você assine esta mudança…',
      noWallet:
        'Este navegador não lembra sua carteira. Saia, entre de novo com ela e repita a mudança.',
      otherWallet:
        'A carteira conectada não é a da sua sessão. Entre com a mesma carteira e repita a mudança.',
      declined: 'Você não assinou, então nada mudou.',
      give: 'Dar',
      giveLabel: 'Papel a dar a {who}',
      take: 'Tirar o papel {role} de {who}',
      noRolesYet: 'Sem outros papéis além do de base.',
      working: 'Salvando…',
      showLog: 'Ver o registro',
      hideLog: 'Ocultar o registro',
      logEmpty: 'Ainda não há mudanças escritas.',
      logAct: {
        'organization-created': 'Organização criada',
        'organization-renamed': 'Organização renomeada',
        'member-added': 'Pessoa adicionada',
        'member-removed': 'Pessoa removida',
        'member-left': 'Pessoa que saiu',
        'role-given': 'Papel dado',
        'role-taken': 'Papel retirado',
        'topup-started': 'Recarga iniciada',
        'house-read': 'A casa olhou',
        'role-created': 'Papel criado',
        'role-edited': 'Papel editado',
        'role-moved': 'Papel movido',
        'role-deleted': 'Papel apagado',
        'settings-changed': 'Ajustes da comunidade alterados',
      },
    },
    referrals: {
      title: 'Indicações',
      soon: 'Em breve',
      text: 'Aqui você poderá convidar pessoas para a Numinia e ver o saldo que vocês ganham com isso. Ainda não está pronto: quando estiver, avisaremos em Novidades.',
    },
    vuelta: {
      title: 'Recarga',
      checking: 'Verificando o pagamento…',
      done: 'Recarga feita · você já pode fechar esta aba',
      balanceNow: 'Saldo agora: {b}',
      processing: 'Ainda em processamento',
      processingNote: 'O Stripe ainda não confirmou. Vamos olhar de novo em alguns segundos.',
      cancelled: 'Cancelada',
      cancelledNote: 'Nada foi cobrado. Você pode fechar esta aba.',
      unknown: 'Não encontramos esta recarga na sua conta.',
      back: 'Ir para o Saldo',
    },
  },
};
