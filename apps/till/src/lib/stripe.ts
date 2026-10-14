/**
 * A tiny Stripe client for the till's top-ups (MIS-180): three calls over
 * `fetch`, no SDK. Stripe Managed Payments is the seller (merchant of
 * record) and the till keeps only the balance, so it needs no more than to
 * open a Checkout Session, read one back, and list the events of finished
 * ones. Bodies are form-encoded as Stripe's API expects; every request
 * names the key in `Authorization` and pins `Stripe-Version`, so a change
 * of the account's default version never changes what the till reads.
 *
 * `fetch` is injected: tests run against a fake Stripe and never reach
 * api.stripe.com. A Stripe answer that is not 2xx, or not the object the
 * till expects, is thrown — a failure, never a refusal — and the error
 * names the call and the status only, never the key, a wallet or an amount.
 */

/**
 * The API version every request pins. The current one on 2026-10-14
 * (docs.stripe.com/api/versioning); Managed Payments needs 2025-03-31.basil
 * or later. Event objects are rendered in the version of their creation;
 * the fields the till reads exist, unchanged, in both.
 */
export const STRIPE_VERSION = '2026-09-30.endive';

const API = 'https://api.stripe.com';

/** What the client needs of `fetch`. */
export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/** The fields of a Checkout Session the till reads. */
export interface CheckoutSession {
  readonly id: string;
  readonly status: 'open' | 'complete' | 'expired';
  readonly paymentStatus: 'paid' | 'unpaid' | 'no_payment_required';
  /** In the smallest unit of `currency` (cents for euros); null while unknown. */
  readonly amountTotal: number | null;
  /** `total_details.amount_tax`; null while unknown. */
  readonly amountTax: number | null;
  /** Lowercase ISO code, as Stripe writes it. */
  readonly currency: string | null;
  readonly paymentIntent: string | null;
  readonly invoice: string | null;
  readonly clientReferenceId: string | null;
  /** Where the buyer pays; null once the session is no longer open. */
  readonly url: string | null;
}

/** One event about a Checkout Session. */
export interface SessionEvent {
  readonly id: string;
  readonly type: string;
  /** Unix seconds. */
  readonly created: number;
  /** The session as it was when the event happened; null when it is not one. */
  readonly session: CheckoutSession | null;
}

export interface EventPage {
  readonly events: readonly SessionEvent[];
  readonly hasMore: boolean;
}

export interface EventQuery {
  readonly types: readonly string[];
  /** Unix seconds: events created at or after it. */
  readonly createdGte: number;
  /** The last event id of the previous page. */
  readonly startingAfter?: string;
}

const STATUSES: readonly string[] = ['open', 'complete', 'expired'];
const PAYMENT_STATUSES: readonly string[] = ['paid', 'unpaid', 'no_payment_required'];

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value !== '';
}

/** A field that is null, missing, or of the given kind. */
function optional<T>(value: unknown, is: (v: unknown) => v is T): T | null | undefined {
  if (value === null || value === undefined) return null;
  return is(value) ? value : undefined;
}

