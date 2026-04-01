/**
 * Structured JSON logger using Pino.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info({ assetId, action: 'upload' }, 'Asset uploaded');
 *   logger.error({ err, route: '/api/assets' }, 'Failed to fetch assets');
 *
 * In development: human-readable output via pino-pretty (if installed).
 * In production: JSON lines for log aggregation (Vercel, Datadog, etc.).
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
    : {}),
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: { service: 'numinia-digital-goods' },
});

/**
 * Create a child logger scoped to a specific module/route.
 *
 * Usage:
 *   const log = createLogger('api/assets');
 *   log.info({ id }, 'Asset created');
 */
export function createLogger(module: string) {
  return logger.child({ module });
}
