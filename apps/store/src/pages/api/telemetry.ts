/**
 * Client error intake (MISSION-022). The browser beacon reports uncaught
 * errors here; we log ONE structured line per report. Operations, not
 * analytics: no identity, no consent surface, size-capped, fire-and-forget.
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { capMessage, logEvent } from '../../lib/telemetry';

export const prerender = false;

const reportSchema = z
  .object({
    message: z.string().min(1).max(500),
    source: z.string().max(300).optional(),
    path: z.string().max(300).optional(),
  })
  .strict();

export const POST: APIRoute = async ({ request }) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = reportSchema.safeParse(body);
  // Malformed reports are dropped silently: this endpoint must never become
  // a mirror that error-loops with a broken client.
  if (parsed.success) {
    logEvent({
      level: 'error',
      kind: 'client',
      message: capMessage(parsed.data.message),
      source: parsed.data.source ?? '',
      path: parsed.data.path ?? '',
    });
  }
  return new Response(null, { status: 204 });
};
