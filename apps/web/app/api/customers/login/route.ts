import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const CUSTOMER_COOKIE = 'airportfaster_customer_session';
const SESSION_TTL_SECONDS = 604800;

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/customers/login
 * Proxies customer login to Fastify API.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as unknown;
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request' } },
        { status: 400 },
      );
    }

    const apiResponse = await fetch(`${API_URL}/api/public/customers/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });

    const data = (await apiResponse.json()) as {
      success: boolean;
      data?: { customerId: string; firstName: string | null; lastName: string | null; email: string };
      error?: { code: string; message: string };
    };

    if (!apiResponse.ok || !data.success) {
      return NextResponse.json(
        { success: false, error: data.error ?? { code: 'AUTH_ERROR', message: 'Login failed' } },
        { status: apiResponse.status },
      );
    }

    const setCookieHeader = apiResponse.headers.get('set-cookie');
    let sessionToken: string | null = null;

    if (setCookieHeader) {
      const match = setCookieHeader.match(new RegExp(`${CUSTOMER_COOKIE}=([^;]+)`));
      sessionToken = match?.[1] ?? null;
    }

    const response = NextResponse.json({ success: true, data: data.data }, { status: 200 });

    if (sessionToken) {
      response.cookies.set(CUSTOMER_COOKIE, sessionToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_TTL_SECONDS,
      });
    }

    return response;
  } catch (error) {
    console.error('Customer login proxy error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}
