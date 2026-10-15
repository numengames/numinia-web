/**
 * /notifications — the «Más» bell (the Oracle, 2026-10-15, after
 * platform.claude.com's «Notificaciones»): a title, two tabs, and the empty
 * states that are the truth today, since nothing sends notifications yet.
 * Five locales; the sign-in word itself comes from APP_SHELL_UI.
 */

import type { SupportedLocale } from '@numinia/domain';

/** The two tabs, in their order; `?tab=requests` opens the second. */
export type NotificationsTab = 'updates' | 'requests';

interface EmptyState {
  readonly title: string;
  readonly text: string;
}

interface NotificationsMessages {
  readonly title: string;
  readonly description: string;
  readonly tabs: Readonly<Record<NotificationsTab, string>>;
  readonly empty: Readonly<Record<NotificationsTab, EmptyState>>;
  /** Signed out: the one line above the door. */
  readonly signedOut: string;
}

export const NOTIFICATIONS_UI: Readonly<Record<SupportedLocale, NotificationsMessages>> = {
  es: {
    title: 'Notificaciones',
    description: 'Los avisos de tu cuenta y las solicitudes que te lleguen, en un solo sitio.',
    tabs: { updates: 'Actualizaciones', requests: 'Solicitudes' },
    empty: {
      updates: {
        title: 'Estás al día',
        text: 'Los avisos y anuncios de tu cuenta aparecerán aquí.',
      },
      requests: {
        title: 'No tienes solicitudes',
        text: 'Las invitaciones y peticiones que te lleguen aparecerán aquí.',
      },
    },
    signedOut: 'Entra para ver tus notificaciones',
  },
  en: {
    title: 'Notifications',
    description: 'Your account’s notices and the requests you receive, in one place.',
    tabs: { updates: 'Updates', requests: 'Requests' },
    empty: {
      updates: {
        title: 'You’re all caught up',
        text: 'Notices and announcements about your account will appear here.',
      },
      requests: {
        title: 'No requests',
        text: 'Invitations and requests sent to you will appear here.',
      },
    },
    signedOut: 'Sign in to see your notifications',
  },
  ja: {
    title: '通知',
    description: 'アカウントのお知らせと届いたリクエストを、ひとつの場所で。',
    tabs: { updates: 'アップデート', requests: 'リクエスト' },
    empty: {
      updates: {
        title: 'すべて確認済みです',
        text: 'アカウントのお知らせや告知はここに表示されます。',
      },
      requests: {
        title: 'リクエストはありません',
        text: '届いた招待やリクエストはここに表示されます。',
      },
    },
    signedOut: 'ログインして通知を確認しましょう',
  },
  ko: {
    title: '알림',
    description: '계정 안내와 받은 요청을 한곳에서 확인하세요.',
    tabs: { updates: '업데이트', requests: '요청' },
    empty: {
      updates: {
        title: '모두 확인했어요',
        text: '계정 안내와 공지가 여기에 표시됩니다.',
      },
      requests: {
        title: '요청이 없습니다',
        text: '받은 초대와 요청이 여기에 표시됩니다.',
      },
    },
    signedOut: '로그인하고 알림을 확인하세요',
  },
  'pt-br': {
    title: 'Notificações',
    description: 'Os avisos da sua conta e as solicitações que você receber, em um só lugar.',
    tabs: { updates: 'Atualizações', requests: 'Solicitações' },
    empty: {
      updates: {
        title: 'Você está em dia',
        text: 'Os avisos e anúncios da sua conta aparecerão aqui.',
      },
      requests: {
        title: 'Você não tem solicitações',
        text: 'Os convites e pedidos que você receber aparecerão aqui.',
      },
    },
    signedOut: 'Entre para ver suas notificações',
  },
};
