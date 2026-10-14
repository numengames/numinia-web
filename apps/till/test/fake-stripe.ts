/**
 * A pretend Stripe for the tests: the three calls the till makes (open a
 * Checkout Session, read one back, list events), answered from memory as
 * api.stripe.com answers them — form-encoded requests in, JSON out. It
 * keeps every request it was sent, so a test can see the headers and body
 * the till wrote. The tests never reach the real Stripe.
 */

import type { Fetcher } from '../src/lib/stripe';

export interface SeenRequest {
  readonly method: string;
  readonly url: URL;
  readonly headers: Readonly<Record<string, string>>;
  readonly form: URLSearchParams;
}

type Json = Record<string, unknown>;

/** The fake's prices: euros of each quick top-up, tax included (as the real prices are). */
export const FAKE_PRICES = { '10': 'price_ten', '50': 'price_fifty', '100': 'price_hundred' };
const PRICE_CENTS: Readonly<Record<string, number>> = {
  price_ten: 1000,
  price_fifty: 5000,
  price_hundred: 10000,
};

export interface Payment {
  /** What the buyer paid, tax included (cents); the price itself by default. */
  readonly amountTotal?: number | null;
  /** The tax Managed Payments collected (cents). */
  readonly amountTax?: number | null;
  readonly currency?: string;
  readonly paymentIntent?: string | null;
  readonly invoice?: string | null;
  /** A late payment (SEPA): its event is `checkout.session.async_payment_succeeded`. */
  readonly async?: boolean;
  /** The event's `created` (unix seconds). */
  readonly created?: number;
}

export class FakeStripe {
  readonly sessions = new Map<string, Json>();
  /** Every event, in the order they happened. */
  readonly events: Json[] = [];
  readonly requests: SeenRequest[] = [];
  /** When set, the next request answers this status (and the setting clears). */
  failNext: number | null = null;
  /** When set, every answer is this body instead (a malformed Stripe). */
  answerWith: unknown = undefined;
  #sessionCount = 0;
  #eventCount = 0;

  readonly fetch: Fetcher = async (url, init) => {
    const parsed = new URL(url);
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    const method = init.method ?? 'GET';
    const form = new URLSearchParams(typeof init.body === 'string' ? init.body : parsed.search);
    this.requests.push({ method, url: parsed, headers, form });
    if (this.failNext !== null) {
      const status = this.failNext;
      this.failNext = null;
      return Response.json({ error: { message: 'pretend failure' } }, { status });
    }
    if (this.answerWith !== undefined) return Response.json(this.answerWith);
    if (method === 'POST' && parsed.pathname === '/v1/checkout/sessions') return this.#create(form);
    const sessionPath = /^\/v1\/checkout\/sessions\/([^/]+)$/.exec(parsed.pathname);
    if (method === 'GET' && sessionPath !== null) {
      const session = this.sessions.get(decodeURIComponent(sessionPath[1] as string));
      return session === undefined
        ? Response.json({ error: { message: 'No such checkout.session' } }, { status: 404 })
        : Response.json(session);
    }
    if (method === 'GET' && parsed.pathname === '/v1/events') return this.#list(form);
    return Response.json({ error: { message: 'Unrecognized request URL' } }, { status: 404 });
  };

  #create(form: URLSearchParams): Response {
    this.#sessionCount += 1;
    const id = `cs_test_${String(this.#sessionCount).padStart(4, '0')}`;
    const price = form.get('line_items[0][price]') ?? '';
    const session: Json = {
      id,
      object: 'checkout.session',
      status: 'open',
      payment_status: 'unpaid',
      mode: form.get('mode'),
      amount_total: PRICE_CENTS[price] ?? null,
      total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: 0 },
      currency: 'eur',
      payment_intent: null,
      invoice: null,
      client_reference_id: form.get('client_reference_id'),
      metadata: {
        account: form.get('metadata[account]'),
        wallet: form.get('metadata[wallet]'),
      },
      url: `https://checkout.stripe.com/c/pay/${id}`,
    };
    this.sessions.set(id, session);
    return Response.json(session);
  }

  #list(form: URLSearchParams): Response {
    const types = [...form.entries()]
      .filter(([key]) => key.startsWith('types['))
      .map(([, value]) => value);
    const gte = Number(form.get('created[gte]'));
    const limit = Number(form.get('limit') ?? 10);
    const newestFirst = this.events
      .map((event, index) => ({ event, index }))
      .filter(({ event }) => types.includes(String(event['type'])))
      .filter(({ event }) => Number(event['created']) >= gte)
      .sort((a, b) => Number(b.event['created']) - Number(a.event['created']) || b.index - a.index)
      .map(({ event }) => event);
    const after = form.get('starting_after');
    const start = after === null ? 0 : newestFirst.findIndex((event) => event['id'] === after) + 1;
    const data = newestFirst.slice(start, start + limit);
    return Response.json({
      object: 'list',
      url: '/v1/events',
      data,
      has_more: start + limit < newestFirst.length,
    });
  }

  #event(type: string, session: Json, created: number): void {
    this.#eventCount += 1;
    this.events.push({
      id: `evt_test_${String(this.#eventCount).padStart(4, '0')}`,
      object: 'event',
      type,
      created,
      data: { object: structuredClone(session) },
    });
  }

  /** The buyer pays session `id`: Stripe marks it paid and writes its event. */
  pay(id: string, payment: Payment = {}): Json {
    const session = this.sessions.get(id);
    if (session === undefined) throw new Error(`fake stripe: no session ${id}`);
    // Tax-inclusive prices: the buyer pays the price; Spain's 21 % sits inside it.
    const total = Number(session['amount_total']);
    const tax =
      payment.amountTax === undefined ? total - Math.round(total / 1.21) : payment.amountTax;
    Object.assign(session, {
      status: 'complete',
      payment_status: 'paid',
      amount_total: payment.amountTotal === undefined ? total : payment.amountTotal,
      total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: tax },
      currency: payment.currency ?? 'eur',
      payment_intent:
        payment.paymentIntent === undefined ? `pi_test_${id.slice(8)}` : payment.paymentIntent,
      invoice: payment.invoice === undefined ? `in_test_${id.slice(8)}` : payment.invoice,
      url: null,
    });
    const created = payment.created ?? 1_792_000_000;
    if (payment.async === true) {
      this.#event('checkout.session.completed', { ...session, payment_status: 'unpaid' }, created);
      this.#event('checkout.session.async_payment_succeeded', session, created);
    } else {
      this.#event('checkout.session.completed', session, created);
    }
    return session;
  }

  /** A completed session whose late payment has not arrived yet. */
  complete(id: string): void {
    const session = this.sessions.get(id);
    if (session === undefined) throw new Error(`fake stripe: no session ${id}`);
    Object.assign(session, { status: 'complete', payment_status: 'unpaid', url: null });
  }

  /** The session expires unpaid. */
  expire(id: string): void {
    const session = this.sessions.get(id);
    if (session === undefined) throw new Error(`fake stripe: no session ${id}`);
    Object.assign(session, { status: 'expired', url: null });
  }

  /** An event of a session the till never opened (another product of the same account). */
  foreign(created: number): void {
    this.#event(
      'checkout.session.completed',
      {
        id: `cs_test_other_${created}`,
        object: 'checkout.session',
        status: 'complete',
        payment_status: 'paid',
        amount_total: 500,
        total_details: { amount_tax: 0 },
        currency: 'usd',
        payment_intent: 'pi_other',
        invoice: null,
        client_reference_id: null,
        url: null,
      },
      created,
    );
  }
}
