/**
 * «Conectar una IA», the guide the panel's dialog tells a person who knows
 * nothing about it (lib/agentes-guia.ts says what is drawn where; these are
 * the words): the three ways, the ten questions, the tiles and the numbered
 * steps of each AI. Five locales, typed so a missing one does not compile.
 *
 * Plain words for someone who is not technical at all: no «OAuth», «MCP» or
 * «token» outside the advanced way (and where Hermes' own screen says them,
 * said once, with what they are). `**word**` is bold (lib `pieces`), `{n}`,
 * `{minutes}` and `{address}` are filled in by the dialog.
 *
 * Japanese and Korean are a best effort: a native speaker should read them.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { GuideClient, GuideWay, StepsKey } from '../lib/agentes-guia';

/** One numbered step: its title, what to do, and a small note under it. */
export interface GuideStep {
  readonly title: string;
  readonly body: string;
  readonly note?: string;
}

/** The ten questions of the FAQ, in the order of lib's `FAQ_GLYPHS`. */
type Ten<T> = readonly [T, T, T, T, T, T, T, T, T, T];

export interface GuideList {
  readonly title: string;
  readonly sub: string;
  readonly steps: readonly [GuideStep, GuideStep, GuideStep];
  /** The side card: its label and what will happen. */
  readonly after: { readonly label: string; readonly text: string };
  /** Small cards under it: a glyph, a line, and optionally a button to the other tab. */
  readonly notes: readonly {
    readonly glyph: 'robot' | 'lock-key' | 'shield-check';
    readonly text: string;
    readonly action?: string;
  }[];
}

export interface GuideMessages {
  readonly explain: {
    readonly sub: string;
    readonly waysLabel: string;
    readonly easiest: string;
    readonly who: string;
    readonly does: string;
    readonly happens: string;
    readonly ways: Readonly<
      Record<
        GuideWay,
        {
          readonly title: string;
          readonly who: string;
          readonly does: string;
          readonly happens: string;
          readonly cta: string;
        }
      >
    >;
  };
  readonly faq: {
    readonly title: string;
    readonly items: Ten<{ readonly q: string; readonly a: string }>;
    readonly foot: string;
  };
  readonly choose: {
    readonly back: string;
    readonly title: string;
    readonly sub: string;
    readonly tiles: Readonly<
      Record<GuideClient, { readonly name: string; readonly text: string; readonly chip?: string }>
    >;
  };
  readonly steps: {
    readonly back: string;
    /** `{n}`: the step's number, for screen readers. */
    readonly stepLabel: string;
    readonly addressLabel: string;
    /** The sample the small picture of numinia.com shows. */
    readonly mock: {
      readonly community: string;
      readonly name: string;
      readonly role: string;
      readonly none: string;
      readonly allow: string;
      readonly caption: string;
    };
    readonly hermes: {
      readonly tabs: string;
      readonly computer: string;
      readonly cloud: string;
      readonly link: string;
      readonly terminal: string;
      readonly terminalHelp: string;
      readonly copyLines: string;
      /** The warning on both Hermes tabs: asking its chat can take 10–15 minutes. `**bold**` allowed. */
      readonly timeWarn: string;
    };
    readonly other: {
      readonly tabs: string;
      readonly code: string;
      readonly key: string;
      readonly warnTitle: string;
      readonly warn: string;
      readonly createCode: string;
      readonly createKey: string;
      readonly commandHelp: string;
      readonly copyCommand: string;
    };
    readonly lists: Readonly<Record<StepsKey, GuideList>>;
  };
}

// The side card of the three ways that sign in is the same for each of them.
const AFTER_ES = {
  label: 'Lo que verás después',
  text: 'Se abrirá **numinia.com**. Eliges la comunidad y pulsas **Permitir**. Después vuelves a tu IA y ya puede entrar en tus mundos.',
};
const NOTES_ES = [
  {
    glyph: 'robot',
    text: 'Cuando termines, cierra esta ventana: tu IA aparecerá en la lista (si no sale, recarga la página).',
  },
] as const;

