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
