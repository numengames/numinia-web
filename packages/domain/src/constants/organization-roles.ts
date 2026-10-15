/**
 * The register of organisation permissions (numinia-archive STD-052): the
 * labels of the seventeen permissions in the five languages, the cap of roles,
 * and the roles each kind of organisation is born with.
 */

import type { LocalizedString, SupportedLocale } from '../types/i18n.js';
import type {
  OrganizationPermission,
  OrganizationRole,
  OrganizationTemplate,
  OrganizationTemplateId,
} from '../types/organization.js';

/** An organisation holds at most this many roles besides the base role. */
export const MAX_ORGANIZATION_ROLES = 250;

/** The base role, which every member holds and nobody can delete, sits here. */
export const BASE_ROLE_POSITION = 0;

/** A role's name: 1 to this many characters. */
export const ROLE_NAME_MAX = 100;

export const BASE_ROLE_NAME: LocalizedString = {
  es: '@todos',
  en: '@everyone',
  ja: '@everyone',
  ko: '@everyone',
  'pt-br': '@todos',
};

export const ORGANIZATION_PERMISSION_LABELS: Readonly<
  Record<OrganizationPermission, LocalizedString>
> = {
  administrator: {
    es: 'Administrador',
    en: 'Administrator',
    ja: '管理者',
    ko: '관리자',
    'pt-br': 'Administrador',
  },
  'manage-organization': {
    es: 'Gestionar la organización',
    en: 'Manage the organization',
    ja: '組織の管理',
    ko: '조직 관리',
    'pt-br': 'Gerenciar a organização',
  },
  'view-organization-log': {
    es: 'Ver el registro',
    en: 'View the log',
    ja: '記録の閲覧',
    ko: '기록 보기',
    'pt-br': 'Ver o registro',
  },
  'manage-roles': {
    es: 'Gestionar roles',
    en: 'Manage roles',
    ja: 'ロールの管理',
    ko: '역할 관리',
    'pt-br': 'Gerenciar cargos',
  },
  'invite-members': {
    es: 'Invitar',
    en: 'Invite',
    ja: '招待',
    ko: '초대',
    'pt-br': 'Convidar',
  },
  'remove-members': {
    es: 'Quitar miembros',
    en: 'Remove members',
    ja: 'メンバーを外す',
    ko: '멤버 내보내기',
    'pt-br': 'Remover membros',
  },
  'ban-members': {
    es: 'Vetar',
    en: 'Ban',
    ja: '追放',
    ko: '차단',
    'pt-br': 'Banir',
  },
  'mute-members': {
    es: 'Silenciar',
    en: 'Mute',
    ja: 'ミュート',
    ko: '음소거',
    'pt-br': 'Silenciar',
  },
  'create-rituals': {
    es: 'Publicar rituales',
    en: 'Publish rituals',
    ja: '儀式の公開',
    ko: '의식 게시',
    'pt-br': 'Publicar rituais',
  },
  'manage-rituals': {
    es: 'Gestionar rituales',
    en: 'Manage rituals',
    ja: '儀式の管理',
    ko: '의식 관리',
    'pt-br': 'Gerenciar rituais',
  },
  'enter-worlds': {
    es: 'Entrar en la sede',
    en: 'Enter the worlds',
    ja: 'ワールドに入る',
    ko: '월드 입장',
    'pt-br': 'Entrar nos mundos',
  },
  'build-in-worlds': {
    es: 'Construir',
    en: 'Build',
    ja: '建築',
    ko: '건축',
    'pt-br': 'Construir',
  },
  'start-stop-worlds': {
    es: 'Encender y apagar',
    en: 'Start and stop worlds',
    ja: 'ワールドの起動と停止',
    ko: '월드 켜기와 끄기',
    'pt-br': 'Ligar e desligar mundos',
  },
  'create-worlds': {
    es: 'Abrir sedes',
    en: 'Create worlds',
    ja: 'ワールドの作成',
    ko: '월드 만들기',
    'pt-br': 'Criar mundos',
  },
  'view-balance': {
    es: 'Ver saldo y facturas',
    en: 'View balance and invoices',
    ja: '残高と請求書の閲覧',
    ko: '잔액과 청구서 보기',
    'pt-br': 'Ver saldo e faturas',
  },
  'top-up': {
    es: 'Recargar saldo',
    en: 'Top up',
    ja: '残高のチャージ',
    ko: '잔액 충전',
    'pt-br': 'Recarregar saldo',
  },
  'manage-balance': {
    es: 'Datos de facturación',
    en: 'Billing details',
    ja: '請求情報',
    ko: '청구 정보',
    'pt-br': 'Dados de faturamento',
  },
};

const ADMINISTRATION: LocalizedString = {
  es: 'Administración',
  en: 'Administration',
  ja: '管理',
  ko: '관리',
  'pt-br': 'Administração',
};
const FINANCE: LocalizedString = {
  es: 'Finanzas',
  en: 'Finance',
  ja: '経理',
  ko: '재무',
  'pt-br': 'Finanças',
};
const MEMBER: LocalizedString = {
  es: 'Miembro',
  en: 'Member',
  ja: 'メンバー',
  ko: '멤버',
  'pt-br': 'Membro',
};
const MODERATION: LocalizedString = {
  es: 'Moderación',
  en: 'Moderation',
  ja: 'モデレーション',
  ko: '운영',
  'pt-br': 'Moderação',
};

export const ORGANIZATION_TEMPLATES: Readonly<
  Record<OrganizationTemplateId, OrganizationTemplate>
> = {
  alpha: {
    id: 'alpha',
    roles: [{ name: ADMINISTRATION, permissions: ['administrator'], hoist: true }],
    base: ['enter-worlds', 'top-up'],
  },
  team: {
    id: 'team',
    roles: [
      { name: ADMINISTRATION, permissions: ['administrator'], hoist: true },
      { name: FINANCE, permissions: ['manage-balance'], hoist: false },
      {
        name: MEMBER,
        permissions: ['enter-worlds', 'start-stop-worlds', 'build-in-worlds'],
        hoist: false,
      },
    ],
    base: ['view-balance', 'top-up'],
  },
  community: {
    id: 'community',
    roles: [
      { name: ADMINISTRATION, permissions: ['administrator'], hoist: true },
      {
        name: MODERATION,
        permissions: ['remove-members', 'ban-members', 'mute-members', 'manage-rituals'],
        hoist: true,
      },
    ],
    base: ['enter-worlds', 'top-up'],
  },
};

/**
 * The roles an organisation is born with, named in one language: the template's
 * roles from the top down, then the base role at 0. `makeId(i)` names the i-th.
 */
export function rolesFromTemplate(
  id: OrganizationTemplateId,
  locale: SupportedLocale,
  makeId: (index: number) => string,
): readonly OrganizationRole[] {
  const template = ORGANIZATION_TEMPLATES[id];
  const top = template.roles.length;
  const roles: OrganizationRole[] = template.roles.map((role, index) => ({
    id: makeId(index),
    name: role.name[locale],
    color: null,
    position: top - index,
    hoist: role.hoist,
    permissions: role.permissions,
  }));
  roles.push({
    id: makeId(top),
    name: BASE_ROLE_NAME[locale],
    color: null,
    position: BASE_ROLE_POSITION,
    hoist: false,
    permissions: template.base,
  });
  return roles;
}