const ES: GuideMessages = {
  explain: {
    sub: 'Hay tres maneras de conectar tu IA. Casi todo el mundo usa la primera.',
    waysLabel: 'Tres maneras de conectar tu IA',
    easiest: 'La más fácil',
    who: 'Para quién',
    does: 'Qué vas a hacer',
    happens: 'Qué va a pasar',
    ways: {
      address: {
        title: 'Pegar una dirección y entrar con tu cuenta',
        who: 'Claude, ChatGPT y Hermes. La más fácil: te la recomendamos.',
        does: 'Copias una dirección y la pegas en tu IA.',
        happens:
          'Se abrirá numinia.com. Eliges la comunidad y pulsas «Permitir». Vuelves a tu IA y ya puede entrar en tus mundos. Unos 2 minutos.',
        cta: 'Elegir mi IA',
      },
      code: {
        title: 'Con un código del panel',
        who: 'IAs y programas que no tienen inicio de sesión.',
        does: 'Pides un código (token) en el panel, lo copias y lo pegas en tu IA junto a la dirección.',
        happens:
          'La IA entra con ese código, sin abrir numinia.com. Guárdalo bien: es como una contraseña y solo se enseña una vez.',
        cta: 'Pedir un código',
      },
      key: {
        title: 'Con clave propia (avanzado)',
        who: 'Para programadores. Si no sabes qué es, no la necesitas.',
        does: 'Tu IA crea su clave y pegas aquí la parte pública.',
        happens: 'La clave privada nunca sale de la máquina de tu IA. Entra sin iniciar sesión.',
        cta: 'Ver cómo se hace',
      },
    },
  },
  faq: {
    title: 'Antes de empezar: lo que suele preguntar la gente',
    items: [
      {
        q: '¿Qué podrá hacer la IA?',
        a: 'Entrar en los mundos de la comunidad que elijas, moverse, hablar y construir. **Solo hace lo que permite su rol:** construir solo si el rol que le des lo permite. Con el rol «ninguno» solo mira y habla.',
      },
      {
        q: '¿Cuánto tarda?',
        a: 'Con Claude o ChatGPT, un par de minutos. Con Hermes, lo mismo si sigues los pasos tú; si se lo pides a su chat con un modelo gratuito, puede tardar 10–15 minutos.',
      },
      {
        q: '¿Puede ver mis datos o mi cartera?',
        a: 'No. **Nunca ve saldos ni carteras.** No puede gastar saldo, cambiar roles ni encender o apagar mundos. Solo actúa en la comunidad que tú elijas.',
      },
      {
        q: '¿Me cuesta dinero?',
        a: 'Por ahora, **conectarla no te cuesta nada**: Numinia paga el tiempo que la IA pasa dentro de los mundos (hasta {n} IAs de una comunidad a la vez; el cuerpo de la IA sale solo tras {minutes} minutos sin usarse). Lo que cobre tu IA (Claude, ChatGPT…) lo pagas a ellos, como siempre. Más adelante podrá pagarlo la comunidad con su saldo, y te lo diremos antes.',
      },
      {
        q: '¿Puedo apagarla o quitarla cuando quiera?',
        a: 'Sí, siempre, desde esta página. **Apagar** la saca de los mundos. **Desconectar** corta su conexión. **Quitar** la borra de la comunidad. Si está dentro de un mundo, sale en unos minutos (10 como máximo).',
      },
      {
        q: '¿Qué es «Activa» y qué es «Dormida»?',
        a: '**Activa**: atenta y dispuesta a interactuar. **Dormida**: mira y escucha, solo habla si la llaman y no construye. Puedes cambiarla cuando quieras.',
      },
      {
        q: '¿Oye lo que dice la gente?',
        a: 'Solo si lo enciendes. Cada IA tiene su interruptor **«Oír lo que se habla cerca»**, apagado de serie: lo enciendes o apagas cuando quieras en su tarjeta.',
      },
      {
        q: '¿Qué pasa si comparto la dirección?',
        a: 'Nada grave: la dirección sola no da acceso a nada. Quien la use tiene que entrar en numinia.com, y alguien que pueda gestionar roles tiene que pulsar «Permitir». **El código (token) sí es secreto:** quien lo tenga puede hacerse pasar por la IA. Si se escapa, renuévalo.',
      },
      {
        q: '¿Y si mi IA no aparece en la lista?',
        a: 'Recarga la página. Si sigue sin salir, mira que en numinia.com llegaste a pulsar «Permitir» y que elegiste esta comunidad. Si no, vuelve a tu IA y pide conectar otra vez.',
      },
      {
        q: '¿Por qué me pide elegir comunidad y rol?',
        a: 'Porque la IA entra como una persona más **en una comunidad**, y el **rol** decide qué puede hacer ahí. Solo ves los roles que tú puedes dar, y tú respondes de ella.',
      },
    ],
    foot: 'Siempre puedes apagar, desconectar o quitar una IA desde esta misma lista.',
  },
  choose: {
    back: 'Las tres maneras',
    title: '¿Qué IA quieres conectar?',
    sub: 'Elige la que usas. Te diremos paso a paso qué pulsar.',
    tiles: {
      claude: { name: 'Claude', text: 'La app o la web de Claude.' },
      chatgpt: { name: 'ChatGPT', text: 'La web de ChatGPT.' },
      hermes: { name: 'Hermes', text: 'En tu ordenador o en la nube.' },
      other: {
        name: 'Otra IA o un programa',
        text: 'Que no tiene inicio de sesión.',
        chip: 'Avanzado · con código',
      },
    },
  },
  steps: {
    back: 'Elegir otra IA',
    stepLabel: 'Paso {n}',
    addressLabel: 'Dirección para tu IA',
    mock: {
      community: 'Comunidad',
      name: 'Mi comunidad',
      role: 'Rol',
      none: 'Ninguno',
      allow: 'Permitir',
      caption: 'Así se ve numinia.com cuando pide permiso (dibujo de muestra)',
    },
    hermes: {
      tabs: 'Dónde tienes Hermes',
      computer: 'Hermes en mi ordenador',
      cloud: 'Hermes en la nube',
      link: 'Añadir a Hermes',
      terminal: '¿Prefieres la terminal?',
      terminalHelp:
        'Escribe estas dos líneas (la segunda abre numinia.com para que entres). Si Hermes está en un servidor y el navegador acaba en una página de error, haz lo del paso 3.',
      copyLines: 'Copiar las líneas',
      timeWarn:
        '**Hazlo tú con estos pasos: son unos 2 minutos.** Si se lo pides al chat de Hermes, sobre todo con un modelo gratuito, puede tardar 10–15 minutos o quedarse a medias.',
    },
    other: {
      tabs: 'Cómo entra tu IA',
      code: 'Con un código',
      key: 'Con clave propia',
      warnTitle: 'Opción avanzada',
      warn: 'Solo si tu IA no puede iniciar sesión (un programa o Hermes en un servidor). Si usas Claude, ChatGPT o Hermes con panel, vuelve y elige el camino fácil.',
      createCode: 'Crear código',
      createKey: 'Empezar',
      commandHelp: 'En Hermes, esta línea te pide el código:',
      copyCommand: 'Copiar la línea',
    },
    lists: {
      claude: {
        title: 'Conectar Claude',
        sub: 'Tres pasos. Tardas un par de minutos.',
        steps: [
          {
            title: 'Copia la dirección',
            body: 'Es la dirección que le dice a Claude dónde está Numinia.',
          },
          {
            title: 'En Claude, añade un conector',
            body: 'Abre **Conectores** (en el menú «Personalizar» o en «Ajustes»), pulsa **Añadir conector personalizado**, ponle de nombre «Numinia», pega la dirección y sigue hasta **Añadir**.',
            note: 'Si tu Claude es de una empresa, puede que solo el propietario pueda añadir conectores.',
          },
          {
            title: 'Pulsa «Conectar» y permite el acceso',
            body: 'Claude te llevará a **numinia.com**: elige la comunidad y pulsa **Permitir**. Luego vuelve a Claude.',
          },
        ],
        after: AFTER_ES,
        notes: NOTES_ES,
      },
      chatgpt: {
        title: 'Conectar ChatGPT',
        sub: 'Tres pasos. Los nombres de los botones pueden variar según tu cuenta.',
        steps: [
          {
            title: 'Copia la dirección',
            body: 'Es la dirección que le dice a ChatGPT dónde está Numinia.',
          },
          {
            title: 'En ChatGPT, crea una app nueva',
            body: 'Entra en **Ajustes › Aplicaciones** y pulsa **Crear**. Si no ves esa opción, activa antes el **modo desarrollador** en los ajustes avanzados.',
            note: 'Depende de tu plan: en cuentas de empresa puede que tenga que activarlo quien administra ChatGPT.',
          },
          {
            title: 'Pega la dirección y entra con numinia.com',
            body: 'Ponle de nombre «Numinia», pega la dirección y, si te pregunta cómo entrar, elige **OAuth** (inicio de sesión). Se abrirá **numinia.com**: elige la comunidad y pulsa **Permitir**. Después pulsa **Crear**.',
          },
        ],
        after: AFTER_ES,
        notes: NOTES_ES,
      },
      'hermes-computer': {
        title: 'Conectar Hermes',
        sub: 'Elige dónde tienes Hermes.',
        steps: [
          {
            title: 'Pulsa «Añadir a Hermes»',
            body: 'Se abrirá la app de Hermes de tu ordenador con todo preparado.',
            note: 'No se lo pidas al chat de Hermes: ahí no se puede conectar. Este botón sí.',
          },
          {
            title: 'Confirma en Hermes',
            body: 'Hermes te enseña qué va a añadir y te pregunta antes. Pulsa para aceptar.',
          },
          {
            title: 'Permite el acceso en numinia.com',
            body: 'Se abrirá **numinia.com**: elige la comunidad y pulsa **Permitir**. Luego vuelve a Hermes.',
            note: '¿No se abre Hermes? Añádelo tú en su panel (pestaña «Hermes en la nube»): la dirección es {address}',
          },
        ],
        after: AFTER_ES,
        notes: NOTES_ES,
      },
      'hermes-cloud': {
        title: 'Conectar Hermes',
        sub: 'Elige dónde tienes Hermes.',
        steps: [
          {
            title: 'Copia la dirección',
            body: 'Es la dirección que le dice a Hermes dónde está Numinia.',
          },
          {
            title: 'No se lo pidas al chat: añádelo en el panel',
            body: 'Abre el panel web de Hermes, entra en **MCP › Añadir servidor**, ponle de nombre **numinia**, pega la dirección y elige **OAuth** (entrar con inicio de sesión).',
            note: '«MCP» es solo el nombre de esa sección. El chat de Hermes no puede conectar servidores nuevos: solo instala los de su catálogo. Por eso se hace en el panel.',
          },
          {
            title: 'Pulsa «Authenticate» y permite el acceso',
            body: 'Se abrirá **numinia.com**: elige la comunidad y pulsa **Permitir**. Vuelve a tu panel de Hermes.',
            note: 'Si el navegador acaba en una página de error con una dirección que empieza por «http://127.0.0.1», es normal en Hermes en la nube: copia esa dirección entera de la barra del navegador y pégala en Hermes, donde te la pide.',
          },
        ],
        after: AFTER_ES,
        notes: NOTES_ES,
      },
      'other-code': {
        title: 'Otra IA, con un código',
        sub: 'Un camino más técnico, sin inicio de sesión.',
        steps: [
          {
            title: 'Pide un código (token) en el panel',
            body: 'Un **token** es una contraseña larga que identifica a tu IA. **Solo se enseña una vez:** cópialo y guárdalo.',
          },
          {
            title: 'Copia la dirección',
            body: 'Es dónde tu IA tiene que conectarse.',
          },
          {
            title: 'Pégalos en tu IA',
            body: 'Pon la dirección y, donde tu IA pida una «clave de API» o «token», pega el código.',
          },
        ],
        after: {
          label: 'Lo que pasará',
          text: 'Tu IA entra con el código, **sin abrir numinia.com**. Aparecerá en la lista de Agentes como «Desde el panel (con código)».',
        },
        notes: [
          {
            glyph: 'lock-key',
            text: 'Si compartes el código, cualquiera puede hacerse pasar por tu IA. Si se escapa, renuévalo en el menú ⋯ de la IA.',
          },
          {
            glyph: 'shield-check',
            text: '**¿Programador?** También puedes usar una clave propia: tu IA crea su clave y tú pegas aquí la parte pública.',
            action: 'Ver cómo se hace',
          },
        ],
      },
      'other-key': {
        title: 'Otra IA, con clave propia',
        sub: 'Para programadores. Tu IA crea su clave y tú pegas aquí la parte pública.',
        steps: [
          {
            title: 'Dale un nombre y elige qué puede hacer',
            body: 'Dices cómo se llama tu IA y si solo mira y habla o también construye.',
          },
          {
            title: 'Crea su clave donde vive tu IA',
            body: 'Te damos una línea para copiar. Crea la clave y enseña su parte pública. La clave privada no sale de esa máquina.',
          },
          {
            title: 'Pega la parte pública y añádela',
            body: 'La pegas aquí, miras el resumen y pulsas **Añadir**.',
          },
        ],
        after: {
          label: 'Lo que pasará',
          text: 'Tu IA entra con su clave, **sin abrir numinia.com**. Aparecerá en la lista de Agentes con la marca «Con clave».',
        },
        notes: [
          {
            glyph: 'lock-key',
            text: 'Si no sabes qué es una clave, no la necesitas: vuelve y elige otra manera.',
          },
        ],
      },
    },
  },
};

const AFTER_EN = {
  label: 'What you will see next',
  text: '**numinia.com** will open. You pick the community and press **Allow**. Then you go back to your AI and it can enter your worlds.',
};
const NOTES_EN = [
  {
    glyph: 'robot',
    text: 'When you are done, close this window: your AI will show up in the list (if it does not, reload the page).',
  },
] as const;

