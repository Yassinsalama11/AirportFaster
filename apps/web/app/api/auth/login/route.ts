import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const COOKIE_NAME = 'airportfaster_session';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/auth/login
 * Proxies login to Fastify API, then sets the session cookie from the response.
 * This avoids cross-origin cookie issues when web:3000 talks to api:3001.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as unknown;
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid request' },
        },
        { status: 400 },
      );
    }

    // Forward to Fastify API
    const apiResponse = await fetch(`${API_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });

    const data = (await apiResponse.json()) as {
      success: boolean;
      data?: { user: unknown; expiresAt: string };
      error?: { code: string; message: string };
    };

    if (!apiResponse.ok || !data.success) {
      return NextResponse.json(
        {
          success: false,
          error: data.error ?? { code: 'AUTH_ERROR', message: 'Authentication failed' },
        },
        { status: apiResponse.status },
      );
    }

    // Extract the session token from the API's Set-Cookie header
    const setCookieHeader = apiResponse.headers.get('set-cookie');
    let sessionToken: string | null = null;

    if (setCookieHeader) {
      const match = setCookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
      sessionToken = match?.[1] ?? null;
    }

    const response = NextResponse.json(
      { success: true, data: data.data },
      { status: 200 },
    );

    if (sessionToken && data.data?.expiresAt) {
      response.cookies.set(COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        path: '/',
        expires: new Date(data.data.expiresAt),
      });
    }

    return response;
  } catch (error) {
    console.error('Login proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An error occurred' },
      },
      { status: 500 },
    );
  }
}
