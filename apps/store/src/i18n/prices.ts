/**
 * The price room's words (LAP › Prices), five locales. The room's frame
 * (title, intro, refusal) stays in lap.ts with the rest of the LAP; these
 * are the room's own: the tariff in force, the calculator, the example
 * fleet, the market, the rules, publishing and the history. `{name}`
 * placeholders are filled by `fill()` in lib/prices.ts.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { RuleKey, VersionState } from '../lib/prices';

export interface PricesRoomMessages {
  readonly loading: string;
  /** No desk is bound to this site (503 not-bound). */
  readonly notBound: string;
  readonly notBoundNote: string;
  /** The desk failed or did not answer (502, or no answer at all). */
  readonly failed: string;
  readonly retry: string;
  /** Each catalog size's name. */
  readonly sizeNames: Readonly<Record<string, string>>;
  /** People at once: `{n}`. */
  readonly people: string;
  /** The seed's 2 GB size, whose people were never measured. */
  readonly exampleSize: string;
  /** A size the catalog does not know: `{k}` its name in the till. */
  readonly otherSize: string;
  readonly otherSizeNote: string;
  /** Who published the seed. */
  readonly seed: string;
  readonly inForce: {
    readonly title: string;
    /** `{n}` version, `{d}` its first day. */
    readonly heading: string;
    /** `{who}`: a short wallet, or the seed. */
    readonly by: string;
    readonly noNote: string;
    readonly none: string;
    readonly size: string;
    readonly running: string;
    readonly stopped: string;
    readonly month: string;
    /** `{v}`: the price with VAT. */
    readonly withVat: string;
    /** `{n}` version, `{d}` its first day. */
    readonly scheduled: string;
    readonly vatNote: string;
  };
  readonly calculator: {
    readonly title: string;
    /** `{d}`: the day the figures were read. */
    readonly intro: string;
    readonly machine: string;
    /** `{m}` machine, `{c}` cores, `{r}` GB of RAM, `{e}` euros a month. */
    readonly machineOption: string;
    readonly occupancy: string;
    readonly cpu: string;
    readonly copies: string;
    readonly copiesFull: string;
    readonly copiesIncremental: string;
    readonly topup: string;
    readonly seller: string;
    readonly sellerStripe: string;
    readonly sellerNumen: string;
    readonly hour: string;
    readonly support: string;
    readonly supportMedium: string;
    readonly supportLarge: string;
    readonly note: string;
  };
  /** One size's card in the calculator. */
  readonly card: {
    /** `{f}` GB of files, `{r}` GB reserved, `{c}` cores. */
    readonly specs: string;
    readonly running: string;
    readonly stopped: string;
    /** For screen readers: `{name}` the size. */
    readonly runningOf: string;
    readonly stoppedOf: string;
    readonly month: string;
    readonly consumer: string;
    /** `{d}` a day, `{m}` a month. */
    readonly consumerValue: string;
    /** `{a}` the top-up, `{n}` days. */
    readonly lasts: string;
    readonly lastsFree: string;
    readonly cost: string;
    /** `{c}` the cost a day. */
    readonly costValue: string;
    /** `{n}` worlds per machine. */
    readonly machine: string;
    readonly machineNone: string;
    readonly copies: string;
    readonly support: string;
    readonly stripe: string;
    readonly margin: string;
    readonly marginReached: string;
    readonly marginShort: string;
    readonly inTariff: string;
    readonly inUse: string;
    readonly out: string;
    readonly noModel: string;
    readonly badAmount: string;
    readonly empty: string;
  };
  readonly fleet: {
    readonly title: string;
    readonly intro: string;
    readonly size: string;
    readonly worlds: string;
    readonly running: string;
    readonly revenue: string;
    /** `{name}` the size, `{n}` people at once. */
    readonly sizeLine: string;
    readonly notPriced: string;
    /** For screen readers: `{name}` the size. */
    readonly worldsOf: string;
    readonly runningOf: string;
    readonly fixed: string;
    readonly extras: string;
    readonly extrasHint: string;
    readonly revenueLine: string;
    /** `{n}` machines, `{m}` the machine. */
    readonly machines: string;
    readonly machinesNone: string;
    readonly copies: string;
    readonly support: string;
    readonly stripe: string;
    readonly fixedLine: string;
    readonly extrasLine: string;
    readonly profit: string;
    readonly note: string;
  };
  readonly market: {
    readonly title: string;
    /** `{d}`: the day the market was read. */
    readonly intro: string;
    readonly who: string;
    readonly month: string;
    /** `{name}` the size, `{n}` people at once. */
    readonly ours: string;
    readonly offers: Readonly<Record<string, string>>;
  };
  readonly rules: {
    readonly title: string;
    readonly intro: string;
    readonly items: Readonly<Record<RuleKey, { readonly label: string; readonly meaning: string }>>;
    readonly bad: string;
  };
  readonly publish: {
    readonly title: string;
    readonly startsOn: string;
    /** `{t}`: when the UTC day begins on the reader's clock. */
    readonly utc: string;
    readonly note: string;
    readonly notePlaceholder: string;
    readonly button: string;
    readonly checking: string;
    /** `{n}` the version replaced. */
    readonly replaces: string;
    readonly first: string;
    /** `{n}` days of notice, `{d}` the first day allowed. */
    readonly rise: string;
    /** `{d}` the first day allowed. */
    readonly riseMove: string;
    /** `{n}` days of notice. */
    readonly riseReady: string;
    readonly nothing: string;
    readonly fixFirst: string;
    readonly checkFailed: string;
    readonly reload: string;
    /** The till's problems in the room's words; `other` quotes the till: `{t}`. */
    readonly problems: {
      readonly notice: string;
      readonly tomorrow: string;
      readonly inUse: string;
      readonly basis: string;
      readonly by: string;
      readonly meanwhile: string;
      readonly other: string;
    };
  };
  readonly dialog: {
    /** `{n}` the new version. */
    readonly title: string;
    readonly intro: string;
    readonly sizes: string;
    readonly size: string;
    readonly before: string;
    readonly after: string;
    /** `{r}` running, `{s}` stopped. */
    readonly prices: string;
    readonly vat: string;
    readonly added: string;
    readonly removed: string;
    readonly noSizes: string;
    readonly rules: string;
    readonly noRules: string;
    /** `{d}` the day, `{t}` when it begins on the reader's clock. */
    readonly starts: string;
    readonly note: string;
    readonly noNote: string;
    readonly mail: string;
    readonly confirm: string;
    readonly cancel: string;
    readonly publishing: string;
    readonly refused: string;
    readonly failed: string;
    readonly close: string;
  };
  /** `{n}` the version, `{d}` its first day. */
  readonly published: string;
  readonly publishedClose: string;
  readonly history: {
    readonly title: string;
    /** `{n}` version, `{d}` its first day. */
    readonly heading: string;
    readonly states: Readonly<Record<VersionState, string>>;
    /** `{who}` who published it, `{t}` when, on the reader's clock. */
    readonly by: string;
    readonly noNote: string;
    readonly load: string;
    /** `{n}` the version. */
    readonly loaded: string;
    readonly empty: string;
    /** One size in a version's line: `{name}`, `{r}` running, `{s}` stopped. */
    readonly price: string;
  };
}

