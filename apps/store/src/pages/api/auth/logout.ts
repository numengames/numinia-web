/**
 * Logout (MISSION-002 Step 0 spike): drop the session cookie. Stateless
 * sessions mean there is nothing server-side to revoke in this spike.
 */

import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../lib/auth/server';

export const prerender = false;

export const POST: APIRoute = ({ cookies }) => {
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return Response.json({ ok: true });
};
