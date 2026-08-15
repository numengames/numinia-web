/**
 * Per-method login progress (MISSION-002 spike UX).
 * Invisible until the user picks a method inside the vendor widget; then a
 * 1-2-3 progress bar shows the current step plus what comes next, driven by
 * real state (wallet + session) — never by clicks alone, so it cannot lie.
 * Copy rule: reassure, never alarm — no mention of payments or transactions.
 */

export type LoginMethod = 'google' | 'email' | 'passkey' | 'wallet';
export type LoginPhase = 'connect' | 'sign' | 'done';

interface MethodCopy {
  readonly id: LoginMethod;
  readonly label: string;
  /** One line per progress step, aligned with LoginPhase order. */
  readonly steps: readonly [string, string, string];
}

const METHODS: readonly MethodCopy[] = [
  {
    id: 'google',
    label: 'Google',
    steps: [
      'A Google window opens — pick your account and it closes by itself.',
      'Numinia prepares your personal key and signs you in automatically.',
      'Welcome in — you are now a Nomad of Numinia.',
    ],
  },
  {
    id: 'email',
    label: 'Email',
    steps: [
      'Type your email and press the arrow — a 6-digit code lands in your inbox.',
      'Enter the code. Your access is created on the spot — no password, ever.',
      'Welcome in — you are now a Nomad of Numinia.',
    ],
  },
  {
    id: 'passkey',
    label: 'Passkey',
    steps: [
      'Your device asks for your fingerprint, face or PIN.',
      'Your access unlocks and signs you in automatically.',
      'Welcome in — you are now a Nomad of Numinia.',
    ],
  },
  {
    id: 'wallet',
    label: 'Wallet',
    steps: [
      'Your wallet asks permission to connect with this site — accept to continue.',
      'Your wallet shows a signature request — approve it to confirm the address is yours. That is all it does.',
      'Welcome in — you are now a Nomad of Numinia.',
    ],
  },
];

/**
 * Infers which method a click/focus inside the vendor widget refers to.
 * ConnectEmbed exposes no selection callback, so we listen at the container
 * (capture phase) and classify the actionable element by its visible text /
 * labels. Heuristic and spike-grade by design: a miss just means the guide
 * doesn't switch — login itself is never affected.
 */
const METHOD_PATTERNS: ReadonlyArray<{ method: LoginMethod; pattern: RegExp }> = [
  { method: 'google', pattern: /google/ },
  { method: 'passkey', pattern: /passkey/ },
  { method: 'email', pattern: /e-?mail/ },
  { method: 'wallet', pattern: /wallet|metamask|coinbase|rainbow|zerion/ },
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
  /** Method the user tapped in the widget (null until anything is chosen). */
  selected: LoginMethod | null;
  /** Method actually in use, once the flow really started (wins over taps). */
  detected: LoginMethod | null;
  phase: LoginPhase;
}

export function LoginMethodGuide({ selected, detected, phase }: LoginMethodGuideProps) {
  const shown = detected ?? selected;
  const copy = METHODS.find((method) => method.id === shown);
  if (!copy) return null;
  const current = phase === 'connect' ? 0 : phase === 'sign' ? 1 : 2;
  return (
    <section aria-label="Login progress" data-login-progress>
      <ol>
        {copy.steps.map((step, index) => {
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
          Step {current + 1} of 3 · {copy.label}
        </strong>{' '}
        — {copy.steps[current]}
      </p>
      {copy.steps.slice(current + 1).map((step, offset) => (
        <p key={step} data-next-step>
          {current + 2 + offset} · {step}
        </p>
      ))}
    </section>
  );
}
