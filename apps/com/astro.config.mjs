// @ts-check
import { defineConfig } from 'astro/config';
import { licenseManifest } from '../../scripts/vite-license-manifest.mjs';

export default defineConfig({
  output: 'static',
  vite: { plugins: [licenseManifest()] },
  i18n: {
    locales: ['es', 'en', 'ja', 'ko', 'pt-br'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
