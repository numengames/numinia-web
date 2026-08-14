// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import react from '@astrojs/react';
import node from '@astrojs/node';
import { parseEnv } from '@numinia/domain';

// Fail closed AT BOOT: a missing required variable kills dev/build here,
// before any server binds (MISSION-000 env-validation scenario).
const rawEnv = { ...loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), ''), ...process.env };
export const env = parseEnv(rawEnv);

export default defineConfig({
  site: env.publicSiteUrl,
  output: 'static',
  // Node adapter serves the on-demand SIWE endpoint locally (no cloud deploy yet).
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  i18n: {
    locales: ['es', 'en', 'ja', 'ko', 'pt-br'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
