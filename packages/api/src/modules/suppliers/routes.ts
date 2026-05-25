import type { FastifyInstance, FastifyReply } from 'fastify';
import { requirePermission } from '../../lib/rbac.js';
import { writeAuditLog } from '../../lib/audit.js';
import {
  CreateSupplierBodySchema,
  UpdateSupplierBodySchema,
  ListSuppliersQuerySchema,
  SupplierIdParamsSchema,
  SupplierContactIdParamsSchema,
  SupplierAirportParamsSchema,
  SupplierServiceParamsSchema,
  SupplierCoverageParamsSchema,
  CreateContactBodySchema,
  LinkAirportBodySchema,
  LinkServiceBodySchema,
  AddCoverageBodySchema,
  PutSupplierAvailabilityBodySchema,
} from './validators.js';
import {
  SupplierError,
  listSuppliersService,
  getSupplierService,
  createSupplierService,
  updateSupplierService,
  deleteSupplierService,
  addContactService,
  removeContactService,
  linkAirportService,
  unlinkAirportService,
  linkServiceService,
  unlinkServiceService,
  addCoverageService,
  removeCoverageService,
  getSupplierAvailabilityService,
  updateSupplierAvailabilityService,
} from './service.js';

function sendSupplierError(reply: FastifyReply, error: SupplierError) {
  return reply.status(error.statusCode).send({
    success: false,
    error: { code: error.code, message: error.message },
  });
}

function getAuditCtx(request: {
  session: { userId: string } | null;
  ip: string;
  headers: { 'user-agent'?: string | undefined };
}) {
  return {
    userId: request.session?.userId,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  };
}

