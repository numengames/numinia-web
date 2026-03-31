import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { env } from '@/lib/env';
import { addPassHolder } from '@/lib/season-storage';

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
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 },
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const seasonId = session.metadata?.season_id;
    const walletAddress = session.metadata?.wallet_address;

    if (!seasonId || !walletAddress) {
      console.error('Webhook missing metadata:', { seasonId, walletAddress });
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
    } catch (error) {
      console.error('Failed to record pass holder:', error);
      return NextResponse.json(
        { error: 'Failed to record purchase' },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ received: true });
}
