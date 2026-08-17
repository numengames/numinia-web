/**
 * Minimal ambient declaration for workerd's virtual module — only the shape
 * runtime-env.ts consumes. The full @cloudflare/workers-types package would
 * drag a global type surface into an app that only needs `env` here.
 */
declare module 'cloudflare:workers' {
  export const env: Readonly<Record<string, unknown>>;
}
