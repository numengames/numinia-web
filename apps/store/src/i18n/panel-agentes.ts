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
  /** The community has no AI yet. */
  readonly none: string;
  /** Always visible: how long a change takes to reach the worlds. */
  readonly notice: string;
  readonly invite: string;
  /** Beside a disabled «Invitar»: why. */
  readonly noRight: string;
  /** The switch's two words, also its label. */
  readonly on: string;
  readonly off: string;
  readonly stateLabel: string;
  /** The switch on each AI's card: whether it may read the nearby chat of the worlds it is in. */
  readonly hearLabel: string;
  readonly hearHint: string;
  readonly states: Readonly<Record<AgentState, { readonly name: string; readonly hint: string }>>;
  /** What the till says the next pass will be, in plain words. */
  readonly status: Readonly<Record<AgentStatus, string>>;
  /** `{name}`: who answers for the AI. */
  readonly responsible: string;
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
  /** Under the title: whose AIs these are — not Ajustes › «Agente IA», the community's own assistant. */
  readonly subtitle: string;
  /** «Conecta tu IA» (paso 2): the relay's address and how each kind of app uses it. */
  readonly url: {
    readonly title: string;
    readonly intro: string;
    /** The address's label, for screen readers. */
    readonly label: string;
    readonly claude: string;
    readonly chatgpt: string;
    readonly hermes: string;
    /** The «Add to Hermes» link (hermes://mcp/install). */
    readonly hermesAdd: string;
    /** Clients that cannot sign in: the address with the panel's token; the Hermes line follows. */
    readonly noLogin: string;
    readonly copyCommand: string;
    /** Where an AI's hearing is switched: on its card, off until someone who may edit it turns it on. */
    readonly hear: string;
  };
  /** How a row's AI is connected (`via`), and «Desconectar» for one connected from an app. */
  readonly connection: {
    readonly panel: string;
    /** `{host}`: the app's host. */
    readonly url: string;
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
    none: 'Aún no hay ninguna IA. Una IA entra en los mundos de la comunidad como una persona más: mira, habla y, si tú quieres, construye.',
    notice: 'Los cambios llegan a los mundos en unos 10 minutos como máximo.',
    invite: 'Invitar a una IA',
    noRight: 'Para invitar a una IA hace falta poder gestionar los roles de la comunidad.',
    on: 'Encendida',
    off: 'Apagada',
    stateLabel: 'Estado',
    hearLabel: 'Oír lo que se habla cerca',
    hearHint: 'Si lo enciendes, la IA lee el chat cercano en los mundos donde esté.',
    states: {
      activa: { name: 'Activa', hint: 'Atenta y dispuesta a interactuar' },
      dormida: {
        name: 'Dormida',
        hint: 'Baja atención: mira y escucha, solo habla si la llaman, no construye',
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
      houseCannot: 'La casa no responde por una IA: la invita una persona de la comunidad.',
      noSuchRole: 'Ese rol ya no existe. Recarga la página.',
      notToken: 'Esa IA se conecta con llave, no con token.',
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
      rowLine: 'Token {prefix} · creado el {day}',
      rowNone: 'Sin token: renuévalo para que pueda volver a entrar.',
      renew: 'Renovar token',
      renewLabel: 'Renovar el token de {name}',
      renewAsk:
        '¿Renovar el token de {name}? El actual dejará de valer y la IA no entrará hasta que use el nuevo.',
      renewYes: 'Sí, renovar',
      renewNo: 'No, dejarlo',
      renewing: 'Renovando…',
    },
    subtitle:
      'IAs que traen los miembros. El asistente propio de la comunidad es otra cosa: está en Ajustes › Agente IA.',
    url: {
      title: 'Conecta tu IA',
      intro:
        'Pega esta dirección en tu IA y entra con numinia.com: eliges la comunidad, el nombre de la IA y su rol.',
      label: 'Dirección para tu IA',
      claude:
        'En Claude: añade un conector personalizado y pega la dirección. Se abre numinia.com para que entres.',
      chatgpt:
        'En ChatGPT: activa el modo desarrollador, crea una app nueva y pega la dirección. Se abre numinia.com para que entres.',
      hermes:
        'En Hermes de escritorio: «Añadir a Hermes» lo deja preparado; confírmalo y entra con numinia.com.',
      hermesAdd: 'Añadir a Hermes',
      noLogin:
        'Sin inicio de sesión (scripts, Hermes en un servidor): la misma dirección con el token de «Invitar a una IA» › «Con un token». En Hermes, esta línea te pide el token:',
      copyCommand: 'Copiar la línea',
      hear: 'Para que una IA oiga lo que se habla cerca, enciende «Oír lo que se habla cerca» en su tarjeta: viene apagado.',
    },
    connection: {
      panel: 'Conectada desde el panel',
      url: 'Conectada desde {host}',
      urlNone: 'Desconectada. Para volver, conéctala otra vez desde {host}.',
      disconnect: 'Desconectar',
      disconnectLabel: 'Desconectar a {name}',
      disconnectAsk:
        '¿Desconectar a {name}? Se apaga y su conexión desde {host} deja de valer. Si está en un mundo, sale en su siguiente comprobación: un minuto como mucho.',
      disconnectYes: 'Sí, desconectar',
      disconnectNo: 'No, dejarla',
      disconnecting: 'Desconectando…',
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
    none: 'No AI yet. An AI enters the community’s worlds like anyone else: it looks, talks and, if you want, builds.',
    notice: 'Changes reach the worlds within about 10 minutes at most.',
    invite: 'Invite an AI',
    noRight: 'To invite an AI you need to be able to manage the community’s roles.',
    on: 'On',
    off: 'Off',
    stateLabel: 'State',
    hearLabel: 'Hear what is said nearby',
    hearHint: 'If you turn it on, the AI reads the nearby chat in the worlds it is in.',
    states: {
      activa: { name: 'Active', hint: 'Attentive and ready to interact' },
      dormida: {
        name: 'Asleep',
        hint: 'Low attention: it watches and listens, only speaks if called, does not build',
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
      houseCannot: 'The house does not answer for an AI: a person of the community invites it.',
      noSuchRole: 'That role no longer exists. Reload the page.',
      notToken: 'That AI connects with a key, not a token.',
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
      rowLine: 'Token {prefix} · created on {day}',
      rowNone: 'No token: renew it so it can come back in.',
      renew: 'Renew token',
      renewLabel: 'Renew the token of {name}',
      renewAsk:
        'Renew the token of {name}? The current one will stop working and the AI will not get in until it uses the new one.',
      renewYes: 'Yes, renew',
      renewNo: 'No, keep it',
      renewing: 'Renewing…',
    },
    subtitle:
      'AIs that members bring. The community’s own assistant is something else: it is in Settings › AI agent.',
    url: {
      title: 'Connect your AI',
      intro:
        'Paste this address into your AI and sign in with numinia.com: you pick the community, the AI’s name and its role.',
      label: 'Address for your AI',
      claude:
        'In Claude: add a custom connector and paste the address. numinia.com opens for you to sign in.',
      chatgpt:
        'In ChatGPT: turn on developer mode, create a new app and paste the address. numinia.com opens for you to sign in.',
      hermes:
        'In Hermes desktop: «Add to Hermes» sets it up; confirm it and sign in with numinia.com.',
      hermesAdd: 'Add to Hermes',
      noLogin:
        'Without signing in (scripts, Hermes on a server): the same address with the token from «Invite an AI» › «With a token». In Hermes, this line asks you for the token:',
      copyCommand: 'Copy the line',
      hear: 'For an AI to hear what is said nearby, turn on «Hear what is said nearby» on its card: it starts off.',
    },
    connection: {
      panel: 'Connected from the panel',
      url: 'Connected from {host}',
      urlNone: 'Disconnected. To come back, connect it again from {host}.',
      disconnect: 'Disconnect',
      disconnectLabel: 'Disconnect {name}',
      disconnectAsk:
        'Disconnect {name}? It is switched off and its connection from {host} stops working. If it is in a world, it leaves at its next check: within a minute.',
      disconnectYes: 'Yes, disconnect',
      disconnectNo: 'No, keep it',
      disconnecting: 'Disconnecting…',
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
    none: 'まだAIはいません。AIは他の人と同じようにコミュニティの世界に入り、見て、話し、あなたが望めば建てます。',
    notice: '変更が世界に届くまで、長くても10分ほどかかります。',
    invite: 'AIを招待',
    noRight: 'AIを招待するには、コミュニティのロールを管理できる必要があります。',
    on: 'オン',
    off: 'オフ',
    stateLabel: '状態',
    hearLabel: '近くの会話を聞く',
    hearHint: 'オンにすると、AIは自分がいる世界で近くのチャットを読みます。',
    states: {
      activa: { name: 'アクティブ', hint: '注意深く、やり取りに応じられる状態' },
      dormida: {
        name: 'スリープ',
        hint: '注意は低め：見て聞くだけで、呼ばれたときだけ話し、建てません',
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
      houseCannot: 'ハウスはAIの責任者になれません。コミュニティの人が招待します。',
      noSuchRole: 'そのロールはもうありません。ページを読み込み直してください。',
      notToken: 'このAIはトークンではなく鍵で接続します。',
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
      rowLine: 'トークン {prefix} · {day} に作成',
      rowNone: 'トークンなし：更新すると再び入れるようになります。',
      renew: 'トークンを更新',
      renewLabel: '{name}のトークンを更新',
      renewAsk:
        '{name}のトークンを更新しますか？現在のトークンは使えなくなり、新しいトークンを使うまでAIは入れません。',
      renewYes: 'はい、更新',
      renewNo: 'いいえ',
      renewing: '更新中…',
    },
    subtitle:
      'メンバーが連れてくるAIです。コミュニティ自身のアシスタントは別のもので、設定 › AIエージェント にあります。',
    url: {
      title: 'AIをつなぐ',
      intro:
        'このアドレスをAIに貼り付けて、numinia.comでログインします。コミュニティ、AIの名前、ロールを選びます。',
      label: 'AI用のアドレス',
      claude:
        'Claudeでは：カスタムコネクタを追加してアドレスを貼り付けます。numinia.comが開くのでログインします。',
      chatgpt:
        'ChatGPTでは：開発者モードをオンにし、新しいアプリを作成してアドレスを貼り付けます。numinia.comが開くのでログインします。',
      hermes:
        'Hermesデスクトップでは：「Hermesに追加」で準備できます。確認してnuminia.comでログインします。',
      hermesAdd: 'Hermesに追加',
      noLogin:
        'ログインなし（スクリプト、サーバー上のHermes）：同じアドレスに「AIを招待」›「トークンで接続」のトークンを使います。Hermesでは、この1行がトークンを尋ねます：',
      copyCommand: 'この行をコピー',
      hear: 'AIに近くの会話を聞かせるには、そのカードで「近くの会話を聞く」をオンにします。最初はオフです。',
    },
    connection: {
      panel: 'パネルから接続',
      url: '{host} から接続',
      urlNone: '接続が切れています。戻すには {host} からもう一度接続してください。',
      disconnect: '接続を切る',
      disconnectLabel: '{name} の接続を切る',
      disconnectAsk:
        '{name} の接続を切りますか？オフになり、{host} からの接続は無効になります。世界にいる場合は、次の確認で退出します（長くても1分）。',
      disconnectYes: 'はい、切る',
      disconnectNo: 'いいえ、残す',
      disconnecting: '切断中…',
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
    none: '아직 AI가 없습니다. AI는 다른 사람처럼 커뮤니티의 세계에 들어와 보고, 말하고, 원하면 만듭니다.',
    notice: '변경 사항은 세계에 길어도 약 10분 안에 반영됩니다.',
    invite: 'AI 초대',
    noRight: 'AI를 초대하려면 커뮤니티의 역할을 관리할 수 있어야 합니다.',
    on: '켜짐',
    off: '꺼짐',
    stateLabel: '상태',
    hearLabel: '근처 대화 듣기',
    hearHint: '켜면 AI가 있는 세계에서 근처 채팅을 읽습니다.',
    states: {
      activa: { name: '활동', hint: '주의를 기울이며 상호작용할 준비가 된 상태' },
      dormida: {
        name: '휴면',
        hint: '낮은 주의: 보고 듣기만 하고, 부를 때만 말하며, 만들지 않습니다',
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
      houseCannot: '하우스는 AI의 책임자가 될 수 없습니다. 커뮤니티의 사람이 초대합니다.',
      noSuchRole: '그 역할은 더 이상 없습니다. 페이지를 다시 불러오세요.',
      notToken: '이 AI는 토큰이 아니라 키로 연결합니다.',
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
      rowLine: '토큰 {prefix} · {day} 생성',
      rowNone: '토큰 없음: 갱신하면 다시 들어올 수 있습니다.',
      renew: '토큰 갱신',
      renewLabel: '{name}의 토큰 갱신',
      renewAsk:
        '{name}의 토큰을 갱신할까요? 현재 토큰은 쓸 수 없게 되고, 새 토큰을 쓸 때까지 AI는 들어올 수 없습니다.',
      renewYes: '예, 갱신',
      renewNo: '아니요',
      renewing: '갱신 중…',
    },
    subtitle:
      '멤버가 데려오는 AI입니다. 커뮤니티 자체의 도우미는 다른 것으로, 설정 › AI 에이전트에 있습니다.',
    url: {
      title: 'AI 연결하기',
      intro:
        '이 주소를 AI에 붙여 넣고 numinia.com으로 로그인하세요. 커뮤니티, AI 이름, 역할을 고릅니다.',
      label: 'AI용 주소',
      claude:
        'Claude에서: 사용자 지정 커넥터를 추가하고 주소를 붙여 넣으세요. numinia.com이 열리면 로그인합니다.',
      chatgpt:
        'ChatGPT에서: 개발자 모드를 켜고 새 앱을 만든 뒤 주소를 붙여 넣으세요. numinia.com이 열리면 로그인합니다.',
      hermes:
        'Hermes 데스크톱에서: «Hermes에 추가»로 준비됩니다. 확인하고 numinia.com으로 로그인하세요.',
      hermesAdd: 'Hermes에 추가',
      noLogin:
        '로그인 없이 (스크립트, 서버의 Hermes): 같은 주소에 «AI 초대» › «토큰으로»의 토큰을 씁니다. Hermes에서는 이 한 줄이 토큰을 묻습니다:',
      copyCommand: '이 줄 복사',
      hear: 'AI가 근처 대화를 듣게 하려면 AI 카드에서 「근처 대화 듣기」를 켜세요. 처음에는 꺼져 있습니다.',
    },
    connection: {
      panel: '패널에서 연결됨',
      url: '{host}에서 연결됨',
      urlNone: '연결이 끊겼습니다. 다시 쓰려면 {host}에서 다시 연결하세요.',
      disconnect: '연결 끊기',
      disconnectLabel: '{name} 연결 끊기',
      disconnectAsk:
        '{name}의 연결을 끊을까요? 꺼지고 {host}에서의 연결은 더 이상 유효하지 않습니다. 세계에 있다면 다음 확인 때 나갑니다(길어도 1분).',
      disconnectYes: '네, 끊기',
      disconnectNo: '아니요, 그대로 둠',
      disconnecting: '끊는 중…',
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
    none: 'Ainda não há nenhuma IA. Uma IA entra nos mundos da comunidade como qualquer pessoa: olha, fala e, se você quiser, constrói.',
    notice: 'As mudanças chegam aos mundos em cerca de 10 minutos, no máximo.',
    invite: 'Convidar uma IA',
    noRight: 'Para convidar uma IA é preciso poder gerenciar os papéis da comunidade.',
    on: 'Ligada',
    off: 'Desligada',
    stateLabel: 'Estado',
    hearLabel: 'Ouvir o que se fala por perto',
    hearHint: 'Se você ligar, a IA lê o chat próximo nos mundos em que estiver.',
    states: {
      activa: { name: 'Ativa', hint: 'Atenta e disposta a interagir' },
      dormida: {
        name: 'Dormindo',
        hint: 'Atenção baixa: olha e escuta, só fala se a chamarem, não constrói',
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
      houseCannot: 'A casa não responde por uma IA: quem convida é uma pessoa da comunidade.',
      noSuchRole: 'Esse papel não existe mais. Recarregue a página.',
      notToken: 'Essa IA se conecta com chave, não com token.',
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
      rowLine: 'Token {prefix} · criado em {day}',
      rowNone: 'Sem token: renove para ela poder voltar a entrar.',
      renew: 'Renovar token',
      renewLabel: 'Renovar o token de {name}',
      renewAsk:
        'Renovar o token de {name}? O atual deixará de valer e a IA não entrará até usar o novo.',
      renewYes: 'Sim, renovar',
      renewNo: 'Não, manter',
      renewing: 'Renovando…',
    },
    subtitle:
      'IAs que os membros trazem. O assistente próprio da comunidade é outra coisa: fica em Configurações › Agente de IA.',
    url: {
      title: 'Conecte sua IA',
      intro:
        'Cole este endereço na sua IA e entre com numinia.com: você escolhe a comunidade, o nome da IA e o papel dela.',
      label: 'Endereço para a sua IA',
      claude:
        'No Claude: adicione um conector personalizado e cole o endereço. O numinia.com abre para você entrar.',
      chatgpt:
        'No ChatGPT: ative o modo desenvolvedor, crie um app novo e cole o endereço. O numinia.com abre para você entrar.',
      hermes:
        'No Hermes para desktop: «Adicionar ao Hermes» deixa tudo pronto; confirme e entre com numinia.com.',
      hermesAdd: 'Adicionar ao Hermes',
      noLogin:
        'Sem login (scripts, Hermes num servidor): o mesmo endereço com o token de «Convidar uma IA» › «Com um token». No Hermes, esta linha pede o token:',
      copyCommand: 'Copiar a linha',
      hear: 'Para uma IA ouvir o que se fala por perto, ligue «Ouvir o que se fala por perto» no cartão dela: ela começa desligada.',
    },
    connection: {
      panel: 'Conectada pelo painel',
      url: 'Conectada de {host}',
      urlNone: 'Desconectada. Para voltar, conecte de novo a partir de {host}.',
      disconnect: 'Desconectar',
      disconnectLabel: 'Desconectar {name}',
      disconnectAsk:
        'Desconectar {name}? Ela é desligada e a conexão de {host} deixa de valer. Se estiver num mundo, sai na próxima verificação: em um minuto, no máximo.',
      disconnectYes: 'Sim, desconectar',
      disconnectNo: 'Não, manter',
      disconnecting: 'Desconectando…',
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
