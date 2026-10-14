import { describe, expect, it } from 'vitest';
import { STRIPE_VERSION, Stripe, formEncode, parseSession, type Fetcher } from '../src/lib/stripe';
import { FakeStripe } from './fake-stripe';

const KEY = 'rk_test_pretend';

/** A Checkout Session as Stripe answers it, every field the till reads present. */
function sessionJson(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'cs_test_a1',
    object: 'checkout.session',
    status: 'complete',
    payment_status: 'paid',
    amount_total: 1210,
    total_details: { amount_tax: 210 },
    currency: 'eur',
    payment_intent: 'pi_1',
    invoice: 'in_1',
    client_reference_id: 'acc_p_1',
    url: null,
    ...overrides,
  };
}

describe('reading a Checkout Session', () => {
  it('reads the fields the till uses, ids of expanded objects included', () => {
    expect(parseSession(sessionJson())).toEqual({
      id: 'cs_test_a1',
      status: 'complete',
      paymentStatus: 'paid',
      amountTotal: 1210,
      amountTax: 210,
      currency: 'eur',
      paymentIntent: 'pi_1',
      invoice: 'in_1',
      clientReferenceId: 'acc_p_1',
      url: null,
    });
    expect(
      parseSession(sessionJson({ payment_intent: { id: 'pi_2' }, invoice: { id: 'in_2' } })),
    ).toMatchObject({ paymentIntent: 'pi_2', invoice: 'in_2' });
  });

  it('reads a missing or null field as null', () => {
    const { total_details: _details, ...noDetails } = sessionJson();
    expect(parseSession(noDetails)).toMatchObject({ amountTax: null });
    expect(
      parseSession(
        sessionJson({
          amount_total: null,
          total_details: { amount_tax: null },
          currency: null,
          payment_intent: null,
          invoice: undefined,
          client_reference_id: null,
          url: 'https://checkout.stripe.com/c/pay/cs_test_a1',
        }),
      ),
    ).toEqual({
      id: 'cs_test_a1',
      status: 'complete',
      paymentStatus: 'paid',
      amountTotal: null,
      amountTax: null,
      currency: null,
      paymentIntent: null,
      invoice: null,
      clientReferenceId: null,
      url: 'https://checkout.stripe.com/c/pay/cs_test_a1',
    });
  });

  it('answers null for anything not shaped as a session', () => {
    for (const notASession of [
      null,
      'cs_test_a1',
      [sessionJson()],
      sessionJson({ object: 'payment_intent' }),
      sessionJson({ id: '' }),
      sessionJson({ status: 'done' }),
      sessionJson({ payment_status: 'maybe' }),
      sessionJson({ amount_total: 12.1 }),
      sessionJson({ total_details: { amount_tax: '210' } }),
      sessionJson({ currency: 978 }),
      sessionJson({ payment_intent: { id: '' } }),
      sessionJson({ invoice: 7 }),
      sessionJson({ client_reference_id: '' }),
      sessionJson({ url: false }),
    ]) {
      expect(parseSession(notASession)).toBeNull();
    }
  });
});

