/**
 * UI chrome around the published legal corpus — labels, the language
 * notice (the masters are English only) and the meta descriptions. This is
 * interface copy, translated in all five UI languages; the legal text
 * itself is never translated here.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { LegalDoc } from '../lib/legal';

export interface LegalUiStrings {
  readonly versionLabel: string;
  readonly updatedLabel: string;
  readonly onlyInEnglish: string;
  readonly meta: Readonly<Record<LegalDoc, string>>;
}

export const LEGAL_UI: Readonly<Record<SupportedLocale, LegalUiStrings>> = {
  es: {
    versionLabel: 'versión',
    updatedLabel: 'actualizado',
    onlyInEnglish:
      'Este documento solo existe en inglés. No lo traducimos por nuestra cuenta: un texto legal necesita traducción jurídica.',
    meta: {
      notice:
        'Aviso legal de Numen Games: quién opera Numinia y qué licencias rigen lo que publicamos.',
      privacy: 'Política de privacidad de Numen Games (RGPD y LOPDGDD).',
      cookies:
        'Política de cookies de Numen Games: qué guarda numinia.com en tu navegador y por qué.',
      terms: 'Términos y condiciones de Numen Games, la compañía que opera Numinia.',
    },
  },
  en: {
    versionLabel: 'version',
    updatedLabel: 'updated',
    onlyInEnglish:
      'This document exists in English only. We do not translate it ourselves: legal text needs qualified legal translation.',
    meta: {
      notice:
        'Legal notice of Numen Games: who operates Numinia and which licences govern what we publish.',
      privacy: 'Privacy policy of Numen Games (GDPR and LOPDGDD).',
      cookies: 'Cookie policy of Numen Games: what numinia.com keeps in your browser, and why.',
      terms: 'Terms and conditions of Numen Games, the company operating Numinia.',
    },
  },
  ja: {
    versionLabel: 'バージョン',
    updatedLabel: '更新日',
    onlyInEnglish:
      'この文書は英語版のみです。法的な文書には専門の法務翻訳が必要なため、当社では独自に翻訳していません。',
    meta: {
      notice: 'Numen Games の法的通知：Numinia の運営者と、公開物に適用されるライセンス。',
      privacy: 'Numen Games のプライバシーポリシー（GDPR・LOPDGDD）。',
      cookies: 'Numen Games のクッキーポリシー：numinia.com がブラウザに保存するものとその理由。',
      terms: 'Numinia を運営する Numen Games の利用規約。',
    },
  },
  ko: {
    versionLabel: '버전',
    updatedLabel: '갱신일',
    onlyInEnglish:
      '이 문서는 영어로만 제공됩니다. 법률 문서는 전문 법률 번역이 필요하므로 자체적으로 번역하지 않습니다.',
    meta: {
      notice: 'Numen Games 법적 고지: Numinia 운영자와 게시물에 적용되는 라이선스.',
      privacy: 'Numen Games의 개인정보 처리방침(GDPR·LOPDGDD).',
      cookies: 'Numen Games 쿠키 정책: numinia.com이 브라우저에 저장하는 항목과 그 이유.',
      terms: 'Numinia를 운영하는 Numen Games의 이용약관.',
    },
  },
  'pt-br': {
    versionLabel: 'versão',
    updatedLabel: 'atualizado',
    onlyInEnglish:
      'Este documento existe apenas em inglês. Não o traduzimos por conta própria: um texto legal precisa de tradução jurídica.',
    meta: {
      notice:
        'Aviso legal da Numen Games: quem opera a Numinia e quais licenças regem o que publicamos.',
      privacy: 'Política de privacidade da Numen Games (GDPR e LOPDGDD).',
      cookies:
        'Política de cookies da Numen Games: o que numinia.com guarda no seu navegador e por quê.',
      terms: 'Termos e condições da Numen Games, a empresa que opera a Numinia.',
    },
  },
};