export async function supplierRoutes(fastify: FastifyInstance): Promise<void> {
  // GET / — list suppliers
  fastify.get(
    '/',
    { preHandler: requirePermission('suppliers.read') },
    async (request, reply) => {
      const parseResult = ListSuppliersQuerySchema.safeParse(request.query);
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
      const result = await listSuppliersService(parseResult.data);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // GET /:id — full detail
  fastify.get(
    '/:id',
    { preHandler: requirePermission('suppliers.read') },
    async (request, reply) => {
      const paramsResult = SupplierIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid supplier id' },
        });
      }
      try {
        const supplier = await getSupplierService(paramsResult.data.id);
        return reply.status(200).send({ success: true, data: { supplier } });
      } catch (error) {
        if (error instanceof SupplierError) return sendSupplierError(reply, error);
        throw error;
      }
    },
  );

  // POST / — create supplier
  fastify.post(
    '/',
    { preHandler: requirePermission('suppliers.write') },
    async (request, reply) => {
      const parseResult = CreateSupplierBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parseResult.error.flatten(),
          },
        });
      }
      try {
        const supplier = await createSupplierService(parseResult.data);
        await writeAuditLog({
          ...getAuditCtx(request),
          action: 'suppliers.create',
          entityType: 'supplier',
          entityId: supplier.id,
          metadata: { name: supplier.name },
        });
        return reply.status(201).send({ success: true, data: { supplier } });
      } catch (error) {
        if (error instanceof SupplierError) return sendSupplierError(reply, error);
        throw error;
      }
    },
  );

  // PATCH /:id — update basic fields
  fastify.patch(
    '/:id',
    { preHandler: requirePermission('suppliers.write') },
    async (request, reply) => {
      const paramsResult = SupplierIdParamsSchema.safeParse(request.params);
      const bodyResult = UpdateSupplierBodySchema.safeParse(request.body);
      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid update request' },
        });
      }
      try {
        const supplier = await updateSupplierService(paramsResult.data.id, bodyResult.data);
        await writeAuditLog({
          ...getAuditCtx(request),
          action: 'suppliers.update',
          entityType: 'supplier',
          entityId: supplier.id,
          metadata: { changedFields: Object.keys(bodyResult.data) },
        });
        return reply.status(200).send({ success: true, data: { supplier } });
      } catch (error) {
        if (error instanceof SupplierError) return sendSupplierError(reply, error);
        throw error;
      }
    },
  );

  // DELETE /:id — soft-delete (set status to 'suspended')
  fastify.delete(
    '/:id',
    { preHandler: requirePermission('suppliers.write') },
    async (request, reply) => {
      const paramsResult = SupplierIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid supplier id' },
        });
      }
      try {
        await deleteSupplierService(paramsResult.data.id);
        await writeAuditLog({
          ...getAuditCtx(request),
          action: 'suppliers.delete',
          entityType: 'supplier',
          entityId: paramsResult.data.id,
        });
        return reply.status(204).send();
      } catch (error) {
        if (error instanceof SupplierError) return sendSupplierError(reply, error);
        throw error;
      }
    },
  );

  // POST /:id/contacts — add contact
  fastify.post(
    '/:id/contacts',
    { preHandler: requirePermission('suppliers.write') },
    async (request, reply) => {
      const paramsResult = SupplierIdParamsSchema.safeParse(request.params);
      const bodyResult = CreateContactBodySchema.safeParse(request.body);
      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid contact request',
            details: bodyResult.success ? undefined : bodyResult.error.flatten(),
          },
        });
      }
      try {
        const contact = await addContactService(paramsResult.data.id, bodyResult.data);
        await writeAuditLog({
          ...getAuditCtx(request),
          action: 'suppliers.contact.add',
          entityType: 'supplier',
          entityId: paramsResult.data.id,
          metadata: { contactName: bodyResult.data.name },
        });
        return reply.status(201).send({ success: true, data: { contact } });
      } catch (error) {
        if (error instanceof SupplierError) return sendSupplierError(reply, error);
        throw error;
      }
    },
  );

  // DELETE /:id/contacts/:contactId — remove contact
  fastify.delete(
    '/:id/contacts/:contactId',
    { preHandler: requirePermission('suppliers.write') },
    async (request, reply) => {
      const paramsResult = SupplierContactIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid params' },
        });
      }
      try {
        await removeContactService(paramsResult.data.id, paramsResult.data.contactId);
        await writeAuditLog({
          ...getAuditCtx(request),
          action: 'suppliers.contact.remove',
          entityType: 'supplier',
          entityId: paramsResult.data.id,
          metadata: { contactId: paramsResult.data.contactId },
        });
        return reply.status(204).send();
      } catch (error) {
        if (error instanceof SupplierError) return sendSupplierError(reply, error);
        throw error;
      }
    },
  );

  // POST /:id/airports — link airport
  fastify.post(
    '/:id/airports',
    { preHandler: requirePermission('suppliers.write') },
    async (request, reply) => {
      const paramsResult = SupplierIdParamsSchema.safeParse(request.params);
      const bodyResult = LinkAirportBodySchema.safeParse(request.body);
      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid request' },
        });
      }
      try {
        const link = await linkAirportService(paramsResult.data.id, bodyResult.data.airportId);
        await writeAuditLog({
          ...getAuditCtx(request),
          action: 'suppliers.airport.link',
          entityType: 'supplier',
          entityId: paramsResult.data.id,
          metadata: { airportId: bodyResult.data.airportId },
        });
        return reply.status(201).send({ success: true, data: { link } });
      } catch (error) {
        if (error instanceof SupplierError) return sendSupplierError(reply, error);
        throw error;
      }
    },
  );

  // DELETE /:id/airports/:airportId — unlink airport
  fastify.delete(
    '/:id/airports/:airportId',
    { preHandler: requirePermission('suppliers.write') },
    async (request, reply) => {
      const paramsResult = SupplierAirportParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid params' },
        });
      }
      try {
        await unlinkAirportService(paramsResult.data.id, paramsResult.data.airportId);
        await writeAuditLog({
          ...getAuditCtx(request),
          action: 'suppliers.airport.unlink',
          entityType: 'supplier',
          entityId: paramsResult.data.id,
          metadata: { airportId: paramsResult.data.airportId },
        });
        return reply.status(204).send();
      } catch (error) {
        if (error instanceof SupplierError) return sendSupplierError(reply, error);
        throw error;
      }
    },
  );

  // POST /:id/services — link service
  fastify.post(
    '/:id/services',
    { preHandler: requirePermission('suppliers.write') },
    async (request, reply) => {
      const paramsResult = SupplierIdParamsSchema.safeParse(request.params);
      const bodyResult = LinkServiceBodySchema.safeParse(request.body);
      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid request' },
        });
      }
      try {
        const link = await linkServiceService(paramsResult.data.id, bodyResult.data.serviceId);
        await writeAuditLog({
          ...getAuditCtx(request),
          action: 'suppliers.service.link',
          entityType: 'supplier',
          entityId: paramsResult.data.id,
          metadata: { serviceId: bodyResult.data.serviceId },
        });
        return reply.status(201).send({ success: true, data: { link } });
      } catch (error) {
        if (error instanceof SupplierError) return sendSupplierError(reply, error);
        throw error;
      }
    },
  );

  // DELETE /:id/services/:serviceId — unlink service
  fastify.delete(
    '/:id/services/:serviceId',
    { preHandler: requirePermission('suppliers.write') },
    async (request, reply) => {
      const paramsResult = SupplierServiceParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid params' },
        });
      }
      try {
        await unlinkServiceService(paramsResult.data.id, paramsResult.data.serviceId);
        await writeAuditLog({
          ...getAuditCtx(request),
          action: 'suppliers.service.unlink',
          entityType: 'supplier',
          entityId: paramsResult.data.id,
          metadata: { serviceId: paramsResult.data.serviceId },
        });
        return reply.status(204).send();
      } catch (error) {
        if (error instanceof SupplierError) return sendSupplierError(reply, error);
        throw error;
      }
    },
  );

  // POST /:id/coverage — add coverage
  fastify.post(
    '/:id/coverage',
    { preHandler: requirePermission('suppliers.write') },
    async (request, reply) => {
      const paramsResult = SupplierIdParamsSchema.safeParse(request.params);
      const bodyResult = AddCoverageBodySchema.safeParse(request.body);
      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid coverage request',
            details: bodyResult.success ? undefined : bodyResult.error.flatten(),
          },
        });
      }
      try {
        const coverage = await addCoverageService(paramsResult.data.id, bodyResult.data);
        await writeAuditLog({
          ...getAuditCtx(request),
          action: 'suppliers.coverage.add',
          entityType: 'supplier',
          entityId: paramsResult.data.id,
          metadata: { airportServiceId: bodyResult.data.airportServiceId },
        });
        return reply.status(201).send({ success: true, data: { coverage } });
      } catch (error) {
        if (error instanceof SupplierError) return sendSupplierError(reply, error);
        throw error;
      }
    },
  );

  // DELETE /:id/coverage/:coverageId — remove coverage
  fastify.delete(
    '/:id/coverage/:coverageId',
    { preHandler: requirePermission('suppliers.write') },
    async (request, reply) => {
      const paramsResult = SupplierCoverageParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid params' },
        });
      }
      try {
        await removeCoverageService(paramsResult.data.id, paramsResult.data.coverageId);
        await writeAuditLog({
          ...getAuditCtx(request),
          action: 'suppliers.coverage.remove',
          entityType: 'supplier',
          entityId: paramsResult.data.id,
          metadata: { coverageId: paramsResult.data.coverageId },
        });
        return reply.status(204).send();
      } catch (error) {
        if (error instanceof SupplierError) return sendSupplierError(reply, error);
        throw error;
      }
    },
  );

  // GET /:id/availability — fetch the 7-day open/close schedule for a supplier
  fastify.get(
    '/:id/availability',
    { preHandler: requirePermission('suppliers.read') },
    async (request, reply) => {
      const paramsResult = SupplierIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid supplier id' },
        });
      }
      try {
        const schedule = await getSupplierAvailabilityService(paramsResult.data.id);
        return reply.status(200).send({ success: true, data: { schedule } });
      } catch (error) {
        if (error instanceof SupplierError) return sendSupplierError(reply, error);
        throw error;
      }
    },
  );

  // PUT /:id/availability — replace the 7-day schedule for a supplier
  fastify.put(
    '/:id/availability',
    { preHandler: requirePermission('suppliers.write') },
    async (request, reply) => {
      const paramsResult = SupplierIdParamsSchema.safeParse(request.params);
      const bodyResult = PutSupplierAvailabilityBodySchema.safeParse(request.body);
      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid availability request',
            details: bodyResult.success ? undefined : bodyResult.error.flatten(),
          },
        });
      }
      try {
        const schedule = await updateSupplierAvailabilityService(
          paramsResult.data.id,
          bodyResult.data,
        );
        await writeAuditLog({
          ...getAuditCtx(request),
          action: 'suppliers.availability.update',
          entityType: 'supplier',
          entityId: paramsResult.data.id,
          metadata: { dayCount: bodyResult.data.schedule.length },
        });
        return reply.status(200).send({ success: true, data: { schedule } });
      } catch (error) {
        if (error instanceof SupplierError) return sendSupplierError(reply, error);
        throw error;
      }
    },
  );
}