const EN: GuideMessages = {
  explain: {
    sub: 'There are three ways to connect your AI. Almost everyone uses the first.',
    waysLabel: 'Three ways to connect your AI',
    easiest: 'The easiest',
    who: 'Who it is for',
    does: 'What you will do',
    happens: 'What will happen',
    ways: {
      address: {
        title: 'Paste an address and sign in with your account',
        who: 'Claude, ChatGPT and Hermes. The easiest: we recommend it.',
        does: 'You copy an address and paste it into your AI.',
        happens:
          'numinia.com will open. You pick the community and press “Allow”. You go back to your AI and it can enter your worlds. About 2 minutes.',
        cta: 'Choose my AI',
      },
      code: {
        title: 'With a code from the panel',
        who: 'AIs and programs that have no sign-in.',
        does: 'You ask for a code (a token) in the panel, copy it and paste it into your AI next to the address.',
        happens:
          'The AI enters with that code, without opening numinia.com. Keep it safe: it is like a password and it is shown only once.',
        cta: 'Ask for a code',
      },
      key: {
        title: 'With its own key (advanced)',
        who: 'For programmers. If you do not know what it is, you do not need it.',
        does: 'Your AI makes its own key and you paste its public part here.',
        happens: 'The private key never leaves your AI’s machine. It enters without signing in.',
        cta: 'See how it is done',
      },
    },
  },
  faq: {
    title: 'Before you start: what people usually ask',
    items: [
      {
        q: 'What will the AI be able to do?',
        a: 'Enter the worlds of the community you choose, move, talk and build. **It only does what its role allows:** it builds only if the role you give it allows it. With the role “none” it only looks and talks.',
      },
      {
        q: 'How long does it take?',
        a: 'With Claude or ChatGPT, a couple of minutes. With Hermes, the same if you follow the steps yourself; if you ask its chat with a free model, it can take 10–15 minutes.',
      },
      {
        q: 'Can it see my data or my wallet?',
        a: 'No. **It never sees balances or wallets.** It cannot spend balance, change roles or switch worlds on or off. It only acts in the community you choose.',
      },
      {
        q: 'Does it cost me money?',
        a: 'For now, **connecting it costs you nothing**: Numinia pays for the time the AI spends inside the worlds (up to {n} AIs of one community at once; an AI’s body leaves by itself after {minutes} minutes without use). What your AI charges (Claude, ChatGPT…) you pay to them, as always. Later the community may pay for it with its balance, and we will tell you first.',
      },
      {
        q: 'Can I switch it off or remove it whenever I want?',
        a: 'Yes, always, from this page. **Switch off** takes it out of the worlds. **Disconnect** cuts its connection. **Remove** deletes it from the community. If it is inside a world, it leaves within a few minutes (10 at most).',
      },
      {
        q: 'What are “Active” and “Asleep”?',
        a: '**Active**: attentive and ready to interact. **Asleep**: it watches and listens, speaks only if called and does not build. You can change it whenever you want.',
      },
      {
        q: 'Does it hear what people say?',
        a: 'Only if you turn it on. Each AI has its own switch, **“Hear what is said nearby”**, off by default: you turn it on or off whenever you want on its card.',
      },
      {
        q: 'What happens if I share the address?',
        a: 'Nothing serious: the address alone gives access to nothing. Whoever uses it has to sign in at numinia.com, and someone who can manage roles has to press “Allow”. **The code (token) is secret:** whoever has it can pass as the AI. If it leaks, renew it.',
      },
      {
        q: 'What if my AI does not show up in the list?',
        a: 'Reload the page. If it still does not show, check that you pressed “Allow” on numinia.com and chose this community. If not, go back to your AI and ask to connect again.',
      },
      {
        q: 'Why does it ask me to choose a community and a role?',
        a: 'Because the AI enters as one more person **in one community**, and the **role** decides what it can do there. You only see the roles you can give, and you answer for it.',
      },
    ],
    foot: 'You can always switch off, disconnect or remove an AI from this same list.',
  },
  choose: {
    back: 'The three ways',
    title: 'Which AI do you want to connect?',
    sub: 'Pick the one you use. We will tell you step by step what to press.',
    tiles: {
      claude: { name: 'Claude', text: 'The Claude app or website.' },
      chatgpt: { name: 'ChatGPT', text: 'The ChatGPT website.' },
      hermes: { name: 'Hermes', text: 'On your computer or in the cloud.' },
      other: {
        name: 'Another AI or a program',
        text: 'One with no sign-in.',
        chip: 'Advanced · with a code',
      },
    },
  },
  steps: {
    back: 'Choose another AI',
    stepLabel: 'Step {n}',
    addressLabel: 'Address for your AI',
    mock: {
      community: 'Community',
      name: 'My community',
      role: 'Role',
      none: 'None',
      allow: 'Allow',
      caption: 'How numinia.com looks when it asks for permission (sample drawing)',
    },
    hermes: {
      tabs: 'Where you have Hermes',
      computer: 'Hermes on my computer',
      cloud: 'Hermes in the cloud',
      link: 'Add to Hermes',
      terminal: 'Prefer the terminal?',
      terminalHelp:
        'Type these two lines (the second opens numinia.com for you to sign in). If Hermes is on a server and the browser ends on an error page, do what step 3 says.',
      copyLines: 'Copy the lines',
      timeWarn:
        '**Do it yourself with these steps: it takes about 2 minutes.** If you ask Hermes’ chat instead, especially with a free model, it can take 10–15 minutes or stop halfway.',
    },
    other: {
      tabs: 'How your AI gets in',
      code: 'With a code',
      key: 'With its own key',
      warnTitle: 'Advanced option',
      warn: 'Only if your AI cannot sign in (a program, or Hermes on a server). If you use Claude, ChatGPT or Hermes with a panel, go back and pick the easy way.',
      createCode: 'Create a code',
      createKey: 'Start',
      commandHelp: 'In Hermes, this line asks for the code:',
      copyCommand: 'Copy the line',
    },
    lists: {
      claude: {
        title: 'Connect Claude',
        sub: 'Three steps. It takes a couple of minutes.',
        steps: [
          {
            title: 'Copy the address',
            body: 'It is the address that tells Claude where Numinia is.',
          },
          {
            title: 'In Claude, add a connector',
            body: 'Open **Connectors** (in the “Customize” menu or in “Settings”), press **Add custom connector**, name it “Numinia”, paste the address and go on to **Add**.',
            note: 'If your Claude belongs to a company, maybe only the owner can add connectors.',
          },
          {
            title: 'Press “Connect” and allow access',
            body: 'Claude will take you to **numinia.com**: pick the community and press **Allow**. Then go back to Claude.',
          },
        ],
        after: AFTER_EN,
        notes: NOTES_EN,
      },
      chatgpt: {
        title: 'Connect ChatGPT',
        sub: 'Three steps. Button names may vary with your account.',
        steps: [
          {
            title: 'Copy the address',
            body: 'It is the address that tells ChatGPT where Numinia is.',
          },
          {
            title: 'In ChatGPT, create a new app',
            body: 'Go to **Settings › Apps** and press **Create**. If you do not see it, first turn on **developer mode** in the advanced settings.',
            note: 'It depends on your plan: on company accounts, whoever administers ChatGPT may have to turn it on.',
          },
          {
            title: 'Paste the address and sign in with numinia.com',
            body: 'Name it “Numinia”, paste the address and, if it asks how to sign in, choose **OAuth** (sign-in). **numinia.com** will open: pick the community and press **Allow**. Then press **Create**.',
          },
        ],
        after: AFTER_EN,
        notes: NOTES_EN,
      },
      'hermes-computer': {
        title: 'Connect Hermes',
        sub: 'Choose where you have Hermes.',
        steps: [
          {
            title: 'Press “Add to Hermes”',
            body: 'The Hermes app on your computer will open with everything ready.',
            note: 'Do not ask Hermes’ chat to do it: it cannot connect there. This button can.',
          },
          {
            title: 'Confirm in Hermes',
            body: 'Hermes shows what it will add and asks first. Press to accept.',
          },
          {
            title: 'Allow access on numinia.com',
            body: '**numinia.com** will open: pick the community and press **Allow**. Then go back to Hermes.',
            note: 'Hermes does not open? Add it yourself in its panel (the “Hermes in the cloud” tab): the address is {address}',
          },
        ],
        after: AFTER_EN,
        notes: NOTES_EN,
      },
      'hermes-cloud': {
        title: 'Connect Hermes',
        sub: 'Choose where you have Hermes.',
        steps: [
          {
            title: 'Copy the address',
            body: 'It is the address that tells Hermes where Numinia is.',
          },
          {
            title: 'Do not ask the chat: add it in the panel',
            body: 'Open Hermes’ web panel, go to **MCP › Add server**, name it **numinia**, paste the address and choose **OAuth** (sign in).',
            note: '“MCP” is just the name of that section. Hermes’ chat cannot connect new servers: it only installs the ones in its catalog. That is why it is done in the panel.',
          },
          {
            title: 'Press “Authenticate” and allow access',
            body: '**numinia.com** will open: pick the community and press **Allow**. Go back to your Hermes panel.',
            note: 'If the browser ends on an error page with an address that starts with “http://127.0.0.1”, that is normal for Hermes in the cloud: copy that whole address from the browser’s bar and paste it into Hermes, where it asks for it.',
          },
        ],
        after: AFTER_EN,
        notes: NOTES_EN,
      },
      'other-code': {
        title: 'Another AI, with a code',
        sub: 'A more technical way, with no sign-in.',
        steps: [
          {
            title: 'Ask for a code (a token) in the panel',
            body: 'A **token** is a long password that identifies your AI. **It is shown only once:** copy it and keep it.',
          },
          {
            title: 'Copy the address',
            body: 'It is where your AI has to connect.',
          },
          {
            title: 'Paste them into your AI',
            body: 'Put in the address and, where your AI asks for an “API key” or “token”, paste the code.',
          },
        ],
        after: {
          label: 'What will happen',
          text: 'Your AI enters with the code, **without opening numinia.com**. It will show up in the list as “From the panel (with a code)”.',
        },
        notes: [
          {
            glyph: 'lock-key',
            text: 'If you share the code, anyone can pass as your AI. If it leaks, renew it in the AI’s ⋯ menu.',
          },
          {
            glyph: 'shield-check',
            text: '**A programmer?** You can also use its own key: your AI makes its key and you paste its public part here.',
            action: 'See how it is done',
          },
        ],
      },
      'other-key': {
        title: 'Another AI, with its own key',
        sub: 'For programmers. Your AI makes its key and you paste its public part here.',
        steps: [
          {
            title: 'Give it a name and choose what it can do',
            body: 'You say what your AI is called and whether it only looks and talks or also builds.',
          },
          {
            title: 'Make its key where your AI lives',
            body: 'We give you a line to copy. It makes the key and shows its public part. The private key does not leave that machine.',
          },
          {
            title: 'Paste the public part and add it',
            body: 'You paste it here, look at the summary and press **Add**.',
          },
        ],
        after: {
          label: 'What will happen',
          text: 'Your AI enters with its key, **without opening numinia.com**. It will show up in the list marked “With a key”.',
        },
        notes: [
          {
            glyph: 'lock-key',
            text: 'If you do not know what a key is, you do not need it: go back and pick another way.',
          },
        ],
      },
    },
  },
};

