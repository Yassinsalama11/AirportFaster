import { createWriteStream, existsSync, mkdirSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const LOCAL_UPLOAD_DIR = '/tmp/airportfaster-uploads';
const LOCAL_UPLOAD_URL_BASE =
  process.env['API_LOCAL_UPLOAD_URL'] ?? 'http://localhost:3001/uploads';

export interface StorageAdapter {
  upload(filename: string, stream: Readable, mimeType: string): Promise<string>;
  getPresignUrl(key: string, mimeType: string): Promise<{ url: string; key: string }>;
}

// ── Local disk adapter ────────────────────────────────────────────────────────

class LocalDiskAdapter implements StorageAdapter {
  constructor(private readonly uploadDir: string, private readonly urlBase: string) {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(filename: string, stream: Readable, _mimeType: string): Promise<string> {
    const safeFilename = sanitizeFilename(filename);
    const dest = path.join(this.uploadDir, safeFilename);
    const writer = createWriteStream(dest);
    await pipeline(stream, writer);
    return `${this.urlBase}/${safeFilename}`;
  }

  async getPresignUrl(key: string, _mimeType: string): Promise<{ url: string; key: string }> {
    // For local dev, just return the upload URL (client should POST to /api/admin/uploads)
    return { url: `${this.urlBase}/${key}`, key };
  }
}

// ── S3 adapter ────────────────────────────────────────────────────────────────

class S3Adapter implements StorageAdapter {
  private readonly bucket: string;
  private readonly region: string;
  private readonly cdnBase: string;

  constructor(bucket: string, region: string, cdnBase: string) {
    this.bucket = bucket;
    this.region = region;
    this.cdnBase = cdnBase;
  }

  async upload(filename: string, stream: Readable, mimeType: string): Promise<string> {
    // Dynamic import to avoid requiring AWS SDK unless S3 is actually configured
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s3Module = await import('@aws-sdk/client-s3' as any);
    const { S3Client, PutObjectCommand } = s3Module as {
      S3Client: new (opts: { region: string }) => { send: (cmd: unknown) => Promise<void> };
      PutObjectCommand: new (opts: { Bucket: string; Key: string; Body: Buffer; ContentType: string }) => unknown;
    };
    const client = new S3Client({ region: this.region });
    const safeFilename = sanitizeFilename(filename);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    }
    const body = Buffer.concat(chunks);
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: safeFilename,
        Body: body,
        ContentType: mimeType,
      }),
    );
    return `${this.cdnBase}/${safeFilename}`;
  }

  async getPresignUrl(key: string, mimeType: string): Promise<{ url: string; key: string }> {
    // Dynamic import to avoid requiring AWS SDK unless S3 is actually configured
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s3Module = await import('@aws-sdk/client-s3' as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const presignerModule = await import('@aws-sdk/s3-request-presigner' as any);
    const { S3Client, PutObjectCommand } = s3Module as {
      S3Client: new (opts: { region: string }) => unknown;
      PutObjectCommand: new (opts: { Bucket: string; Key: string; ContentType: string }) => unknown;
    };
    const { getSignedUrl } = presignerModule as {
      getSignedUrl: (client: unknown, cmd: unknown, opts: { expiresIn: number }) => Promise<string>;
    };
    const client = new S3Client({ region: this.region });
    const safeKey = sanitizeFilename(key);
    const url = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: safeKey,
        ContentType: mimeType,
      }),
      { expiresIn: 3600 },
    );
    return { url, key: safeKey };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename).replace(/[^a-z0-9.]/gi, '');
  const base = path
    .basename(filename, path.extname(filename))
    .replace(/[^a-z0-9-_]/gi, '-')
    .slice(0, 64);
  const unique = crypto.randomBytes(8).toString('hex');
  return `${Date.now()}-${unique}-${base}${ext}`;
}

export function generateUploadKey(originalFilename: string): string {
  return sanitizeFilename(originalFilename);
}

// ── Factory ───────────────────────────────────────────────────────────────────

let _adapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (_adapter) return _adapter;

  const bucket = process.env['AWS_S3_BUCKET'];
  const region = process.env['AWS_REGION'];
  const cdnBase = process.env['AWS_CDN_BASE'];

  if (bucket && region) {
    _adapter = new S3Adapter(bucket, region, cdnBase ?? `https://${bucket}.s3.${region}.amazonaws.com`);
  } else {
    _adapter = new LocalDiskAdapter(LOCAL_UPLOAD_DIR, LOCAL_UPLOAD_URL_BASE);
  }

  return _adapter;
}

export { LOCAL_UPLOAD_DIR };
