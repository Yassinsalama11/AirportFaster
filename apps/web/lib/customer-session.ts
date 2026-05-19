import { cookies } from 'next/headers';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const CUSTOMER_COOKIE = 'airportfaster_customer_session';

export interface CustomerSessionData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  phone: string | null;
  locale: string | null;
  isVip: boolean;
  createdAt: string;
  _count: { bookings: number };
}

/**
 * Get the current customer session from the server-side cookie.
 * Returns null if not authenticated or session is invalid.
 */
export async function getCustomerSession(): Promise<CustomerSessionData | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore['get'](CUSTOMER_COOKIE)?.value;

  if (!sessionToken) return null;

  try {
    const response = await fetch(`${API_URL}/api/public/customers/me`, {
      headers: {
        Cookie: `${CUSTOMER_COOKIE}=${sessionToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      success: boolean;
      data?: { customer: CustomerSessionData };
    };

    if (!data.success || !data.data) return null;

    return data.data.customer;
  } catch {
    return null;
  }
}

/**
 * Get the customer session token (for forwarding to API calls).
 */
export async function getCustomerSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore['get'](CUSTOMER_COOKIE)?.value ?? null;
}