describe('the client', () => {
  it('form-encodes Stripe’s bracket keys', () => {
    expect(
      formEncode({ 'line_items[0][price]': 'price_ten', success_url: 'https://a/?s={X}' }),
    ).toBe('line_items%5B0%5D%5Bprice%5D=price_ten&success_url=https%3A%2F%2Fa%2F%3Fs%3D%7BX%7D');
  });

  it('pins the API version and names the key in every request, form-encoded', async () => {
    const stripe = new FakeStripe();
    const client = new Stripe(KEY, stripe.fetch);
    const opened = await client.createCheckoutSession({
      mode: 'payment',
      'line_items[0][price]': 'price_ten',
      client_reference_id: 'acc_p_1',
    });
    expect(opened).toMatchObject({ id: 'cs_test_0001', status: 'open', amountTotal: 1000 });
    await client.retrieveCheckoutSession(opened.id);
    await client.listEvents({ types: ['checkout.session.completed'], createdGte: 5 });
    expect(STRIPE_VERSION).toBe('2026-09-30.endive');
    for (const request of stripe.requests) {
      expect(request.headers['authorization']).toBe(`Bearer ${KEY}`);
      expect(request.headers['stripe-version']).toBe(STRIPE_VERSION);
      expect(request.url.origin).toBe('https://api.stripe.com');
    }
    const [create, retrieve, list] = stripe.requests;
    expect(create?.headers['content-type']).toBe('application/x-www-form-urlencoded');
    expect(create?.form.get('line_items[0][price]')).toBe('price_ten');
    expect(retrieve?.method).toBe('GET');
    expect(retrieve?.headers['content-type']).toBeUndefined();
    expect(retrieve?.url.pathname).toBe('/v1/checkout/sessions/cs_test_0001');
    expect(list?.url.search).toBe(
      '?limit=100&created%5Bgte%5D=5&types%5B0%5D=checkout.session.completed',
    );
  });

  it('calls the runtime’s fetch when none is given', async () => {
    const stripe = new FakeStripe();
    const original = globalThis.fetch;
    globalThis.fetch = ((url: string, init: RequestInit) =>
      stripe.fetch(url, init)) as typeof fetch;
    try {
      await new Stripe(KEY).listEvents({ types: [], createdGte: 0 });
    } finally {
      globalThis.fetch = original;
    }
    expect(stripe.requests).toHaveLength(1);
  });

  it('lists events page by page, each with its session', async () => {
    const stripe = new FakeStripe();
    const client = new Stripe(KEY, stripe.fetch);
    const { id } = await client.createCheckoutSession({ 'line_items[0][price]': 'price_ten' });
    stripe.pay(id, { async: true, created: 100 });
    const types = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
    const first = await client.listEvents({ types, createdGte: 50 });
    expect(first.hasMore).toBe(false);
    expect(
      first.events.map((event) => [event.type, event.created, event.session?.paymentStatus]),
    ).toEqual([
      ['checkout.session.async_payment_succeeded', 100, 'paid'],
      ['checkout.session.completed', 100, 'unpaid'],
    ]);
    const after = await client.listEvents({
      types,
      createdGte: 50,
      startingAfter: 'evt_test_0002',
    });
    expect(after.events.map((event) => event.id)).toEqual(['evt_test_0001']);
    expect(stripe.requests.at(-1)?.form.get('starting_after')).toBe('evt_test_0002');
    // An event about something else carries no session.
    stripe.answerWith = {
      data: [{ id: 'evt_x', type: 'checkout.session.completed', created: 1, data: { object: {} } }],
      has_more: false,
    };
    expect((await client.listEvents({ types, createdGte: 0 })).events[0]?.session).toBeNull();
    stripe.answerWith = {
      data: [{ id: 'evt_y', type: 'checkout.session.completed', created: 1, data: 'x' }],
      has_more: false,
    };
    expect((await client.listEvents({ types, createdGte: 0 })).events[0]?.session).toBeNull();
  });

  it('throws on a status that is not 2xx, naming the route and status only', async () => {
    const stripe = new FakeStripe();
    const client = new Stripe(KEY, stripe.fetch);
    stripe.failNext = 401;
    const failure = client.listEvents({ types: ['x'], createdGte: 1792000000 });
    await expect(failure).rejects.toThrow('stripe: GET /v1/events answered 401');
    await expect(failure).rejects.not.toThrow(KEY);
    stripe.failNext = 500;
    await expect(client.createCheckoutSession({ 'metadata[wallet]': '0xabc' })).rejects.toThrow(
      /^stripe: POST \/v1\/checkout\/sessions answered 500$/,
    );
    await expect(client.retrieveCheckoutSession('cs_test_none')).rejects.toThrow(
      'stripe: GET /v1/checkout/sessions/cs_test_none answered 404',
    );
  });

  it('throws on an answer that is not what was asked for', async () => {
    const stripe = new FakeStripe();
    const client = new Stripe(KEY, stripe.fetch);
    stripe.answerWith = sessionJson({ url: null });
    await expect(client.createCheckoutSession({})).rejects.toThrow('answered no open session');
    stripe.answerWith = { object: 'list' };
    await expect(client.createCheckoutSession({})).rejects.toThrow('answered no open session');
    await expect(client.retrieveCheckoutSession('cs_test_a1')).rejects.toThrow(
      'answered no such session',
    );
    stripe.answerWith = sessionJson();
    await expect(client.retrieveCheckoutSession('cs_test_b2')).rejects.toThrow(
      'answered no such session',
    );
    for (const notAList of [[], { data: {}, has_more: false }, { data: [], has_more: 'no' }]) {
      stripe.answerWith = notAList;
      await expect(client.listEvents({ types: [], createdGte: 0 })).rejects.toThrow(
        'stripe: GET /v1/events answered no list',
      );
    }
    for (const event of [
      null,
      { id: 'evt', type: 't', created: 1.5 },
      { id: '', type: 't', created: 1 },
    ]) {
      stripe.answerWith = { data: [event], has_more: false };
      await expect(client.listEvents({ types: [], createdGte: 0 })).rejects.toThrow(
        'answered a malformed event',
      );
    }
  });

  it('accepts any fetcher shaped as one', async () => {
    const seen: string[] = [];
    const fetcher: Fetcher = async (url) => {
      seen.push(url);
      return Response.json({ data: [], has_more: false });
    };
    expect(await new Stripe(KEY, fetcher).listEvents({ types: [], createdGte: 0 })).toEqual({
      events: [],
      hasMore: false,
    });
    expect(seen).toEqual(['https://api.stripe.com/v1/events?limit=100&created%5Bgte%5D=0']);
  });
});
