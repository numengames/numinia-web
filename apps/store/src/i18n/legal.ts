/**
 * Legal page content — DRAFTS pending Oracle review (MISSION-003 P3).
 * Content is authored in ES + EN only (ADR-002 rationale: legal text needs
 * qualified translation, not coverage); other locales render the EN text
 * behind a language notice. Placeholders marked [PENDING] must be filled by
 * the Oracle before any deploy.
 */

export type LegalDoc = 'privacy' | 'cookies' | 'terms' | 'legal-notice';

export const LEGAL_DOCS: readonly LegalDoc[] = ['privacy', 'cookies', 'terms', 'legal-notice'];

interface LegalSection {
  readonly heading: string;
  readonly body: readonly string[];
}

interface LegalContent {
  readonly title: string;
  readonly sections: readonly LegalSection[];
}

type Bilingual = { readonly es: LegalContent; readonly en: LegalContent };

export const LEGAL_CONTENT: Readonly<Record<LegalDoc, Bilingual>> = {
  privacy: {
    es: {
      title: 'Política de privacidad',
      sections: [
        {
          heading: 'Qué datos tratamos',
          body: [
            'Este sitio es estático y de solo lectura: no hay registro de usuarios, no pedimos datos personales y no existe ninguna base de datos de visitantes.',
            'Si en el futuro se activa la analítica de uso, será anónima (sin identificadores personales ni direcciones de wallet), se activará solo tras tu consentimiento explícito y esta política se actualizará antes.',
          ],
        },
        {
          heading: 'Responsable',
          body: ['[PENDIENTE: identidad del responsable, contacto] — Numen Games.'],
        },
      ],
    },
    en: {
      title: 'Privacy policy',
      sections: [
        {
          heading: 'What data we process',
          body: [
            'This site is static and read-only: there is no user registration, we ask for no personal data, and no visitor database exists.',
            'If usage analytics are enabled in the future they will be anonymous (no personal identifiers, no wallet addresses), activated only after your explicit consent, and this policy will be updated first.',
          ],
        },
        {
          heading: 'Controller',
          body: ['[PENDING: controller identity, contact] — Numen Games.'],
        },
      ],
    },
  },
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
  terms: {
    es: {
      title: 'Términos de uso',
      sections: [
        {
          heading: 'Los bienes digitales',
          body: [
            'Todos los bienes digitales publicados en este sitio se ofrecen bajo licencia CC0 1.0 Universal: puedes usarlos, remezclarlos y redistribuirlos, incluso con fines comerciales, sin pedir permiso ni atribuir.',
            'Los nombres, la marca Numinia y los textos narrativos del sitio no forman parte de esa licencia.',
          ],
        },
        {
          heading: 'El sitio',
          body: [
            'El sitio se ofrece "tal cual", sin garantías. Los archivos se sirven desde almacenamiento de terceros (Arweave, R2, IPFS, GitHub) y su disponibilidad puede variar.',
          ],
        },
      ],
    },
    en: {
      title: 'Terms of use',
      sections: [
        {
          heading: 'The digital goods',
          body: [
            'All digital goods published on this site are offered under the CC0 1.0 Universal license: you may use, remix, and redistribute them, commercially included, without permission or attribution.',
            'Names, the Numinia brand, and the narrative texts of the site are not part of that license.',
          ],
        },
        {
          heading: 'The site',
          body: [
            'The site is provided "as is", without warranties. Files are served from third-party storage (Arweave, R2, IPFS, GitHub) and availability may vary.',
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
