/**
 * The figures behind the price room's calculator (MIS-184), each with the
 * day it was read and where: the machines from OVH's public order catalog,
 * the nightly copies from AWS S3 at the ECB's dollar rate, Stripe's fees,
 * the size catalog (the product the Oracle approved on 2026-10-13: a world
 * is sold by the people it holds at once) and what the market charges.
 *
 * Pure, dated data, ported from the pricing study's prototype and model
 * (2026-10-13 reads). When a figure changes, change it here with its new
 * day and source; the room shows the day each figure was read. Figures the
 * house has not measured yet say so in `source` instead of naming a page.
 */

import type { Assumptions, DeskRules } from './prices';

/** The day every figure below was read. */
export const READ_ON = '2026-10-13';

/** The `source` of a figure that is the house's own judgement until it is measured. */
export const JUDGEMENT = 'judgement until measured';
/** The `source` of the product's own figures: what the Oracle approved. */
export const DECISION = "the Oracle's decision of 2026-10-13";

/** Where a figure comes from: an https page, or one of the two house sources above. */
export interface Reading {
  readonly readOn: string;
  readonly source: string;
}

/** One number, with its reading. */
export interface Figure extends Reading {
  readonly value: number;
}

/** A machine the fleet can rent: OVH VPS, monthly, without commitment, net of VAT. */
export interface MachineOffer extends Reading {
  readonly key: string;
  readonly vcores: number;
  readonly ramGb: number;
  readonly diskGb: number;
  readonly eurMonth: number;
}

const OVH_CATALOG = 'https://api.ovh.com/1.0/order/catalog/public/vps?ovhSubsidiary=ES';

export const MACHINES: readonly MachineOffer[] = [
  {
    key: 'VPS-2',
    vcores: 4,
    ramGb: 8,
    diskGb: 75,
    eurMonth: 8.49,
    readOn: READ_ON,
    source: OVH_CATALOG,
  },
  {
    key: 'VPS-3',
    vcores: 6,
    ramGb: 12,
    diskGb: 100,
    eurMonth: 12.24,
    readOn: READ_ON,
    source: OVH_CATALOG,
  },
  {
    key: 'VPS-4',
    vcores: 8,
    ramGb: 24,
    diskGb: 200,
    eurMonth: 23.49,
    readOn: READ_ON,
    source: OVH_CATALOG,
  },
];

/** What a machine keeps for itself (system, Docker, Caddy, its door): judgement until measured. */
export const MACHINE_SELF: Reading & {
  readonly ramGb: number;
  readonly cpu: number;
  readonly diskGb: number;
} = { ramGb: 1, cpu: 0.5, diskGb: 15, readOn: READ_ON, source: JUDGEMENT };

/** S3 Standard in Paris, dollars per GB-month. */
export const S3_USD_PER_GB_MONTH: Figure = {
  value: 0.024,
  readOn: READ_ON,
  source: 'https://aws.amazon.com/s3/pricing/',
};

/** The ECB's reference rate, dollars per euro, of the day before the reading. */
export const USD_PER_EUR: Figure & { readonly rateOf: string } = {
  value: 1.1181,
  rateOf: '2026-10-12',
  readOn: READ_ON,
  source: 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml',
};

/** Full nightly copies held at once: 14 current and up to 7 not yet expired. */
export const FULL_COPIES_HELD: Figure = { value: 21, readOn: READ_ON, source: JUDGEMENT };

/** Incremental copies: one whole copy plus about 5 % of changes. */
export const INCREMENTAL_HELD: Figure = { value: 1.05, readOn: READ_ON, source: JUDGEMENT };

const STRIPE_PRICING = 'https://stripe.com/es/pricing';

/**
 * Stripe's fees per payment. Managed Payments (Stripe sells and handles the
 * VAT and the invoices, the default since 2026-10-13) adds 3.5 % on top of
 * the card fee; when Numen sells, the invoice and Stripe Tax are added.
 */
export const STRIPE: {
  readonly cardPercent: Figure;
  readonly cardFixedEur: Figure;
  readonly managedPaymentsPercent: Figure;
  readonly invoicePercent: Figure;
  readonly invoiceCapUsd: Figure;
  readonly taxPercent: Figure;
} = {
  cardPercent: { value: 1.5, readOn: READ_ON, source: STRIPE_PRICING },
  cardFixedEur: { value: 0.25, readOn: READ_ON, source: STRIPE_PRICING },
  managedPaymentsPercent: { value: 3.5, readOn: READ_ON, source: STRIPE_PRICING },
  invoicePercent: { value: 0.4, readOn: READ_ON, source: STRIPE_PRICING },
  invoiceCapUsd: { value: 2, readOn: READ_ON, source: STRIPE_PRICING },
  taxPercent: { value: 0.5, readOn: READ_ON, source: STRIPE_PRICING },
};

/** Where Stripe says what selling through Managed Payments means. */
export const MANAGED_PAYMENTS_SOURCE =
  'https://docs.stripe.com/payments/managed-payments/how-it-works';

/**
 * One size of world, as the product sells it: the people it holds at once
 * (null when unknown), the engine's player limit, what the machine reserves
 * and caps, the files included and their typical use (for the copies), the
 * support minutes a month, and the prices a new version starts from.
 */
export interface SizeSpec extends Reading {
  readonly key: string;
  readonly people: number | null;
  readonly playerLimit: number | null;
  readonly ramReservedGb: number;
  readonly ramCeilingGb: number;
  readonly cpuCeiling: number;
  readonly filesGb: number;
  readonly usedGb: number;
  readonly supportMinutes: number;
  /** Starting prices for a draft, whole cents a day net of VAT; null when only a version prices it. */
  readonly startRunningCents: number | null;
  readonly startStoppedCents: number | null;
}

