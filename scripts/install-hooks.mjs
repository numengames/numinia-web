/**
 * Point git at the versioned hooks directory. Runs via the `prepare` script,
 * so every `npm ci` re-arms the guardrails — no husky dependency needed.
 * Silently skips when not inside a git work tree (e.g. tarball installs).
 */
import { execFileSync } from 'node:child_process';

try {
  execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { stdio: 'ignore' });
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' });
} catch {
  // Not a git checkout — nothing to arm.
}
