// T-053: Fetch internal links for a given entity, used in page rendering.

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export interface InternalLinkPage {
  id: string;
  type: string;
  slug: string;
  airportId?: string | null;
  serviceId?: string | null;
}

export interface InternalLink {
  id: string;
  anchorText: string;
  locale: string;
  createdAt: string;
  fromPage: InternalLinkPage;
  toPage: InternalLinkPage;
}

export async function getInternalLinksForEntity(
  entityType: 'airport' | 'service',
  entityId: string,
): Promise<InternalLink[]> {
  try {
    const params = new URLSearchParams({ entityType, entityId, limit: '10' });
    const res = await fetch(`${API_BASE}/api/admin/internal-links?${params.toString()}`, {
      next: { revalidate: 3600, tags: ['internal-links'] },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      success: boolean;
      data: { links: InternalLink[] };
    };
    return data.success ? data.data.links : [];
  } catch {
    return [];
  }
}
