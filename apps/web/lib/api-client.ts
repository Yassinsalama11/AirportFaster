const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * Make an authenticated API call, forwarding the session cookie.
 */
export async function apiCall<T>(
  path: string,
  options: RequestInit & { sessionToken?: string } = {},
): Promise<ApiResponse<T>> {
  const { sessionToken, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (sessionToken) {
    (headers as Record<string, string>)['Cookie'] = `airportfaster_session=${sessionToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  return response.json() as Promise<ApiResponse<T>>;
}

export { API_URL };