function isWhole(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/** An id, or an expanded object's id. */
function idOf(value: unknown): string | null | undefined {
  if (isRecord(value)) return isId(value['id']) ? value['id'] : undefined;
  return optional(value, isId);
}

/** A Checkout Session read field by field; null when `value` is not one. */
export function parseSession(value: unknown): CheckoutSession | null {
  if (!isRecord(value) || value['object'] !== 'checkout.session') return null;
  const { id, status, payment_status: paymentStatus, total_details: details } = value;
  if (!isId(id) || !STATUSES.includes(String(status))) return null;
  if (!PAYMENT_STATUSES.includes(String(paymentStatus))) return null;
  const amountTotal = optional(value['amount_total'], isWhole);
  const amountTax = isRecord(details) ? optional(details['amount_tax'], isWhole) : null;
  const currency = optional(value['currency'], isId);
  const paymentIntent = idOf(value['payment_intent']);
  const invoice = idOf(value['invoice']);
  const clientReferenceId = optional(value['client_reference_id'], isId);
  const url = optional(value['url'], isId);
  const fields = [amountTotal, amountTax, currency, paymentIntent, invoice, clientReferenceId, url];
  if (fields.includes(undefined)) return null;
  return {
    id,
    status: status as CheckoutSession['status'],
    paymentStatus: paymentStatus as CheckoutSession['paymentStatus'],
    amountTotal: amountTotal ?? null,
    amountTax: amountTax ?? null,
    currency: currency ?? null,
    paymentIntent: paymentIntent ?? null,
    invoice: invoice ?? null,
    clientReferenceId: clientReferenceId ?? null,
    url: url ?? null,
  };
}

/** One event of a list page; null when it is not shaped as an event. */
function parseEvent(value: unknown): SessionEvent | null {
  if (!isRecord(value)) return null;
  const { id, type, created, data } = value;
  if (!isId(id) || !isId(type) || !isWhole(created)) return null;
  return { id, type, created, session: parseSession(isRecord(data) ? data['object'] : null) };
}

/** `application/x-www-form-urlencoded`, keys already in Stripe's bracket form. */
export function formEncode(params: Readonly<Record<string, string>>): string {
  return new URLSearchParams(Object.entries(params)).toString();
}

export class Stripe {
  readonly #key: string;
  readonly #fetch: Fetcher;

  constructor(key: string, fetcher: Fetcher = (url, init) => fetch(url, init)) {
    this.#key = key;
    this.#fetch = fetcher;
  }

  async #call(method: 'GET' | 'POST', path: string, body?: string): Promise<unknown> {
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.#key}`,
      'stripe-version': STRIPE_VERSION,
    };
    if (body !== undefined) headers['content-type'] = 'application/x-www-form-urlencoded';
    const init: RequestInit = body === undefined ? { method, headers } : { method, headers, body };
    const response = await this.#fetch(`${API}${path}`, init);
    if (!response.ok) {
      // The route without its query, and the status: never the key or a value sent.
      throw new Error(`stripe: ${method} ${path.split('?')[0]} answered ${response.status}`);
    }
    const json: unknown = await response.json();
    return json;
  }

  /** Opens a Checkout Session with `params` (Stripe's form keys); its id and where to pay. */
  async createCheckoutSession(params: Readonly<Record<string, string>>): Promise<CheckoutSession> {
    const session = parseSession(
      await this.#call('POST', '/v1/checkout/sessions', formEncode(params)),
    );
    if (session === null || session.url === null) {
      throw new Error('stripe: POST /v1/checkout/sessions answered no open session');
    }
    return session;
  }

  /** A Checkout Session as Stripe holds it now. */
  async retrieveCheckoutSession(id: string): Promise<CheckoutSession> {
    const path = `/v1/checkout/sessions/${encodeURIComponent(id)}`;
    const session = parseSession(await this.#call('GET', path));
    if (session === null || session.id !== id) {
      throw new Error('stripe: GET /v1/checkout/sessions/{id} answered no such session');
    }
    return session;
  }

  /** One page (up to 100) of the events of these types created since `createdGte`, newest first. */
  async listEvents(query: EventQuery): Promise<EventPage> {
    const params: Record<string, string> = {
      limit: '100',
      'created[gte]': String(query.createdGte),
    };
    query.types.forEach((type, index) => {
      params[`types[${index}]`] = type;
    });
    if (query.startingAfter !== undefined) params['starting_after'] = query.startingAfter;
    const page = await this.#call('GET', `/v1/events?${formEncode(params)}`);
    if (!isRecord(page) || !Array.isArray(page['data']) || typeof page['has_more'] !== 'boolean') {
      throw new Error('stripe: GET /v1/events answered no list');
    }
    const events = page['data'].map(parseEvent);
    if (events.includes(null)) throw new Error('stripe: GET /v1/events answered a malformed event');
    return { events: events as SessionEvent[], hasMore: page['has_more'] };
  }
}
