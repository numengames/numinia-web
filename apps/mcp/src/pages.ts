/**
 * What a person's browser sees from the relay itself: where numinia.com's
 * consent page is in their language, and the one plain page the relay shows
 * when it will not go on (a link that does not work, or the relay not ready).
 * The texts are the consent page's own (store: i18n/conectar-ia.ts
 * `badTitle`, `badLead`, `unavailable`), so both sides say the same thing.
 */
import { CONSENT_PATH, DEFAULT_LOCALE, LOCALES, type Locale } from './config';

/**
 * The locale the browser prefers among the site's five, by
 * `Accept-Language` quality (a language matches by its primary tag, so
 * `pt-PT` gets `pt-br` and `es-419` gets `es`), or English.
 */
export function localeOf(acceptLanguage: string | null): Locale {
  const ranked = (acceptLanguage ?? '')
    .split(',')
    .map((part, index) => {
      const [tag = '', ...params] = part.trim().toLowerCase().split(';');
      const q = params.map((param) => /^\s*q=([0-9.]+)\s*$/.exec(param)?.[1]).find(Boolean);
      return { tag: tag.trim(), q: q === undefined ? 1 : Number(q), index };
    })
    .filter((entry) => entry.tag !== '' && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const { tag } of ranked) {
    const primary = tag.split('-')[0];
    const found = LOCALES.find((locale) => locale.split('-')[0] === primary);
    if (found !== undefined) return found;
  }
  return DEFAULT_LOCALE;
}

/** The consent page's path in a locale: English has no prefix. */
export const consentPath = (locale: Locale): string =>
  locale === DEFAULT_LOCALE ? CONSENT_PATH : `/${locale}${CONSENT_PATH}`;

/** Why the relay stops: a link that does not work, the relay not ready, or too many tries (story W10). */
export type Stop = 'bad' | 'unavailable' | 'busy';

const TEXTS: Readonly<
  Record<
    Locale,
    { title: string; bad: string; unavailable: string; busyTitle: string; busy: string }
  >
> = {
  en: {
    title: 'This link does not work',
    bad: 'Something is missing, or it is not a link to connect an AI. Go back to your AI and ask to connect again.',
    unavailable: 'We cannot connect AIs right now. Try again in a while.',
    busyTitle: 'Wait a minute',
    busy: 'Too many tries from your connection. Wait a minute, then go back to your AI and ask to connect again.',
  },
  es: {
    title: 'Este enlace no sirve',
    bad: 'Le falta algo o no es un enlace para conectar una IA. Vuelve a tu IA y pide conectar otra vez.',
    unavailable: 'Ahora mismo no podemos conectar IAs. Inténtalo dentro de un rato.',
    busyTitle: 'Espera un minuto',
    busy: 'Demasiados intentos desde tu conexión. Espera un minuto, vuelve a tu IA y pide conectar otra vez.',
  },
  ja: {
    title: 'このリンクは使えません',
    bad: '何かが足りないか、AIを接続するためのリンクではありません。AIに戻って、もう一度接続を依頼してください。',
    unavailable: '今はAIを接続できません。しばらくしてからお試しください。',
    busyTitle: '少しお待ちください',
    busy: 'お使いの接続からの試行が多すぎます。1分待ってから、AIに戻ってもう一度接続を依頼してください。',
  },
  ko: {
    title: '이 링크는 사용할 수 없습니다',
    bad: '무언가 빠졌거나 AI를 연결하는 링크가 아닙니다. AI로 돌아가 다시 연결을 요청하세요.',
    unavailable: '지금은 AI를 연결할 수 없습니다. 잠시 후 다시 시도하세요.',
    busyTitle: '잠시 기다려 주세요',
    busy: '연결에서 시도가 너무 많습니다. 1분 기다린 뒤 AI로 돌아가 다시 연결을 요청하세요.',
  },
  'pt-br': {
    title: 'Este link não funciona',
    bad: 'Falta alguma coisa, ou não é um link para conectar uma IA. Volte à sua IA e peça para conectar de novo.',
    unavailable: 'Agora não conseguimos conectar IAs. Tente daqui a pouco.',
    busyTitle: 'Espere um minuto',
    busy: 'Tentativas demais a partir da sua conexão. Espere um minuto, volte à sua IA e peça para conectar de novo.',
  },
};

/** Headers every relay page carries: never cached, never a referrer, no script. */
export const PAGE_HEADERS = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
} as const;

/**
 * The plain page: no code, no redirect, nothing of the request echoed
 * back. `extra` carries the header that clears the request's cookie.
 */
export function stopPage(
  request: Request,
  stop: Stop,
  status: number,
  extra?: HeadersInit,
): Response {
  const locale = localeOf(request.headers.get('Accept-Language'));
  const text = TEXTS[locale];
  const body = `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Numinia</title>
<style>body{font-family:system-ui,sans-serif;max-width:36rem;margin:4rem auto;padding:0 1rem;line-height:1.5}</style>
</head><body><h1>${stop === 'busy' ? text.busyTitle : text.title}</h1><p>${text[stop]}</p></body></html>`;
  const headers = new Headers({ ...PAGE_HEADERS, 'Content-Type': 'text/html; charset=utf-8' });
  for (const [name, value] of new Headers(extra)) headers.append(name, value);
  return new Response(body, { status, headers });
}

/** A 302 to `location`, never cached, with any extra headers (a cookie). */
export function redirect(location: string, extra?: HeadersInit): Response {
  const headers = new Headers({ ...PAGE_HEADERS, Location: location });
  for (const [name, value] of new Headers(extra)) headers.append(name, value);
  return new Response(null, { status: 302, headers });
}