const ES: PricesRoomMessages = {
  loading: 'Leyendo la caja…',
  notBound: 'La caja no está conectada a esta web.',
  notBoundNote:
    'Esta web habla con la caja por un enlace interno de Cloudflare. Mientras ese enlace no exista, no hay tarifa que leer ni que publicar.',
  failed: 'La caja no ha respondido.',
  retry: 'Reintentar',
  sizeNames: { small: 'Pequeño', medium: 'Mediano', large: 'Grande', '2g': '2 GB' },
  people: 'hasta {n} personas a la vez',
  exampleSize: 'tamaño de ejemplo de la primera tarifa · personas sin medir',
  otherSize: 'Tamaño «{k}»',
  otherSizeNote: 'no está en el catálogo',
  seed: 'la caja al nacer',
  inForce: {
    title: 'En vigor',
    heading: 'Versión {n} · desde el {d}',
    by: 'Publicada por {who}.',
    noNote: 'Sin nota.',
    none: 'Aún no hay ninguna versión en vigor.',
    size: 'Tamaño',
    running: 'Encendido al día',
    stopped: 'Parado al día',
    month: 'Un mes encendido',
    withVat: 'con IVA {v}',
    scheduled: 'Programada: versión {n} desde el {d}.',
    vatNote: 'Precios sin IVA; «con IVA» incluye el 21 %.',
  },
  calculator: {
    title: 'Calculadora',
    intro:
      'Precios sin IVA salvo donde pone «con IVA». Costes de OVH, AWS y Stripe consultados el {d}. Los precios de cada tamaño son el borrador que se publica; el resto son supuestos para ver el margen.',
    machine: 'Máquina',
    machineOption: '{m} · {c} núcleos · {r} GB · {e}/mes',
    occupancy: 'Ocupación de las máquinas',
    cpu: 'Procesador prometido',
    copies: 'Copias de cada noche',
    copiesFull: 'Zip completo (hoy)',
    copiesIncremental: 'Incrementales',
    topup: 'Recarga media',
    seller: 'Quién vende',
    sellerStripe: 'Stripe (Managed Payments)',
    sellerNumen: 'Nosotros, con Stripe',
    hour: 'Hora del equipo (€)',
    support: 'Soporte al mes, mediano / grande (min)',
    supportMedium: 'Minutos de soporte al mes de un mundo mediano',
    supportLarge: 'Minutos de soporte al mes de un mundo grande',
    note: 'Ocupación: qué parte del sitio de las máquinas está vendido. «Procesador prometido ×2»: la máquina reparte el doble de procesador del que tiene, porque los mundos rara vez se llenan a la vez; en ×1, todos podrían estar llenos a la vez. Margen bruto antes de sueldos fijos e impuestos, con el soporte dentro; marcado cuando llega al 60 %.',
  },
  card: {
    specs: '{f} GB de archivos · {r} GB reservados · {c} núcleo',
    running: 'Encendido, €/día',
    stopped: 'Parado, €/día',
    runningOf: '{name}: encendido, euros al día sin IVA',
    stoppedOf: '{name}: parado, euros al día sin IVA',
    month: 'Al mes encendido',
    consumer: 'Particular, con IVA',
    consumerValue: '{d}/día · {m}/mes',
    lasts: '{a} de recarga duran {n} días encendido',
    lastsFree: 'Encendido no gasta saldo',
    cost: 'Nos cuesta',
    costValue: '{c}/día',
    machine: 'máquina ({n} por máquina)',
    machineNone: 'máquina (no cabe en esta)',
    copies: 'copias',
    support: 'soporte',
    stripe: 'Stripe',
    margin: 'Margen bruto',
    marginReached: 'llega al 60 %',
    marginShort: 'por debajo del 60 %',
    inTariff: 'En la tarifa',
    inUse: 'Hay mundos que pagan este tamaño: no se puede quitar de la tarifa.',
    out: 'Fuera de la tarifa: no se publica.',
    noModel: 'Sin datos de consumo: no se puede calcular lo que cuesta.',
    badAmount: 'Escribe euros con dos decimales como mucho, por ejemplo 0,20.',
    empty: 'La tarifa necesita al menos un tamaño.',
  },
  fleet: {
    title: 'Beneficio al mes con una flota de ejemplo',
    intro:
      'Cambia cuántos mundos hay de cada tamaño y qué parte del mes pasan encendidos. Las máquinas se cuentan con la ocupación de arriba.',
    size: 'Tamaño',
    worlds: 'Mundos',
    running: '% del mes encendido',
    revenue: 'Ingresos al mes',
    sizeLine: '{name} · hasta {n}',
    notPriced: 'fuera de la tarifa',
    worldsOf: 'Mundos de tamaño {name}',
    runningOf: 'Parte del mes que pasan encendidos los mundos de tamaño {name}, en %',
    fixed: 'Gastos fijos al mes (€)',
    extras: 'Voz, vídeo e IA (€ al mes)',
    extrasHint: 'Voz: unos 0,03 € por persona y hora con LiveKit. Vídeo e IA: por calcular.',
    revenueLine: 'Ingresos',
    machines: 'Máquinas: {n} × {m}',
    machinesNone: 'Máquinas: algún mundo no cabe en una {m}',
    copies: 'Copias',
    support: 'Soporte',
    stripe: 'Stripe',
    fixedLine: 'Gastos fijos',
    extrasLine: 'Voz, vídeo e IA',
    profit: 'Beneficio al mes',
    note: 'Un mundo dormido porque está vacío paga como encendido; parado es cuando su dueño lo apaga.',
  },
  market: {
    title: 'Frente al mercado',
    intro:
      'Un mundo encendido todo el mes, frente a lo que cobran otros (€ al mes, sin IVA; consultado el {d}).',
    who: 'Quién · a cuántas personas',
    month: '€/mes',
    ours: 'Numinia {name} · {n} personas',
    offers: {
      hyperworldBasic: 'HyperWorld.host Basic · 10 personas',
      realmsPlus: 'Minecraft Realms Plus · tú y 10 más',
      frameBasic: 'FrameVR Basic · 8 personas',
      hermesStandard: 'Hermes Cloud Standard · un agente (el modelo del cobro por días)',
      hyperworldOg: 'HyperWorld.host OG · 500 declaradas',
      hubs4: 'Hubs gestionado 4 GB · «60+»',
      framePlus: 'FrameVR Plus · 50 personas',
      hubs8: 'Hubs gestionado 8 GB · «120+»',
      framePro: 'FrameVR Pro · 300 personas',
    },
  },
  rules: {
    title: 'Reglas',
    intro: 'Van con la tarifa: cambiar una regla también es publicar una versión nueva.',
    items: {
      eventBoostCentsPerDay: {
        label: 'Día de evento (€)',
        meaning: 'Lo que cuesta subir un mundo a un tamaño mayor durante un día, para un evento.',
      },
      minTopupCents: {
        label: 'Recarga mínima (€)',
        meaning: 'La recarga más pequeña que se acepta.',
      },
      quickTopupsCents: {
        label: 'Recargas de un toque (€)',
        meaning:
          'Los importes que se ofrecen con un botón, de menor a mayor y ninguno por debajo de la recarga mínima. Sepáralos con espacios.',
      },
      minBalanceDaysRunning: {
        label: 'Saldo para crear un mundo (días)',
        meaning: 'Días encendido que tiene que cubrir el saldo para poder crear un mundo.',
      },
      keepDaysAtZero: {
        label: 'Días que se guarda a cero (días)',
        meaning:
          'Días que se guarda gratis un mundo parado por falta de saldo antes de borrarlo. Al menos uno.',
      },
      noticeDaysForRise: {
        label: 'Aviso de una subida (días)',
        meaning: 'Días que pasan entre publicar una subida y que empiece a cobrarse.',
      },
      lowBalanceDaysDefault: {
        label: 'Aviso de saldo bajo (días)',
        meaning: 'Con cuántos días de saldo se avisa al dueño, si él no elige otra cosa.',
      },
    },
    bad: 'No se entiende: revisa el número.',
  },
  publish: {
    title: 'Publicar',
    startsOn: 'Empieza el',
    utc: 'El día cuenta en UTC: en tu hora empieza el {t}.',
    note: 'Por qué (queda en el historial)',
    notePlaceholder: 'Por ejemplo: tamaños por personas a la vez, como se aprobó.',
    button: 'Publicar',
    checking: 'Consultando la caja…',
    replaces: 'Sustituye a la versión {n}.',
    first: 'Será la primera versión de la tarifa.',
    rise: 'Es una subida: necesita {n} días de aviso; lo antes, el {d}.',
    riseMove: 'Llevar la fecha al {d}',
    riseReady: 'Es una subida, con los {n} días de aviso que pide.',
    nothing: 'Nada cambia respecto a la versión que sustituye.',
    fixFirst: 'Corrige lo marcado arriba para poder publicar.',
    checkFailed: 'La caja no ha podido revisar el borrador.',
    reload: 'Volver a leer la caja',
    problems: {
      notice: 'Es una subida: necesita {n} días de aviso; lo antes, el {d}.',
      tomorrow: 'Una versión nueva empieza mañana como pronto: el {d}.',
      inUse: 'Hay mundos que pagan el tamaño {s}: la versión tiene que seguir poniéndole precio.',
      basis: 'El porqué admite 500 caracteres como mucho.',
      by: 'La cartera de tu sesión no sirve para publicar.',
      meanwhile: 'Otra versión se ha publicado mientras tanto: vuelve a leer la caja.',
      other: 'La caja dice: «{t}»',
    },
  },
  dialog: {
    title: 'Publicar la versión {n}',
    intro: 'La caja guarda una versión nueva con su fecha; lo cobrado antes no cambia.',
    sizes: 'Qué cambia en cada tamaño',
    size: 'Tamaño',
    before: 'Antes',
    after: 'Después',
    prices: '{r} encendido · {s} parado',
    vat: 'con IVA: {r} · {s}',
    added: 'No estaba (tamaño nuevo)',
    removed: 'Sale de la tarifa',
    noSizes: 'Los precios no cambian.',
    rules: 'Reglas que cambian',
    noRules: 'Las reglas no cambian.',
    starts: 'Empieza el {d} (día UTC; en tu hora, el {t}).',
    note: 'Por qué',
    noNote: 'Sin nota.',
    mail: 'Aún no avisa a nadie por correo.',
    confirm: 'Publicar la versión {n}',
    cancel: 'Cancelar',
    publishing: 'Publicando',
    refused: 'La caja no la ha aceptado:',
    failed: 'La caja no ha respondido. Lo escrito sigue aquí; vuelve a intentarlo.',
    close: 'Cerrar',
  },
  published: 'Versión {n} publicada. Empieza el {d}.',
  publishedClose: 'Entendido',
  history: {
    title: 'Historial',
    heading: 'Versión {n} · desde el {d}',
    states: {
      'in-force': 'en vigor',
      scheduled: 'programada',
      earlier: 'anterior',
      replaced: 'sustituida antes de empezar',
    },
    by: 'Publicada por {who} el {t}.',
    noNote: 'Sin nota.',
    load: 'Llevar a la calculadora',
    loaded: 'La versión {n} está en la calculadora.',
    empty: 'La caja aún no tiene versiones.',
    price: '{name}: {r} / {s}',
  },
};

