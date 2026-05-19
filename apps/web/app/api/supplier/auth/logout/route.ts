import { NextResponse } from 'next/server';

const SUPPLIER_COOKIE = 'airportfaster_supplier_session';

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true }, { status: 200 });
  response.cookies.delete(SUPPLIER_COOKIE);
  return response;
}
