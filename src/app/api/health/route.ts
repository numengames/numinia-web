import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

type ServiceStatus = 'ok' | 'degraded' | 'error';

interface ServiceCheck {
  status: ServiceStatus;
  latencyMs: number;
  error?: string;
}

async function checkGitHub(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const res = await fetch(
      `https://api.github.com/repos/${env.github.repoOwner}/${env.github.repoName}`,
      {
        headers: {
          Authorization: `Bearer ${env.github.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );
    const latencyMs = Date.now() - start;
    if (res.ok) return { status: 'ok', latencyMs };
    return { status: 'degraded', latencyMs, error: `HTTP ${res.status}` };
  } catch (err) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

async function checkR2(): Promise<ServiceCheck> {
  if (!env.r2.publicUrl) {
    return { status: 'ok', latencyMs: 0, error: 'R2 not configured (optional)' };
  }
  const start = Date.now();
  try {
    const res = await fetch(env.r2.publicUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - start;
    // R2 public URL may return 404 for root but still be reachable
    if (res.status < 500) return { status: 'ok', latencyMs };
    return { status: 'degraded', latencyMs, error: `HTTP ${res.status}` };
  } catch (err) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function GET() {
  const [github, r2] = await Promise.all([checkGitHub(), checkR2()]);

  const services = { github, r2 };

  const overallStatus: ServiceStatus =
    Object.values(services).some((s) => s.status === 'error')
      ? 'error'
      : Object.values(services).some((s) => s.status === 'degraded')
        ? 'degraded'
        : 'ok';

  const statusCode = overallStatus === 'ok' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '0.12.0',
      services,
    },
    { status: statusCode }
  );
}
