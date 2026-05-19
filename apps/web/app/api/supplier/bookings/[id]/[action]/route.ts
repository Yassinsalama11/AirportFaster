import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const SUPPLIER_COOKIE = 'airportfaster_supplier_session';

/**
 * PATCH /api/supplier/bookings/[id]/[action]
 * Proxies supplier booking actions (confirm, start, complete) to Fastify API.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
): Promise<NextResponse> {
  const { id, action } = await params;

  const allowedActions = ['confirm', 'start', 'complete'];
  if (!allowedActions.includes(action)) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ACTION', message: 'Invalid action' } },
      { status: 400 },
    );
  }

  const supplierToken = request.cookies.get(SUPPLIER_COOKIE)?.value;
  if (!supplierToken) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 },
    );
  }

  try {
    const apiResponse = await fetch(`${API_URL}/api/supplier/bookings/${id}/${action}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SUPPLIER_COOKIE}=${supplierToken}`,
      },
    });

    const data = (await apiResponse.json()) as {
      success: boolean;
      data?: unknown;
      error?: { code: string; message: string };
    };

    return NextResponse.json(data, { status: apiResponse.status });
  } catch (error) {
    console.error('Supplier booking action proxy error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 },
    );
  }
}
