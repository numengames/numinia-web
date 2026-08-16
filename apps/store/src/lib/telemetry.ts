/**
 * Structured telemetry (MISSION-021) — one JSON line per event, consumed by
 * Workers Logs (observability.enabled in wrangler.jsonc). No PII by design:
 * wallets are truncated, messages are size-capped, and nothing here ever
 * feeds analytics — this is operations, not measurement (ADR-016 stays).
 */

const MESSAGE_CAP = 500;

export function truncateWallet(wallet: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) return 'invalid';
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

export function capMessage(message: string): string {
  return message.length > MESSAGE_CAP ? `${message.slice(0, MESSAGE_CAP)}…` : message;
}

/** One structured line; Workers Logs indexes the JSON fields. */
export function logEvent(event: Readonly<Record<string, unknown>>): void {
  // The one sanctioned console in the codebase: on Workers, console IS the
  // structured-log transport (observability.enabled ships it to Workers Logs).
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...event }));
}
