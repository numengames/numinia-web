/**
 * «Saldo»'s words, five locales: your account and your organizations',
 * the balance that never expires, top-ups through Stripe in a new tab,
 * usage, movements and members, the way back from Stripe and «Referidos».
 * «organización» on this screen (the rest of the site says comunidad; the
 * naming is still open, so nothing else is renamed). `{name}` placeholders
 * are filled by `fill()` in lib/accounts.ts.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { LineLabel, SpendRange } from '../lib/accounts';

export interface SaldoMessages {
  /** The sidebar's entry and the page's tab. */
  readonly nav: string;
  readonly title: string;
  /** Meta description and lead of the page. */
  readonly lead: string;
  /** The page's own tabs: Saldo and Referidos. */
  readonly tabs: { readonly label: string; readonly saldo: string; readonly referrals: string };
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
    readonly onlyAdmins: string;
    readonly perMember: string;
    readonly perMemberEmpty: string;
  };
  readonly problems: {
    readonly notMember: string;
    readonly adminOnly: string;
    readonly lastAdmin: string;
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
    tabs: { label: 'Secciones de Saldo', saldo: 'Saldo', referrals: 'Referidos' },
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
      labels: { topup: 'Recarga', world: 'Mundo · día', adjustment: 'Ajuste', refund: 'Devolución' },
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
      onlyAdmins: 'Solo quien administra la organización puede añadir o quitar miembros.',
      perMember: 'Consumo por miembro',
      perMemberEmpty: 'Cuando cada mundo tenga dueño veréis aquí cuánto gasta cada uno.',
    },
    problems: {
      notMember: 'No eres miembro de esta organización.',
      adminOnly: 'Solo quien administra la organización puede hacerlo.',
      lastAdmin: 'Una organización necesita al menos una persona que la administre.',
      other: 'La caja no lo ha permitido.',
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
    tabs: { label: 'Balance sections', saldo: 'Balance', referrals: 'Referrals' },
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
      onlyAdmins: "Only the organization's admins can add or remove members.",
      perMember: 'Use per member',
      perMemberEmpty: 'Once every world has an owner, you will see here how much each of you spends.',
    },
    problems: {
      notMember: 'You are not a member of this organization.',
      adminOnly: "Only the organization's admins can do that.",
      lastAdmin: 'An organization needs at least one admin.',
      other: 'The till did not allow it.',
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
    tabs: { label: '残高のセクション', saldo: '残高', referrals: '紹介' },
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
      onlyAdmins: 'メンバーの追加・削除は組織の管理者だけができます。',
      perMember: 'メンバーごとの利用',
      perMemberEmpty: 'すべてのワールドに持ち主が決まると、ここで各自の利用額が見られます。',
    },
    problems: {
      notMember: 'あなたはこの組織のメンバーではありません。',
      adminOnly: 'これは組織の管理者だけができます。',
      lastAdmin: '組織には少なくとも1人の管理者が必要です。',
      other: 'レジが許可しませんでした。',
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
    tabs: { label: '잔액 섹션', saldo: '잔액', referrals: '추천' },
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
      onlyAdmins: '멤버 추가와 삭제는 조직 관리자만 할 수 있습니다.',
      perMember: '멤버별 사용량',
      perMemberEmpty: '모든 월드에 주인이 정해지면 여기에서 각자 얼마나 쓰는지 볼 수 있습니다.',
    },
    problems: {
      notMember: '이 조직의 멤버가 아닙니다.',
      adminOnly: '조직 관리자만 할 수 있습니다.',
      lastAdmin: '조직에는 관리자가 한 명 이상 필요합니다.',
      other: '계산대가 허용하지 않았습니다.',
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
    tabs: { label: 'Seções do Saldo', saldo: 'Saldo', referrals: 'Indicações' },
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
      onlyAdmins: 'Só quem administra a organização pode adicionar ou remover membros.',
      perMember: 'Consumo por membro',
      perMemberEmpty: 'Quando cada mundo tiver dono, vocês verão aqui quanto cada um gasta.',
    },
    problems: {
      notMember: 'Você não é membro desta organização.',
      adminOnly: 'Só quem administra a organização pode fazer isso.',
      lastAdmin: 'Uma organização precisa de pelo menos uma pessoa que a administre.',
      other: 'O caixa não permitiu.',
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
