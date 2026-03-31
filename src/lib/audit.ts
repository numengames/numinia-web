/**
 * Audit logging — File Over App style.
 * Events are queued in-memory and flushed to data/audit/YYYY-MM.json
 * in the GitHub data repo. Fire-and-forget (never blocks requests).
 */

import { env } from './env';

interface AuditEvent {
  action: string;
  actor: string; // wallet address or userId
  target?: string; // asset ID, etc.
  metadata?: Record<string, unknown>;
  timestamp: string;
}

const queue: AuditEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Log an audit event. Non-blocking — adds to queue and returns immediately.
 */
export function logAudit(event: Omit<AuditEvent, 'timestamp'>) {
  queue.push({ ...event, timestamp: new Date().toISOString() });

  // Flush after 10 events or 30 seconds, whichever comes first
  if (queue.length >= 10) {
    flushAuditQueue();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flushAuditQueue, 30000);
  }
}

/**
 * Flush the audit queue to the data repo.
 */
async function flushAuditQueue() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  if (queue.length === 0) return;

  const events = queue.splice(0, queue.length);
  const token = env.github.token;
  const owner = env.github.repoOwner;
  const repo = env.github.repoName;

  if (!token || !owner || !repo) return;

  const now = new Date();
  const path = `data/audit/${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}.json`;

  try {
    // Read existing file
    let existing: AuditEvent[] = [];
    let sha: string | undefined;

    const getRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
    );

    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
      existing = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
    }

    // Append new events
    const merged = [...existing, ...events];
    const content = Buffer.from(JSON.stringify(merged, null, 2)).toString('base64');

    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `audit: ${events.length} events`,
          content,
          ...(sha ? { sha } : {}),
          branch: env.github.branch,
        }),
      }
    );
  } catch {
    // Fire-and-forget — don't break the app if audit fails
  }
}
