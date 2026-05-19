-- CreateEnum
CREATE TYPE "PricingMode" AS ENUM ('fixed', 'cost_plus_markup');

-- CreateEnum
CREATE TYPE "MarkupType" AS ENUM ('percentage', 'fixed_amount');

-- CreateEnum
CREATE TYPE "PricingRuleStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed');

-- CreateEnum
CREATE TYPE "PromoStatus" AS ENUM ('active', 'inactive', 'expired');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "BlackoutScopeType" AS ENUM ('airport', 'airport_service');

-- AlterTable
ALTER TABLE "airport_services" ADD COLUMN     "cut_off_minutes" INTEGER,
ADD COLUMN     "min_notice_minutes" INTEGER;

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" UUID NOT NULL,
    "airport_service_id" UUID NOT NULL,
    "supplier_id" UUID,
    "mode" "PricingMode" NOT NULL,
    "base_price_minor" INTEGER,
    "supplier_cost_minor" INTEGER,
    "markup_type" "MarkupType",
    "markupValue" DECIMAL(10,4),
    "currency" VARCHAR(3) NOT NULL,
    "passenger_pricing" JSONB,
    "peak_rules" JSONB,
    "valid_from" TIMESTAMPTZ,
    "valid_to" TIMESTAMPTZ,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "PricingRuleStatus" NOT NULL DEFAULT 'active',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_rates" (
    "id" UUID NOT NULL,
    "base_currency" VARCHAR(3) NOT NULL,
    "quote_currency" VARCHAR(3) NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "fetched_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currency_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_codes" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" DECIMAL(10,4) NOT NULL,
    "currency" VARCHAR(3),
    "max_redemptions" INTEGER,
    "redemptions_used" INTEGER NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMPTZ,
    "valid_to" TIMESTAMPTZ,
    "min_booking_minor" INTEGER,
    "status" "PromoStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_rules" (
    "id" UUID NOT NULL,
    "airport_service_id" UUID NOT NULL,
    "days_of_week" INTEGER[],
    "time_windows" JSONB NOT NULL,
    "cut_off_minutes" INTEGER NOT NULL DEFAULT 120,
    "min_notice_minutes" INTEGER NOT NULL DEFAULT 60,
    "capacity_per_slot" INTEGER,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "availability_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blackout_dates" (
    "id" UUID NOT NULL,
    "scope_type" "BlackoutScopeType" NOT NULL,
    "scope_id" UUID NOT NULL,
    "date_from" DATE NOT NULL,
    "date_to" DATE NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blackout_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_schedules" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "airport_id" UUID NOT NULL,
    "days_of_week" INTEGER[],
    "time_windows" JSONB NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 10,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "supplier_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pricing_rules_airport_service_id_status_priority_idx" ON "pricing_rules"("airport_service_id", "status", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "currency_rates_base_currency_quote_currency_key" ON "currency_rates"("base_currency", "quote_currency");

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- CreateIndex
CREATE INDEX "availability_rules_airport_service_id_status_idx" ON "availability_rules"("airport_service_id", "status");

-- CreateIndex
CREATE INDEX "blackout_dates_scope_type_scope_id_idx" ON "blackout_dates"("scope_type", "scope_id");

-- CreateIndex
CREATE INDEX "supplier_schedules_supplier_id_airport_id_idx" ON "supplier_schedules"("supplier_id", "airport_id");

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_airport_service_id_fkey" FOREIGN KEY ("airport_service_id") REFERENCES "airport_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_airport_service_id_fkey" FOREIGN KEY ("airport_service_id") REFERENCES "airport_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
