// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import react from '@astrojs/react';
import node from '@astrojs/node';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import { parseEnv } from '@numinia/domain';
import { satteri } from '@astrojs/markdown-satteri';
import { licenseManifest } from '../../scripts/vite-license-manifest.mjs';

// Fail closed AT BOOT: a missing required variable kills dev/build here,
// before any server binds (MISSION-000 env-validation scenario).
// .env values are hoisted into process.env so that application modules
// (src/lib/env.ts) see the exact same environment during build and runtime.
const fileEnv = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');
for (const [key, value] of Object.entries(fileEnv)) {
  if (process.env[key] === undefined) process.env[key] = value;
}
const env = parseEnv(process.env);

/**
 * The Cloudflare prerender runs inside a Worker that does NOT inherit
 * process.env, so the PUBLIC build configuration is injected statically.
 * Only non-secret keys are listed here — a secret in `define` would be
 * compiled into the bundle, which is exactly what must never happen.
 */
const PUBLIC_BUILD_KEYS = [
  'GITHUB_REPO_OWNER',
  'GITHUB_REPO_NAME',
  'GITHUB_BRANCH',
  'PUBLIC_SITE_URL',
  'DATA_SOURCE',
];
const publicDefines = Object.fromEntries(
  PUBLIC_BUILD_KEYS.filter((key) => process.env[key] !== undefined).map((key) => [
    `process.env.${key}`,
    JSON.stringify(process.env[key]),
  ]),
);

/**
 * Sätteri hast plugin: external links in markdown content open in a new tab
 * (UX rule: leaving numinia always opens a new tab).
 */
const externalLinksNewTab = {
  name: 'external-links-new-tab',
  element: {
    filter: ['a'],
    visit(node) {
      const href = String(node.properties?.href ?? '');
      if (!/^https?:\/\//i.test(href)) return;
      return {
        ...node,
        properties: { ...node.properties, target: '_blank', rel: 'noopener noreferrer' },
      };
    },
  },
};

export default defineConfig({
  site: env.publicSiteUrl,
  output: 'static',
  vite: { define: publicDefines, plugins: [licenseManifest()] },
  /**
   * Astro sessions off: we never use them (our session is our own signed
   * cookie), and leaving them on makes the Cloudflare adapter demand a KV
   * namespace the deploy would have to create for nothing.
   */
  session: false,
  /**
   * Adapter by target. Locally (and in CI/e2e) the Node adapter serves the
   * on-demand auth endpoints; the numinia.com deploy runs on Cloudflare
   * Workers, where @numinia/auth works unchanged because it was written
   * WinterCG-pure (Web Crypto only) from the start.
   *   DEPLOY_TARGET=cloudflare npm run build   → Workers bundle
   *   npm run build                            → Node bundle (default)
   */
  adapter:
    process.env.DEPLOY_TARGET === 'cloudflare'
      ? cloudflare({ imageService: 'passthrough' })
      : node({ mode: 'standalone' }),
  integrations: [
    react(),
    sitemap({
      // Internal pages stay out of the index (robots.txt disallows them too).
      // Internal pages and redirect stubs stay out of the index.
      filter: (page) =>
        !page.includes('/spike/') && !/\/city\/(inhabitants|districts|the-game)\//.test(page),
    }),
  ],
  markdown: {
    // Light syntax theme: the default dark theme fails WCAG contrast on our
    // light surface background (caught by the axe gate on /docs/developers/).
    shikiConfig: { theme: 'github-light' },
    processor: satteri({ hastPlugins: [externalLinksNewTab] }),
  },
  i18n: {
    locales: ['es', 'en', 'ja', 'ko', 'pt-br'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
