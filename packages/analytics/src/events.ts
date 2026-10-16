/**
 * Analytics event taxonomy — the funnel backbone.
 *
 * Rules:
 * - Every event is declared here with a strict props spec. Undeclared props
 *   do not travel (privacy by design; wallet addresses are never a prop).
 * - Names are frozen: dashboards and funnels break silently when names drift,
 *   so changing one changes dashboards: rename deliberately.
 *
 * Validation is hand-rolled on purpose: events are internally produced (the
 * compiler already types them), so runtime guards only need to be strict and
 * tiny — bundling a schema library into every page would cost ~55 KB for data
 * we author ourselves. External data keeps using Zod in @numinia/domain.
 */

interface PropSpec {
  readonly required: readonly string[];
  readonly optional: readonly string[];
}

const EVENT_PROP_SPECS = {
  /** A page finished loading. Referrer is reduced to its host. */
  page_view: { required: [], optional: ['referrerHost'] },
  /** Any interactive element with a data-metric id was activated. */
  cta_click: { required: ['metricId'], optional: [] },
  /** An asset download was requested (Phase 1 funnel). */
  download_click: { required: ['assetId', 'format'], optional: [] },
  /** Wallet connection flow entered (Phase 2 funnel). No address, ever. */
  wallet_connect_start: { required: [], optional: [] },
  /** Wallet connection flow completed. No address, ever. */
  wallet_connect_success: { required: [], optional: [] },
  /** Session Zero begun (Phase 3 funnel). */
  session_zero_start: { required: [], optional: [] },
  /** A Session Zero seal was earned. */
  seal_earned: { required: ['sealId'], optional: [] },
} as const satisfies Record<string, PropSpec>;

export type AnalyticsEventName = keyof typeof EVENT_PROP_SPECS;

export const ANALYTICS_EVENT_NAMES = Object.keys(EVENT_PROP_SPECS) as AnalyticsEventName[];

type Spec = (typeof EVENT_PROP_SPECS)[AnalyticsEventName];
type RequiredProps<S extends Spec> = { [K in S['required'][number]]: string };
type OptionalProps<S extends Spec> = { [K in S['optional'][number]]?: string };

export type AnalyticsEventProps<Name extends AnalyticsEventName> = RequiredProps<
  (typeof EVENT_PROP_SPECS)[Name]
> &
  OptionalProps<(typeof EVENT_PROP_SPECS)[Name]>;

export interface AnalyticsEvent {
  readonly name: AnalyticsEventName;
  readonly path: string;
  readonly locale?: string;
  readonly ts: number;
  readonly props: Readonly<Record<string, string>>;
}

/** Page context provided by the caller; `now` is injectable for testability. */
export interface AnalyticsContext {
  readonly path: string;
  readonly locale?: string;
  readonly now: () => number;
}

function validateProps(name: string, spec: PropSpec, props: Record<string, unknown>): void {
  for (const key of spec.required) {
    const value = props[key];
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(`Event "${name}" requires non-empty string prop "${key}"`);
    }
  }
  for (const key of Object.keys(props)) {
    if (spec.required.includes(key)) continue;
    if (spec.optional.includes(key)) {
      const value = props[key];
      if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`Event "${name}" optional prop "${key}" must be a non-empty string`);
      }
      continue;
    }
    throw new Error(
      `Event "${name}" does not declare prop "${key}" — undeclared props never travel`,
    );
  }
}

export function buildEvent<Name extends AnalyticsEventName>(
  name: Name,
  context: AnalyticsContext,
  props: AnalyticsEventProps<Name>,
): AnalyticsEvent {
  const spec = EVENT_PROP_SPECS[name] as PropSpec | undefined;
  if (!spec) {
    throw new Error(`Unknown analytics event: ${String(name)}`);
  }
  validateProps(name, spec, props as Record<string, unknown>);
  return {
    name,
    path: context.path,
    ts: context.now(),
    props: { ...(props as Record<string, string>) },
    ...(context.locale === undefined ? {} : { locale: context.locale }),
  };
}

// ---- W1 «El dinero» (cut 2026-10-16): its data-metric ids --------------------
// No new event and no new prop: each travels as `cta_click.metricId`.
// - Saldo y consumo: `saldo-csv` (the movements as a CSV made in the browser),
//   `saldo-members-link` (an organization's way to «Miembros y roles»).
// - The panel's Resumen: `panel-summary-next` (the next encounter),
//   `panel-summary-people`, `panel-summary-balance`, `panel-summary-log`.

