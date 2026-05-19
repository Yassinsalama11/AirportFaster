import crypto from 'crypto';
import { prisma } from '@airportfaster/db';
import type { CreateApiKeyBody } from './validators.js';

// ── Key generation ────────────────────────────────────────────────────────────

/**
 * Generate a new API key.
 * Format: ap_live_<32 hex bytes>
 * keyPrefix: first 12 chars (e.g. "ap_live_Ab1c") for display
 */
export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const rawSuffix = crypto.randomBytes(32).toString('hex');
  const rawKey = `ap_live_${rawSuffix}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 16); // "ap_live_XXXXXXXX"
  return { rawKey, keyHash, keyPrefix };
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function listApiKeys() {
  return prisma.apiKey.findMany({
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      supplierId: true,
      scopes: true,
      rateLimit: true,
      status: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findApiKeyById(id: string) {
  return prisma.apiKey.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      supplierId: true,
      scopes: true,
      rateLimit: true,
      status: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });
}

export async function findApiKeyByHash(keyHash: string) {
  return prisma.apiKey.findUnique({
    where: { keyHash },
  });
}

export async function createApiKey(body: CreateApiKeyBody) {
  const { rawKey, keyHash, keyPrefix } = generateApiKey();

  const record = await prisma.apiKey.create({
    data: {
      name: body.name,
      keyHash,
      keyPrefix,
      supplierId: body.supplierId ?? null,
      scopes: body.scopes,
      rateLimit: body.rateLimit,
      status: 'active',
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      supplierId: true,
      scopes: true,
      rateLimit: true,
      status: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return { ...record, key: rawKey };
}

export async function revokeApiKey(id: string) {
  return prisma.apiKey.update({
    where: { id },
    data: { status: 'revoked' },
  });
}

export async function touchApiKeyLastUsed(id: string) {
  await prisma.apiKey.update({
    where: { id },
    data: { lastUsedAt: new Date() },
  }).catch(() => null); // best-effort
}

export async function getApiKeyUsageStats(id: string) {
  const key = await findApiKeyById(id);
  if (!key) return null;

  return {
    keyId: id,
    keyPrefix: key.keyPrefix,
    lastUsedAt: key.lastUsedAt,
    status: key.status,
  };
}