const EN: PricesRoomMessages = {
  loading: 'Reading the till…',
  notBound: 'The till is not connected to this site.',
  notBoundNote:
    'This site talks to the till over an internal Cloudflare link. Until that link exists, there is no tariff to read or to publish.',
  failed: 'The till did not answer.',
  retry: 'Try again',
  sizeNames: { small: 'Small', medium: 'Medium', large: 'Large', '2g': '2 GB' },
  people: 'up to {n} people at once',
  exampleSize: 'example size of the first tariff · people not measured',
  otherSize: 'Size “{k}”',
  otherSizeNote: 'not in the catalog',
  seed: 'the till at its birth',
  inForce: {
    title: 'In force',
    heading: 'Version {n} · from {d}',
    by: 'Published by {who}.',
    noNote: 'No note.',
    none: 'No version is in force yet.',
    size: 'Size',
    running: 'Running, a day',
    stopped: 'Stopped, a day',
    month: 'A month running',
    withVat: 'with VAT {v}',
    scheduled: 'Scheduled: version {n} from {d}.',
    vatNote: 'Prices without VAT; “with VAT” adds 21 %.',
  },
  calculator: {
    title: 'Calculator',
    intro:
      'Prices without VAT except where it says “with VAT”. OVH, AWS and Stripe costs read on {d}. Each size’s prices are the draft that gets published; everything else is an assumption to see the margin.',
    machine: 'Machine',
    machineOption: '{m} · {c} cores · {r} GB · {e}/month',
    occupancy: 'Machine occupancy',
    cpu: 'Processor promised',
    copies: 'Nightly copies',
    copiesFull: 'Full zip (today)',
    copiesIncremental: 'Incremental',
    topup: 'Average top-up',
    seller: 'Who sells',
    sellerStripe: 'Stripe (Managed Payments)',
    sellerNumen: 'Us, with Stripe',
    hour: 'Team hour (€)',
    support: 'Support a month, medium / large (min)',
    supportMedium: 'Support minutes a month for a medium world',
    supportLarge: 'Support minutes a month for a large world',
    note: 'Occupancy: how much of the machines’ room is sold. “Processor promised ×2”: the machine hands out twice the processor it has, because worlds are rarely full at the same time; at ×1, all of them could be full at once. Gross margin before fixed salaries and taxes, support included; marked when it reaches 60 %.',
  },
  card: {
    specs: '{f} GB of files · {r} GB reserved · {c} core',
    running: 'Running, €/day',
    stopped: 'Stopped, €/day',
    runningOf: '{name}: running, euros a day without VAT',
    stoppedOf: '{name}: stopped, euros a day without VAT',
    month: 'A month running',
    consumer: 'Consumer, with VAT',
    consumerValue: '{d}/day · {m}/month',
    lasts: 'A {a} top-up lasts {n} days running',
    lastsFree: 'Running spends no balance',
    cost: 'It costs us',
    costValue: '{c}/day',
    machine: 'machine ({n} per machine)',
    machineNone: 'machine (does not fit this one)',
    copies: 'copies',
    support: 'support',
    stripe: 'Stripe',
    margin: 'Gross margin',
    marginReached: 'reaches 60 %',
    marginShort: 'below 60 %',
    inTariff: 'In the tariff',
    inUse: 'Some worlds pay for this size: it cannot leave the tariff.',
    out: 'Out of the tariff: not published.',
    noModel: 'No consumption figures: its cost cannot be worked out.',
    badAmount: 'Write euros with two decimals at most, for example 0.20.',
    empty: 'The tariff needs at least one size.',
  },
  fleet: {
    title: 'Profit a month with an example fleet',
    intro:
      'Change how many worlds of each size there are and how much of the month they run. Machines are counted with the occupancy above.',
    size: 'Size',
    worlds: 'Worlds',
    running: '% of the month running',
    revenue: 'Revenue a month',
    sizeLine: '{name} · up to {n}',
    notPriced: 'out of the tariff',
    worldsOf: 'Worlds of size {name}',
    runningOf: 'Share of the month that worlds of size {name} run, in %',
    fixed: 'Fixed costs a month (€)',
    extras: 'Voice, video and AI (€ a month)',
    extrasHint:
      'Voice: about 0.03 € per person and hour with LiveKit. Video and AI: to be worked out.',
    revenueLine: 'Revenue',
    machines: 'Machines: {n} × {m}',
    machinesNone: 'Machines: some world does not fit a {m}',
    copies: 'Copies',
    support: 'Support',
    stripe: 'Stripe',
    fixedLine: 'Fixed costs',
    extrasLine: 'Voice, video and AI',
    profit: 'Profit a month',
    note: 'A world asleep because it is empty pays as running; stopped is when its owner switches it off.',
  },
  market: {
    title: 'Against the market',
    intro:
      'One world running all month, against what others charge (€ a month, without VAT; read on {d}).',
    who: 'Who · for how many people',
    month: '€/month',
    ours: 'Numinia {name} · {n} people',
    offers: {
      hyperworldBasic: 'HyperWorld.host Basic · 10 people',
      realmsPlus: 'Minecraft Realms Plus · you and 10 more',
      frameBasic: 'FrameVR Basic · 8 people',
      hermesStandard: 'Hermes Cloud Standard · one agent (the model for charging by the day)',
      hyperworldOg: 'HyperWorld.host OG · 500 declared',
      hubs4: 'Managed Hubs 4 GB · “60+”',
      framePlus: 'FrameVR Plus · 50 people',
      hubs8: 'Managed Hubs 8 GB · “120+”',
      framePro: 'FrameVR Pro · 300 people',
    },
  },
  rules: {
    title: 'Rules',
    intro: 'They travel with the tariff: changing a rule is publishing a new version too.',
    items: {
      eventBoostCentsPerDay: {
        label: 'Event day (€)',
        meaning: 'What it costs to move a world up to a larger size for one day, for an event.',
      },
      minTopupCents: { label: 'Smallest top-up (€)', meaning: 'The smallest top-up accepted.' },
      quickTopupsCents: {
        label: 'One-tap top-ups (€)',
        meaning:
          'The amounts offered on a button, from smallest to largest and none below the smallest top-up. Separate them with spaces.',
      },
      minBalanceDaysRunning: {
        label: 'Balance to create a world (days)',
        meaning: 'Days running the balance must cover before a world can be created.',
      },
      keepDaysAtZero: {
        label: 'Days kept at zero (days)',
        meaning:
          'Days a world stopped for lack of balance is kept for free before it is deleted. At least one.',
      },
      noticeDaysForRise: {
        label: 'Notice of a rise (days)',
        meaning: 'Days between publishing a rise and charging it.',
      },
      lowBalanceDaysDefault: {
        label: 'Low-balance warning (days)',
        meaning:
          'With how many days of balance left the owner is warned, unless they choose otherwise.',
      },
    },
    bad: 'This does not read: check the number.',
  },
  publish: {
    title: 'Publish',
    startsOn: 'Starts on',
    utc: 'The day counts in UTC: on your clock it begins on {t}.',
    note: 'Why (it stays in the history)',
    notePlaceholder: 'For example: sizes by people at once, as approved.',
    button: 'Publish',
    checking: 'Asking the till…',
    replaces: 'It replaces version {n}.',
    first: 'It will be the tariff’s first version.',
    rise: 'This is a rise: it needs {n} days’ notice; {d} at the earliest.',
    riseMove: 'Move the date to {d}',
    riseReady: 'This is a rise, with the {n} days’ notice it needs.',
    nothing: 'Nothing changes from the version it replaces.',
    fixFirst: 'Fix what is marked above to publish.',
    checkFailed: 'The till could not check the draft.',
    reload: 'Read the till again',
    problems: {
      notice: 'This is a rise: it needs {n} days’ notice; {d} at the earliest.',
      tomorrow: 'A new version starts tomorrow at the earliest: {d}.',
      inUse: 'Some worlds pay for size {s}: the version must keep pricing it.',
      basis: 'The why takes 500 characters at most.',
      by: 'Your session’s wallet cannot publish.',
      meanwhile: 'Another version was published meanwhile: read the till again.',
      other: 'The till says: “{t}”',
    },
  },
  dialog: {
    title: 'Publish version {n}',
    intro: 'The till keeps a new version with its date; nothing charged before changes.',
    sizes: 'What changes for each size',
    size: 'Size',
    before: 'Before',
    after: 'After',
    prices: '{r} running · {s} stopped',
    vat: 'with VAT: {r} · {s}',
    added: 'Not in it (a new size)',
    removed: 'Leaves the tariff',
    noSizes: 'Prices do not change.',
    rules: 'Rules that change',
    noRules: 'The rules do not change.',
    starts: 'It starts on {d} (a UTC day; on your clock, {t}).',
    note: 'Why',
    noNote: 'No note.',
    mail: 'It does not email anyone yet.',
    confirm: 'Publish version {n}',
    cancel: 'Cancel',
    publishing: 'Publishing',
    refused: 'The till did not accept it:',
    failed: 'The till did not answer. What you typed is still here; try again.',
    close: 'Close',
  },
  published: 'Version {n} published. It starts on {d}.',
  publishedClose: 'Got it',
  history: {
    title: 'History',
    heading: 'Version {n} · from {d}',
    states: {
      'in-force': 'in force',
      scheduled: 'scheduled',
      earlier: 'earlier',
      replaced: 'replaced before it began',
    },
    by: 'Published by {who} on {t}.',
    noNote: 'No note.',
    load: 'Take to the calculator',
    loaded: 'Version {n} is in the calculator.',
    empty: 'The till holds no versions yet.',
    price: '{name}: {r} / {s}',
  },
};

