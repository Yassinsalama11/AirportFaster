import { cookies } from 'next/headers';
import type { ApiResponse } from './api-client';

const CUSTOMER_COOKIE = 'airportfaster_customer_session';
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

/**
 * Server-component API helper that automatically forwards the customer session cookie.
 */
export async function customerFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore['get'](CUSTOMER_COOKIE)?.value;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (sessionToken) {
    headers['Cookie'] = `${CUSTOMER_COOKIE}=${sessionToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  return response.json() as Promise<ApiResponse<T>>;
}
