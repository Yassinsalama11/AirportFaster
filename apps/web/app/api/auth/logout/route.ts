import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const COOKIE_NAME = 'airportfaster_session';

/**
 * POST /api/auth/logout
 * Proxies logout to Fastify API, then clears the session cookie.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const sessionToken = request.cookies.get(COOKIE_NAME)?.value;

  if (sessionToken) {
    // Forward logout to API to invalidate server-side session
    await fetch(`${API_URL}/api/admin/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: `${COOKIE_NAME}=${sessionToken}`,
      },
    }).catch(() => null); // Don't fail if API call fails
  }

  const response = NextResponse.json({ success: true }, { status: 200 });

  // Clear the cookie
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });

  return response;
}