const AFTER_JA = {
  label: 'このあとの流れ',
  text: '**numinia.com** が開きます。コミュニティを選んで **許可する** を押します。そのあとAIに戻れば、あなたの世界に入れるようになります。',
};
const NOTES_JA = [
  {
    glyph: 'robot',
    text: '終わったらこのウィンドウを閉じてください。AIが一覧に表示されます（表示されないときはページを読み込み直してください）。',
  },
] as const;

const JA: GuideMessages = {
  explain: {
    sub: 'AIをつなぐ方法は3つあります。ほとんどの人は1つ目を使います。',
    waysLabel: 'AIをつなぐ3つの方法',
    easiest: '一番かんたん',
    who: 'こんな人向け',
    does: 'やること',
    happens: '起こること',
    ways: {
      address: {
        title: 'アドレスを貼り付けて、アカウントでログインする',
        who: 'Claude、ChatGPT、Hermes。一番かんたんなので、おすすめです。',
        does: 'アドレスをコピーして、AIに貼り付けます。',
        happens:
          'numinia.com が開きます。コミュニティを選んで「許可する」を押し、AIに戻れば、あなたの世界に入れるようになります。所要時間は約2分です。',
        cta: 'AIを選ぶ',
      },
      code: {
        title: 'パネルのコードでつなぐ',
        who: 'ログインのないAIやプログラム。',
        does: 'パネルでコード（トークン）を作り、コピーして、アドレスと一緒にAIに貼り付けます。',
        happens:
          'AIはそのコードで入ります。numinia.com は開きません。パスワードと同じなので大切に保管してください。表示されるのは1回だけです。',
        cta: 'コードを作る',
      },
      key: {
        title: '自分の鍵でつなぐ（上級者向け）',
        who: 'プログラマー向けです。何のことかわからなければ、必要ありません。',
        does: 'AIが自分の鍵を作り、その公開部分をここに貼り付けます。',
        happens: '秘密鍵はAIのあるマシンから出ません。ログインなしで入ります。',
        cta: 'やり方を見る',
      },
    },
  },
  faq: {
    title: '始める前に：よくある質問',
    items: [
      {
        q: 'AIは何ができますか？',
        a: 'あなたが選んだコミュニティの世界に入り、動き、話し、建てることができます。**できるのはロールで許されたことだけです。** 建てられるのは、与えたロールが許す場合だけ。ロールが「なし」なら、見て話すだけです。',
      },
      {
        q: 'どのくらい時間がかかりますか？',
        a: 'ClaudeやChatGPTなら2分ほどです。Hermesも、手順どおり自分で進めれば同じです。無料モデルでHermesのチャットに頼むと、10〜15分かかることがあります。',
      },
      {
        q: '私のデータやウォレットを見られますか？',
        a: 'いいえ。**残高やウォレットは決して見えません。** 残高を使うことも、ロールを変えることも、世界のオン・オフもできません。あなたが選んだコミュニティの中だけで動きます。',
      },
      {
        q: 'お金はかかりますか？',
        a: '今のところ、**つなぐだけなら無料です。** AIが世界で過ごす時間はNuminiaが負担します（1つのコミュニティで同時に最大{n}つのAI。AIの体は、{minutes}分使われないと自動で出ます）。AI側（Claude、ChatGPTなど）の料金は、いつもどおりそれぞれに支払います。将来はコミュニティの残高で支払えるようにするかもしれませんが、その前にお知らせします。',
      },
      {
        q: 'いつでもオフにしたり削除したりできますか？',
        a: 'はい、このページからいつでもできます。**オフ**にすると世界から出ます。**接続を切る**とつながりが切れます。**削除**するとコミュニティから消えます。世界にいる場合は、数分以内（長くても10分）に出ます。',
      },
      {
        q: '「アクティブ」と「スリープ」って何ですか？',
        a: '**アクティブ**：注意深く、やり取りに応じられる状態。**スリープ**：見て聞くだけで、呼ばれたときだけ話し、建てません。いつでも変えられます。',
      },
      {
        q: '人の話を聞いていますか？',
        a: 'オンにしたときだけです。AIごとに **「近くの会話を聞く」** のスイッチがあり、最初はオフです。そのAIのカードでいつでも切り替えられます。',
      },
      {
        q: 'アドレスを人に教えるとどうなりますか？',
        a: '心配ありません。アドレスだけでは何にもアクセスできません。使う人は numinia.com にログインし、ロールを管理できる人が「許可する」を押す必要があります。**コード（トークン）は秘密です。** 持っている人はAIになりすませます。漏れたら作り直してください。',
      },
      {
        q: 'AIが一覧に出てきません。',
        a: 'ページを読み込み直してください。それでも出ないときは、numinia.com で「許可する」を押したか、このコミュニティを選んだかを確認してください。違っていたら、AIに戻ってもう一度つなぎ直します。',
      },
      {
        q: 'なぜコミュニティとロールを選ぶのですか？',
        a: 'AIは、**1つのコミュニティ**の一員のように入り、**ロール**がそこでできることを決めるからです。選べるのはあなたが与えられるロールだけで、AIの責任はあなたが持ちます。',
      },
    ],
    foot: 'AIのオフ、接続を切る、削除は、いつでもこの一覧からできます。',
  },
  choose: {
    back: '3つの方法',
    title: 'どのAIをつなぎますか？',
    sub: '使っているものを選んでください。押すところを順番に案内します。',
    tiles: {
      claude: { name: 'Claude', text: 'Claudeのアプリまたはウェブ。' },
      chatgpt: { name: 'ChatGPT', text: 'ChatGPTのウェブ。' },
      hermes: { name: 'Hermes', text: 'パソコン、またはクラウド。' },
      other: {
        name: '別のAIやプログラム',
        text: 'ログインのないもの。',
        chip: '上級者向け・コード',
      },
    },
  },
  steps: {
    back: '別のAIを選ぶ',
    stepLabel: 'ステップ {n}',
    addressLabel: 'AI用のアドレス',
    mock: {
      community: 'コミュニティ',
      name: 'わたしのコミュニティ',
      role: 'ロール',
      none: 'なし',
      allow: '許可する',
      caption: '許可を求めるときの numinia.com のイメージ（見本の絵）',
    },
    hermes: {
      tabs: 'Hermesの場所',
      computer: 'パソコンのHermes',
      cloud: 'クラウドのHermes',
      link: 'Hermesに追加',
      terminal: 'ターミナルを使いますか？',
      terminalHelp:
        '次の2行を入力します（2行目で numinia.com が開きログインします）。Hermesがサーバーにあり、ブラウザがエラーページで止まったときは、ステップ3のとおりにします。',
      copyLines: '2行をコピー',
      timeWarn:
        '**この手順どおりに自分でやれば、約2分です。** HermesのチャットにAIの接続を頼むと、特に無料モデルでは10〜15分かかったり、途中で止まったりすることがあります。',
    },
    other: {
      tabs: 'AIの入り方',
      code: 'コードで',
      key: '自分の鍵で',
      warnTitle: '上級者向けの方法',
      warn: 'AIがログインできない場合（プログラムや、サーバー上のHermes）だけです。Claude、ChatGPT、パネルのあるHermesなら、戻ってかんたんな方法を選んでください。',
      createCode: 'コードを作る',
      createKey: '始める',
      commandHelp: 'Hermesでは、この1行でコードを尋ねられます：',
      copyCommand: 'この行をコピー',
    },
    lists: {
      claude: {
        title: 'Claudeをつなぐ',
        sub: '3ステップ。2〜3分で終わります。',
        steps: [
          {
            title: 'アドレスをコピー',
            body: 'Claudeに、Numiniaの場所を教えるアドレスです。',
          },
          {
            title: 'Claudeでコネクタを追加',
            body: '**コネクタ**（「カスタマイズ」または「設定」のメニュー）を開き、**カスタムコネクタを追加**を押して、名前を「Numinia」にし、アドレスを貼り付けて**追加**まで進みます。',
            note: '会社のClaudeの場合、コネクタを追加できるのはオーナーだけのことがあります。',
          },
          {
            title: '「接続」を押してアクセスを許可',
            body: 'Claudeが **numinia.com** に案内します。コミュニティを選んで**許可する**を押し、Claudeに戻ります。',
          },
        ],
        after: AFTER_JA,
        notes: NOTES_JA,
      },
      chatgpt: {
        title: 'ChatGPTをつなぐ',
        sub: '3ステップ。ボタンの名前はアカウントによって違うことがあります。',
        steps: [
          {
            title: 'アドレスをコピー',
            body: 'ChatGPTに、Numiniaの場所を教えるアドレスです。',
          },
          {
            title: 'ChatGPTで新しいアプリを作る',
            body: '**設定 › アプリ**を開いて**作成**を押します。見当たらないときは、先に詳細設定で**開発者モード**をオンにします。',
            note: 'プランによって違います。会社のアカウントでは、ChatGPTの管理者がオンにする必要があるかもしれません。',
          },
          {
            title: 'アドレスを貼り付けて numinia.com でログイン',
            body: '名前を「Numinia」にしてアドレスを貼り付け、ログイン方法を聞かれたら**OAuth**（ログイン）を選びます。**numinia.com** が開くので、コミュニティを選んで**許可する**を押し、最後に**作成**を押します。',
          },
        ],
        after: AFTER_JA,
        notes: NOTES_JA,
      },
      'hermes-computer': {
        title: 'Hermesをつなぐ',
        sub: 'Hermesがある場所を選んでください。',
        steps: [
          {
            title: '「Hermesに追加」を押す',
            body: 'パソコンのHermesアプリが、準備された状態で開きます。',
            note: 'Hermesのチャットには頼まないでください。そこでは接続できません。このボタンならできます。',
          },
          {
            title: 'Hermesで確認',
            body: 'Hermesが追加する内容を見せて、先に確認します。押して承認します。',
          },
          {
            title: 'numinia.com でアクセスを許可',
            body: '**numinia.com** が開くので、コミュニティを選んで**許可する**を押します。そのあとHermesに戻ります。',
            note: 'Hermesが開かないときは、Hermesのパネル（「クラウドのHermes」タブ）で自分で追加します。アドレスは {address}',
          },
        ],
        after: AFTER_JA,
        notes: NOTES_JA,
      },
      'hermes-cloud': {
        title: 'Hermesをつなぐ',
        sub: 'Hermesがある場所を選んでください。',
        steps: [
          {
            title: 'アドレスをコピー',
            body: 'Hermesに、Numiniaの場所を教えるアドレスです。',
          },
          {
            title: 'チャットに頼まず、パネルで追加する',
            body: 'Hermesのウェブパネルを開き、**MCP › サーバーを追加**に進みます。名前は **numinia**、アドレスを貼り付け、**OAuth**（ログイン）を選びます。',
            note: '「MCP」はその項目の名前にすぎません。Hermesのチャットは新しいサーバーを接続できず、カタログにあるものを入れるだけです。だからパネルで行います。',
          },
          {
            title: '「Authenticate」を押してアクセスを許可',
            body: '**numinia.com** が開くので、コミュニティを選んで**許可する**を押します。Hermesのパネルに戻ります。',
            note: 'ブラウザが「http://127.0.0.1」で始まるアドレスのエラーページで止まっても、クラウドのHermesでは普通のことです。そのアドレス全体をブラウザのアドレスバーからコピーして、Hermesの入力欄に貼り付けてください。',
          },
        ],
        after: AFTER_JA,
        notes: NOTES_JA,
      },
      'other-code': {
        title: '別のAI、コードで',
        sub: '少し技術的な方法です。ログインはありません。',
        steps: [
          {
            title: 'パネルでコード（トークン）を作る',
            body: '**トークン**は、AIを見分けるための長いパスワードです。**表示されるのは1回だけ**なので、コピーして保管してください。',
          },
          {
            title: 'アドレスをコピー',
            body: 'AIがつながる先です。',
          },
          {
            title: 'AIに貼り付ける',
            body: 'アドレスを入れ、AIが「APIキー」や「トークン」を求める欄にコードを貼り付けます。',
          },
        ],
        after: {
          label: '起こること',
          text: 'AIはコードで入ります。**numinia.com は開きません。** 一覧には「パネルから（コード）」と表示されます。',
        },
        notes: [
          {
            glyph: 'lock-key',
            text: 'コードを人に教えると、誰でもAIになりすませます。漏れたら、AIの ⋯ メニューで作り直してください。',
          },
          {
            glyph: 'shield-check',
            text: '**プログラマーですか？** 自分の鍵も使えます。AIが鍵を作り、その公開部分をここに貼り付けます。',
            action: 'やり方を見る',
          },
        ],
      },
      'other-key': {
        title: '別のAI、自分の鍵で',
        sub: 'プログラマー向けです。AIが鍵を作り、その公開部分をここに貼り付けます。',
        steps: [
          {
            title: '名前をつけて、できることを選ぶ',
            body: 'AIの名前と、見て話すだけか、建てることもできるかを決めます。',
          },
          {
            title: 'AIのいる場所で鍵を作る',
            body: 'コピーする1行を用意します。それで鍵が作られ、公開部分が表示されます。秘密鍵はそのマシンから出ません。',
          },
          {
            title: '公開部分を貼り付けて追加',
            body: 'ここに貼り付け、まとめを確認して**追加**を押します。',
          },
        ],
        after: {
          label: '起こること',
          text: 'AIは鍵で入ります。**numinia.com は開きません。** 一覧には「鍵で接続」と表示されます。',
        },
        notes: [
          {
            glyph: 'lock-key',
            text: '鍵が何かわからなければ、必要ありません。戻って別の方法を選んでください。',
          },
        ],
      },
    },
  },
};

