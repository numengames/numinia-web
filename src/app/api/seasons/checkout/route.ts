import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { env } from '@/lib/env';
import { getUserSession } from '@/lib/auth/getSession';
import { getActiveSeason, getUserSeasonStatus } from '@/lib/season-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!env.stripe.secretKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 503 },
    );
  }

  const session = getUserSession(req);
  if (!session.authenticated || !session.address) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const season = await getActiveSeason();
  if (!season || season.status !== 'active') {
    return NextResponse.json(
      { error: 'No active season' },
      { status: 404 },
    );
  }

  // Check if user already has the pass
  const status = await getUserSeasonStatus(season.id, session.address);
  if (status.hasPass) {
    return NextResponse.json(
      { error: 'You already own this season pass' },
      { status: 409 },
    );
  }

  try {
    const stripe = new Stripe(env.stripe.secretKey);

    // Derive locale from Referer header for redirect URLs
    const referer = req.headers.get('referer') ?? '';
    const locale = referer.includes('/ja/') ? 'ja' : 'en';
    const baseUrl = env.siteUrl;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: season.stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        season_id: season.id,
        wallet_address: session.address,
      },
      success_url: `${baseUrl}/${locale}/LAP/seasons?purchase=success`,
      cancel_url: `${baseUrl}/${locale}/LAP/seasons`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    );
  }
}
