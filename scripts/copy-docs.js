/**
 * Copy docs/ folder into .next/standalone/docs/ for Vercel standalone builds.
 * Without this, the docs markdown files aren't available at runtime.
 *
 * Run after `next build`:
 *   "build": "next build && node scripts/copy-docs.js"
 */

const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'docs');
const dest = path.join(__dirname, '..', '.next', 'standalone', 'docs');

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    console.log(`[copy-docs] Source not found: ${srcDir} — skipping`);
    return;
  }

  fs.mkdirSync(destDir, { recursive: true });

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Only copy if .next/standalone exists (Vercel standalone output)
const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');
if (fs.existsSync(standaloneDir)) {
  copyDir(src, dest);
  console.log('[copy-docs] Copied docs/ to .next/standalone/docs/');
} else {
  console.log('[copy-docs] No standalone build found — skipping (dev mode)');
}
