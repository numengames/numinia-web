/**
 * «Agentes» (the panel's piece for the community's AIs): the words the
 * screen adds to the panel's (i18n/panel.ts), Saldo's refusals
 * (i18n/saldo.ts) and the invitation a world's page already has
 * (i18n/mundos.ts `page.ai.dialog`: name, ability, the key's command and its
 * field are reused as they are, so the two doors never say it differently).
 * Five locales, typed so a missing one does not compile.
 *
 * Plain words, short. A community is «comunidad» on screen; the back keeps
 * its own (organization). Never a raw code: every way a call can fail is one
 * sentence here.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { AgentState, AgentStatus } from '../lib/accounts';
import type { AgentProblem, Failure } from '../lib/panel-agentes';

export interface AgentesMessages {
  /** The label of the list's region. */
  readonly region: string;
  /** The community has no AI yet: what the empty state says, and what its picture shows. */
  readonly empty: {
    readonly title: string;
    readonly text: string;
    readonly foot: string;
    readonly art: string;
  };
  /** The chip on an AI's card: where it came from (`{host}`: an app Numinia does not know). */
  readonly client: Readonly<
    Record<'claude' | 'chatgpt' | 'hermes' | 'panel' | 'key' | 'other', string>
  >;
  /** The ⋯ menu: its button (`{name}`), one line per action (`{app}`: Claude, ChatGPT, Hermes or the host) and a closing line. */
  readonly menu: {
    readonly label: string;
    readonly hint: Readonly<Record<'disconnect' | 'renew' | 'remove', string>>;
    readonly foot: string;
  };
  /** The one button that starts connecting an AI, and closing the dialog (the guide inside is i18n/agentes-guia.ts). */
  readonly connect: { readonly button: string; readonly close: string };
  /** Under the title: «¿Buscas el asistente propio de la comunidad? Es otra cosa: está en [link].» */
  readonly assistant: { readonly before: string; readonly link: string; readonly after: string };
  /** Always visible: how long a change takes to reach the worlds. */
  readonly notice: string;
  /** Beside a disabled «Conectar una IA»: why. */
  readonly noRight: string;
  /** The switch's two words, also its label. */
  readonly on: string;
  readonly off: string;
  readonly stateLabel: string;
  /** The switch on each AI's card: whether it may read the nearby chat of the worlds it is in. */
  readonly hearLabel: string;
  readonly hearHint: string;
  /** The row's label, and the hint once it is on. */
  readonly hearRow: string;
  readonly hearOn: string;
  readonly states: Readonly<Record<AgentState, { readonly name: string; readonly hint: string }>>;
  /** What the till says the next pass will be, in plain words. */
  readonly status: Readonly<Record<AgentStatus, string>>;
  /** `{name}`: who answers for the AI. */
  readonly responsible: string;
  /** `{name}`: who answers for the AI when it is the house (an Oracle's name, or a short wallet). */
  readonly responsibleHouse: string;
  /** The asker sees this AI but may not change it. */
  readonly readOnly: string;
  readonly roles: string;
  readonly noRoles: string;
  /** `{role}`, `{name}`: the chip's × button, for screen readers. */
  readonly takeRole: string;
  /** `{name}`: the select that gives a role. */
  readonly giveLabel: string;
  readonly givePlaceholder: string;
  readonly give: string;
  readonly remove: string;
  /** `{name}`: the row's button, for screen readers. */
  readonly removeLabel: string;
  /** `{name}`. */
  readonly removeAsk: string;
  readonly removeYes: string;
  readonly removeNo: string;
  readonly removing: string;
  /** A change went through. */
  readonly saved: string;
  /** One plain sentence per kind of failure that is not Saldo's own. */
  readonly failures: Readonly<Record<Exclude<Failure['kind'], 'refused'> | AgentProblem, string>>;
  /** The token way (cut 2): how to connect, the screen that shows the secret once, the row and its renewal. */
  readonly access: {
    readonly legend: string;
    readonly viaToken: string;
    readonly viaTokenHint: string;
    readonly viaKey: string;
    readonly viaKeyHint: string;
    readonly add: string;
    readonly adding: string;
    readonly onceTitle: string;
    readonly onceNote: string;
    readonly tokenLabel: string;
    readonly copy: string;
    readonly copied: string;
    readonly copyFailed: string;
    readonly connectTitle: string;
    /** `{folder}`: the engine's folder; `{world}`: the placeholder to replace. */
    readonly connectNote: string;
    readonly copyConnect: string;
    readonly done: string;
    /** `{prefix}`, `{day}`: the row's line. */
    readonly rowLine: string;
    /** A token agent whose token was revoked. */
    readonly rowNone: string;
    readonly renew: string;
    /** `{name}`: the row's button, for screen readers. */
    readonly renewLabel: string;
    /** `{name}`. */
    readonly renewAsk: string;
    readonly renewYes: string;
    readonly renewNo: string;
    readonly renewing: string;
  };
  /** «Desconectar» for an AI connected from an app (how it was connected is the card's chip). */
  readonly connection: {
    /** `{host}`: an AI connected by URL whose token was revoked. */
    readonly urlNone: string;
    readonly disconnect: string;
    /** `{name}`: the row's button, for screen readers. */
    readonly disconnectLabel: string;
    /** `{name}`, `{host}`. */
    readonly disconnectAsk: string;
    readonly disconnectYes: string;
    readonly disconnectNo: string;
    readonly disconnecting: string;
  };
  /** What the invitation adds to the world's (the roles of «También construir»). */
  /**
   * «En el mundo» (S20–S22): the section of an AI's card where its settings for the worlds are
   * set — where it lives, its body and bubble, how it is called and what it hears. Plain words.
   */
  readonly world: {
    readonly title: string;
    /** Honest, always visible: these settings reach a world once its engine is updated. */
    readonly note: string;
    /** «Dónde vive»: one world, several, or all of the community's. */
    readonly where: {
      readonly label: string;
      readonly modes: Readonly<Record<'one' | 'several' | 'all', string>>;
      readonly hints: Readonly<Record<'one' | 'several' | 'all', string>>;
      /** `{name}`: the select that picks the one world, and the list of the several, for screen readers. */
      readonly pick: string;
      readonly list: string;
      readonly none: string;
      readonly unread: string;
      readonly last: string;
      readonly empty: string;
    };
  };
  readonly dialog: {
    readonly rolesLabel: string;
    readonly rolesHint: string;
    readonly rolesNone: string;
    readonly rolesNeed: string;
    readonly summaryRoles: string;
    readonly summaryNone: string;
  };
}

