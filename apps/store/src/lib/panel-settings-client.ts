/**
 * «Ajustes de la comunidad», the browser's side: reading and saving an
 * organization's panel settings through /api/saldo/settings. Pure but for the
 * `fetch` it is handed (a test hands a double); no zod, so an island may
 * import it. A failed read is `null` and the panel keeps today's defaults;
 * a failed save says so and changes nothing on the screen.
 */

import { readSettings, type DeskSettings, type DeskSettingsChange } from './accounts';

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

const URL_OF = '/api/saldo/settings';

/** The organization's settings, or null when the till did not say (the defaults stand). */
export async function loadSettings(fetcher: Fetcher, org: string): Promise<DeskSettings | null> {
  try {
    const response = await fetcher(`${URL_OF}?cuenta=${encodeURIComponent(org)}`, {
      headers: { accept: 'application/json' },
    });
    const json: unknown = await response.json().catch(() => null);
    return response.ok ? readSettings(json) : null;
  } catch {
    return null;
  }
}

/** Saves a change; the settings as the till now holds them, or null when it refused or failed. */
export async function saveSettings(
  fetcher: Fetcher,
  org: string,
  change: DeskSettingsChange,
): Promise<DeskSettings | null> {
  try {
    const response = await fetcher(URL_OF, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ accountId: org, ...change }),
    });
    const json: unknown = await response.json().catch(() => null);
    return response.ok ? readSettings(json) : null;
  } catch {
    return null;
  }
}