export const SIZE_CATALOG: readonly SizeSpec[] = [
  {
    key: 'small',
    people: 20,
    playerLimit: 25,
    ramReservedGb: 0.5,
    ramCeilingGb: 0.75,
    cpuCeiling: 0.25,
    filesGb: 2,
    usedGb: 0.5,
    supportMinutes: 0,
    startRunningCents: 20,
    startStoppedCents: 2,
    readOn: READ_ON,
    source: DECISION,
  },
  {
    key: 'medium',
    people: 50,
    playerLimit: 60,
    ramReservedGb: 1,
    ramCeilingGb: 1.5,
    cpuCeiling: 0.5,
    filesGb: 5,
    usedGb: 2,
    supportMinutes: 5,
    startRunningCents: 75,
    startStoppedCents: 5,
    readOn: READ_ON,
    source: DECISION,
  },
  {
    key: 'large',
    people: 100,
    playerLimit: 120,
    ramReservedGb: 1,
    ramCeilingGb: 2,
    cpuCeiling: 1,
    filesGb: 20,
    usedGb: 8,
    supportMinutes: 15,
    startRunningCents: 180,
    startStoppedCents: 10,
    readOn: READ_ON,
    source: DECISION,
  },
  {
    // The seed's example size (2 GB reserved): people at once never measured.
    key: '2g',
    people: null,
    playerLimit: null,
    ramReservedGb: 2,
    ramCeilingGb: 2,
    cpuCeiling: 1.5,
    filesGb: 20,
    usedGb: 2,
    supportMinutes: 5,
    startRunningCents: null,
    startStoppedCents: null,
    readOn: READ_ON,
    source: JUDGEMENT,
  },
];

/** One world for a whole month elsewhere, euros net of VAT; its words live in i18n/prices.ts. */
export interface MarketOffer extends Reading {
  readonly key: string;
  readonly eurMonth: number;
}

export const MARKET: readonly MarketOffer[] = [
  { key: 'hyperworldBasic', eurMonth: 4.47, readOn: READ_ON, source: 'https://hyperworld.host' },
  {
    key: 'realmsPlus',
    eurMonth: 7.15,
    readOn: READ_ON,
    source: 'https://www.minecraft.net/en-us/realms',
  },
  {
    key: 'frameBasic',
    eurMonth: 8.94,
    readOn: READ_ON,
    source: 'https://learn.framevr.io/pricing',
  },
  {
    key: 'hermesStandard',
    eurMonth: 13.88,
    readOn: READ_ON,
    source: 'https://portal.nousresearch.com/cloud',
  },
  { key: 'hyperworldOg', eurMonth: 22.36, readOn: READ_ON, source: 'https://hyperworld.host' },
  {
    key: 'hubs4',
    eurMonth: 32.2,
    readOn: READ_ON,
    source: 'https://www.popacloudhost.com/mozilla-hubs-hosting',
  },
  {
    key: 'framePlus',
    eurMonth: 44.72,
    readOn: READ_ON,
    source: 'https://learn.framevr.io/pricing',
  },
  {
    key: 'hubs8',
    eurMonth: 54.56,
    readOn: READ_ON,
    source: 'https://www.popacloudhost.com/mozilla-hubs-hosting',
  },
  {
    key: 'framePro',
    eurMonth: 178.87,
    readOn: READ_ON,
    source: 'https://learn.framevr.io/pricing',
  },
];

/**
 * The rules a draft starts from when the till holds no version at all: the
 * seed's (example figures, DBT-026). Any version's own rules win.
 */
export const DEFAULT_RULES: DeskRules = {
  eventBoostCentsPerDay: 180,
  minTopupCents: 1000,
  quickTopupsCents: [1000, 2000, 5000, 10000],
  minBalanceDaysRunning: 2,
  keepDaysAtZero: 90,
  noticeDaysForRise: 30,
  lowBalanceDaysDefault: 3,
};

/** The sizes the example fleet counts, in the room's order. */
export const FLEET_SIZES: readonly string[] = ['small', 'medium', 'large'];

/**
 * The calculator as it opens: a VPS-3 half sold, the processor promised
 * once, full copies, an average top-up of 20 €, Stripe as the seller, the
 * team's hour at 30 €, 5 and 15 minutes of support a month for a medium and
 * a large world, 15 € of fixed costs, no voice, video or AI yet, and an
 * example fleet of 20 small, 10 medium and 3 large worlds running all month.
 */
export const DEFAULT_ASSUMPTIONS: Assumptions = {
  machine: 'VPS-3',
  occupancyPct: 50,
  cpuPromised: 1,
  copies: 'full',
  topupEur: 20,
  seller: 'stripe',
  teamHourEur: 30,
  supportMinutes: { medium: 5, large: 15 },
  fixedEurMonth: 15,
  extrasEurMonth: 0,
  fleet: {
    small: { worlds: 20, runningPct: 100 },
    medium: { worlds: 10, runningPct: 100 },
    large: { worlds: 3, runningPct: 100 },
  },
};

/** The calculator's choices: the slider's range and steps, the top-ups offered. */
export const OCCUPANCY_RANGE = { min: 20, max: 100, step: 5 } as const;
export const CPU_PROMISED_RANGE = { min: 1, max: 3, step: 0.5 } as const;
export const TOPUPS_EUR: readonly number[] = [10, 20, 50, 100];
