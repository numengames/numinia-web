/**
 * Does a world's engine take the `ia` block of an AI's pass? (S18, D-084)
 *
 * The engine accepts the block from 0.29.0; an older engine REFUSES a pass
 * with a field it does not know, so the AI would not get in at all. The pass
 * therefore carries `ia` only to a world that SAYS it runs 0.29.0 or later,
 * and to nobody else: whatever is not clearly yes is no (fail closed).
 *
 * What a world says is its public `/status` (the one the worlds room already
 * reads): `semver`, the engine's package version, or a `version` that is
 * itself `x.y.z`. The build string an engine reports today (`7e7876f
 * 2026-10-20`) and its commit say nothing of the order of versions, so they
 * are not read: until the engine's `/status` carries `semver`, no world
 * gets the block.
 *
 * The answer is kept for a few minutes per world: an AI asks for a pass
 * every few minutes and the world's version changes only when it is updated.
 */

type Fetch = typeof fetch;

/** The first engine whose pass takes an `ia` block. */
export const IA_FROM_ENGINE = [0, 29, 0] as const;
/** How long a yes is kept, and a no (a world that did not answer is asked again sooner). */
export const IA_YES_TTL_MS = 5 * 60_000;
export const IA_NO_TTL_MS = 60_000;

const SEMVER = /^v?(\d{1,6})\.(\d{1,6})\.(\d{1,6})$/;

/** The `x.y.z` a `/status` body says, or null. */
export function engineSemver(status: unknown): readonly [number, number, number] | null {
  if (typeof status !== 'object' || status === null) return null;
  const { semver, version } = status as Record<string, unknown>;
  for (const said of [semver, version]) {
    const match = typeof said === 'string' ? SEMVER.exec(said) : null;
    if (match !== null) return [Number(match[1]), Number(match[2]), Number(match[3])];
  }
  return null;
}

/** Whether a `/status` body says an engine of 0.29.0 or later. */
export function takesIa(status: unknown): boolean {
  const said = engineSemver(status);
  if (said === null) return false;
  for (const [index, wanted] of IA_FROM_ENGINE.entries()) {
    const have = said[index] as number;
    if (have !== wanted) return have > wanted;
  }
  return true;
}

const kept = new Map<string, { readonly at: number; readonly yes: boolean }>();

/** Forget what was kept (tests). */
export function forgetWorldIa(): void {
  kept.clear();
}

/** Ask the world at `host` (its public `/status`, like a visitor) whether it takes the block. Never throws. */
export async function worldTakesIa(
  fetchImpl: Fetch,
  host: string,
  nowMs: number = Date.now(),
  timeoutMs = 2500,
): Promise<boolean> {
  const before = kept.get(host);
  if (before !== undefined && nowMs - before.at < (before.yes ? IA_YES_TTL_MS : IA_NO_TTL_MS)) {
    return before.yes;
  }
  let yes: boolean;
  try {
    const response = await fetchImpl(`https://${host}/status`, {
      headers: { accept: 'application/json', 'user-agent': 'numinia-agent-pass' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    yes = response.ok && takesIa(await response.json());
  } catch {
    yes = false;
  }
  kept.set(host, { at: nowMs, yes });
  return yes;
}
