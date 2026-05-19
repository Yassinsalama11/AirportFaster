import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const SUPPLIER_COOKIE = 'airportfaster_supplier_session';
const SESSION_TTL_SECONDS = 28800;

const LoginSchema = z.object({
  email: z.string().email(),
  pin: z.string().min(1),
});

/**
 * POST /api/supplier/auth/login
 * Proxies supplier login to Fastify API, then sets the supplier session cookie.
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

    const apiResponse = await fetch(`${API_URL}/api/supplier/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });

    const data = (await apiResponse.json()) as {
      success: boolean;
      data?: { supplierId: string; supplierName: string; contactName: string };
      error?: { code: string; message: string };
    };

    if (!apiResponse.ok || !data.success) {
      return NextResponse.json(
        { success: false, error: data.error ?? { code: 'AUTH_ERROR', message: 'Authentication failed' } },
        { status: apiResponse.status },
      );
    }

    // Extract supplier session cookie from API response
    const setCookieHeader = apiResponse.headers.get('set-cookie');
    let sessionToken: string | null = null;

    if (setCookieHeader) {
      const match = setCookieHeader.match(new RegExp(`${SUPPLIER_COOKIE}=([^;]+)`));
      sessionToken = match?.[1] ?? null;
    }

    const response = NextResponse.json({ success: true, data: data.data }, { status: 200 });

    if (sessionToken) {
      response.cookies.set(SUPPLIER_COOKIE, sessionToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_TTL_SECONDS,
      });
    }

    return response;
  } catch (error) {
    console.error('Supplier login proxy error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}
