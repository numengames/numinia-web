/**
 * Audit logging — File Over App style.
 *
 * Events are buffered in Redis (when available) or in-memory, then flushed
 * to data/audit/YYYY-MM.json in the GitHub data repo.
 *
 * Redis buffer survives serverless instance recycling. In-memory fallback
 * works for local dev but may lose events on Vercel cold starts.
 *
 * Fire-and-forget — never blocks requests.
 */

import { env } from './env';
import { getRedis } from './redis';

interface AuditEvent {
  action: string;
  actor: string; // wallet address or userId
  target?: string; // asset ID, etc.
  metadata?: Record<string, unknown>;
  timestamp: string;
}

const REDIS_KEY = 'audit:queue';
const FLUSH_THRESHOLD = 10;
const FLUSH_INTERVAL_MS = 30000;

/* ---------- in-memory fallback ---------- */

const memoryQueue: AuditEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/* ---------- public API ---------- */

/**
 * Log an audit event. Non-blocking — adds to queue and returns immediately.
 */
export function logAudit(event: Omit<AuditEvent, 'timestamp'>) {
  const entry: AuditEvent = { ...event, timestamp: new Date().toISOString() };

  const redis = getRedis();
  if (redis) {
    // Push to Redis list — fire-and-forget
    redis.lpush(REDIS_KEY, JSON.stringify(entry)).then(len => {
      if (len >= FLUSH_THRESHOLD) flushAuditQueue();
    }).catch(() => {
      // Redis failed — fall back to memory for this event
      pushToMemory(entry);
    });
  } else {
    pushToMemory(entry);
  }
}

function pushToMemory(entry: AuditEvent) {
  memoryQueue.push(entry);
  if (memoryQueue.length >= FLUSH_THRESHOLD) {
    flushAuditQueue();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flushAuditQueue, FLUSH_INTERVAL_MS);
  }
}

/**
 * Flush the audit queue (Redis + in-memory) to the GitHub data repo.
 */
async function flushAuditQueue() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }

  const events: AuditEvent[] = [];

  // Drain Redis queue
  const redis = getRedis();
  if (redis) {
    try {
      // Pop all items atomically: LRANGE + DEL in pipeline
      const pipeline = redis.pipeline();
      pipeline.lrange(REDIS_KEY, 0, -1);
      pipeline.del(REDIS_KEY);
      const results = await pipeline.exec();
      const items = results[0] as string[];
      if (items && items.length > 0) {
        for (const item of items) {
          try {
            events.push(typeof item === 'string' ? JSON.parse(item) : item as unknown as AuditEvent);
          } catch { /* skip malformed entries */ }
        }
      }
    } catch {
      // Redis unavailable during flush — proceed with memory queue only
    }
  }

  // Drain memory queue
  if (memoryQueue.length > 0) {
    events.push(...memoryQueue.splice(0, memoryQueue.length));
  }

  if (events.length === 0) return;

  // Write to GitHub data repo
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

// Schedule periodic flush (catches events that never hit the threshold)
if (typeof setInterval !== 'undefined') {
  setInterval(flushAuditQueue, FLUSH_INTERVAL_MS);
}