const AFTER_KO = {
  label: '그다음에 보게 될 것',
  text: '**numinia.com**이 열립니다. 커뮤니티를 고르고 **허용**을 누르세요. 그런 다음 AI로 돌아가면 내 월드에 들어갈 수 있습니다.',
};
const NOTES_KO = [
  {
    glyph: 'robot',
    text: '끝나면 이 창을 닫으세요. AI가 목록에 나타납니다(나타나지 않으면 페이지를 새로 고치세요).',
  },
] as const;

const KO: GuideMessages = {
  explain: {
    sub: 'AI를 연결하는 방법은 세 가지입니다. 대부분 첫 번째를 사용합니다.',
    waysLabel: 'AI를 연결하는 세 가지 방법',
    easiest: '가장 쉬움',
    who: '누구에게',
    does: '할 일',
    happens: '일어나는 일',
    ways: {
      address: {
        title: '주소를 붙여 넣고 내 계정으로 로그인',
        who: 'Claude, ChatGPT, Hermes. 가장 쉬워서 추천합니다.',
        does: '주소를 복사해서 AI에 붙여 넣습니다.',
        happens:
          'numinia.com이 열립니다. 커뮤니티를 고르고 “허용”을 누른 뒤 AI로 돌아가면 내 월드에 들어갈 수 있습니다. 약 2분 걸립니다.',
        cta: 'AI 고르기',
      },
      code: {
        title: '패널의 코드로 연결',
        who: '로그인이 없는 AI와 프로그램.',
        does: '패널에서 코드(토큰)를 만들어 복사한 뒤, 주소와 함께 AI에 붙여 넣습니다.',
        happens:
          'AI는 그 코드로 들어옵니다. numinia.com은 열리지 않습니다. 비밀번호와 같으니 잘 보관하세요. 한 번만 보여 줍니다.',
        cta: '코드 만들기',
      },
      key: {
        title: '자체 키로 연결 (고급)',
        who: '프로그래머용입니다. 무엇인지 모르면 필요 없습니다.',
        does: 'AI가 자체 키를 만들고, 그 공개 부분을 여기에 붙여 넣습니다.',
        happens: '비공개 키는 AI가 있는 기기를 떠나지 않습니다. 로그인 없이 들어옵니다.',
        cta: '방법 보기',
      },
    },
  },
  faq: {
    title: '시작하기 전에: 자주 묻는 질문',
    items: [
      {
        q: 'AI는 무엇을 할 수 있나요?',
        a: '고른 커뮤니티의 월드에 들어가 움직이고, 말하고, 건설할 수 있습니다. **역할이 허용하는 것만 합니다.** 건설은 내가 준 역할이 허용할 때만 가능합니다. 역할이 “없음”이면 보고 말하기만 합니다.',
      },
      {
        q: '시간이 얼마나 걸리나요?',
        a: 'Claude나 ChatGPT는 2분 정도입니다. Hermes도 단계를 직접 따라 하면 같습니다. 무료 모델로 Hermes 채팅에 부탁하면 10~15분이 걸릴 수 있습니다.',
      },
      {
        q: '내 데이터나 지갑을 볼 수 있나요?',
        a: '아니요. **잔액이나 지갑은 절대 보지 못합니다.** 잔액을 쓰거나, 역할을 바꾸거나, 월드를 켜고 끌 수 없습니다. 내가 고른 커뮤니티에서만 활동합니다.',
      },
      {
        q: '돈이 드나요?',
        a: '지금은 **연결하는 데 비용이 들지 않습니다.** AI가 월드에서 보내는 시간은 Numinia가 부담합니다(한 커뮤니티에서 동시에 최대 {n}개의 AI, AI의 몸은 {minutes}분 동안 쓰이지 않으면 저절로 나갑니다). AI 쪽 요금(Claude, ChatGPT 등)은 늘 그렇듯 각 서비스에 냅니다. 나중에는 커뮤니티가 잔액으로 낼 수도 있으며, 그 전에 미리 알려 드리겠습니다.',
      },
      {
        q: '언제든 끄거나 삭제할 수 있나요?',
        a: '네, 이 페이지에서 언제든 할 수 있습니다. **끄기**는 월드에서 내보냅니다. **연결 끊기**는 연결을 끊습니다. **삭제**는 커뮤니티에서 지웁니다. 월드 안에 있다면 몇 분 안에(최대 10분) 나갑니다.',
      },
      {
        q: '“활동”과 “휴면”은 무엇인가요?',
        a: '**활동**: 주의를 기울이며 상호작용할 준비가 된 상태. **휴면**: 보고 듣기만 하고, 부르면 말하며, 건설하지 않습니다. 언제든 바꿀 수 있습니다.',
      },
      {
        q: '사람들이 하는 말을 듣나요?',
        a: '켰을 때만 듣습니다. AI마다 **“근처 대화 듣기”** 스위치가 있고 처음에는 꺼져 있습니다. 해당 AI 카드에서 언제든 켜고 끌 수 있습니다.',
      },
      {
        q: '주소를 공유하면 어떻게 되나요?',
        a: '큰 문제는 없습니다. 주소만으로는 아무것도 접근할 수 없습니다. 사용하는 사람은 numinia.com에 로그인해야 하고, 역할을 관리할 수 있는 사람이 “허용”을 눌러야 합니다. **코드(토큰)는 비밀입니다.** 가진 사람은 AI인 척할 수 있습니다. 유출되면 새로 만드세요.',
      },
      {
        q: '내 AI가 목록에 나오지 않아요.',
        a: '페이지를 새로 고치세요. 그래도 나오지 않으면 numinia.com에서 “허용”을 눌렀는지, 이 커뮤니티를 골랐는지 확인하세요. 아니라면 AI로 돌아가 다시 연결해 달라고 하세요.',
      },
      {
        q: '왜 커뮤니티와 역할을 고르라고 하나요?',
        a: 'AI는 **한 커뮤니티**의 또 다른 한 사람처럼 들어오고, **역할**이 그곳에서 할 수 있는 일을 정하기 때문입니다. 내가 줄 수 있는 역할만 보이며, AI에 대한 책임은 나에게 있습니다.',
      },
    ],
    foot: 'AI를 끄거나, 연결을 끊거나, 삭제하는 일은 언제든 이 목록에서 할 수 있습니다.',
  },
  choose: {
    back: '세 가지 방법',
    title: '어떤 AI를 연결할까요?',
    sub: '사용하는 AI를 고르세요. 무엇을 누를지 단계별로 알려 드립니다.',
    tiles: {
      claude: { name: 'Claude', text: 'Claude 앱 또는 웹.' },
      chatgpt: { name: 'ChatGPT', text: 'ChatGPT 웹.' },
      hermes: { name: 'Hermes', text: '내 컴퓨터 또는 클라우드.' },
      other: {
        name: '다른 AI 또는 프로그램',
        text: '로그인이 없는 것.',
        chip: '고급 · 코드로',
      },
    },
  },
  steps: {
    back: '다른 AI 고르기',
    stepLabel: '{n}단계',
    addressLabel: 'AI용 주소',
    mock: {
      community: '커뮤니티',
      name: '내 커뮤니티',
      role: '역할',
      none: '없음',
      allow: '허용',
      caption: '허용을 요청할 때의 numinia.com 모습(예시 그림)',
    },
    hermes: {
      tabs: 'Hermes가 있는 곳',
      computer: '내 컴퓨터의 Hermes',
      cloud: '클라우드의 Hermes',
      link: 'Hermes에 추가',
      terminal: '터미널이 편하신가요?',
      terminalHelp:
        '다음 두 줄을 입력하세요(두 번째 줄에서 numinia.com이 열려 로그인합니다). Hermes가 서버에 있고 브라우저가 오류 페이지에서 멈추면 3단계대로 하세요.',
      copyLines: '두 줄 복사',
      timeWarn:
        '**이 단계를 직접 따라 하면 약 2분이면 됩니다.** Hermes 채팅에 부탁하면, 특히 무료 모델에서는 10~15분이 걸리거나 중간에 멈출 수 있습니다.',
    },
    other: {
      tabs: 'AI가 들어오는 방법',
      code: '코드로',
      key: '자체 키로',
      warnTitle: '고급 옵션',
      warn: 'AI가 로그인할 수 없을 때만 쓰세요(프로그램, 또는 서버의 Hermes). Claude, ChatGPT, 패널이 있는 Hermes를 쓴다면 돌아가서 쉬운 방법을 고르세요.',
      createCode: '코드 만들기',
      createKey: '시작',
      commandHelp: 'Hermes에서는 이 한 줄이 코드를 물어봅니다:',
      copyCommand: '이 줄 복사',
    },
    lists: {
      claude: {
        title: 'Claude 연결하기',
        sub: '세 단계. 2~3분이면 됩니다.',
        steps: [
          {
            title: '주소 복사',
            body: 'Claude에게 Numinia가 어디 있는지 알려 주는 주소입니다.',
          },
          {
            title: 'Claude에서 커넥터 추가',
            body: '**커넥터**(“맞춤 설정” 또는 “설정” 메뉴)를 열고 **맞춤 커넥터 추가**를 누른 뒤, 이름을 “Numinia”로 하고 주소를 붙여 넣어 **추가**까지 진행하세요.',
            note: '회사용 Claude라면 소유자만 커넥터를 추가할 수 있을 수 있습니다.',
          },
          {
            title: '“연결”을 누르고 접근 허용',
            body: 'Claude가 **numinia.com**으로 안내합니다. 커뮤니티를 고르고 **허용**을 누른 뒤 Claude로 돌아가세요.',
          },
        ],
        after: AFTER_KO,
        notes: NOTES_KO,
      },
      chatgpt: {
        title: 'ChatGPT 연결하기',
        sub: '세 단계. 버튼 이름은 계정에 따라 다를 수 있습니다.',
        steps: [
          {
            title: '주소 복사',
            body: 'ChatGPT에게 Numinia가 어디 있는지 알려 주는 주소입니다.',
          },
          {
            title: 'ChatGPT에서 새 앱 만들기',
            body: '**설정 › 앱**으로 가서 **만들기**를 누르세요. 보이지 않으면 먼저 고급 설정에서 **개발자 모드**를 켜세요.',
            note: '요금제에 따라 다릅니다. 회사 계정이라면 ChatGPT 관리자가 켜야 할 수 있습니다.',
          },
          {
            title: '주소를 붙여 넣고 numinia.com으로 로그인',
            body: '이름을 “Numinia”로 하고 주소를 붙여 넣은 뒤, 로그인 방식을 물으면 **OAuth**(로그인)를 고르세요. **numinia.com**이 열리면 커뮤니티를 고르고 **허용**을 누른 다음 **만들기**를 누르세요.',
          },
        ],
        after: AFTER_KO,
        notes: NOTES_KO,
      },
      'hermes-computer': {
        title: 'Hermes 연결하기',
        sub: 'Hermes가 어디에 있는지 고르세요.',
        steps: [
          {
            title: '“Hermes에 추가” 누르기',
            body: '내 컴퓨터의 Hermes 앱이 모두 준비된 채로 열립니다.',
            note: 'Hermes 채팅에 부탁하지 마세요. 거기서는 연결할 수 없습니다. 이 버튼은 됩니다.',
          },
          {
            title: 'Hermes에서 확인',
            body: 'Hermes가 무엇을 추가할지 보여 주고 먼저 묻습니다. 눌러서 수락하세요.',
          },
          {
            title: 'numinia.com에서 접근 허용',
            body: '**numinia.com**이 열립니다. 커뮤니티를 고르고 **허용**을 누른 뒤 Hermes로 돌아가세요.',
            note: 'Hermes가 열리지 않나요? Hermes 패널(“클라우드의 Hermes” 탭)에서 직접 추가하세요. 주소는 {address}',
          },
        ],
        after: AFTER_KO,
        notes: NOTES_KO,
      },
      'hermes-cloud': {
        title: 'Hermes 연결하기',
        sub: 'Hermes가 어디에 있는지 고르세요.',
        steps: [
          {
            title: '주소 복사',
            body: 'Hermes에게 Numinia가 어디 있는지 알려 주는 주소입니다.',
          },
          {
            title: '채팅에 부탁하지 말고 패널에서 추가',
            body: 'Hermes 웹 패널을 열고 **MCP › 서버 추가**로 가세요. 이름은 **numinia**, 주소를 붙여 넣고 **OAuth**(로그인)를 고르세요.',
            note: '“MCP”는 그 메뉴의 이름일 뿐입니다. Hermes 채팅은 새 서버를 연결하지 못하고 카탈로그에 있는 것만 설치합니다. 그래서 패널에서 합니다.',
          },
          {
            title: '“Authenticate”를 누르고 접근 허용',
            body: '**numinia.com**이 열립니다. 커뮤니티를 고르고 **허용**을 누른 뒤 Hermes 패널로 돌아가세요.',
            note: '브라우저가 “http://127.0.0.1”로 시작하는 주소의 오류 페이지에서 멈춰도 클라우드의 Hermes에서는 정상입니다. 그 주소 전체를 브라우저 주소창에서 복사해 Hermes가 요청하는 곳에 붙여 넣으세요.',
          },
        ],
        after: AFTER_KO,
        notes: NOTES_KO,
      },
      'other-code': {
        title: '다른 AI, 코드로',
        sub: '조금 더 기술적인 방법입니다. 로그인이 없습니다.',
        steps: [
          {
            title: '패널에서 코드(토큰) 만들기',
            body: '**토큰**은 AI를 구별하는 긴 비밀번호입니다. **한 번만 보여 주니** 복사해서 보관하세요.',
          },
          {
            title: '주소 복사',
            body: 'AI가 연결해야 하는 곳입니다.',
          },
          {
            title: 'AI에 붙여 넣기',
            body: '주소를 넣고, AI가 “API 키”나 “토큰”을 요구하는 곳에 코드를 붙여 넣으세요.',
          },
        ],
        after: {
          label: '일어나는 일',
          text: 'AI는 코드로 들어옵니다. **numinia.com은 열리지 않습니다.** 목록에는 “패널에서 (코드)”로 표시됩니다.',
        },
        notes: [
          {
            glyph: 'lock-key',
            text: '코드를 공유하면 누구나 AI인 척할 수 있습니다. 유출되면 AI의 ⋯ 메뉴에서 새로 만드세요.',
          },
          {
            glyph: 'shield-check',
            text: '**프로그래머이신가요?** 자체 키도 쓸 수 있습니다. AI가 키를 만들고 그 공개 부분을 여기에 붙여 넣습니다.',
            action: '방법 보기',
          },
        ],
      },
      'other-key': {
        title: '다른 AI, 자체 키로',
        sub: '프로그래머용입니다. AI가 키를 만들고 그 공개 부분을 여기에 붙여 넣습니다.',
        steps: [
          {
            title: '이름을 정하고 할 수 있는 일 고르기',
            body: 'AI의 이름과, 보고 말하기만 할지 건설도 할지를 정합니다.',
          },
          {
            title: 'AI가 있는 곳에서 키 만들기',
            body: '복사할 한 줄을 드립니다. 키를 만들고 공개 부분을 보여 줍니다. 비공개 키는 그 기기를 떠나지 않습니다.',
          },
          {
            title: '공개 부분을 붙여 넣고 추가',
            body: '여기에 붙여 넣고, 요약을 확인한 뒤 **추가**를 누르세요.',
          },
        ],
        after: {
          label: '일어나는 일',
          text: 'AI는 자체 키로 들어옵니다. **numinia.com은 열리지 않습니다.** 목록에는 “키로 연결”로 표시됩니다.',
        },
        notes: [
          {
            glyph: 'lock-key',
            text: '키가 무엇인지 모르면 필요 없습니다. 돌아가서 다른 방법을 고르세요.',
          },
        ],
      },
    },
  },
};