// ---- W14 «Agentes» (IAs de organización, 2026-10-17) ----
// No new event and no new prop: each travels as `cta_click.metricId`.
// - The panel's Agentes: `panel-nav-agents` (its rail door), `panel-agentes-retry`,
//   `panel-agentes-switch` (Encendida/Apagada), `panel-agentes-state-<activa|dormida>`,
//   `panel-agentes-role-select`, `panel-agentes-role-give`, `panel-agentes-role-take`,
//   `panel-agentes-remove` (+ `-yes`, `-no`), `panel-agentes-invite` and the invitation's
//   `panel-agentes-invite-<name|ability-talk|ability-build|role|copy|key|next|back|cancel|add>`.
// - The community's Ajustes: `panel-settings-piece-agents`.

// ---- W13 «El menú de la cara y Gente» (cut 9, 2026-10-16) ----
// No new event and no new prop: each travels as `cta_click.metricId`.
// - The header's account menu: `chrome-balance` (Tu saldo), `chrome-panel-org`
//   (one door per organization the person belongs to); `chrome-panels` stays as
//   the generic door while the list is not known.
// - The panel's Gente: `panel-nav-gente` (its rail door), `panel-gente-retry`.

// ---- W12 «Ajustes de la comunidad, Qué ha pasado y Sede completa» (cut 8, 2026-10-16) ----
// No new event and no new prop: each travels as `cta_click.metricId`.
// - The panel's Ajustes: `panel-settings-piece-<venues|members|roles|balance>` (a
//   piece's switch), `panel-settings-words-<simple|mixed|numinia>` (a preset),
//   `panel-settings-retry`; and, on the page of a piece that is off,
//   `panel-piece-turn-on`.
// - The panel's «Qué ha pasado»: `panel-happened-more`, `panel-happened-retry`.

// ---- W4 «El censo» (cut 2026-10-16): its data-metric ids ----------------------
// No new event and no new prop: each travels as `cta_click.metricId`.
// - The Census page's «Quién ha entrado» (the house only): `census-citizens-search`,
//   `census-citizens-retry`, `census-citizens-more`, `census-citizen-copy`,
//   `census-citizen-add` (opens the dialog), `census-citizen-add-org`,
//   `census-citizen-add-save`, `census-citizen-add-cancel`.
// - The panel's «Añadir miembro», for the house: `panel-member-add-suggestion`
//   (a person picked from the suggestions).

// ---- W6 «Mundos ↔ organizaciones» (cut 2026-10-16): its data-metric ids --------
// No new event and no new prop: each travels as `cta_click.metricId`.
// - The Worlds room, the house only: `worlds-select` (a row's checkbox),
//   `worlds-select-shown`, `worlds-select-clear`, `worlds-assign` (one row),
//   `worlds-assign-chosen` (the chosen rows), `worlds-page-link` (to the
//   world's own page), `worlds-assign-org`, `worlds-assign-save`,
//   `worlds-assign-cancel` (the dialog).
// - The panel's «Sedes»: `panel-venue-open`, `panel-venue-enter`, `panel-venues-retry`.
// - A world's page: `world-enter`, `world-page-retry`, `world-page-home`,
//   `world-page-venues`, `world-page-members`, `world-page-balance`.

// ---- «IA» on a world's page (cut 2026-10-16): its data-metric ids -----------------
// No new event and no new prop: each travels as `cta_click.metricId`.
// - The section, for whoever manages the world: `ai-invite` (opens the dialog),
//   `ai-retry`, `ai-remove`, `ai-remove-yes`, `ai-remove-no`.
// - The invitation dialog: `ai-invite-name`, `ai-invite-ability-talk`,
//   `ai-invite-ability-build`, `ai-invite-next`, `ai-invite-back`, `ai-invite-copy`,
//   `ai-invite-key`, `ai-invite-add`, `ai-invite-cancel`.

// ---- v3 «La esfera y la casa» (cut B, 2026-10-16): its data-metric ids ----------
// No new event and no new prop: each travels as `cta_click.metricId`.
// - The sphere of Numen Games: `house-sphere-dot` (a community's dot on the
//   ring), `house-sphere-more` (the «+N» chip to the list).
// - /communities/: `communities-house-title`, `communities-house-enter` (the
//   house's card, to its page).
// - The page of Numen Games: `house-enter-agora` (or `house-its-worlds` when the
//   commons has no world), `house-how-to-play`, `house-legend-chip`,
//   `house-rings-summa`, `house-meta-doors`, `house-meta-codex`,
//   `house-world-enter`, `house-archive`, `house-bazaar`.
