import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/auth/github/login');

export async function GET() {
  try {
    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.append('client_id', env.github.clientId);
    githubAuthUrl.searchParams.append('redirect_uri', env.github.redirectUri);
    githubAuthUrl.searchParams.append('scope', 'user:email');
    
    // Redirect to GitHub login page
    return NextResponse.redirect(githubAuthUrl.toString());
  } catch (error) {
    log.error({ err: error }, 'GitHub login error');
    return NextResponse.redirect(new URL('/login?error=auth_error', env.github.redirectUri));
  }
} 