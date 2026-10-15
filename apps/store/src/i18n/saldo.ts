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
  readonly signatureNote: string;
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
  };
  readonly lines: {
    readonly title: string;
    readonly empty: string;
    readonly when: string;
    readonly what: string;
    readonly amount: string;
    readonly labels: Readonly<Record<LineLabel, string>>;
    /** `{v}`: the VAT paid with a top-up. */
    readonly vat: string;
    /** `{world}` and `{size}` of a world's day. */
    readonly world: string;
  };
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
      lowNote: 'Te queda menos de 10 €. Recarga para que tus mundos sigan abiertos.',
      spent: 'Gastado este periodo',
      spentOf: 'en los últimos {range}',
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
      title: 'Uso',
      ranges: { '7d': '7 días', '30d': '30 días', '12m': '12 meses' },
      rangeLabel: 'Periodo',
      empty: 'En este periodo no se ha gastado nada: ningún mundo ha consumido saldo.',
      chartDays: 'Gasto por día: {total} en total',
      chartMonths: 'Gasto por mes: {total} en total',
    },
    lines: {
      title: 'Movimientos',
      empty: 'Todavía no hay movimientos en esta cuenta.',
      when: 'Fecha',
      what: 'Concepto',
      amount: 'Importe',
      labels: {
        topup: 'Recarga',
        world: 'Mundo · día',
        adjustment: 'Ajuste',
        refund: 'Devolución',
      },
      vat: 'IVA {v}',
      world: '{world} · {size}',
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
        'La firma nueva de tu cartera para dar «Administrador» o «Gestionar roles» todavía no está lista. Lo demás sí puedes hacerlo.',
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
        'Dar «Administrador» o «Gestionar roles» pedirá una firma nueva de tu cartera; esta pantalla todavía no sabe pedirla.',
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
      lowNote: 'Less than €10 left. Top up to keep your worlds open.',
      spent: 'Spent this period',
      spentOf: 'over the last {range}',
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
      empty: 'Nothing was spent in this period: no world used any balance.',
      chartDays: 'Spend per day: {total} in all',
      chartMonths: 'Spend per month: {total} in all',
    },
    lines: {
      title: 'Movements',
      empty: 'No movements on this account yet.',
      when: 'Date',
      what: 'What',
      amount: 'Amount',
      labels: { topup: 'Top-up', world: 'World · day', adjustment: 'Adjustment', refund: 'Refund' },
      vat: 'VAT {v}',
      world: '{world} · {size}',
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
        'A new signature from your wallet to give «Administrator» or «Manage roles» is not ready yet. You can do the rest.',
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
        'Giving «Administrator» or «Manage roles» will ask for a fresh signature from your wallet; this screen cannot ask for it yet.',
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
      lowNote: '残りが10ユーロ未満です。ワールドを開いたままにするにはチャージしてください。',
      spent: '今期の利用額',
      spentOf: '直近{range}',
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
      empty: 'この期間の利用はありません。残高を使ったワールドはありません。',
      chartDays: '日ごとの利用額：合計{total}',
      chartMonths: '月ごとの利用額：合計{total}',
    },
    lines: {
      title: '取引履歴',
      empty: 'このアカウントにはまだ取引がありません。',
      when: '日付',
      what: '内容',
      amount: '金額',
      labels: { topup: 'チャージ', world: 'ワールド · 1日', adjustment: '調整', refund: '返金' },
      vat: 'VAT {v}',
      world: '{world} · {size}',
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
        '「管理者」や「ロールの管理」を付与するためのウォレットの新しい署名は、まだ用意できていません。それ以外の操作はできます。',
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
        '「管理者」や「ロールの管理」を付与するには、ウォレットの新しい署名が必要になります。この画面はまだ署名を求められません。',
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
      lowNote: '10유로 미만 남았습니다. 월드를 계속 열어 두려면 충전하세요.',
      spent: '이번 기간 사용액',
      spentOf: '최근 {range}',
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
      empty: '이 기간에는 사용한 금액이 없습니다. 잔액을 쓴 월드가 없습니다.',
      chartDays: '일별 사용액: 합계 {total}',
      chartMonths: '월별 사용액: 합계 {total}',
    },
    lines: {
      title: '거래 내역',
      empty: '이 계정에는 아직 거래 내역이 없습니다.',
      when: '날짜',
      what: '내용',
      amount: '금액',
      labels: { topup: '충전', world: '월드 · 1일', adjustment: '조정', refund: '환불' },
      vat: 'VAT {v}',
      world: '{world} · {size}',
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
        "'관리자'나 '역할 관리'를 부여하기 위한 지갑의 새 서명은 아직 준비되지 않았습니다. 나머지는 할 수 있습니다.",
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
      signatureNote:
        "'관리자'나 '역할 관리'를 부여하려면 지갑의 새 서명이 필요합니다. 이 화면은 아직 서명을 요청할 수 없습니다.",
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
      lowNote: 'Restam menos de 10 €. Recarregue para manter seus mundos abertos.',
      spent: 'Gasto neste período',
      spentOf: 'nos últimos {range}',
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
      title: 'Uso',
      ranges: { '7d': '7 dias', '30d': '30 dias', '12m': '12 meses' },
      rangeLabel: 'Período',
      empty: 'Nada foi gasto neste período: nenhum mundo consumiu saldo.',
      chartDays: 'Gasto por dia: {total} no total',
      chartMonths: 'Gasto por mês: {total} no total',
    },
    lines: {
      title: 'Movimentos',
      empty: 'Ainda não há movimentos nesta conta.',
      when: 'Data',
      what: 'Descrição',
      amount: 'Valor',
      labels: { topup: 'Recarga', world: 'Mundo · dia', adjustment: 'Ajuste', refund: 'Devolução' },
      vat: 'IVA {v}',
      world: '{world} · {size}',
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
        'A nova assinatura da sua carteira para dar «Administrador» ou «Gerenciar papéis» ainda não está pronta. O resto você pode fazer.',
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
        'Dar «Administrador» ou «Gerenciar papéis» vai pedir uma nova assinatura da sua carteira; esta tela ainda não sabe pedi-la.',
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
