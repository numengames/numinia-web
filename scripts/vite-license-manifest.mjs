// DEBT-001 metafile (LEGAL_DEBT.md): minifiers strip license comments, so a
// string scan of dist/ has false negatives. This plugin records the REAL
// module list of every bundle into dist/.license-modules.json, which
// scripts/license-guard.mjs audits — module paths, not strings.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const MANIFEST = join(process.cwd(), 'dist', '.license-modules.json');

export function licenseManifest() {
  return {
    name: 'license-module-manifest',
    generateBundle(options, bundle) {
      const modules = new Set();
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        for (const rawId of Object.keys(chunk.modules)) {
          const id = rawId.split('?')[0];
          // Only third-party code matters here; virtual and first-party
          // modules are covered by the repo's own licensing (REUSE.toml).
          if (id.includes('node_modules')) modules.add(id);
        }
      }
      if (modules.size === 0 && !options.dir) return;
      const bucket = relative(process.cwd(), options.dir ?? 'dist') || 'dist';
      let manifest = {};
      try {
        manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
      } catch {
        /* first build of the run — start fresh */
      }
      manifest[bucket] = [...new Set([...(manifest[bucket] ?? []), ...modules])].sort();
      mkdirSync(dirname(MANIFEST), { recursive: true });
      writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
    },
  };
}
