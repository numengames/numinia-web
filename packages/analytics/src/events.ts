/**
 * Analytics event taxonomy — the funnel backbone (ADR-016).
 *
 * Rules:
 * - Every event is declared here with a strict props spec. Undeclared props
 *   do not travel (privacy by design; wallet addresses are never a prop).
 * - Names are frozen: dashboards and funnels break silently when names drift,
 *   so changing one requires updating docs/analytics.md first.
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
