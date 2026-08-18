/**
 * The door asks first (MIS-086): no wallet widget until the visitor accepts
 * the published legal corpus. The checkbox is the gate; the endpoint enforces
 * it again server-side — this is the courtesy, not the lock.
 *
 * Copy arrives as props: the island is mounted from Astro pages that know the
 * locale, so the acceptance is asked in the reader's language even while the
 * rest of the login guide is still EN (D9).
 */

export interface LegalGateCopy {
  readonly label: string;
  readonly read: string;
  readonly pending: string;
  readonly termsHref: string;
  readonly termsLabel: string;
  readonly privacyHref: string;
  readonly privacyLabel: string;
}

interface Props {
  readonly copy: LegalGateCopy;
  readonly accepted: boolean;
  readonly onChange: (accepted: boolean) => void;
}

export function LegalConsentGate({ copy, accepted, onChange }: Props) {
  return (
    <div data-legal-gate>
      <label>
        <input
          type="checkbox"
          checked={accepted}
          data-metric="auth-accept-legal"
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        <span>{copy.label}</span>
      </label>
      {/* Links live outside the label: a link inside a checkbox label is a
          known trap — activating it toggles the box on some browsers. */}
      <p>
        {copy.read}{' '}
        <a href={copy.termsHref} target="_blank" rel="noreferrer" data-metric="auth-legal-terms">
          {copy.termsLabel}
        </a>{' '}
        ·{' '}
        <a
          href={copy.privacyHref}
          target="_blank"
          rel="noreferrer"
          data-metric="auth-legal-privacy"
        >
          {copy.privacyLabel}
        </a>
      </p>
    </div>
  );
}
