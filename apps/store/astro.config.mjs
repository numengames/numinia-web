// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import react from '@astrojs/react';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import { parseEnv } from '@numinia/domain';

// Fail closed AT BOOT: a missing required variable kills dev/build here,
// before any server binds (MISSION-000 env-validation scenario).
// .env values are hoisted into process.env so that application modules
// (src/lib/env.ts) see the exact same environment during build and runtime.
const fileEnv = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');
for (const [key, value] of Object.entries(fileEnv)) {
  if (process.env[key] === undefined) process.env[key] = value;
}
const env = parseEnv(process.env);

export default defineConfig({
  site: env.publicSiteUrl,
  output: 'static',
  // Node adapter serves the on-demand SIWE endpoint locally (no cloud deploy yet).
  adapter: node({ mode: 'standalone' }),
  integrations: [
    react(),
    sitemap({
      // Internal pages stay out of the index (robots.txt disallows them too).
      filter: (page) => !page.includes('/spike/'),
    }),
  ],
  markdown: {
    // Light syntax theme: the default dark theme fails WCAG contrast on our
    // light surface background (caught by the axe gate on /docs/developers/).
    shikiConfig: { theme: 'github-light' },
  },
  i18n: {
    locales: ['es', 'en', 'ja', 'ko', 'pt-br'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
