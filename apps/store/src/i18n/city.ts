/**
 * La Ciudad — locale plumbing for the chapter scroller. The narrative itself
 * lives in city-landing.ts (numinia.com canon, ES+EN per ADR-002); other
 * locales read EN behind a language notice.
 */

import type { SupportedLocale } from '@numinia/domain';

export function loreLocale(locale: SupportedLocale): 'es' | 'en' {
  return locale === 'es' ? 'es' : 'en';
}

export const CITY_LANGUAGE_NOTICE: Partial<Record<SupportedLocale, string>> = {
  ja: 'この物語は現在、スペイン語と英語で提供されています。',
  ko: '이 이야기는 현재 스페인어와 영어로 제공됩니다.',
  'pt-br': 'Esta narrativa está disponível em espanhol e inglês por enquanto.',
};