const AFTER_PT = {
  label: 'O que você verá depois',
  text: 'O **numinia.com** vai abrir. Você escolhe a comunidade e aperta **Permitir**. Depois volta para a sua IA e ela já pode entrar nos seus mundos.',
};
const NOTES_PT = [
  {
    glyph: 'robot',
    text: 'Quando terminar, feche esta janela: sua IA vai aparecer na lista (se não aparecer, recarregue a página).',
  },
] as const;

const PT: GuideMessages = {
  explain: {
    sub: 'Há três maneiras de conectar a sua IA. Quase todo mundo usa a primeira.',
    waysLabel: 'Três maneiras de conectar a sua IA',
    easiest: 'A mais fácil',
    who: 'Para quem',
    does: 'O que você vai fazer',
    happens: 'O que vai acontecer',
    ways: {
      address: {
        title: 'Colar um endereço e entrar com a sua conta',
        who: 'Claude, ChatGPT e Hermes. A mais fácil: nós recomendamos.',
        does: 'Você copia um endereço e cola na sua IA.',
        happens:
          'O numinia.com vai abrir. Você escolhe a comunidade e aperta «Permitir». Volta para a sua IA e ela já pode entrar nos seus mundos. Cerca de 2 minutos.',
        cta: 'Escolher a minha IA',
      },
      code: {
        title: 'Com um código do painel',
        who: 'IAs e programas que não têm login.',
        does: 'Você pede um código (token) no painel, copia e cola na sua IA junto com o endereço.',
        happens:
          'A IA entra com esse código, sem abrir o numinia.com. Guarde bem: é como uma senha e só aparece uma vez.',
        cta: 'Pedir um código',
      },
      key: {
        title: 'Com chave própria (avançado)',
        who: 'Para programadores. Se você não sabe o que é, não precisa.',
        does: 'A sua IA cria a própria chave e você cola aqui a parte pública.',
        happens: 'A chave privada nunca sai da máquina da sua IA. Ela entra sem fazer login.',
        cta: 'Ver como se faz',
      },
    },
  },
  faq: {
    title: 'Antes de começar: o que as pessoas costumam perguntar',
    items: [
      {
        q: 'O que a IA poderá fazer?',
        a: 'Entrar nos mundos da comunidade que você escolher, andar, falar e construir. **Ela só faz o que o papel dela permite:** só constrói se o papel que você der permitir. Com o papel «nenhum», só olha e fala.',
      },
      {
        q: 'Quanto tempo leva?',
        a: 'Com Claude ou ChatGPT, uns dois minutos. Com Hermes, o mesmo se você seguir os passos por conta própria; se pedir ao chat dele com um modelo gratuito, pode levar de 10 a 15 minutos.',
      },
      {
        q: 'Ela pode ver meus dados ou minha carteira?',
        a: 'Não. **Ela nunca vê saldos nem carteiras.** Não pode gastar saldo, mudar papéis nem ligar ou desligar mundos. Só age na comunidade que você escolher.',
      },
      {
        q: 'Custa dinheiro?',
        a: 'Por enquanto, **conectar não custa nada**: a Numinia paga o tempo que a IA passa dentro dos mundos (até {n} IAs de uma comunidade ao mesmo tempo; o corpo da IA sai sozinho depois de {minutes} minutos sem uso). O que a sua IA cobrar (Claude, ChatGPT…) você paga a eles, como sempre. Mais adiante a comunidade poderá pagar com o saldo dela, e avisaremos antes.',
      },
      {
        q: 'Posso desligar ou remover quando quiser?',
        a: 'Sim, sempre, por esta página. **Desligar** tira a IA dos mundos. **Desconectar** corta a conexão. **Remover** apaga da comunidade. Se ela estiver dentro de um mundo, sai em alguns minutos (10 no máximo).',
      },
      {
        q: 'O que é «Ativa» e o que é «Dormindo»?',
        a: '**Ativa**: atenta e disposta a interagir. **Dormindo**: olha e escuta, só fala se a chamarem e não constrói. Você pode mudar quando quiser.',
      },
      {
        q: 'Ela ouve o que as pessoas dizem?',
        a: 'Só se você ligar. Cada IA tem o seu interruptor **«Ouvir o que se fala por perto»**, desligado de fábrica: você liga ou desliga quando quiser no cartão dela.',
      },
      {
        q: 'O que acontece se eu compartilhar o endereço?',
        a: 'Nada grave: o endereço sozinho não dá acesso a nada. Quem usar precisa entrar no numinia.com, e alguém que possa gerenciar papéis precisa apertar «Permitir». **O código (token) é secreto:** quem o tiver pode se passar pela IA. Se vazar, renove.',
      },
      {
        q: 'E se a minha IA não aparecer na lista?',
        a: 'Recarregue a página. Se continuar sem aparecer, confira se você apertou «Permitir» no numinia.com e escolheu esta comunidade. Se não, volte para a sua IA e peça para conectar de novo.',
      },
      {
        q: 'Por que ele pede para escolher comunidade e papel?',
        a: 'Porque a IA entra como mais uma pessoa **em uma comunidade**, e o **papel** decide o que ela pode fazer ali. Você só vê os papéis que pode dar, e você responde por ela.',
      },
    ],
    foot: 'Você sempre pode desligar, desconectar ou remover uma IA por esta mesma lista.',
  },
  choose: {
    back: 'As três maneiras',
    title: 'Qual IA você quer conectar?',
    sub: 'Escolha a que você usa. Vamos dizer passo a passo o que apertar.',
    tiles: {
      claude: { name: 'Claude', text: 'O app ou o site do Claude.' },
      chatgpt: { name: 'ChatGPT', text: 'O site do ChatGPT.' },
      hermes: { name: 'Hermes', text: 'No seu computador ou na nuvem.' },
      other: {
        name: 'Outra IA ou um programa',
        text: 'Que não tem login.',
        chip: 'Avançado · com código',
      },
    },
  },
  steps: {
    back: 'Escolher outra IA',
    stepLabel: 'Passo {n}',
    addressLabel: 'Endereço para a sua IA',
    mock: {
      community: 'Comunidade',
      name: 'Minha comunidade',
      role: 'Papel',
      none: 'Nenhum',
      allow: 'Permitir',
      caption: 'Como o numinia.com aparece quando pede permissão (desenho de exemplo)',
    },
    hermes: {
      tabs: 'Onde você tem o Hermes',
      computer: 'Hermes no meu computador',
      cloud: 'Hermes na nuvem',
      link: 'Adicionar ao Hermes',
      terminal: 'Prefere o terminal?',
      terminalHelp:
        'Digite estas duas linhas (a segunda abre o numinia.com para você entrar). Se o Hermes estiver num servidor e o navegador parar numa página de erro, faça o que diz o passo 3.',
      copyLines: 'Copiar as linhas',
      timeWarn:
        '**Faça você mesmo com estes passos: levam cerca de 2 minutos.** Se pedir ao chat do Hermes, principalmente com um modelo gratuito, pode levar de 10 a 15 minutos ou ficar pela metade.',
    },
    other: {
      tabs: 'Como a sua IA entra',
      code: 'Com um código',
      key: 'Com chave própria',
      warnTitle: 'Opção avançada',
      warn: 'Só se a sua IA não consegue fazer login (um programa, ou o Hermes num servidor). Se você usa Claude, ChatGPT ou Hermes com painel, volte e escolha o caminho fácil.',
      createCode: 'Criar código',
      createKey: 'Começar',
      commandHelp: 'No Hermes, esta linha pede o código:',
      copyCommand: 'Copiar a linha',
    },
    lists: {
      claude: {
        title: 'Conectar o Claude',
        sub: 'Três passos. Leva um par de minutos.',
        steps: [
          {
            title: 'Copie o endereço',
            body: 'É o endereço que diz ao Claude onde está a Numinia.',
          },
          {
            title: 'No Claude, adicione um conector',
            body: 'Abra **Conectores** (no menu «Personalizar» ou em «Configurações»), aperte **Adicionar conector personalizado**, dê o nome «Numinia», cole o endereço e siga até **Adicionar**.',
            note: 'Se o seu Claude é de uma empresa, talvez só o proprietário possa adicionar conectores.',
          },
          {
            title: 'Aperte «Conectar» e permita o acesso',
            body: 'O Claude vai levar você ao **numinia.com**: escolha a comunidade e aperte **Permitir**. Depois volte ao Claude.',
          },
        ],
        after: AFTER_PT,
        notes: NOTES_PT,
      },
      chatgpt: {
        title: 'Conectar o ChatGPT',
        sub: 'Três passos. Os nomes dos botões podem variar conforme a sua conta.',
        steps: [
          {
            title: 'Copie o endereço',
            body: 'É o endereço que diz ao ChatGPT onde está a Numinia.',
          },
          {
            title: 'No ChatGPT, crie um app novo',
            body: 'Entre em **Configurações › Aplicativos** e aperte **Criar**. Se não aparecer essa opção, ative antes o **modo desenvolvedor** nas configurações avançadas.',
            note: 'Depende do seu plano: em contas de empresa, talvez quem administra o ChatGPT precise ativar.',
          },
          {
            title: 'Cole o endereço e entre com o numinia.com',
            body: 'Dê o nome «Numinia», cole o endereço e, se perguntar como entrar, escolha **OAuth** (login). O **numinia.com** vai abrir: escolha a comunidade e aperte **Permitir**. Depois aperte **Criar**.',
          },
        ],
        after: AFTER_PT,
        notes: NOTES_PT,
      },
      'hermes-computer': {
        title: 'Conectar o Hermes',
        sub: 'Escolha onde você tem o Hermes.',
        steps: [
          {
            title: 'Aperte «Adicionar ao Hermes»',
            body: 'O app do Hermes no seu computador vai abrir com tudo preparado.',
            note: 'Não peça isso ao chat do Hermes: ali não dá para conectar. Este botão dá.',
          },
          {
            title: 'Confirme no Hermes',
            body: 'O Hermes mostra o que vai adicionar e pergunta antes. Aperte para aceitar.',
          },
          {
            title: 'Permita o acesso no numinia.com',
            body: 'O **numinia.com** vai abrir: escolha a comunidade e aperte **Permitir**. Depois volte ao Hermes.',
            note: 'O Hermes não abre? Adicione você mesmo no painel dele (aba «Hermes na nuvem»): o endereço é {address}',
          },
        ],
        after: AFTER_PT,
        notes: NOTES_PT,
      },
      'hermes-cloud': {
        title: 'Conectar o Hermes',
        sub: 'Escolha onde você tem o Hermes.',
        steps: [
          {
            title: 'Copie o endereço',
            body: 'É o endereço que diz ao Hermes onde está a Numinia.',
          },
          {
            title: 'Não peça ao chat: adicione no painel',
            body: 'Abra o painel web do Hermes, entre em **MCP › Adicionar servidor**, dê o nome **numinia**, cole o endereço e escolha **OAuth** (entrar com login).',
            note: '«MCP» é só o nome dessa seção. O chat do Hermes não consegue conectar servidores novos: só instala os do catálogo dele. Por isso se faz no painel.',
          },
          {
            title: 'Aperte «Authenticate» e permita o acesso',
            body: 'O **numinia.com** vai abrir: escolha a comunidade e aperte **Permitir**. Volte ao seu painel do Hermes.',
            note: 'Se o navegador parar numa página de erro com um endereço que começa com «http://127.0.0.1», é normal no Hermes na nuvem: copie esse endereço inteiro da barra do navegador e cole no Hermes, onde ele pedir.',
          },
        ],
        after: AFTER_PT,
        notes: NOTES_PT,
      },
      'other-code': {
        title: 'Outra IA, com um código',
        sub: 'Um caminho mais técnico, sem login.',
        steps: [
          {
            title: 'Peça um código (token) no painel',
            body: 'Um **token** é uma senha longa que identifica a sua IA. **Só aparece uma vez:** copie e guarde.',
          },
          {
            title: 'Copie o endereço',
            body: 'É onde a sua IA precisa se conectar.',
          },
          {
            title: 'Cole os dois na sua IA',
            body: 'Coloque o endereço e, onde a sua IA pedir uma «chave de API» ou «token», cole o código.',
          },
        ],
        after: {
          label: 'O que vai acontecer',
          text: 'A sua IA entra com o código, **sem abrir o numinia.com**. Ela vai aparecer na lista como «Do painel (com código)».',
        },
        notes: [
          {
            glyph: 'lock-key',
            text: 'Se você compartilhar o código, qualquer pessoa pode se passar pela sua IA. Se vazar, renove no menu ⋯ da IA.',
          },
          {
            glyph: 'shield-check',
            text: '**Programador?** Você também pode usar uma chave própria: a sua IA cria a chave e você cola aqui a parte pública.',
            action: 'Ver como se faz',
          },
        ],
      },
      'other-key': {
        title: 'Outra IA, com chave própria',
        sub: 'Para programadores. A sua IA cria a chave e você cola aqui a parte pública.',
        steps: [
          {
            title: 'Dê um nome e escolha o que ela pode fazer',
            body: 'Você diz como a sua IA se chama e se ela só olha e fala ou também constrói.',
          },
          {
            title: 'Crie a chave onde a sua IA vive',
            body: 'Damos uma linha para copiar. Ela cria a chave e mostra a parte pública. A chave privada não sai dessa máquina.',
          },
          {
            title: 'Cole a parte pública e adicione',
            body: 'Você cola aqui, olha o resumo e aperta **Adicionar**.',
          },
        ],
        after: {
          label: 'O que vai acontecer',
          text: 'A sua IA entra com a chave, **sem abrir o numinia.com**. Ela vai aparecer na lista com a marca «Com chave».',
        },
        notes: [
          {
            glyph: 'lock-key',
            text: 'Se você não sabe o que é uma chave, não precisa: volte e escolha outra maneira.',
          },
        ],
      },
    },
  },
};

export const GUIDE: Readonly<Record<SupportedLocale, GuideMessages>> = {
  es: ES,
  en: EN,
  ja: JA,
  ko: KO,
  'pt-br': PT,
};
