/**
 * Legal page content.
 *
 * `terms` and `privacy` are served from the real corpus (verbatim copies of
 * the numinia-nwos masters, rendered by components/legal/) — only `cookies`
 * and `legal-notice` remain DRAFTS pending Oracle review (MISSION-003 P3).
 * Drafts are authored in ES + EN only (ADR-002: legal text needs qualified
 * translation, not coverage); other locales render the EN text behind a
 * language notice. Placeholders marked [PENDING] must be filled by the Oracle.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { DraftLegalDoc } from '../lib/legal';

interface LegalSection {
  readonly heading: string;
  readonly body: readonly string[];
}

interface LegalContent {
  readonly title: string;
  readonly sections: readonly LegalSection[];
}

type Bilingual = { readonly es: LegalContent; readonly en: LegalContent };

export const LEGAL_DRAFTS: Readonly<Record<DraftLegalDoc, Bilingual>> = {
  cookies: {
    es: {
      title: 'Política de cookies',
      sections: [
        {
          heading: 'Cookies utilizadas',
          body: [
            'A día de hoy este sitio no utiliza cookies ni almacenamiento local: ninguna, ni propias ni de terceros.',
            'Si alguna función futura necesitara cookies (por ejemplo, analítica consentida o sesión de ciudadano), se te pedirá consentimiento antes de instalar ninguna y esta página se actualizará con el detalle.',
          ],
        },
      ],
    },
    en: {
      title: 'Cookie policy',
      sections: [
        {
          heading: 'Cookies in use',
          body: [
            'Today this site uses no cookies and no local storage: none, first- or third-party.',
            'If a future feature needs cookies (for example consented analytics or a citizen session), you will be asked for consent before any are set, and this page will be updated with the details.',
          ],
        },
      ],
    },
  },
  'legal-notice': {
    es: {
      title: 'Aviso legal',
      sections: [
        {
          heading: 'Titular del sitio',
          body: [
            '[PENDIENTE: denominación social, NIF, domicilio, correo de contacto] — Numen Games.',
            'Este aviso se completará y validará antes de cualquier despliegue público (LSSI-CE).',
          ],
        },
      ],
    },
    en: {
      title: 'Legal notice',
      sections: [
        {
          heading: 'Site owner',
          body: [
            '[PENDING: legal name, tax ID, address, contact email] — Numen Games.',
            'This notice will be completed and validated before any public deployment.',
          ],
        },
      ],
    },
  },
};

/**
 * UI chrome around the real corpus — labels, the scope note (CON-005: the
 * texts name www.numen.games) and the language notices (CON-004 / FLAG-5:
 * terms are EN-only, privacy ES-only). This is interface copy, translated in
 * all five UI languages; the legal text itself is never translated here.
 */
export interface LegalUiStrings {
  readonly versionLabel: string;
  readonly updatedLabel: string;
  readonly scopeNote: string;
  readonly onlyInEnglish: string;
  readonly onlyInSpanish: string;
  readonly metaTerms: string;
  readonly metaPrivacy: string;
}

export const LEGAL_UI: Readonly<Record<SupportedLocale, LegalUiStrings>> = {
  es: {
    versionLabel: 'versión',
    updatedLabel: 'actualizado',
    scopeNote:
      'Numinia está operada por Numen Games S.L. Este documento es el corpus legal de la compañía y su texto se refiere a www.numen.games; su alcance está en revisión. Se publica íntegro y sin modificar.',
    onlyInEnglish:
      'Este documento solo existe en inglés. No lo traducimos por nuestra cuenta: un texto legal necesita traducción jurídica.',
    onlyInSpanish:
      'Este documento solo existe en español. No lo traducimos por nuestra cuenta: un texto legal necesita traducción jurídica.',
    metaTerms: 'Términos y condiciones de Numen Games, la compañía que opera Numinia.',
    metaPrivacy: 'Política de privacidad de Numen Games (RGPD y LOPDGDD).',
  },
  en: {
    versionLabel: 'version',
    updatedLabel: 'updated',
    scopeNote:
      'Numinia is operated by Numen Games S.L. This document is the company legal corpus and its text refers to www.numen.games; its scope is under review. It is published in full and unmodified.',
    onlyInEnglish:
      'This document exists in English only. We do not translate it ourselves: legal text needs qualified legal translation.',
    onlyInSpanish:
      'This document exists in Spanish only. We do not translate it ourselves: legal text needs qualified legal translation.',
    metaTerms: 'Terms and conditions of Numen Games, the company operating Numinia.',
    metaPrivacy: 'Privacy policy of Numen Games (GDPR and LOPDGDD).',
  },
  ja: {
    versionLabel: 'バージョン',
    updatedLabel: '更新日',
    scopeNote:
      'Numinia は Numen Games S.L. が運営しています。本文書は同社の法的文書であり、本文は www.numen.games を対象としています。適用範囲は現在確認中です。全文を無修正で公開しています。',
    onlyInEnglish:
      'この文書は英語版のみです。法的な文書には専門の法務翻訳が必要なため、当社では独自に翻訳していません。',
    onlyInSpanish:
      'この文書はスペイン語版のみです。法的な文書には専門の法務翻訳が必要なため、当社では独自に翻訳していません。',
    metaTerms: 'Numinia を運営する Numen Games の利用規約。',
    metaPrivacy: 'Numen Games のプライバシーポリシー（GDPR・LOPDGDD）。',
  },
  ko: {
    versionLabel: '버전',
    updatedLabel: '갱신일',
    scopeNote:
      'Numinia는 Numen Games S.L.이 운영합니다. 이 문서는 회사의 법적 문서이며 본문은 www.numen.games를 대상으로 합니다. 적용 범위는 검토 중입니다. 전문을 수정 없이 공개합니다.',
    onlyInEnglish:
      '이 문서는 영어로만 제공됩니다. 법률 문서는 전문 법률 번역이 필요하므로 자체적으로 번역하지 않습니다.',
    onlyInSpanish:
      '이 문서는 스페인어로만 제공됩니다. 법률 문서는 전문 법률 번역이 필요하므로 자체적으로 번역하지 않습니다.',
    metaTerms: 'Numinia를 운영하는 Numen Games의 이용약관.',
    metaPrivacy: 'Numen Games의 개인정보 처리방침(GDPR·LOPDGDD).',
  },
  'pt-br': {
    versionLabel: 'versão',
    updatedLabel: 'atualizado',
    scopeNote:
      'A Numinia é operada pela Numen Games S.L. Este documento é o corpus legal da empresa e seu texto se refere a www.numen.games; seu alcance está em revisão. É publicado na íntegra e sem modificações.',
    onlyInEnglish:
      'Este documento existe apenas em inglês. Não o traduzimos por conta própria: um texto legal precisa de tradução jurídica.',
    onlyInSpanish:
      'Este documento existe apenas em espanhol. Não o traduzimos por conta própria: um texto legal precisa de tradução jurídica.',
    metaTerms: 'Termos e condições da Numen Games, a empresa que opera a Numinia.',
    metaPrivacy: 'Política de privacidade da Numen Games (GDPR e LOPDGDD).',
  },
};
