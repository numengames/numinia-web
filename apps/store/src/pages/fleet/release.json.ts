/**
 * The signed FleetRelease record (fleet auto-update, story S4): GET
 * /fleet/release.json — `{ message, signature }`, what an Oracle's wallet
 * signed and every machine's release timer reads and checks again. Public,
 * cached a minute; see lib/fleet-release-source.ts.
 */

import type { APIRoute } from 'astro';
import { answerRelease, releaseDeskFrom } from '../../lib/fleet-release-source';
import { runtimeBinding } from '../../lib/runtime-env';

export const prerender = false;

const desk = () =>
  releaseDeskFrom({ binding: runtimeBinding('TILL_FLEET'), dataSource: process.env.DATA_SOURCE });

export const GET: APIRoute = async ({ request }) =>
  answerRelease(desk(), request.headers.get('if-none-match'));
