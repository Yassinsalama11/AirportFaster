-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('pending', 'verified', 'suspended');

-- CreateEnum
CREATE TYPE "SupplierDocumentType" AS ENUM ('license', 'contract', 'insurance', 'other');

-- CreateEnum
CREATE TYPE "SupplierDocumentStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "AssignmentMethod" AS ENUM ('manual', 'rule_based');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('offered', 'accepted', 'rejected', 'reassigned');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('draft', 'pending_payment', 'paid', 'pending_supplier_assignment', 'supplier_assigned', 'pending_supplier_confirmation', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded', 'failed');

-- CreateEnum
CREATE TYPE "BookingDirection" AS ENUM ('arrival', 'departure', 'transit');

-- CreateEnum
CREATE TYPE "PassengerType" AS ENUM ('adult', 'child', 'infant');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('homepage', 'airport_page', 'service_page', 'direct', 'api');

-- CreateEnum
CREATE TYPE "NoteVisibility" AS ENUM ('internal', 'customer');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('system', 'staff', 'supplier', 'customer');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('requires_payment', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('card', 'bank_transfer', 'wallet');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('charge', 'refund', 'adjustment');

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('received', 'processed', 'failed');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('draft', 'approved', 'paid');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'processing', 'paid', 'failed');

-- CreateEnum
CREATE TYPE "RefundType" AS ENUM ('full', 'partial', 'none');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('requested', 'admin_approved', 'finance_approved', 'processing', 'completed', 'rejected');

