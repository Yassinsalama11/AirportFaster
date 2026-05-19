import { cookies } from 'next/headers';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const COOKIE_NAME = 'airportfaster_session';

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  permissions: string[];
}

/**
 * Get the current session user from the server-side cookie.
 * Used in Server Components and Route Handlers.
 * Returns null if not authenticated or session is invalid.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore['get'](COOKIE_NAME)?.value;

  if (!sessionToken) return null;

  try {
    const response = await fetch(`${API_URL}/api/admin/auth/me`, {
      headers: {
        Cookie: `${COOKIE_NAME}=${sessionToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      success: boolean;
      data: { user: SessionUser };
    };
    if (!data.success) return null;

    return data.data.user;
  } catch {
    return null;
  }
}

/**
 * Get the session token from cookies (for forwarding to API calls).
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore['get'](COOKIE_NAME)?.value ?? null;
}