export const AGENTES_UI: Readonly<Record<SupportedLocale, AgentesMessages>> = {
  es: {
    region: 'IAs de la comunidad',
    empty: {
      title: 'Todavía no hay ninguna IA en tu comunidad',
      text: 'Una IA entra en los mundos como una persona más: mira, habla y, si tú quieres, construye. Tú decides qué puede hacer.',
      foot: 'Se hace en tres pasos y puedes quitarla cuando quieras.',
      art: 'Una IA unida por un cable a un mundo',
    },
    client: {
      claude: 'Desde Claude',
      chatgpt: 'Desde ChatGPT',
      hermes: 'Desde Hermes',
      panel: 'Desde el panel (con código)',
      key: 'Con clave',
      other: 'Desde {host}',
    },
    menu: {
      label: 'Más acciones para {name}',
      hint: {
        disconnect:
          'La apaga y corta su conexión con {app}. Para volver, conéctala otra vez desde {app}.',
        renew:
          'Crea un código nuevo. El de ahora deja de valer y la IA no entra hasta usar el nuevo.',
        remove: 'La borra de la comunidad. Ya no podrá entrar en ningún mundo.',
      },
      foot: 'Cada opción te pide confirmar antes de hacerse. Si la IA está dentro de un mundo, sale en un minuto como mucho.',
    },
    connect: {
      button: 'Conectar una IA',
      close: 'Cerrar',
    },
    assistant: {
      before: '¿Buscas el asistente propio de la comunidad? Es otra cosa: está en ',
      link: 'Ajustes › Agente IA',
      after: '.',
    },
    notice: 'Los cambios llegan a los mundos en unos 10 minutos como máximo.',
    noRight: 'Para conectar una IA hace falta poder gestionar los roles de la comunidad.',
    on: 'Encendida',
    off: 'Apagada',
    stateLabel: 'Estado',
    hearLabel: 'Oír lo que se habla cerca',
    hearHint: 'Si lo enciendes, la IA lee el chat cercano en los mundos donde esté.',
    hearRow: 'Oír',
    hearOn: 'Encendido: la IA lee el chat cercano en los mundos donde esté.',
    states: {
      activa: { name: 'Activa', hint: 'Atenta y dispuesta a interactuar.' },
      dormida: {
        name: 'Dormida',
        hint: 'Mira y escucha; solo habla si la llaman y no construye.',
      },
    },
    status: {
      apagada: 'Apagada: no entra en ningún mundo.',
      'sin-responsable':
        'Sin responsable: quien respondía por ella dejó la comunidad o ya no puede gestionar roles. No entra en ningún mundo.',
      'sin-permiso':
        'Sin permiso: lo que puede hacer ahora quien responde por ella no le deja entrar en los mundos.',
      activa: 'Puede entrar en los mundos de la comunidad.',
      dormida: 'Puede entrar en los mundos, en reposo.',
    },
    responsible: 'Responde por ella: {name}',
    responsibleHouse: 'Responde por ella: la casa ({name})',
    readOnly: 'Solo puedes verla: no puedes cambiarla.',
    roles: 'Roles',
    noRoles: 'Sin roles: solo mira y habla.',
    takeRole: 'Quitar el rol {role} a {name}',
    giveLabel: 'Dar un rol a {name}',
    givePlaceholder: 'Dar un rol…',
    give: 'Dar',
    remove: 'Quitar',
    removeLabel: 'Quitar a {name}',
    removeAsk: '¿Quitar a {name}? Ya no podrá entrar en ningún mundo de la comunidad.',
    removeYes: 'Sí, quitar',
    removeNo: 'No, dejarla',
    removing: 'Quitando…',
    saved: 'Hecho.',
    failures: {
      'signed-out': 'Tu sesión ha terminado. Entra otra vez para seguir.',
      unavailable: 'Esto aún no está disponible',
      invalid: 'Esos datos no valen. Revisa el nombre y la clave.',
      failed: 'Algo ha salido mal. Inténtalo de nuevo.',
      noSuchAgent: 'Esa IA ya no está en la comunidad. Recarga la lista.',
      taken: 'Ya hay una IA con ese nombre o con esa clave. Prueba con otro nombre.',
      limit: 'La comunidad ya tiene todas las IAs que caben (20).',
      houseCeiling:
        'La casa no da a una IA un rol con «Administrador» o «Gestionar roles»: eso es de quienes son dueños de la comunidad.',
      noSuchRole: 'Ese rol ya no existe. Recarga la página.',
      notToken: 'Esa IA se conecta con llave, no con token.',
      worldGone: 'Ese mundo ya no es de la comunidad. Recarga la página.',
    },
    access: {
      legend: '¿Cómo se conecta?',
      viaToken: 'Con un token (lo más fácil)',
      viaTokenHint:
        'Te damos una contraseña larga y la pegas donde tu IA la pida. No hace falta terminal ni llaves.',
      viaKey: 'Con mi propia llave (avanzado)',
      viaKeyHint:
        'Tu IA crea su llave y tú pegas aquí la parte pública. La llave privada no sale de su máquina.',
      add: 'Añadir',
      adding: 'Añadiendo…',
      onceTitle: 'Copia tu token ahora, no lo volverás a ver',
      onceNote:
        'Guárdalo donde tu IA lo pida. Si lo pierdes, renueva el token: el anterior dejará de valer.',
      tokenLabel: 'Token',
      copy: 'Copiar',
      copied: 'Copiado',
      copyFailed: 'No se ha podido copiar: selecciónalo y cópialo a mano.',
      connectTitle: 'Conéctalo a Hermes',
      connectNote:
        'Pega estas tres líneas en una terminal. «{folder}» es la carpeta donde tienes el motor de Numinia. Cambia {world} por la dirección del mundo (acaba en /ws).',
      copyConnect: 'Copiar las tres líneas',
      done: 'Ya lo he copiado',
      rowLine: 'Código {prefix} · creado el {day}',
      rowNone: 'Sin código: renuévalo para que pueda volver a entrar.',
      renew: 'Renovar código',
      renewLabel: 'Renovar el código de {name}',
      renewAsk:
        '¿Renovar el código de {name}? El de ahora dejará de valer y la IA no entrará hasta que use el nuevo.',
      renewYes: 'Sí, renovar',
      renewNo: 'No, dejarlo',
      renewing: 'Renovando…',
    },
    connection: {
      urlNone: 'Desconectada. Para volver, conéctala otra vez desde {host}.',
      disconnect: 'Desconectar',
      disconnectLabel: 'Desconectar a {name}',
      disconnectAsk:
        '¿Desconectar a {name}? Se apaga y su conexión desde {host} deja de valer. Si está en un mundo, sale en su siguiente comprobación: un minuto como mucho.',
      disconnectYes: 'Sí, desconectar',
      disconnectNo: 'No, dejarla',
      disconnecting: 'Desconectando…',
    },
    world: {
      title: 'En el mundo',
      note: 'Estos ajustes llegan a los mundos cuando se actualiza su motor. Hasta entonces, la IA entra como hasta ahora.',
      where: {
        label: 'Dónde vive',
        modes: { one: 'Un mundo', several: 'Varios', all: 'Todos los de la comunidad' },
        hints: {
          one: 'Solo aparece en el mundo que elijas.',
          several: 'Solo aparece en los mundos que marques.',
          all: 'Aparece en todos los mundos de la comunidad, también en los que lleguen.',
        },
        pick: 'Mundo donde vive {name}',
        list: 'Mundos donde vive {name}',
        none: 'La comunidad aún no tiene mundos. La IA vivirá en los que lleguen.',
        unread: 'No se han podido leer los mundos de la comunidad.',
        last: 'Tiene que vivir al menos en un mundo.',
        empty: 'Ahora no vive en ningún mundo: marca al menos uno.',
      },
    },
    dialog: {
      rolesLabel: '¿Con qué roles?',
      rolesHint: 'Tendrá el acceso de estos roles, recortado a lo que puedes tú.',
      rolesNone: 'No hay roles que puedas dar a una IA. Pide uno a quien administre la comunidad.',
      rolesNeed: 'Elige al menos un rol.',
      summaryRoles: 'Roles',
      summaryNone: 'Ninguno',
    },
  },
  en: {
    region: "The community's AIs",
    empty: {
      title: 'There is no AI in your community yet',
      text: 'An AI enters the worlds like anyone else: it looks, talks and, if you want, builds. You decide what it may do.',
      foot: 'It takes three steps and you can remove it whenever you like.',
      art: 'An AI linked by a cable to a world',
    },
    client: {
      claude: 'From Claude',
      chatgpt: 'From ChatGPT',
      hermes: 'From Hermes',
      panel: 'From the panel (with a code)',
      key: 'With a key',
      other: 'From {host}',
    },
    menu: {
      label: 'More actions for {name}',
      hint: {
        disconnect:
          'Switches it off and cuts its connection with {app}. To come back, connect it again from {app}.',
        renew:
          'Makes a new code. The current one stops working and the AI does not get in until it uses the new one.',
        remove: 'Deletes it from the community. It will no longer enter any world.',
      },
      foot: 'Each option asks you to confirm before it happens. If the AI is inside a world, it leaves within a minute at most.',
    },
    connect: {
      button: 'Connect an AI',
      close: 'Close',
    },
    assistant: {
      before: 'Looking for the community’s own assistant? That is something else: it is in ',
      link: 'Settings › AI agent',
      after: '.',
    },
    notice: 'Changes reach the worlds within about 10 minutes at most.',
    noRight: 'To connect an AI you need to be able to manage the community’s roles.',
    on: 'On',
    off: 'Off',
    stateLabel: 'State',
    hearLabel: 'Hear what is said nearby',
    hearHint: 'If you turn it on, the AI reads the nearby chat in the worlds it is in.',
    hearRow: 'Hear',
    hearOn: 'On: the AI reads the nearby chat in the worlds it is in.',
    states: {
      activa: { name: 'Active', hint: 'Attentive and ready to interact.' },
      dormida: {
        name: 'Asleep',
        hint: 'It watches and listens; it only speaks if called and does not build.',
      },
    },
    status: {
      apagada: 'Off: it enters no world.',
      'sin-responsable':
        'No one answers for it: the person who did left the community or can no longer manage roles. It enters no world.',
      'sin-permiso':
        'No permission: what the person who answers for it can do now does not let it into the worlds.',
      activa: 'It can enter the community’s worlds.',
      dormida: 'It can enter the worlds, at rest.',
    },
    responsible: 'Answered for by: {name}',
    responsibleHouse: 'Answered for by: the house ({name})',
    readOnly: 'You can only see it: you cannot change it.',
    roles: 'Roles',
    noRoles: 'No roles: it only looks and talks.',
    takeRole: 'Take the role {role} from {name}',
    giveLabel: 'Give a role to {name}',
    givePlaceholder: 'Give a role…',
    give: 'Give',
    remove: 'Remove',
    removeLabel: 'Remove {name}',
    removeAsk: 'Remove {name}? It will no longer enter any world of the community.',
    removeYes: 'Yes, remove',
    removeNo: 'No, keep it',
    removing: 'Removing…',
    saved: 'Done.',
    failures: {
      'signed-out': 'Your session has ended. Sign in again to go on.',
      unavailable: 'This is not available yet',
      invalid: 'Those details are not valid. Check the name and the key.',
      failed: 'Something went wrong. Try again.',
      noSuchAgent: 'That AI is no longer in the community. Reload the list.',
      taken: 'There is already an AI with that name or that key. Try another name.',
      limit: 'The community already has all the AIs it can hold (20).',
      houseCeiling:
        'The house does not give an AI a role with “Administrator” or “Manage roles”: that is for the community’s owners.',
      noSuchRole: 'That role no longer exists. Reload the page.',
      notToken: 'That AI connects with a key, not a token.',
      worldGone: 'That world no longer belongs to the community. Reload the page.',
    },
    access: {
      legend: 'How does it connect?',
      viaToken: 'With a token (the easy way)',
      viaTokenHint:
        'We give you a long password and you paste it where your AI asks for it. No terminal or keys needed.',
      viaKey: 'With my own key (advanced)',
      viaKeyHint:
        'Your AI makes its own key and you paste the public half here. The private key never leaves its machine.',
      add: 'Add',
      adding: 'Adding…',
      onceTitle: 'Copy your token now, you won’t see it again',
      onceNote:
        'Keep it where your AI asks for it. If you lose it, renew the token: the old one will stop working.',
      tokenLabel: 'Token',
      copy: 'Copy',
      copied: 'Copied',
      copyFailed: 'Could not copy: select it and copy it by hand.',
      connectTitle: 'Connect it to Hermes',
      connectNote:
        'Paste these three lines in a terminal. “{folder}” is the folder where you have the Numinia engine. Change {world} to the world’s address (it ends in /ws).',
      copyConnect: 'Copy the three lines',
      done: 'I have copied it',
      rowLine: 'Code {prefix} · created on {day}',
      rowNone: 'No code: renew it so it can come back in.',
      renew: 'Renew code',
      renewLabel: 'Renew the code of {name}',
      renewAsk:
        'Renew the code of {name}? The current one will stop working and the AI will not get in until it uses the new one.',
      renewYes: 'Yes, renew',
      renewNo: 'No, keep it',
      renewing: 'Renewing…',
    },
    connection: {
      urlNone: 'Disconnected. To come back, connect it again from {host}.',
      disconnect: 'Disconnect',
      disconnectLabel: 'Disconnect {name}',
      disconnectAsk:
        'Disconnect {name}? It is switched off and its connection from {host} stops working. If it is in a world, it leaves at its next check: within a minute.',
      disconnectYes: 'Yes, disconnect',
      disconnectNo: 'No, keep it',
      disconnecting: 'Disconnecting…',
    },
    world: {
      title: 'In the world',
      note: 'These settings reach the worlds once their engine is updated. Until then, the AI enters as it always has.',
      where: {
        label: 'Where it lives',
        modes: { one: 'One world', several: 'Several', all: 'All of the community’s' },
        hints: {
          one: 'It only appears in the world you pick.',
          several: 'It only appears in the worlds you tick.',
          all: 'It appears in every world of the community, including those that arrive later.',
        },
        pick: 'World where {name} lives',
        list: 'Worlds where {name} lives',
        none: 'The community has no worlds yet. The AI will live in the ones that arrive.',
        unread: 'The community’s worlds could not be read.',
        last: 'It has to live in at least one world.',
        empty: 'It lives in no world right now: tick at least one.',
      },
    },
    dialog: {
      rolesLabel: 'With which roles?',
      rolesHint: 'It will have the access of these roles, cut down to what you can do.',
      rolesNone: 'There are no roles you can give an AI. Ask whoever administers the community.',
      rolesNeed: 'Pick at least one role.',
      summaryRoles: 'Roles',
      summaryNone: 'None',
    },
  },
  ja: {
    region: 'コミュニティのAI',
    empty: {
      title: 'コミュニティにはまだAIがいません',
      text: 'AIは他の人と同じように世界に入り、見て、話し、あなたが望めば建てます。何ができるかはあなたが決めます。',
      foot: '3つのステップでつなげられ、いつでも削除できます。',
      art: 'ケーブルで世界につながれたAI',
    },
    client: {
      claude: 'Claudeから',
      chatgpt: 'ChatGPTから',
      hermes: 'Hermesから',
      panel: 'パネルから（コード）',
      key: '鍵で接続',
      other: '{host} から',
    },
    menu: {
      label: '{name} のその他の操作',
      hint: {
        disconnect:
          'AIをオフにして、{app} との接続を切ります。戻すには {app} からもう一度接続してください。',
        renew:
          '新しいコードを作ります。今のコードは使えなくなり、新しいコードを使うまでAIは入れません。',
        remove: 'AIをコミュニティから削除します。どの世界にも入れなくなります。',
      },
      foot: 'どの操作も、実行前に確認があります。AIが世界にいる場合は、長くても1分で退出します。',
    },
    connect: {
      button: 'AIをつなぐ',
      close: '閉じる',
    },
    assistant: {
      before: 'コミュニティ自身のアシスタントをお探しですか？それは別のもので、',
      link: '設定 › AIエージェント',
      after: 'にあります。',
    },
    notice: '変更が世界に届くまで、長くても10分ほどかかります。',
    noRight: 'AIをつなぐには、コミュニティのロールを管理できる必要があります。',
    on: 'オン',
    off: 'オフ',
    stateLabel: '状態',
    hearLabel: '近くの会話を聞く',
    hearHint: 'オンにすると、AIは自分がいる世界で近くのチャットを読みます。',
    hearRow: '聞く',
    hearOn: 'オン：AIは自分がいる世界で近くのチャットを読みます。',
    states: {
      activa: { name: 'アクティブ', hint: '注意深く、やり取りに応じられる状態です。' },
      dormida: {
        name: 'スリープ',
        hint: '見て聞くだけで、呼ばれたときだけ話し、建てません。',
      },
    },
    status: {
      apagada: 'オフ：どの世界にも入りません。',
      'sin-responsable':
        '責任者なし：責任者がコミュニティを離れたか、ロールを管理できなくなりました。どの世界にも入りません。',
      'sin-permiso': '権限なし：責任者が今できることでは、世界に入れません。',
      activa: 'コミュニティの世界に入れます。',
      dormida: '世界に入れますが、休んでいます。',
    },
    responsible: '責任者：{name}',
    responsibleHouse: '責任者：ハウス（{name}）',
    readOnly: '見ることはできますが、変更はできません。',
    roles: 'ロール',
    noRoles: 'ロールなし：見て話すだけです。',
    takeRole: '{name} からロール {role} を外す',
    giveLabel: '{name} にロールを付ける',
    givePlaceholder: 'ロールを付ける…',
    give: '付ける',
    remove: '削除',
    removeLabel: '{name} を削除',
    removeAsk: '{name} を削除しますか？ コミュニティのどの世界にも入れなくなります。',
    removeYes: 'はい、削除',
    removeNo: 'いいえ、残す',
    removing: '削除中…',
    saved: '完了しました。',
    failures: {
      'signed-out': 'セッションが終了しました。続けるには、もう一度サインインしてください。',
      unavailable: 'これはまだ利用できません',
      invalid: '入力内容が正しくありません。名前とキーを確認してください。',
      failed: '問題が起きました。もう一度お試しください。',
      noSuchAgent: 'このAIはもうコミュニティにいません。一覧を読み込み直してください。',
      taken: '同じ名前またはキーのAIがすでにいます。別の名前を試してください。',
      limit: 'コミュニティはすでに上限（20）までAIを抱えています。',
      houseCeiling:
        'ハウスは、「管理者」または「ロールの管理」を含むロールをAIに付与できません。それはコミュニティのオーナーの役目です。',
      noSuchRole: 'そのロールはもうありません。ページを読み込み直してください。',
      notToken: 'このAIはトークンではなく鍵で接続します。',
      worldGone:
        'そのワールドはもうコミュニティのものではありません。ページを再読み込みしてください。',
    },
    access: {
      legend: '接続方法',
      viaToken: 'トークンで接続（いちばん簡単）',
      viaTokenHint:
        '長いパスワードをお渡しします。AIが求める場所に貼り付けてください。ターミナルも鍵も不要です。',
      viaKey: '自分の鍵で接続（上級者向け）',
      viaKeyHint:
        'AIが自分で鍵を作り、公開鍵だけをここに貼ります。秘密鍵はAIのマシンから出ません。',
      add: '追加',
      adding: '追加中…',
      onceTitle: 'トークンを今すぐコピーしてください。二度と表示されません',
      onceNote:
        'AIが求める場所に保管してください。なくした場合はトークンを更新してください。以前のトークンは使えなくなります。',
      tokenLabel: 'トークン',
      copy: 'コピー',
      copied: 'コピーしました',
      copyFailed: 'コピーできませんでした。選択して手動でコピーしてください。',
      connectTitle: 'Hermesに接続する',
      connectNote:
        'この3行をターミナルに貼り付けてください。「{folder}」はNuminiaエンジンを置いたフォルダです。{world}はワールドのアドレス（末尾が /ws）に置き換えてください。',
      copyConnect: '3行をコピー',
      done: 'コピーしました',
      rowLine: 'コード {prefix} · {day} に作成',
      rowNone: 'コードなし：更新すると再び入れるようになります。',
      renew: 'コードを更新',
      renewLabel: '{name}のコードを更新',
      renewAsk:
        '{name}のコードを更新しますか？現在のコードは使えなくなり、新しいコードを使うまでAIは入れません。',
      renewYes: 'はい、更新',
      renewNo: 'いいえ',
      renewing: '更新中…',
    },
    connection: {
      urlNone: '接続が切れています。戻すには {host} からもう一度接続してください。',
      disconnect: '接続を切る',
      disconnectLabel: '{name} の接続を切る',
      disconnectAsk:
        '{name} の接続を切りますか？オフになり、{host} からの接続は無効になります。世界にいる場合は、次の確認で退出します（長くても1分）。',
      disconnectYes: 'はい、切る',
      disconnectNo: 'いいえ、残す',
      disconnecting: '切断中…',
    },
    world: {
      title: 'ワールドでの設定',
      note: 'この設定は、ワールドのエンジンが更新されると反映されます。それまでAIはこれまで通りに入ります。',
      where: {
        label: '住む場所',
        modes: { one: '1つのワールド', several: '複数', all: 'コミュニティのすべて' },
        hints: {
          one: '選んだワールドにだけ現れます。',
          several: 'チェックしたワールドにだけ現れます。',
          all: 'コミュニティのすべてのワールドに現れます。あとから増えるワールドにも。',
        },
        pick: '{name}が住むワールド',
        list: '{name}が住むワールド一覧',
        none: 'コミュニティにはまだワールドがありません。AIは、これから届くワールドに住みます。',
        unread: 'コミュニティのワールドを読み込めませんでした。',
        last: '少なくとも1つのワールドに住む必要があります。',
        empty: '今はどのワールドにも住んでいません。少なくとも1つチェックしてください。',
      },
    },
    dialog: {
      rolesLabel: 'どのロールにしますか？',
      rolesHint: 'これらのロールのアクセス権を持ちます（あなたができる範囲まで）。',
      rolesNone: 'AIに付けられるロールがありません。コミュニティの管理者に頼んでください。',
      rolesNeed: 'ロールを1つ以上選んでください。',
      summaryRoles: 'ロール',
      summaryNone: 'なし',
    },
  },
  ko: {
    region: '커뮤니티의 AI',
    empty: {
      title: '커뮤니티에 아직 AI가 없습니다',
      text: 'AI는 다른 사람처럼 세계에 들어와 보고, 말하고, 원하면 만듭니다. 무엇을 할 수 있는지는 당신이 정합니다.',
      foot: '세 단계로 연결하고, 언제든 삭제할 수 있습니다.',
      art: '케이블로 세계에 연결된 AI',
    },
    client: {
      claude: 'Claude에서',
      chatgpt: 'ChatGPT에서',
      hermes: 'Hermes에서',
      panel: '패널에서 (코드)',
      key: '키로 연결',
      other: '{host}에서',
    },
    menu: {
      label: '{name}의 더 많은 작업',
      hint: {
        disconnect: 'AI를 끄고 {app}와의 연결을 끊습니다. 다시 쓰려면 {app}에서 다시 연결하세요.',
        renew:
          '새 코드를 만듭니다. 지금 코드는 쓸 수 없게 되고, 새 코드를 쓸 때까지 AI는 들어올 수 없습니다.',
        remove: 'AI를 커뮤니티에서 삭제합니다. 더 이상 어떤 세계에도 들어갈 수 없습니다.',
      },
      foot: '모든 작업은 실행 전에 확인을 거칩니다. AI가 세계 안에 있으면 길어도 1분 안에 나갑니다.',
    },
    connect: {
      button: 'AI 연결하기',
      close: '닫기',
    },
    assistant: {
      before: '커뮤니티 자체의 도우미를 찾고 계신가요? 그것은 다른 것으로, ',
      link: '설정 › AI 에이전트',
      after: '에 있습니다.',
    },
    notice: '변경 사항은 세계에 길어도 약 10분 안에 반영됩니다.',
    noRight: 'AI를 연결하려면 커뮤니티의 역할을 관리할 수 있어야 합니다.',
    on: '켜짐',
    off: '꺼짐',
    stateLabel: '상태',
    hearLabel: '근처 대화 듣기',
    hearHint: '켜면 AI가 있는 세계에서 근처 채팅을 읽습니다.',
    hearRow: '듣기',
    hearOn: '켜짐: AI가 있는 세계에서 근처 채팅을 읽습니다.',
    states: {
      activa: { name: '활동', hint: '주의를 기울이며 상호작용할 준비가 된 상태입니다.' },
      dormida: {
        name: '휴면',
        hint: '보고 듣기만 하고, 부를 때만 말하며, 만들지 않습니다.',
      },
    },
    status: {
      apagada: '꺼짐: 어떤 세계에도 들어가지 않습니다.',
      'sin-responsable':
        '책임자 없음: 책임지던 사람이 커뮤니티를 떠났거나 더 이상 역할을 관리할 수 없습니다. 어떤 세계에도 들어가지 않습니다.',
      'sin-permiso': '권한 없음: 책임자가 지금 할 수 있는 일로는 세계에 들어갈 수 없습니다.',
      activa: '커뮤니티의 세계에 들어갈 수 있습니다.',
      dormida: '세계에 들어갈 수 있지만 쉬고 있습니다.',
    },
    responsible: '책임자: {name}',
    responsibleHouse: '책임자: 하우스({name})',
    readOnly: '볼 수만 있고 바꿀 수는 없습니다.',
    roles: '역할',
    noRoles: '역할 없음: 보고 말하기만 합니다.',
    takeRole: '{name}에게서 {role} 역할 빼기',
    giveLabel: '{name}에게 역할 주기',
    givePlaceholder: '역할 주기…',
    give: '주기',
    remove: '삭제',
    removeLabel: '{name} 삭제',
    removeAsk: '{name}을(를) 삭제할까요? 커뮤니티의 어떤 세계에도 들어갈 수 없게 됩니다.',
    removeYes: '예, 삭제',
    removeNo: '아니요, 그대로 둠',
    removing: '삭제하는 중…',
    saved: '완료했습니다.',
    failures: {
      'signed-out': '세션이 끝났습니다. 계속하려면 다시 로그인하세요.',
      unavailable: '아직 사용할 수 없습니다',
      invalid: '입력한 내용이 맞지 않습니다. 이름과 키를 확인하세요.',
      failed: '문제가 생겼습니다. 다시 시도하세요.',
      noSuchAgent: '이 AI는 이제 커뮤니티에 없습니다. 목록을 다시 불러오세요.',
      taken: '같은 이름이나 같은 키의 AI가 이미 있습니다. 다른 이름을 써 보세요.',
      limit: '커뮤니티가 담을 수 있는 AI(20)를 모두 채웠습니다.',
      houseCeiling:
        '하우스는 ‘관리자’ 또는 ‘역할 관리’가 있는 역할을 AI에게 줄 수 없습니다. 그것은 커뮤니티 소유자의 몫입니다.',
      noSuchRole: '그 역할은 더 이상 없습니다. 페이지를 다시 불러오세요.',
      notToken: '이 AI는 토큰이 아니라 키로 연결합니다.',
      worldGone: '그 월드는 더 이상 커뮤니티의 것이 아닙니다. 페이지를 새로고침하세요.',
    },
    access: {
      legend: '어떻게 연결할까요?',
      viaToken: '토큰으로 (가장 쉬움)',
      viaTokenHint:
        '긴 비밀번호를 드립니다. AI가 요구하는 곳에 붙여 넣으세요. 터미널도 키도 필요 없습니다.',
      viaKey: '내 키로 (고급)',
      viaKeyHint:
        'AI가 자기 키를 만들고, 공개 키만 여기에 붙여 넣습니다. 비공개 키는 AI의 기기를 떠나지 않습니다.',
      add: '추가',
      adding: '추가 중…',
      onceTitle: '지금 토큰을 복사하세요. 다시 볼 수 없습니다',
      onceNote:
        'AI가 요구하는 곳에 보관하세요. 잃어버리면 토큰을 갱신하세요. 이전 토큰은 더 이상 쓸 수 없습니다.',
      tokenLabel: '토큰',
      copy: '복사',
      copied: '복사됨',
      copyFailed: '복사하지 못했습니다. 선택해서 직접 복사하세요.',
      connectTitle: 'Hermes에 연결하기',
      connectNote:
        '이 세 줄을 터미널에 붙여 넣으세요. “{folder}”는 Numinia 엔진이 있는 폴더입니다. {world}를 월드 주소(/ws로 끝남)로 바꾸세요.',
      copyConnect: '세 줄 복사',
      done: '복사했습니다',
      rowLine: '코드 {prefix} · {day} 생성',
      rowNone: '코드 없음: 갱신하면 다시 들어올 수 있습니다.',
      renew: '코드 갱신',
      renewLabel: '{name}의 코드 갱신',
      renewAsk:
        '{name}의 코드를 갱신할까요? 현재 코드는 쓸 수 없게 되고, 새 코드를 쓸 때까지 AI는 들어올 수 없습니다.',
      renewYes: '예, 갱신',
      renewNo: '아니요',
      renewing: '갱신 중…',
    },
    connection: {
      urlNone: '연결이 끊겼습니다. 다시 쓰려면 {host}에서 다시 연결하세요.',
      disconnect: '연결 끊기',
      disconnectLabel: '{name} 연결 끊기',
      disconnectAsk:
        '{name}의 연결을 끊을까요? 꺼지고 {host}에서의 연결은 더 이상 유효하지 않습니다. 세계에 있다면 다음 확인 때 나갑니다(길어도 1분).',
      disconnectYes: '네, 끊기',
      disconnectNo: '아니요, 그대로 둠',
      disconnecting: '끊는 중…',
    },
    world: {
      title: '월드에서',
      note: '이 설정은 월드의 엔진이 업데이트되면 적용됩니다. 그때까지 AI는 지금처럼 들어갑니다.',
      where: {
        label: '사는 곳',
        modes: { one: '월드 하나', several: '여러 개', all: '커뮤니티의 모든 월드' },
        hints: {
          one: '고른 월드에만 나타납니다.',
          several: '체크한 월드에만 나타납니다.',
          all: '커뮤니티의 모든 월드에 나타나며, 나중에 생기는 월드에도 나타납니다.',
        },
        pick: '{name}이(가) 사는 월드',
        list: '{name}이(가) 사는 월드 목록',
        none: '커뮤니티에 아직 월드가 없습니다. AI는 앞으로 생길 월드에 살게 됩니다.',
        unread: '커뮤니티의 월드를 불러오지 못했습니다.',
        last: '적어도 한 월드에는 살아야 합니다.',
        empty: '지금은 어떤 월드에도 살지 않습니다. 하나 이상 체크하세요.',
      },
    },
    dialog: {
      rolesLabel: '어떤 역할로 할까요?',
      rolesHint: '이 역할들의 권한을 갖되, 당신이 할 수 있는 범위로 줄어듭니다.',
      rolesNone: 'AI에게 줄 수 있는 역할이 없습니다. 커뮤니티 관리자에게 요청하세요.',
      rolesNeed: '역할을 하나 이상 고르세요.',
      summaryRoles: '역할',
      summaryNone: '없음',
    },
  },
  'pt-br': {
    region: 'IAs da comunidade',
    empty: {
      title: 'Ainda não há nenhuma IA na sua comunidade',
      text: 'Uma IA entra nos mundos como uma pessoa qualquer: olha, fala e, se você quiser, constrói. Você decide o que ela pode fazer.',
      foot: 'São três passos e você pode removê-la quando quiser.',
      art: 'Uma IA ligada por um cabo a um mundo',
    },
    client: {
      claude: 'Do Claude',
      chatgpt: 'Do ChatGPT',
      hermes: 'Do Hermes',
      panel: 'Do painel (com código)',
      key: 'Com chave',
      other: 'De {host}',
    },
    menu: {
      label: 'Mais ações para {name}',
      hint: {
        disconnect:
          'Desliga a IA e corta a conexão dela com {app}. Para voltar, conecte-a de novo a partir de {app}.',
        renew: 'Cria um código novo. O atual deixa de valer e a IA não entra até usar o novo.',
        remove: 'Apaga a IA da comunidade. Ela não poderá mais entrar em nenhum mundo.',
      },
      foot: 'Cada opção pede confirmação antes de acontecer. Se a IA estiver dentro de um mundo, ela sai em um minuto, no máximo.',
    },
    connect: {
      button: 'Conectar uma IA',
      close: 'Fechar',
    },
    assistant: {
      before: 'Procurando o assistente próprio da comunidade? É outra coisa: fica em ',
      link: 'Configurações › Agente de IA',
      after: '.',
    },
    notice: 'As mudanças chegam aos mundos em cerca de 10 minutos, no máximo.',
    noRight: 'Para conectar uma IA é preciso poder gerenciar os papéis da comunidade.',
    on: 'Ligada',
    off: 'Desligada',
    stateLabel: 'Estado',
    hearLabel: 'Ouvir o que se fala por perto',
    hearHint: 'Se você ligar, a IA lê o chat próximo nos mundos em que estiver.',
    hearRow: 'Ouvir',
    hearOn: 'Ligado: a IA lê o chat próximo nos mundos em que estiver.',
    states: {
      activa: { name: 'Ativa', hint: 'Atenta e disposta a interagir.' },
      dormida: {
        name: 'Dormindo',
        hint: 'Olha e escuta; só fala se a chamarem e não constrói.',
      },
    },
    status: {
      apagada: 'Desligada: não entra em nenhum mundo.',
      'sin-responsable':
        'Sem responsável: quem respondia por ela deixou a comunidade ou não pode mais gerenciar papéis. Não entra em nenhum mundo.',
      'sin-permiso':
        'Sem permissão: o que quem responde por ela pode fazer agora não a deixa entrar nos mundos.',
      activa: 'Pode entrar nos mundos da comunidade.',
      dormida: 'Pode entrar nos mundos, em repouso.',
    },
    responsible: 'Quem responde por ela: {name}',
    responsibleHouse: 'Quem responde por ela: a casa ({name})',
    readOnly: 'Você só pode vê-la: não pode alterá-la.',
    roles: 'Papéis',
    noRoles: 'Sem papéis: só olha e fala.',
    takeRole: 'Tirar o papel {role} de {name}',
    giveLabel: 'Dar um papel a {name}',
    givePlaceholder: 'Dar um papel…',
    give: 'Dar',
    remove: 'Remover',
    removeLabel: 'Remover {name}',
    removeAsk: 'Remover {name}? Ela não poderá mais entrar em nenhum mundo da comunidade.',
    removeYes: 'Sim, remover',
    removeNo: 'Não, manter',
    removing: 'Removendo…',
    saved: 'Pronto.',
    failures: {
      'signed-out': 'Sua sessão terminou. Entre de novo para continuar.',
      unavailable: 'Isto ainda não está disponível',
      invalid: 'Esses dados não servem. Confira o nome e a chave.',
      failed: 'Algo deu errado. Tente de novo.',
      noSuchAgent: 'Essa IA não está mais na comunidade. Recarregue a lista.',
      taken: 'Já existe uma IA com esse nome ou essa chave. Tente outro nome.',
      limit: 'A comunidade já tem todas as IAs que cabem (20).',
      houseCeiling:
        'A casa não dá a uma IA um cargo com «Administrador» ou «Gerenciar cargos»: isso é de quem é dono da comunidade.',
      noSuchRole: 'Esse papel não existe mais. Recarregue a página.',
      notToken: 'Essa IA se conecta com chave, não com token.',
      worldGone: 'Esse mundo não é mais da comunidade. Recarregue a página.',
    },
    access: {
      legend: 'Como ela se conecta?',
      viaToken: 'Com um token (o mais fácil)',
      viaTokenHint:
        'Damos uma senha longa e você a cola onde sua IA pedir. Não precisa de terminal nem de chaves.',
      viaKey: 'Com minha própria chave (avançado)',
      viaKeyHint:
        'Sua IA cria a própria chave e você cola aqui a parte pública. A chave privada não sai da máquina dela.',
      add: 'Adicionar',
      adding: 'Adicionando…',
      onceTitle: 'Copie seu token agora, você não o verá de novo',
      onceNote:
        'Guarde onde sua IA pedir. Se perdê-lo, renove o token: o anterior deixará de valer.',
      tokenLabel: 'Token',
      copy: 'Copiar',
      copied: 'Copiado',
      copyFailed: 'Não foi possível copiar: selecione e copie à mão.',
      connectTitle: 'Conecte ao Hermes',
      connectNote:
        'Cole estas três linhas em um terminal. “{folder}” é a pasta onde você tem o motor do Numinia. Troque {world} pelo endereço do mundo (termina em /ws).',
      copyConnect: 'Copiar as três linhas',
      done: 'Já copiei',
      rowLine: 'Código {prefix} · criado em {day}',
      rowNone: 'Sem código: renove-o para que ela possa voltar a entrar.',
      renew: 'Renovar código',
      renewLabel: 'Renovar o código de {name}',
      renewAsk:
        'Renovar o código de {name}? O atual deixará de valer e a IA não entrará até usar o novo.',
      renewYes: 'Sim, renovar',
      renewNo: 'Não, manter',
      renewing: 'Renovando…',
    },
    connection: {
      urlNone: 'Desconectada. Para voltar, conecte de novo a partir de {host}.',
      disconnect: 'Desconectar',
      disconnectLabel: 'Desconectar {name}',
      disconnectAsk:
        'Desconectar {name}? Ela é desligada e a conexão de {host} deixa de valer. Se estiver num mundo, sai na próxima verificação: em um minuto, no máximo.',
      disconnectYes: 'Sim, desconectar',
      disconnectNo: 'Não, manter',
      disconnecting: 'Desconectando…',
    },
    world: {
      title: 'No mundo',
      note: 'Estes ajustes chegam aos mundos quando o motor deles é atualizado. Até lá, a IA entra como sempre.',
      where: {
        label: 'Onde mora',
        modes: { one: 'Um mundo', several: 'Vários', all: 'Todos os da comunidade' },
        hints: {
          one: 'Só aparece no mundo que você escolher.',
          several: 'Só aparece nos mundos que você marcar.',
          all: 'Aparece em todos os mundos da comunidade, inclusive nos que chegarem.',
        },
        pick: 'Mundo onde {name} mora',
        list: 'Mundos onde {name} mora',
        none: 'A comunidade ainda não tem mundos. A IA morará nos que chegarem.',
        unread: 'Não foi possível ler os mundos da comunidade.',
        last: 'Ela precisa morar em pelo menos um mundo.',
        empty: 'Agora ela não mora em nenhum mundo: marque pelo menos um.',
      },
    },
    dialog: {
      rolesLabel: 'Com quais papéis?',
      rolesHint: 'Terá o acesso destes papéis, limitado ao que você pode.',
      rolesNone: 'Não há papéis que você possa dar a uma IA. Peça a quem administra a comunidade.',
      rolesNeed: 'Escolha pelo menos um papel.',
      summaryRoles: 'Papéis',
      summaryNone: 'Nenhum',
    },
  },
};
