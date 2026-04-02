import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { env } from '@/lib/env';
import { addPassHolder, updatePassHolderNft } from '@/lib/season-storage';
import { mintSeasonPass } from '@/lib/thirdweb-mint';
import { createLogger } from '@/lib/logger';
import { getRedis } from '@/lib/redis';

const log = createLogger('api/seasons/webhook');

// Idempotency: track processed Stripe event IDs to prevent double-processing on retries.
// Uses Redis when available, falls back to in-memory Set (per-instance, best-effort).
const processedEventsLocal = new Set<string>();
const IDEMPOTENCY_TTL = 60 * 60 * 24; // 24h in seconds

async function isEventProcessed(eventId: string): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    const exists = await redis.get(`stripe:event:${eventId}`);
    return exists !== null;
  }
  return processedEventsLocal.has(eventId);
}

async function markEventProcessed(eventId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(`stripe:event:${eventId}`, '1', { ex: IDEMPOTENCY_TTL });
  } else {
    processedEventsLocal.add(eventId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!env.stripe.secretKey || !env.stripe.webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 503 },
    );
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    const stripe = new Stripe(env.stripe.secretKey);
    event = stripe.webhooks.constructEvent(body, sig, env.stripe.webhookSecret);
  } catch (error) {
    log.error({ err: error }, 'Webhook signature verification failed');
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 },
    );
  }

  // Idempotency check: skip already-processed events (Stripe retries on timeout)
  if (await isEventProcessed(event.id)) {
    log.info({ eventId: event.id }, 'Duplicate Stripe event — skipping');
    return NextResponse.json({ received: true });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const seasonId = session.metadata?.season_id;
    const walletAddress = session.metadata?.wallet_address;

    if (!seasonId || !walletAddress) {
      log.error({
        seasonId,
        walletAddress,
        stripeSessionId: session.id,
        customerEmail: session.customer_email,
        metadata: session.metadata,
      }, 'Webhook missing metadata — check checkout session metadata config');
      return NextResponse.json({ received: true });
    }

    try {
      await addPassHolder(seasonId, {
        address: walletAddress,
        purchasedAt: new Date().toISOString(),
        stripeSessionId: session.id,
        completedAdventures: [],
        burnCompleted: false,
      });
      log.info({ seasonId, address: walletAddress, stripeSession: session.id }, 'Pass holder recorded');
    } catch (error) {
      log.error({ err: error, seasonId, walletAddress, stripeSession: session.id }, 'Failed to record pass holder');
      return NextResponse.json(
        { error: 'Failed to record purchase' },
        { status: 500 },
      );
    }

    // Mint NFT to buyer's wallet (best-effort — pass works via JSON even if mint fails)
    try {
      const mintResult = await mintSeasonPass(walletAddress);
      if (mintResult) {
        log.info({ tx: mintResult.transactionHash }, 'Season pass NFT minted');
        await updatePassHolderNft(
          seasonId,
          walletAddress,
          mintResult.tokenId,
          mintResult.transactionHash,
        );
      }
    } catch (mintError) {
      log.error({ err: mintError }, 'NFT mint failed (pass still recorded in JSON)');
    }
  }

  // Mark event as processed after successful handling
  await markEventProcessed(event.id);

  return NextResponse.json({ received: true });
}
