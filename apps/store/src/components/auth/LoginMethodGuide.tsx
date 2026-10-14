/**
 * Per-method login progress (MISSION-002 spike UX).
 * Invisible until the user picks a method inside the vendor widget; then a
 * 1-2-3 progress bar shows the current step plus what comes next, driven by
 * real state (wallet + session) — never by clicks alone, so it cannot lie.
 * Copy rule: reassure, never alarm — no mention of payments or transactions.
 * The words arrive in the reader's language (i18n/sign-in.ts).
 */

import type { LoginMethodId, MethodCopy } from '../../i18n/sign-in';

export type LoginMethod = LoginMethodId;
export type LoginPhase = 'connect' | 'sign' | 'done';

export interface GuideCopy {
  readonly progress: string;
  /** «Paso {n} de 3». */
  readonly step: string;
  readonly methods: Readonly<Record<LoginMethod, MethodCopy>>;
}

/**
 * Infers which method a tap inside the vendor widget refers to.
 * ConnectEmbed exposes no selection callback, so we listen at the container
 * (capture phase) and classify the actionable element by its visible text /
 * labels. Heuristic and spike-grade by design: a miss just means the guide
 * doesn't switch — login itself is never affected. The widget speaks the
 * reader's language, so each pattern carries the words it uses in the five
 * locales the site serves.
 */
const METHOD_PATTERNS: ReadonlyArray<{ method: LoginMethod; pattern: RegExp }> = [
  { method: 'google', pattern: /google/ },
  { method: 'passkey', pattern: /passkey|パスキー|패스키/ },
  { method: 'email', pattern: /e-?mail|correo|メール|이메일/ },
  {
    method: 'wallet',
    pattern: /wallet|cartera|carteira|ウォレット|지갑|metamask|coinbase|rainbow|zerion/,
  },
];

export function methodFromWidgetTarget(target: EventTarget | null): LoginMethod | null {
  if (!(target instanceof Element)) return null;
  const actionable = target.closest('button, a, input, [role="button"]');
  if (!actionable) return null;
  const text = [
    actionable.getAttribute('aria-label'),
    actionable.getAttribute('placeholder'),
    actionable.textContent,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  for (const { method, pattern } of METHOD_PATTERNS) {
    if (pattern.test(text)) return method;
  }
  return null;
}

interface LoginMethodGuideProps {
  copy: GuideCopy;
  /** Method the user tapped in the widget (null until anything is chosen). */
  selected: LoginMethod | null;
  /** Method actually in use, once the flow really started (wins over taps). */
  detected: LoginMethod | null;
  phase: LoginPhase;
}

export function LoginMethodGuide({ copy, selected, detected, phase }: LoginMethodGuideProps) {
  const shown = detected ?? selected;
  if (!shown) return null;
  const method = copy.methods[shown];
  const current = phase === 'connect' ? 0 : phase === 'sign' ? 1 : 2;
  return (
    <section aria-label={copy.progress} data-login-progress>
      <ol>
        {method.steps.map((step, index) => {
          const state = index < current ? 'done' : index === current ? 'active' : 'pending';
          return (
            <li
              key={step}
              data-step-state={state}
              aria-current={state === 'active' ? 'step' : undefined}
            >
              <span data-step-dot>{state === 'done' ? '✓' : index + 1}</span>
            </li>
          );
        })}
      </ol>
      <p role="status">
        <strong>
          {copy.step.replace('{n}', String(current + 1))} · {method.label}
        </strong>{' '}
        — {method.steps[current]}
      </p>
      {method.steps.slice(current + 1).map((step, offset) => (
        <p key={step} data-next-step>
          {current + 2 + offset} · {step}
        </p>
      ))}
    </section>
  );
}
