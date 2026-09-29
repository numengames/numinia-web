/**
 * The cookie notice's words, per UI language (LEG-003 §4). The notice tells
 * the truth about numinia.com (LEG-003 §3.1): the preferences, the session
 * and this answer are needed and stay whatever the visitor chooses; the one
 * optional thing is Measurement, which counts clicks in the tab's memory
 * and sends nothing. The Terms are never accepted here — only at sign-in.
 *
 * Spanish and English are written for the site. Japanese and Korean reuse
 * the English words until a reliable translation exists; Brazilian
 * Portuguese is translated.
 */

import type { SupportedLocale } from '@numinia/domain';

export interface CookieNoticeStrings {
  readonly title: string;
  readonly description: string;
  readonly policyLink: string;
  readonly noticeLink: string;
  readonly privacyLink: string;
  readonly acceptAll: string;
  readonly rejectAll: string;
  readonly preferences: string;
  readonly preferencesTitle: string;
  readonly save: string;
  readonly close: string;
  readonly neededTitle: string;
  readonly neededText: string;
  readonly measurementTitle: string;
  readonly measurementText: string;
  readonly moreTitle: string;
  readonly moreText: string;
}

const EN: CookieNoticeStrings = {
  title: 'What this site keeps in your browser',
  description:
    'Your preferences, your session if you sign in, and this answer: they are needed, so they stay whatever you choose. One thing is optional: <b>Measurement</b> counts what is clicked on the page. The counts stay in this tab and never leave your device. <i>Accept all</i> turns it on; <i>Reject all</i> leaves it off.',
  policyLink: 'Cookie policy',
  noticeLink: 'Legal notice',
  privacyLink: 'Privacy',
  acceptAll: 'Accept all',
  rejectAll: 'Reject all',
  preferences: 'Preferences',
  preferencesTitle: 'What this site keeps',
  save: 'Save my choice',
  close: 'Close',
  neededTitle: 'Needed, and yours',
  neededText:
    'Your language, day or night mode, the player area and manual reader settings, your character sheet and the record of this answer; and, only if you sign in, your session and the sign-in provider’s keys. You set them yourself: they cannot be switched off here, only deleted from your browser.',
  measurementTitle: 'Measurement',
  measurementText:
    'Counts what is clicked on the page, to learn how the site is used. The counts are kept in this tab’s memory and discarded when you close it: nothing is sent to anyone. Off unless you turn it on.',
  moreTitle: 'Nothing else',
  moreText:
    'No advertising and nothing from other companies unless you sign in. The full list, key by key, is in the',
};

export const COOKIE_NOTICE_UI: Readonly<Record<SupportedLocale, CookieNoticeStrings>> = {
  en: EN,
  es: {
    title: 'Lo que esta web guarda en tu navegador',
    description:
      'Tus preferencias, tu sesión si entras y esta respuesta: son necesarias, así que se quedan elijas lo que elijas. Una cosa es opcional: la <b>Medición</b> cuenta qué se pulsa en la página. Esas cuentas se quedan en esta pestaña y nunca salen de tu dispositivo. <i>Aceptar todo</i> la activa; <i>Rechazar todo</i> la deja apagada.',
    policyLink: 'Política de cookies',
    noticeLink: 'Aviso legal',
    privacyLink: 'Privacidad',
    acceptAll: 'Aceptar todo',
    rejectAll: 'Rechazar todo',
    preferences: 'Preferencias',
    preferencesTitle: 'Lo que esta web guarda',
    save: 'Guardar mi elección',
    close: 'Cerrar',
    neededTitle: 'Necesario, y tuyo',
    neededText:
      'Tu idioma, el modo día o noche, los ajustes del área de jugador y del lector del manual, tu ficha de personaje y el registro de esta respuesta; y, solo si entras, tu sesión y las claves del proveedor de acceso. Los pones tú: no se pueden apagar aquí, solo borrar desde tu navegador.',
    measurementTitle: 'Medición',
    measurementText:
      'Cuenta qué se pulsa en la página, para saber cómo se usa la web. Las cuentas se guardan en la memoria de esta pestaña y se descartan al cerrarla: no se envía nada a nadie. Apagada salvo que la actives.',
    moreTitle: 'Nada más',
    moreText:
      'Sin publicidad y sin nada de otras empresas salvo que entres. La lista completa, clave a clave, está en la',
  },
  ja: EN,
  ko: EN,
  'pt-br': {
    title: 'O que este site guarda no seu navegador',
    description:
      'Suas preferências, sua sessão se você entrar, e esta resposta: são necessárias, então ficam seja qual for a sua escolha. Uma coisa é opcional: a <b>Medição</b> conta o que é clicado na página. As contagens ficam nesta aba e nunca saem do seu dispositivo. <i>Aceitar tudo</i> a ativa; <i>Rejeitar tudo</i> a deixa desligada.',
    policyLink: 'Política de cookies',
    noticeLink: 'Aviso legal',
    privacyLink: 'Privacidade',
    acceptAll: 'Aceitar tudo',
    rejectAll: 'Rejeitar tudo',
    preferences: 'Preferências',
    preferencesTitle: 'O que este site guarda',
    save: 'Salvar minha escolha',
    close: 'Fechar',
    neededTitle: 'Necessário, e seu',
    neededText:
      'Seu idioma, o modo dia ou noite, os ajustes da área do jogador e do leitor do manual, sua ficha de personagem e o registro desta resposta; e, só se você entrar, sua sessão e as chaves do provedor de acesso. Você mesmo os define: não podem ser desligados aqui, só apagados no seu navegador.',
    measurementTitle: 'Medição',
    measurementText:
      'Conta o que é clicado na página, para entender como o site é usado. As contagens ficam na memória desta aba e são descartadas ao fechá-la: nada é enviado a ninguém. Desligada, a menos que você a ative.',
    moreTitle: 'Nada mais',
    moreText:
      'Sem publicidade e nada de outras empresas, a menos que você entre. A lista completa, chave por chave, está na',
  },
};
