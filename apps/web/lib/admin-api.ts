import { cookies } from 'next/headers';
import { apiCall } from './api-client';
import type { ApiResponse } from './api-client';

const COOKIE_NAME = 'airportfaster_session';

/**
 * Server-component API helper that automatically forwards the session cookie.
 */
export async function adminApiCall<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore['get'](COOKIE_NAME)?.value;
  const callOptions: RequestInit & { sessionToken?: string } = { ...options };
  if (sessionToken) callOptions.sessionToken = sessionToken;
  return apiCall<T>(path, callOptions);
}
