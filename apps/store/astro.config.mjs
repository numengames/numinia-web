// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import react from '@astrojs/react';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import { parseEnv } from '@numinia/domain';
import { satteri } from '@astrojs/markdown-satteri';

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
  // Node adapter serves the on-demand SIWE endpoint locally (no cloud deploy yet).
  adapter: node({ mode: 'standalone' }),
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
