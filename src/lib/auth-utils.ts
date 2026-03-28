import { cookies } from 'next/headers';

/**
 * User session information from the cookie
 */
export interface UserSession {
  userId: string;
  username: string;
  email: string;
  role: string;
}

/**
 * Get the current user's session from the cookie
 * @returns The user session or null if not logged in
 */
export async function getUserSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  
  if (!sessionCookie) {
    return null;
  }
  
  try {
    const session = JSON.parse(sessionCookie.value);
    return session as UserSession;
  } catch (error) {
    console.error('Failed to parse session cookie:', error);
    return null;
  }
}

/**
 * Check if the current user is authenticated
 * @returns True if the user is logged in, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getUserSession();
  return session !== null;
}

/**
 * Check if the current user has a specific role
 * @param role The role to check for
 * @returns True if the user has the role, false otherwise
 */
export async function hasRole(role: string): Promise<boolean> {
  const session = await getUserSession();
  return session !== null && session.role === role;
}

/**
 * Check if the current user is an admin
 * @returns True if the user is an admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole('admin');
}

/**
 * Get the current user's ID
 * @returns The user ID or null if not logged in
 */
export async function getUserId(): Promise<string | null> {
  const session = await getUserSession();
  return session ? session.userId : null;
}

/**
 * Logout the current user
 * Server action to log out by removing the session cookie
 */
export async function logout() {
  'use server';
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export default {
  getUserSession,
  isAuthenticated,
  hasRole,
  isAdmin,
  getUserId,
  logout
};
