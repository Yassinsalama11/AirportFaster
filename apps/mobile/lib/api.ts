const BASE = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001'

export async function searchAirports(q: string, service?: string): Promise<unknown> {
  const params = new URLSearchParams({ q })
  if (service) params.set('service', service)
  const res = await fetch(`${BASE}/api/public/search?${params}`)
  return res.json()
}

export async function getAirport(slug: string): Promise<unknown> {
  const res = await fetch(`${BASE}/api/public/airports/${slug}`)
  return res.json()
}
