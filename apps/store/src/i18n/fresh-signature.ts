/**
 * The lines a wallet signs before an organization gives «Administrator» or
 * «Manage roles» (STD-051, ORG-008), five locales. Built on the server
 * (lib/fresh-signature.ts `freshMessage`) and shown by the wallet itself —
 * MetaMask and WalletConnect show them before signing; in-app wallets sign
 * without a window. Server only: no page ships these words.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { FreshWords } from '../lib/fresh-signature';

export const FRESH_SIGNATURE_WORDS: Readonly<Record<SupportedLocale, FreshWords>> = {
  es: {
    heading: 'Numinia · {organization}',
    create: 'Creas el rol «{role}» y le das: {permissions}.',
    edit: 'Das al rol «{role}»: {permissions}.',
    give: 'Das el rol «{role}», con {permissions}, a {who}.',
    until:
      'Esta firma vale hasta las {time} UTC y solo para este cambio. No es una transacción ni cuesta nada.',
  },
  en: {
    heading: 'Numinia · {organization}',
    create: 'You create the role «{role}» and give it: {permissions}.',
    edit: 'You give the role «{role}»: {permissions}.',
    give: 'You give the role «{role}», with {permissions}, to {who}.',
    until:
      'This signature is valid until {time} UTC and only for this change. No transaction, no cost.',
  },
  ja: {
    heading: 'Numinia · {organization}',
    create: 'ロール「{role}」を作成し、{permissions}を付与します。',
    edit: 'ロール「{role}」に{permissions}を付与します。',
    give: '{who} にロール「{role}」（{permissions}）を付与します。',
    until: 'この署名は UTC {time} まで、この変更にのみ有効です。取引ではなく、費用はかかりません。',
  },
  ko: {
    heading: 'Numinia · {organization}',
    create: "역할 '{role}'을(를) 만들고 {permissions} 권한을 부여합니다.",
    edit: "역할 '{role}'에 {permissions} 권한을 부여합니다.",
    give: "{who}에게 역할 '{role}'({permissions})을(를) 부여합니다.",
    until: '이 서명은 UTC {time}까지 이 변경에만 유효합니다. 거래가 아니며 비용이 들지 않습니다.',
  },
  'pt-br': {
    heading: 'Numinia · {organization}',
    create: 'Você cria o papel «{role}» e dá a ele: {permissions}.',
    edit: 'Você dá ao papel «{role}»: {permissions}.',
    give: 'Você dá o papel «{role}», com {permissions}, a {who}.',
    until:
      'Esta assinatura vale até as {time} UTC e só para esta mudança. Não é uma transação e não custa nada.',
  },
};
