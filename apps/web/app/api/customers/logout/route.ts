import { NextResponse } from 'next/server';

const CUSTOMER_COOKIE = 'airportfaster_customer_session';

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true }, { status: 200 });
  response.cookies.delete(CUSTOMER_COOKIE);
  return response;
}
