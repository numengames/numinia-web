/**
 * What workerd gives the deployed relay before any module runs: the
 * compatibility flags of wrangler.jsonc as `Cloudflare.compatibilityFlags`.
 * The OAuth library reads `global_fetch_strictly_public` to decide whether
 * CIMD is safe to advertise; descubrimiento.test.ts checks that
 * wrangler.jsonc really sets it.
 */
const runtime = globalThis as unknown as {
  Cloudflare?: { compatibilityFlags: Record<string, boolean> };
};
runtime.Cloudflare = { compatibilityFlags: { global_fetch_strictly_public: true } };
