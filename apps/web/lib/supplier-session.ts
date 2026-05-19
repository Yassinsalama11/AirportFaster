import { cookies } from 'next/headers';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const SUPPLIER_COOKIE = 'airportfaster_supplier_session';

export interface SupplierSessionData {
  supplierId: string;
  supplierName: string;
  status: string;
  rating: unknown;
  email: string;
}

/**
 * Get the current supplier session from the server-side cookie.
 * Returns null if not authenticated or session is invalid.
 */
export async function getSupplierSession(): Promise<SupplierSessionData | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore['get'](SUPPLIER_COOKIE)?.value;

  if (!sessionToken) return null;

  try {
    const response = await fetch(`${API_URL}/api/supplier/auth/me`, {
      headers: {
        Cookie: `${SUPPLIER_COOKIE}=${sessionToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      success: boolean;
      data?: {
        supplier: { id: string; name: string; status: string; rating: unknown };
        email: string;
      };
    };

    if (!data.success || !data.data) return null;

    return {
      supplierId: data.data.supplier.id,
      supplierName: data.data.supplier.name,
      status: data.data.supplier.status,
      rating: data.data.supplier.rating,
      email: data.data.email,
    };
  } catch {
    return null;
  }
}
