import { adminApiCall } from '@/lib/admin-api';
import { ApiKeysClient } from './ApiKeysClient';

export const metadata = { title: 'API Keys' };

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  status: string;
  createdAt: string;
}

interface ApiKeysData {
  items: ApiKey[];
}

export default async function ApiKeysPage() {
  const res = await adminApiCall<ApiKeysData>('/api/admin/api-keys');
  const keys = res.success ? (res.data.items ?? []) : [];

  return <ApiKeysClient initialKeys={keys} />;
}
