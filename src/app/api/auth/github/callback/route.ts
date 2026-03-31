import { NextRequest, NextResponse } from 'next/server';
import { getUsers, saveUsers } from '@/lib/github-storage';
import { v4 as uuidv4 } from 'uuid';
import { GithubUser } from '@/types/github-storage';
import { cookies } from 'next/headers';
import { signSession, generateCsrfToken } from '@/lib/session';
import { env } from '@/lib/env';

// These export configurations tell Next.js that this is a dynamic route
// and should not be statically generated
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

/**
 * This route handles the OAuth callback from GitHub
 * After GitHub redirects back to our app with a code, we exchange it for an access token
 * Then we fetch the user info and create/update the user in our GitHub storage
 */
export async function GET(request: NextRequest) {
  try {
    // Extract the code and state from the URL
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=no_code', request.url));
    }

    // Validate CSRF state against the httpOnly cookie set at OAuth initiation
    const oauthStateCookie = request.cookies.get('oauth_state');
    if (!oauthStateCookie || !stateParam) {
      return NextResponse.redirect(new URL('/login?error=invalid_state', request.url));
    }
    let oauthState: { csrf: string; redirectTo: string };
    try {
      oauthState = JSON.parse(oauthStateCookie.value);
    } catch {
      return NextResponse.redirect(new URL('/login?error=invalid_state', request.url));
    }
    if (oauthState.csrf !== stateParam) {
      return NextResponse.redirect(new URL('/login?error=csrf_mismatch', request.url));
    }
    
    // Exchange the code for an access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: env.github.clientId,
        client_secret: env.github.clientSecret,
        code,
        redirect_uri: env.github.redirectUri
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok || tokenData.error) {
      console.error('Error getting token:', tokenData);
      return NextResponse.redirect(new URL('/login?error=token_error', request.url));
    }
    
    const accessToken = tokenData.access_token;
    
    // Use the access token to get the user's GitHub profile
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    const userData = await userResponse.json();
    
    if (!userResponse.ok) {
      console.error('Error getting user:', userData);
      return NextResponse.redirect(new URL('/login?error=user_error', request.url));
    }
    
    // Get user email
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    const emailData = await emailResponse.json();
    
    if (!emailResponse.ok) {
      console.error('Error getting emails:', emailData);
      return NextResponse.redirect(new URL('/login?error=email_error', request.url));
    }
    
    // Find the primary email
    interface GitHubEmail { primary: boolean; verified: boolean; email: string; }
    const primaryEmail = (emailData as GitHubEmail[]).find((email) => email.primary)?.email || emailData[0]?.email;
    
    if (!primaryEmail) {
      return NextResponse.redirect(new URL('/login?error=no_email', request.url));
    }
    
    // Check if the user already exists in our database
    const users = await getUsers();
    // Try to find the user by email or username
    let user = users.find((u: GithubUser) => u.email?.toLowerCase() === primaryEmail?.toLowerCase() || 
                            u.username?.toLowerCase() === userData.login?.toLowerCase());

    if (!user) {
      // Create a new user
      user = {
        id: uuidv4(),
        username: userData.login,
        email: primaryEmail,
        passwordHash: '', // Not used with OAuth
        role: 'user', // Default role
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add the new user to our database
      users.push(user);
      await saveUsers(users);
    } else {
      // Update the user's last login time
      user.updatedAt = new Date().toISOString();

      // Capture id before the findIndex callback to preserve TypeScript's type narrowing
      const userId = user.id;
      const userIndex = users.findIndex((u: GithubUser) => u.id === userId);
      if (userIndex !== -1) {
        users[userIndex] = user;
        await saveUsers(users);
      }
    }
    
        // Set session cookie and clear the oauth_state CSRF cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'session',
      value: signSession({
        userId: user.id,
        username: user.username,
        role: user.role || 'creator',
      }),
      httpOnly: true,
      secure: env.isProd,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    cookieStore.set({
      name: 'csrf_token',
      value: generateCsrfToken(),
      httpOnly: false,
      secure: env.isProd,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    cookieStore.delete('oauth_state');

    // Redirect — only allow relative paths (prevent open redirect)
    let redirectTo = oauthState.redirectTo || '/';
    if (redirectTo.startsWith('http') || redirectTo.startsWith('//')) redirectTo = '/';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/login?error=unknown', request.url));
  }
} 