const JA: PricesRoomMessages = {
  loading: 'レジを読み込み中…',
  notBound: 'レジはこのサイトに接続されていません。',
  notBoundNote:
    'このサイトはCloudflareの内部リンクでレジと話します。そのリンクがない間は、読む料金表も公開する料金表もありません。',
  failed: 'レジから応答がありません。',
  retry: '再試行',
  sizeNames: { small: '小', medium: '中', large: '大', '2g': '2 GB' },
  people: '同時に最大{n}人',
  exampleSize: '初期データの例のサイズ · 人数は未計測',
  otherSize: 'サイズ「{k}」',
  otherSizeNote: 'カタログにありません',
  seed: '初期データ',
  inForce: {
    title: '適用中',
    heading: 'バージョン{n} · {d}から',
    by: '公開者: {who}。',
    noNote: 'メモなし。',
    none: '適用中のバージョンはまだありません。',
    size: 'サイズ',
    running: '稼働 1日',
    stopped: '停止 1日',
    month: '1か月稼働',
    withVat: '税込 {v}',
    scheduled: '予定: バージョン{n}、{d}から。',
    vatNote: '価格は税抜。「税込」は21 %のVATを加えた額です。',
  },
  calculator: {
    title: '計算機',
    intro:
      '「税込」とある所以外は税抜価格です。OVH、AWS、Stripeの費用は{d}に確認。各サイズの価格が公開される下書きで、それ以外はマージンを見るための前提です。',
    machine: 'マシン',
    machineOption: '{m} · {c}コア · {r} GB · 月{e}',
    occupancy: 'マシンの稼働率',
    cpu: '約束するプロセッサ',
    copies: '毎晩のコピー',
    copiesFull: '完全なzip（現在）',
    copiesIncremental: '増分',
    topup: '平均チャージ額',
    seller: '販売者',
    sellerStripe: 'Stripe（Managed Payments）',
    sellerNumen: '当社（Stripe利用）',
    hour: 'チームの時給（€）',
    support: '月のサポート、中 / 大（分）',
    supportMedium: '中サイズのワールドの月のサポート時間（分）',
    supportLarge: '大サイズのワールドの月のサポート時間（分）',
    note: '稼働率: マシンの容量のうち販売済みの割合。「約束するプロセッサ×2」: ワールドが同時に満員になることはまれなので、マシンは実際の2倍のプロセッサを割り当てます。×1なら全ワールドが同時に満員でも足ります。粗利は固定給与と税金の前、サポート込み。60 %に届くと印が付きます。',
  },
  card: {
    specs: 'ファイル{f} GB · 予約{r} GB · {c}コア',
    running: '稼働、€/日',
    stopped: '停止、€/日',
    runningOf: '{name}: 稼働、1日あたりのユーロ（税抜）',
    stoppedOf: '{name}: 停止、1日あたりのユーロ（税抜）',
    month: '1か月稼働',
    consumer: '個人、税込',
    consumerValue: '{d}/日 · {m}/月',
    lasts: '{a}のチャージで{n}日稼働',
    lastsFree: '稼働しても残高は減りません',
    cost: '当社の原価',
    costValue: '{c}/日',
    machine: 'マシン（1台に{n}）',
    machineNone: 'マシン（このマシンに入りません）',
    copies: 'コピー',
    support: 'サポート',
    stripe: 'Stripe',
    margin: '粗利',
    marginReached: '60 %に到達',
    marginShort: '60 %未満',
    inTariff: '料金表に含める',
    inUse: 'このサイズで支払っているワールドがあるため、料金表から外せません。',
    out: '料金表の外: 公開されません。',
    noModel: '使用量のデータがないため、原価を計算できません。',
    badAmount: '小数点以下2桁までのユーロで入力してください（例: 0.20）。',
    empty: '料金表には少なくとも1つのサイズが必要です。',
  },
  fleet: {
    title: '例のフリートでの月の利益',
    intro:
      '各サイズのワールド数と、月のうち稼働している割合を変えてください。マシンは上の稼働率で数えます。',
    size: 'サイズ',
    worlds: 'ワールド数',
    running: '月の稼働 %',
    revenue: '月の売上',
    sizeLine: '{name} · 最大{n}人',
    notPriced: '料金表の外',
    worldsOf: 'サイズ{name}のワールド数',
    runningOf: 'サイズ{name}のワールドが月に稼働する割合（%）',
    fixed: '月の固定費（€）',
    extras: '音声・ビデオ・AI（月額€）',
    extrasHint: '音声: LiveKitで1人1時間あたり約0.03 €。ビデオとAI: 未計算。',
    revenueLine: '売上',
    machines: 'マシン: {n} × {m}',
    machinesNone: 'マシン: {m}に入らないワールドがあります',
    copies: 'コピー',
    support: 'サポート',
    stripe: 'Stripe',
    fixedLine: '固定費',
    extrasLine: '音声・ビデオ・AI',
    profit: '月の利益',
    note: '空で眠っているワールドは稼働中と同じく支払います。停止とは所有者が止めた状態です。',
  },
  market: {
    title: '市場との比較',
    intro: '1か月ずっと稼働する1ワールドと、他社の料金（月額€、税抜。{d}に確認）。',
    who: '提供者 · 人数',
    month: '€/月',
    ours: 'Numinia {name} · {n}人',
    offers: {
      hyperworldBasic: 'HyperWorld.host Basic · 10人',
      realmsPlus: 'Minecraft Realms Plus · あなたと他10人',
      frameBasic: 'FrameVR Basic · 8人',
      hermesStandard: 'Hermes Cloud Standard・エージェント1体（日額課金のモデル）',
      hyperworldOg: 'HyperWorld.host OG · 公称500人',
      hubs4: 'マネージドHubs 4 GB · 「60+」',
      framePlus: 'FrameVR Plus · 50人',
      hubs8: 'マネージドHubs 8 GB · 「120+」',
      framePro: 'FrameVR Pro · 300人',
    },
  },
  rules: {
    title: 'ルール',
    intro: 'ルールは料金表と一緒です。ルールを変えることも新しいバージョンの公開です。',
    items: {
      eventBoostCentsPerDay: {
        label: 'イベント日（€）',
        meaning: 'イベントのために1日だけワールドを大きいサイズにする料金。',
      },
      minTopupCents: { label: '最小チャージ（€）', meaning: '受け付ける最小のチャージ額。' },
      quickTopupsCents: {
        label: 'ワンタップのチャージ（€）',
        meaning:
          'ボタンで提示する金額。小さい順に、最小チャージ未満は不可。スペースで区切ってください。',
      },
      minBalanceDaysRunning: {
        label: 'ワールド作成に必要な残高（日）',
        meaning: 'ワールドを作成するのに残高が賄うべき稼働日数。',
      },
      keepDaysAtZero: {
        label: '残高ゼロで保管する日数（日）',
        meaning: '残高不足で停止したワールドを削除前に無料で保管する日数。1日以上。',
      },
      noticeDaysForRise: {
        label: '値上げの予告（日）',
        meaning: '値上げを公開してから請求が始まるまでの日数。',
      },
      lowBalanceDaysDefault: {
        label: '残高不足の警告（日）',
        meaning: '所有者が別に選ばない限り、残り何日分の残高で警告するか。',
      },
    },
    bad: '読み取れません。数値を確認してください。',
  },
  publish: {
    title: '公開',
    startsOn: '開始日',
    utc: '日付はUTCで数えます。あなたの時刻では{t}に始まります。',
    note: '理由（履歴に残ります）',
    notePlaceholder: '例: 承認どおり、同時人数によるサイズ。',
    button: '公開',
    checking: 'レジに確認中…',
    replaces: 'バージョン{n}を置き換えます。',
    first: '料金表の最初のバージョンになります。',
    rise: '値上げです。{n}日の予告が必要で、最短で{d}です。',
    riseMove: '日付を{d}にする',
    riseReady: '値上げで、必要な{n}日の予告があります。',
    nothing: '置き換えるバージョンから何も変わりません。',
    fixFirst: '公開するには、上で印の付いた所を直してください。',
    checkFailed: 'レジは下書きを確認できませんでした。',
    reload: 'レジを読み直す',
    problems: {
      notice: '値上げです。{n}日の予告が必要で、最短で{d}です。',
      tomorrow: '新しいバージョンは最短で明日、{d}に始まります。',
      inUse:
        'サイズ{s}で支払っているワールドがあります。このバージョンでも価格を付ける必要があります。',
      basis: '理由は500文字までです。',
      by: 'このセッションのウォレットでは公開できません。',
      meanwhile: 'その間に別のバージョンが公開されました。レジを読み直してください。',
      other: 'レジの返答: 「{t}」',
    },
  },
  dialog: {
    title: 'バージョン{n}を公開',
    intro: 'レジは日付付きの新しいバージョンを保存します。これまでの請求は変わりません。',
    sizes: '各サイズで変わること',
    size: 'サイズ',
    before: '変更前',
    after: '変更後',
    prices: '稼働 {r} · 停止 {s}',
    vat: '税込: {r} · {s}',
    added: '料金表に追加',
    removed: '料金表から外す',
    noSizes: '価格は変わりません。',
    rules: '変わるルール',
    noRules: 'ルールは変わりません。',
    starts: '{d}に開始（UTCの日付。あなたの時刻では{t}）。',
    note: '理由',
    noNote: 'メモなし。',
    mail: 'まだ誰にもメールで知らせません。',
    confirm: 'バージョン{n}を公開',
    cancel: 'キャンセル',
    publishing: '公開中',
    refused: 'レジは受け付けませんでした:',
    failed: 'レジから応答がありません。入力した内容はそのままです。もう一度お試しください。',
    close: '閉じる',
  },
  published: 'バージョン{n}を公開しました。{d}に始まります。',
  publishedClose: 'OK',
  history: {
    title: '履歴',
    heading: 'バージョン{n} · {d}から',
    states: {
      'in-force': '適用中',
      scheduled: '予定',
      earlier: '過去',
      replaced: '開始前に置き換え',
    },
    by: '{who}が{t}に公開。',
    noNote: 'メモなし。',
    load: '計算機に読み込む',
    loaded: 'バージョン{n}を計算機に読み込みました。',
    empty: 'レジにはまだバージョンがありません。',
    price: '{name}: {r} / {s}',
  },
};

