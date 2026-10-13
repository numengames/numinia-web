/**
 * Runtime environment access that survives the Cloudflare build.
 *
 * The bundler statically freezes `process.env` — and even
 * `globalThis.process.env` — to `{}` when building for workerd (verified on
 * the compiled chunks), so no expression that mentions process can reach
 * the Worker's vars and secrets. This is how auth shipped permanently
 * "not configured" while the Worker held perfectly good secrets. The
 * documented channel on Astro 7 is `import { env } from 'cloudflare:workers'`
 * (locals.runtime.env is gone — its getter throws): the middleware calls
 * primeFromWorkerd() before any route runs. Where that import fails (node
 * dev server, Vitest), the ordinary process.env answers through the
 * globalThis fallback. No source at all yields `{}` — the fail-closed
 * config loaders downstream stay in charge.
 */

type EnvRecord = Readonly<Record<string, string | undefined>>;

let primed: EnvRecord | null = null;
let attempted = false;

/** Middleware entry: adopt workerd's env once; a no-op everywhere else. */
export async function primeFromWorkerd(): Promise<void> {
  if (attempted) return;
  attempted = true;
  try {
    const mod = (await import(/* @vite-ignore */ 'cloudflare:workers')) as { env?: unknown };
    primeRuntimeEnv(mod.env);
  } catch {
    // Not running on workerd — the globalThis fallback covers it.
  }
}

/** Adopt an adapter-provided env object (workerd; exposed for tests). */
export function primeRuntimeEnv(env: unknown): void {
  if (env !== null && typeof env === 'object') {
    primed = env as EnvRecord;
  }
}

export function runtimeEnv(): EnvRecord {
  if (primed) return primed;
  const candidate = (globalThis as { process?: { env?: EnvRecord } }).process?.env;
  return candidate ?? {};
}

/**
 * An object binding workerd hands the Worker — a service binding such as
 * the till's desk (TILL_ORACLE in the root wrangler.jsonc) — as its env
 * holds it, or undefined when there is none. The env above is typed as
 * strings because vars and secrets are; a binding is an object (an RPC stub
 * may be a callable one), so it comes back as `unknown` and the caller
 * narrows it to what it needs. Outside workerd only strings exist, so this
 * answers undefined: no binding, never a string mistaken for one.
 */
export function runtimeBinding(name: string): unknown {
  const value: unknown = (runtimeEnv() as Readonly<Record<string, unknown>>)[name];
  if (value === null) return undefined;
  return typeof value === 'object' || typeof value === 'function' ? value : undefined;
}

/** Test seam: priming is isolate-wide; tests reset between scenarios. */
export function resetRuntimeEnvForTests(): void {
  primed = null;
  attempted = false;
}