-- CreateEnum
CREATE TYPE "RefundRequestedBy" AS ENUM ('customer', 'staff');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('flight_delay', 'supplier_no_show', 'passenger_no_show', 'wrong_terminal', 'communication_failure', 'payment_issue', 'service_complaint', 'other');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('created', 'assigned', 'in_progress', 'waiting_external', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "IncidentTeam" AS ENUM ('operations', 'support', 'finance', 'supplier_manager');

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "status" "SupplierStatus" NOT NULL DEFAULT 'pending',
    "country_code" CHAR(2),
    "rating" DECIMAL(3,2),
    "reliability_score" DECIMAL(3,2),
    "payout_currency" VARCHAR(3),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_contacts" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "supplier_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_airports" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "airport_id" UUID NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_airports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_services" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_coverage" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "airport_service_id" UUID NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'active',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "supplier_coverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_documents" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "type" "SupplierDocumentType" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "filename" TEXT,
    "status" "SupplierDocumentStatus" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMPTZ,
    "reviewed_by" UUID,
    "review_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "supplier_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_sla_metrics" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "response_time_avg_minutes" DECIMAL(8,2),
    "confirmation_speed_avg_minutes" DECIMAL(8,2),
    "cancellation_rate" DECIMAL(5,4),
    "no_show_rate" DECIMAL(5,4),
    "complaint_rate" DECIMAL(5,4),
    "reliability_score" DECIMAL(3,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_sla_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_schedule_links" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "airport_id" UUID NOT NULL,
    "days_of_week" INTEGER[],
    "time_windows" JSONB NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 10,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "supplier_schedule_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_synonyms" (
    "id" UUID NOT NULL,
    "term" TEXT NOT NULL,
    "synonym" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_synonyms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "full_name" TEXT,
    "locale" VARCHAR(10),
    "is_vip" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(20) NOT NULL,
    "customer_id" UUID NOT NULL,
    "airport_service_id" UUID NOT NULL,
    "supplier_id" UUID,
    "status" "BookingStatus" NOT NULL DEFAULT 'draft',
    "direction" "BookingDirection" NOT NULL,
    "service_datetime" TIMESTAMPTZ NOT NULL,
    "passenger_count" INTEGER NOT NULL,
    "special_requests" TEXT,
    "locale" VARCHAR(10),
    "currency" VARCHAR(3) NOT NULL,
    "total_minor" INTEGER NOT NULL,
    "manage_token_hash" TEXT,
    "manage_token_expires_at" TIMESTAMPTZ,
    "source" "BookingSource" NOT NULL DEFAULT 'homepage',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_passengers" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "type" "PassengerType" NOT NULL DEFAULT 'adult',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_passengers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_flights" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "flight_number" VARCHAR(10) NOT NULL,
    "airline_code" VARCHAR(3),
    "scheduled_time" TIMESTAMPTZ,
    "terminal" TEXT,
    "gate" TEXT,
    "flight_status" VARCHAR(30),
    "last_synced_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "booking_flights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_price_snapshots" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "base_price_minor" INTEGER NOT NULL,
    "supplier_cost_minor" INTEGER NOT NULL,
    "markup_minor" INTEGER NOT NULL,
    "passenger_adjustment_minor" INTEGER NOT NULL DEFAULT 0,
    "peak_adjustment_minor" INTEGER NOT NULL DEFAULT 0,
    "discount_minor" INTEGER NOT NULL DEFAULT 0,
    "tax_estimate_minor" INTEGER NOT NULL DEFAULT 0,
    "total_minor" INTEGER NOT NULL,
    "margin_minor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "pricing_rule_id" UUID,
    "promo_code_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_price_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_history" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "from_status" "BookingStatus",
    "to_status" "BookingStatus" NOT NULL,
    "actor_type" "ActorType" NOT NULL DEFAULT 'system',
    "actor_id" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_supplier_assignments" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "assigned_by" UUID,
    "assignment_method" "AssignmentMethod" NOT NULL DEFAULT 'manual',
    "status" "AssignmentStatus" NOT NULL DEFAULT 'offered',
    "offered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ,
    "response_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_supplier_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_notes" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "author_user_id" UUID,
    "body" TEXT NOT NULL,
    "visibility" "NoteVisibility" NOT NULL DEFAULT 'internal',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_events" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "amount_minor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'requires_payment',
    "payment_method_type" "PaymentMethodType",
    "captured_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "stripe_object_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_webhook_events" (
    "id" UUID NOT NULL,
    "stripe_event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processing_status" "WebhookProcessingStatus" NOT NULL DEFAULT 'received',
    "processed_at" TIMESTAMPTZ,
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'draft',
    "gross_minor" INTEGER NOT NULL,
    "deductions_minor" INTEGER NOT NULL DEFAULT 0,
    "net_payable_minor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "approved_by" UUID,
    "paid_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_lines" (
    "id" UUID NOT NULL,
    "settlement_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "supplier_cost_minor" INTEGER NOT NULL,
    "refund_adjustment_minor" INTEGER NOT NULL DEFAULT 0,
    "penalty_minor" INTEGER NOT NULL DEFAULT 0,
    "net_minor" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "settlement_id" UUID NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "method" TEXT,
    "external_reference" TEXT,
    "status" "PayoutStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancellation_policies" (
    "id" UUID NOT NULL,
    "scope_type" VARCHAR(30) NOT NULL,
    "scope_id" UUID,
    "windows" JSONB NOT NULL,
    "supplier_penalty_rules" JSONB,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "cancellation_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "payment_id" UUID,
    "type" "RefundType" NOT NULL DEFAULT 'partial',
    "requested_amount_minor" INTEGER NOT NULL,
    "approved_amount_minor" INTEGER,
    "currency" VARCHAR(3) NOT NULL,
    "reason" TEXT,
    "requested_by" "RefundRequestedBy" NOT NULL DEFAULT 'customer',
    "policy_snapshot" JSONB,
    "status" "RefundStatus" NOT NULL DEFAULT 'requested',
    "admin_approved_by" UUID,
    "finance_approved_by" UUID,
    "stripe_refund_id" TEXT,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_status_history" (
    "id" UUID NOT NULL,
    "refund_id" UUID NOT NULL,
    "from_status" "RefundStatus",
    "to_status" "RefundStatus" NOT NULL,
    "actor_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" UUID NOT NULL,
    "booking_id" UUID,
    "supplier_id" UUID,
    "type" "IncidentType" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'medium',
    "status" "IncidentStatus" NOT NULL DEFAULT 'created',
    "opened_by" UUID,
    "resolution_reason" TEXT,
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_updates" (
    "id" UUID NOT NULL,
    "incident_id" UUID NOT NULL,
    "author_user_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_assignments" (
    "id" UUID NOT NULL,
    "incident_id" UUID NOT NULL,
    "assigned_to_user_id" UUID,
    "assigned_team" "IncidentTeam",
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_events" (
    "id" UUID NOT NULL,
    "session_id" TEXT,
    "airport_id" UUID,
    "service_id" UUID,
    "query" TEXT,
    "filters" JSONB,
    "result_count" INTEGER,
    "locale" VARCHAR(10),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_funnel_events" (
    "id" UUID NOT NULL,
    "booking_id" UUID,
    "session_id" TEXT,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_funnel_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversion_events" (
    "id" UUID NOT NULL,
    "session_id" TEXT,
    "type" TEXT NOT NULL,
    "page_id" UUID,
    "value_minor" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversion_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suppliers_status_idx" ON "suppliers"("status");

-- CreateIndex
CREATE INDEX "supplier_contacts_supplier_id_idx" ON "supplier_contacts"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_airports_supplier_id_airport_id_key" ON "supplier_airports"("supplier_id", "airport_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_services_supplier_id_service_id_key" ON "supplier_services"("supplier_id", "service_id");

-- CreateIndex
CREATE INDEX "supplier_coverage_airport_service_id_status_idx" ON "supplier_coverage"("airport_service_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_coverage_supplier_id_airport_service_id_key" ON "supplier_coverage"("supplier_id", "airport_service_id");

-- CreateIndex
CREATE INDEX "supplier_documents_supplier_id_status_idx" ON "supplier_documents"("supplier_id", "status");

-- CreateIndex
CREATE INDEX "supplier_sla_metrics_supplier_id_period_start_idx" ON "supplier_sla_metrics"("supplier_id", "period_start");

-- CreateIndex
CREATE INDEX "supplier_schedule_links_supplier_id_airport_id_idx" ON "supplier_schedule_links"("supplier_id", "airport_id");

-- CreateIndex
CREATE UNIQUE INDEX "search_synonyms_term_synonym_key" ON "search_synonyms"("term", "synonym");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_reference_key" ON "bookings"("reference");

-- CreateIndex
CREATE INDEX "bookings_status_service_datetime_idx" ON "bookings"("status", "service_datetime");

-- CreateIndex
CREATE INDEX "bookings_customer_id_idx" ON "bookings"("customer_id");

-- CreateIndex
CREATE INDEX "bookings_airport_service_id_idx" ON "bookings"("airport_service_id");

-- CreateIndex
CREATE INDEX "bookings_supplier_id_idx" ON "bookings"("supplier_id");

-- CreateIndex
CREATE INDEX "booking_passengers_booking_id_idx" ON "booking_passengers"("booking_id");

-- CreateIndex
CREATE INDEX "booking_flights_booking_id_idx" ON "booking_flights"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_price_snapshots_booking_id_key" ON "booking_price_snapshots"("booking_id");

-- CreateIndex
CREATE INDEX "booking_status_history_booking_id_idx" ON "booking_status_history"("booking_id");

-- CreateIndex
CREATE INDEX "booking_supplier_assignments_booking_id_idx" ON "booking_supplier_assignments"("booking_id");

-- CreateIndex
CREATE INDEX "booking_supplier_assignments_supplier_id_idx" ON "booking_supplier_assignments"("supplier_id");

-- CreateIndex
CREATE INDEX "booking_notes_booking_id_idx" ON "booking_notes"("booking_id");

-- CreateIndex
CREATE INDEX "booking_events_booking_id_type_idx" ON "booking_events"("booking_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_payment_intent_id_key" ON "payments"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payment_transactions_payment_id_idx" ON "payment_transactions"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_webhook_events_stripe_event_id_key" ON "stripe_webhook_events"("stripe_event_id");

-- CreateIndex
CREATE INDEX "stripe_webhook_events_type_idx" ON "stripe_webhook_events"("type");

-- CreateIndex
CREATE INDEX "stripe_webhook_events_processing_status_idx" ON "stripe_webhook_events"("processing_status");

-- CreateIndex
CREATE INDEX "settlements_supplier_id_status_idx" ON "settlements"("supplier_id", "status");

-- CreateIndex
CREATE INDEX "settlement_lines_settlement_id_idx" ON "settlement_lines"("settlement_id");

-- CreateIndex
CREATE INDEX "settlement_lines_booking_id_idx" ON "settlement_lines"("booking_id");

-- CreateIndex
CREATE INDEX "payouts_settlement_id_status_idx" ON "payouts"("settlement_id", "status");

-- CreateIndex
CREATE INDEX "cancellation_policies_scope_type_scope_id_idx" ON "cancellation_policies"("scope_type", "scope_id");

-- CreateIndex
CREATE INDEX "refunds_booking_id_idx" ON "refunds"("booking_id");

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

-- CreateIndex
CREATE INDEX "refund_status_history_refund_id_idx" ON "refund_status_history"("refund_id");

-- CreateIndex
CREATE INDEX "incidents_status_severity_idx" ON "incidents"("status", "severity");

-- CreateIndex
CREATE INDEX "incidents_booking_id_idx" ON "incidents"("booking_id");

-- CreateIndex
CREATE INDEX "incident_updates_incident_id_idx" ON "incident_updates"("incident_id");

-- CreateIndex
CREATE INDEX "incident_assignments_incident_id_idx" ON "incident_assignments"("incident_id");

-- CreateIndex
CREATE INDEX "search_events_created_at_idx" ON "search_events"("created_at");

-- CreateIndex
CREATE INDEX "search_events_airport_id_idx" ON "search_events"("airport_id");

-- CreateIndex
CREATE INDEX "analytics_funnel_events_type_created_at_idx" ON "analytics_funnel_events"("type", "created_at");

-- CreateIndex
CREATE INDEX "analytics_funnel_events_booking_id_idx" ON "analytics_funnel_events"("booking_id");

-- CreateIndex
CREATE INDEX "conversion_events_type_created_at_idx" ON "conversion_events"("type", "created_at");

-- AddForeignKey
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_airports" ADD CONSTRAINT "supplier_airports_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_airports" ADD CONSTRAINT "supplier_airports_airport_id_fkey" FOREIGN KEY ("airport_id") REFERENCES "airports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_services" ADD CONSTRAINT "supplier_services_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_services" ADD CONSTRAINT "supplier_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_coverage" ADD CONSTRAINT "supplier_coverage_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_coverage" ADD CONSTRAINT "supplier_coverage_airport_service_id_fkey" FOREIGN KEY ("airport_service_id") REFERENCES "airport_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_sla_metrics" ADD CONSTRAINT "supplier_sla_metrics_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_schedule_links" ADD CONSTRAINT "supplier_schedule_links_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_schedule_links" ADD CONSTRAINT "supplier_schedule_links_airport_id_fkey" FOREIGN KEY ("airport_id") REFERENCES "airports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_airport_service_id_fkey" FOREIGN KEY ("airport_service_id") REFERENCES "airport_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_passengers" ADD CONSTRAINT "booking_passengers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_flights" ADD CONSTRAINT "booking_flights_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_price_snapshots" ADD CONSTRAINT "booking_price_snapshots_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_supplier_assignments" ADD CONSTRAINT "booking_supplier_assignments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_supplier_assignments" ADD CONSTRAINT "booking_supplier_assignments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_notes" ADD CONSTRAINT "booking_notes_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_lines" ADD CONSTRAINT "settlement_lines_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_lines" ADD CONSTRAINT "settlement_lines_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_status_history" ADD CONSTRAINT "refund_status_history_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_updates" ADD CONSTRAINT "incident_updates_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_assignments" ADD CONSTRAINT "incident_assignments_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
