import type { FastifyInstance } from 'fastify';
import { Readable } from 'stream';
import { requirePermission } from '../../lib/rbac.js';
import { getStorageAdapter, generateUploadKey } from '../../lib/storage.js';
import { z } from 'zod';

const PresignQuerySchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100).default('application/octet-stream'),
});

export async function uploadRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/admin/uploads/presign?filename=&mimeType=
  fastify.get(
    '/presign',
    { preHandler: requirePermission('airports.write') },
    async (request, reply) => {
      const parseResult = PresignQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: parseResult.error.flatten(),
          },
        });
      }

      const adapter = getStorageAdapter();
      const key = generateUploadKey(parseResult.data.filename);
      const result = await adapter.getPresignUrl(key, parseResult.data.mimeType);

      return reply.status(200).send({
        success: true,
        data: result,
      });
    },
  );

  // POST /api/admin/uploads (multipart/form-data)
  fastify.post(
    '/',
    { preHandler: requirePermission('airports.write') },
    async (request, reply) => {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'No file provided' },
        });
      }

      const adapter = getStorageAdapter();
      const url = await adapter.upload(
        data.filename,
        data.file as unknown as Readable,
        data.mimetype,
      );

      return reply.status(201).send({
        success: true,
        data: { url, filename: data.filename },
      });
    },
  );
}