const KO: PricesRoomMessages = {
  loading: '계산대를 읽는 중…',
  notBound: '계산대가 이 사이트에 연결되어 있지 않습니다.',
  notBoundNote:
    '이 사이트는 Cloudflare 내부 연결로 계산대와 통신합니다. 그 연결이 없는 동안에는 읽거나 게시할 요금표가 없습니다.',
  failed: '계산대가 응답하지 않았습니다.',
  retry: '다시 시도',
  sizeNames: { small: '소형', medium: '중형', large: '대형', '2g': '2 GB' },
  people: '동시에 최대 {n}명',
  exampleSize: '초기 데이터의 예시 크기 · 인원 미측정',
  otherSize: '크기 «{k}»',
  otherSizeNote: '카탈로그에 없음',
  seed: '초기 데이터',
  inForce: {
    title: '적용 중',
    heading: '버전 {n} · {d}부터',
    by: '게시: {who}.',
    noNote: '메모 없음.',
    none: '아직 적용 중인 버전이 없습니다.',
    size: '크기',
    running: '실행, 하루',
    stopped: '정지, 하루',
    month: '한 달 실행',
    withVat: '부가세 포함 {v}',
    scheduled: '예정: 버전 {n}, {d}부터.',
    vatNote: '가격은 부가세 별도이며, «부가세 포함»은 21 %를 더한 금액입니다.',
  },
  calculator: {
    title: '계산기',
    intro:
      '«부가세 포함»이라고 적힌 곳 외에는 부가세 별도 가격입니다. OVH, AWS, Stripe 비용은 {d}에 확인했습니다. 각 크기의 가격이 게시될 초안이고, 나머지는 마진을 보기 위한 가정입니다.',
    machine: '머신',
    machineOption: '{m} · 코어 {c}개 · {r} GB · 월 {e}',
    occupancy: '머신 사용률',
    cpu: '약속한 프로세서',
    copies: '매일 밤 사본',
    copiesFull: '전체 zip (현재)',
    copiesIncremental: '증분',
    topup: '평균 충전액',
    seller: '판매자',
    sellerStripe: 'Stripe (Managed Payments)',
    sellerNumen: '우리, Stripe와 함께',
    hour: '팀 시급 (€)',
    support: '월 지원, 중형 / 대형 (분)',
    supportMedium: '중형 월드의 월 지원 시간(분)',
    supportLarge: '대형 월드의 월 지원 시간(분)',
    note: '사용률: 머신 공간 중 판매된 비율. «약속한 프로세서 ×2»: 월드가 동시에 가득 차는 일은 드물어서 머신이 가진 프로세서의 두 배를 나눠 줍니다. ×1이면 모든 월드가 동시에 가득 차도 됩니다. 총마진은 고정 급여와 세금 전이며 지원을 포함합니다. 60 %에 도달하면 표시됩니다.',
  },
  card: {
    specs: '파일 {f} GB · 예약 {r} GB · 코어 {c}개',
    running: '실행, €/일',
    stopped: '정지, €/일',
    runningOf: '{name}: 실행, 하루 유로(부가세 별도)',
    stoppedOf: '{name}: 정지, 하루 유로(부가세 별도)',
    month: '한 달 실행',
    consumer: '개인, 부가세 포함',
    consumerValue: '{d}/일 · {m}/월',
    lasts: '{a} 충전으로 {n}일 실행',
    lastsFree: '실행해도 잔액이 줄지 않습니다',
    cost: '우리 비용',
    costValue: '{c}/일',
    machine: '머신 (머신당 {n}개)',
    machineNone: '머신 (이 머신에 들어가지 않음)',
    copies: '사본',
    support: '지원',
    stripe: 'Stripe',
    margin: '총마진',
    marginReached: '60 % 도달',
    marginShort: '60 % 미만',
    inTariff: '요금표에 포함',
    inUse: '이 크기로 요금을 내는 월드가 있어 요금표에서 뺄 수 없습니다.',
    out: '요금표 밖: 게시되지 않습니다.',
    noModel: '사용량 데이터가 없어 비용을 계산할 수 없습니다.',
    badAmount: '소수점 둘째 자리까지 유로로 입력하세요(예: 0.20).',
    empty: '요금표에는 크기가 하나 이상 필요합니다.',
  },
  fleet: {
    title: '예시 플릿의 월 이익',
    intro:
      '크기별 월드 수와 한 달 중 실행되는 비율을 바꿔 보세요. 머신은 위의 사용률로 계산합니다.',
    size: '크기',
    worlds: '월드',
    running: '월 실행 %',
    revenue: '월 매출',
    sizeLine: '{name} · 최대 {n}명',
    notPriced: '요금표 밖',
    worldsOf: '{name} 크기 월드 수',
    runningOf: '{name} 크기 월드가 한 달 중 실행되는 비율(%)',
    fixed: '월 고정비 (€)',
    extras: '음성, 영상, AI (월 €)',
    extrasHint: '음성: LiveKit으로 1인 1시간당 약 0.03 €. 영상과 AI: 계산 예정.',
    revenueLine: '매출',
    machines: '머신: {n} × {m}',
    machinesNone: '머신: {m}에 들어가지 않는 월드가 있습니다',
    copies: '사본',
    support: '지원',
    stripe: 'Stripe',
    fixedLine: '고정비',
    extrasLine: '음성, 영상, AI',
    profit: '월 이익',
    note: '비어서 잠든 월드는 실행 중과 똑같이 냅니다. 정지는 소유자가 끈 상태입니다.',
  },
  market: {
    title: '시장과 비교',
    intro: '한 달 내내 실행되는 월드 하나와 다른 곳의 요금(월 €, 부가세 별도, {d}에 확인).',
    who: '제공자 · 인원',
    month: '€/월',
    ours: 'Numinia {name} · {n}명',
    offers: {
      hyperworldBasic: 'HyperWorld.host Basic · 10명',
      realmsPlus: 'Minecraft Realms Plus · 본인과 10명',
      frameBasic: 'FrameVR Basic · 8명',
      hermesStandard: 'Hermes Cloud Standard · 에이전트 1개 (일 단위 과금의 모델)',
      hyperworldOg: 'HyperWorld.host OG · 공칭 500명',
      hubs4: '관리형 Hubs 4 GB · «60+»',
      framePlus: 'FrameVR Plus · 50명',
      hubs8: '관리형 Hubs 8 GB · «120+»',
      framePro: 'FrameVR Pro · 300명',
    },
  },
  rules: {
    title: '규칙',
    intro: '규칙은 요금표와 함께 갑니다. 규칙을 바꾸는 것도 새 버전을 게시하는 것입니다.',
    items: {
      eventBoostCentsPerDay: {
        label: '이벤트 날 (€)',
        meaning: '이벤트를 위해 하루 동안 월드를 더 큰 크기로 올리는 요금.',
      },
      minTopupCents: { label: '최소 충전 (€)', meaning: '받는 가장 작은 충전액.' },
      quickTopupsCents: {
        label: '원탭 충전 (€)',
        meaning:
          '버튼으로 제시하는 금액. 작은 것부터 큰 순서이며 최소 충전보다 작을 수 없습니다. 공백으로 구분하세요.',
      },
      minBalanceDaysRunning: {
        label: '월드 생성에 필요한 잔액 (일)',
        meaning: '월드를 만들려면 잔액이 감당해야 하는 실행 일수.',
      },
      keepDaysAtZero: {
        label: '잔액 0에서 보관하는 일수 (일)',
        meaning: '잔액 부족으로 정지된 월드를 삭제 전에 무료로 보관하는 일수. 최소 하루.',
      },
      noticeDaysForRise: {
        label: '인상 예고 (일)',
        meaning: '인상을 게시한 뒤 청구가 시작되기까지의 일수.',
      },
      lowBalanceDaysDefault: {
        label: '잔액 부족 알림 (일)',
        meaning: '소유자가 따로 정하지 않으면 잔액이 며칠 남았을 때 알릴지.',
      },
    },
    bad: '읽을 수 없습니다. 숫자를 확인하세요.',
  },
  publish: {
    title: '게시',
    startsOn: '시작일',
    utc: '날짜는 UTC로 셉니다. 당신의 시간으로는 {t}에 시작합니다.',
    note: '이유 (기록에 남습니다)',
    notePlaceholder: '예: 승인한 대로 동시 인원에 따른 크기.',
    button: '게시',
    checking: '계산대에 확인하는 중…',
    replaces: '버전 {n}을 대체합니다.',
    first: '요금표의 첫 번째 버전이 됩니다.',
    rise: '인상입니다. {n}일 예고가 필요하며, 가장 빠른 날은 {d}입니다.',
    riseMove: '날짜를 {d}로 옮기기',
    riseReady: '인상이며, 필요한 {n}일 예고를 갖췄습니다.',
    nothing: '대체하는 버전과 비교해 바뀌는 것이 없습니다.',
    fixFirst: '게시하려면 위에 표시된 곳을 고치세요.',
    checkFailed: '계산대가 초안을 확인하지 못했습니다.',
    reload: '계산대 다시 읽기',
    problems: {
      notice: '인상입니다. {n}일 예고가 필요하며, 가장 빠른 날은 {d}입니다.',
      tomorrow: '새 버전은 빨라도 내일, {d}에 시작합니다.',
      inUse: '{s} 크기로 요금을 내는 월드가 있습니다. 이 버전도 그 가격을 정해야 합니다.',
      basis: '이유는 최대 500자입니다.',
      by: '이 세션의 지갑으로는 게시할 수 없습니다.',
      meanwhile: '그사이 다른 버전이 게시되었습니다. 계산대를 다시 읽으세요.',
      other: '계산대의 답: «{t}»',
    },
  },
  dialog: {
    title: '버전 {n} 게시',
    intro: '계산대는 날짜가 붙은 새 버전을 저장합니다. 이전에 청구된 것은 바뀌지 않습니다.',
    sizes: '크기별로 바뀌는 것',
    size: '크기',
    before: '이전',
    after: '이후',
    prices: '실행 {r} · 정지 {s}',
    vat: '부가세 포함: {r} · {s}',
    added: '요금표에 추가',
    removed: '요금표에서 제외',
    noSizes: '가격은 바뀌지 않습니다.',
    rules: '바뀌는 규칙',
    noRules: '규칙은 바뀌지 않습니다.',
    starts: '{d}에 시작합니다 (UTC 날짜, 당신의 시간으로 {t}).',
    note: '이유',
    noNote: '메모 없음.',
    mail: '아직 아무에게도 이메일로 알리지 않습니다.',
    confirm: '버전 {n} 게시',
    cancel: '취소',
    publishing: '게시 중',
    refused: '계산대가 받아들이지 않았습니다:',
    failed: '계산대가 응답하지 않았습니다. 입력한 내용은 그대로 있습니다. 다시 시도하세요.',
    close: '닫기',
  },
  published: '버전 {n}이 게시되었습니다. {d}에 시작합니다.',
  publishedClose: '확인',
  history: {
    title: '기록',
    heading: '버전 {n} · {d}부터',
    states: {
      'in-force': '적용 중',
      scheduled: '예정',
      earlier: '이전',
      replaced: '시작 전에 대체됨',
    },
    by: '{who}이(가) {t}에 게시.',
    noNote: '메모 없음.',
    load: '계산기로 가져오기',
    loaded: '버전 {n}을 계산기로 가져왔습니다.',
    empty: '계산대에 아직 버전이 없습니다.',
    price: '{name}: {r} / {s}',
  },
};

const PT: PricesRoomMessages = {
  loading: 'Lendo o caixa…',
  notBound: 'O caixa não está ligado a este site.',
  notBoundNote:
    'Este site fala com o caixa por uma ligação interna da Cloudflare. Enquanto essa ligação não existir, não há tarifa para ler nem para publicar.',
  failed: 'O caixa não respondeu.',
  retry: 'Tentar de novo',
  sizeNames: { small: 'Pequeno', medium: 'Médio', large: 'Grande', '2g': '2 GB' },
  people: 'até {n} pessoas ao mesmo tempo',
  exampleSize: 'tamanho de exemplo da primeira tarifa · pessoas não medidas',
  otherSize: 'Tamanho «{k}»',
  otherSizeNote: 'não está no catálogo',
  seed: 'a caixa ao nascer',
  inForce: {
    title: 'Em vigor',
    heading: 'Versão {n} · desde {d}',
    by: 'Publicada por {who}.',
    noNote: 'Sem nota.',
    none: 'Ainda não há nenhuma versão em vigor.',
    size: 'Tamanho',
    running: 'Ligado por dia',
    stopped: 'Parado por dia',
    month: 'Um mês ligado',
    withVat: 'com IVA {v}',
    scheduled: 'Programada: versão {n} desde {d}.',
    vatNote: 'Preços sem IVA; «com IVA» soma 21 %.',
  },
  calculator: {
    title: 'Calculadora',
    intro:
      'Preços sem IVA, exceto onde diz «com IVA». Custos de OVH, AWS e Stripe consultados em {d}. Os preços de cada tamanho são o rascunho que se publica; o resto são suposições para ver a margem.',
    machine: 'Máquina',
    machineOption: '{m} · {c} núcleos · {r} GB · {e}/mês',
    occupancy: 'Ocupação das máquinas',
    cpu: 'Processador prometido',
    copies: 'Cópias de cada noite',
    copiesFull: 'Zip completo (hoje)',
    copiesIncremental: 'Incrementais',
    topup: 'Recarga média',
    seller: 'Quem vende',
    sellerStripe: 'Stripe (Managed Payments)',
    sellerNumen: 'Nós, com Stripe',
    hour: 'Hora da equipe (€)',
    support: 'Suporte por mês, médio / grande (min)',
    supportMedium: 'Minutos de suporte por mês de um mundo médio',
    supportLarge: 'Minutos de suporte por mês de um mundo grande',
    note: 'Ocupação: que parte do espaço das máquinas está vendida. «Processador prometido ×2»: a máquina reparte o dobro do processador que tem, porque os mundos raramente lotam ao mesmo tempo; em ×1, todos poderiam estar cheios ao mesmo tempo. Margem bruta antes de salários fixos e impostos, com o suporte incluído; marcada quando chega a 60 %.',
  },
  card: {
    specs: '{f} GB de arquivos · {r} GB reservados · {c} núcleo',
    running: 'Ligado, €/dia',
    stopped: 'Parado, €/dia',
    runningOf: '{name}: ligado, euros por dia sem IVA',
    stoppedOf: '{name}: parado, euros por dia sem IVA',
    month: 'Por mês ligado',
    consumer: 'Particular, com IVA',
    consumerValue: '{d}/dia · {m}/mês',
    lasts: 'Uma recarga de {a} dura {n} dias ligado',
    lastsFree: 'Ligado não gasta saldo',
    cost: 'Nos custa',
    costValue: '{c}/dia',
    machine: 'máquina ({n} por máquina)',
    machineNone: 'máquina (não cabe nesta)',
    copies: 'cópias',
    support: 'suporte',
    stripe: 'Stripe',
    margin: 'Margem bruta',
    marginReached: 'chega a 60 %',
    marginShort: 'abaixo de 60 %',
    inTariff: 'Na tarifa',
    inUse: 'Há mundos que pagam este tamanho: não pode sair da tarifa.',
    out: 'Fora da tarifa: não se publica.',
    noModel: 'Sem dados de consumo: não dá para calcular o custo.',
    badAmount: 'Escreva euros com no máximo duas casas decimais, por exemplo 0,20.',
    empty: 'A tarifa precisa de pelo menos um tamanho.',
  },
  fleet: {
    title: 'Lucro por mês com uma frota de exemplo',
    intro:
      'Mude quantos mundos há de cada tamanho e que parte do mês ficam ligados. As máquinas são contadas com a ocupação acima.',
    size: 'Tamanho',
    worlds: 'Mundos',
    running: '% do mês ligado',
    revenue: 'Receita por mês',
    sizeLine: '{name} · até {n}',
    notPriced: 'fora da tarifa',
    worldsOf: 'Mundos do tamanho {name}',
    runningOf: 'Parte do mês em que os mundos do tamanho {name} ficam ligados, em %',
    fixed: 'Custos fixos por mês (€)',
    extras: 'Voz, vídeo e IA (€ por mês)',
    extrasHint: 'Voz: cerca de 0,03 € por pessoa e hora com LiveKit. Vídeo e IA: a calcular.',
    revenueLine: 'Receita',
    machines: 'Máquinas: {n} × {m}',
    machinesNone: 'Máquinas: algum mundo não cabe numa {m}',
    copies: 'Cópias',
    support: 'Suporte',
    stripe: 'Stripe',
    fixedLine: 'Custos fixos',
    extrasLine: 'Voz, vídeo e IA',
    profit: 'Lucro por mês',
    note: 'Um mundo adormecido porque está vazio paga como ligado; parado é quando o dono o desliga.',
  },
  market: {
    title: 'Frente ao mercado',
    intro:
      'Um mundo ligado o mês inteiro, frente ao que outros cobram (€ por mês, sem IVA; consultado em {d}).',
    who: 'Quem · para quantas pessoas',
    month: '€/mês',
    ours: 'Numinia {name} · {n} pessoas',
    offers: {
      hyperworldBasic: 'HyperWorld.host Basic · 10 pessoas',
      realmsPlus: 'Minecraft Realms Plus · você e mais 10',
      frameBasic: 'FrameVR Basic · 8 pessoas',
      hermesStandard: 'Hermes Cloud Standard · um agente (o modelo da cobrança por dia)',
      hyperworldOg: 'HyperWorld.host OG · 500 declaradas',
      hubs4: 'Hubs gerenciado 4 GB · «60+»',
      framePlus: 'FrameVR Plus · 50 pessoas',
      hubs8: 'Hubs gerenciado 8 GB · «120+»',
      framePro: 'FrameVR Pro · 300 pessoas',
    },
  },
  rules: {
    title: 'Regras',
    intro: 'Vão com a tarifa: mudar uma regra também é publicar uma versão nova.',
    items: {
      eventBoostCentsPerDay: {
        label: 'Dia de evento (€)',
        meaning: 'O que custa subir um mundo para um tamanho maior durante um dia, para um evento.',
      },
      minTopupCents: { label: 'Recarga mínima (€)', meaning: 'A menor recarga aceita.' },
      quickTopupsCents: {
        label: 'Recargas de um toque (€)',
        meaning:
          'Os valores oferecidos num botão, do menor ao maior e nenhum abaixo da recarga mínima. Separe-os com espaços.',
      },
      minBalanceDaysRunning: {
        label: 'Saldo para criar um mundo (dias)',
        meaning: 'Dias ligado que o saldo precisa cobrir para poder criar um mundo.',
      },
      keepDaysAtZero: {
        label: 'Dias guardado sem saldo (dias)',
        meaning:
          'Dias em que um mundo parado por falta de saldo é guardado de graça antes de ser apagado. Pelo menos um.',
      },
      noticeDaysForRise: {
        label: 'Aviso de um aumento (dias)',
        meaning: 'Dias entre publicar um aumento e começar a cobrá-lo.',
      },
      lowBalanceDaysDefault: {
        label: 'Aviso de saldo baixo (dias)',
        meaning: 'Com quantos dias de saldo o dono é avisado, se não escolher outra coisa.',
      },
    },
    bad: 'Não dá para ler: confira o número.',
  },
  publish: {
    title: 'Publicar',
    startsOn: 'Começa em',
    utc: 'O dia conta em UTC: no seu horário começa em {t}.',
    note: 'Por quê (fica no histórico)',
    notePlaceholder: 'Por exemplo: tamanhos por pessoas ao mesmo tempo, como aprovado.',
    button: 'Publicar',
    checking: 'Consultando o caixa…',
    replaces: 'Substitui a versão {n}.',
    first: 'Será a primeira versão da tarifa.',
    rise: 'É um aumento: precisa de {n} dias de aviso; no mínimo, {d}.',
    riseMove: 'Levar a data para {d}',
    riseReady: 'É um aumento, com os {n} dias de aviso que pede.',
    nothing: 'Nada muda em relação à versão que substitui.',
    fixFirst: 'Corrija o que está marcado acima para poder publicar.',
    checkFailed: 'O caixa não conseguiu revisar o rascunho.',
    reload: 'Ler o caixa de novo',
    problems: {
      notice: 'É um aumento: precisa de {n} dias de aviso; no mínimo, {d}.',
      tomorrow: 'Uma versão nova começa amanhã, no mínimo: {d}.',
      inUse: 'Há mundos que pagam o tamanho {s}: a versão precisa continuar a dar-lhe preço.',
      basis: 'O porquê aceita no máximo 500 caracteres.',
      by: 'A carteira da sua sessão não serve para publicar.',
      meanwhile: 'Outra versão foi publicada enquanto isso: leia o caixa de novo.',
      other: 'O caixa diz: «{t}»',
    },
  },
  dialog: {
    title: 'Publicar a versão {n}',
    intro: 'O caixa guarda uma versão nova com a sua data; o que já foi cobrado não muda.',
    sizes: 'O que muda em cada tamanho',
    size: 'Tamanho',
    before: 'Antes',
    after: 'Depois',
    prices: '{r} ligado · {s} parado',
    vat: 'com IVA: {r} · {s}',
    added: 'Não estava (tamanho novo)',
    removed: 'Sai da tarifa',
    noSizes: 'Os preços não mudam.',
    rules: 'Regras que mudam',
    noRules: 'As regras não mudam.',
    starts: 'Começa em {d} (dia UTC; no seu horário, {t}).',
    note: 'Por quê',
    noNote: 'Sem nota.',
    mail: 'Ainda não avisa ninguém por e-mail.',
    confirm: 'Publicar a versão {n}',
    cancel: 'Cancelar',
    publishing: 'Publicando',
    refused: 'O caixa não a aceitou:',
    failed: 'O caixa não respondeu. O que você escreveu continua aqui; tente de novo.',
    close: 'Fechar',
  },
  published: 'Versão {n} publicada. Começa em {d}.',
  publishedClose: 'Entendi',
  history: {
    title: 'Histórico',
    heading: 'Versão {n} · desde {d}',
    states: {
      'in-force': 'em vigor',
      scheduled: 'programada',
      earlier: 'anterior',
      replaced: 'substituída antes de começar',
    },
    by: 'Publicada por {who} em {t}.',
    noNote: 'Sem nota.',
    load: 'Levar para a calculadora',
    loaded: 'A versão {n} está na calculadora.',
    empty: 'O caixa ainda não tem versões.',
    price: '{name}: {r} / {s}',
  },
};

export const PRICES_UI: Readonly<Record<SupportedLocale, PricesRoomMessages>> = {
  es: ES,
  en: EN,
  ja: JA,
  ko: KO,
  'pt-br': PT,
};
