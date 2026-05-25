-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('flat_per_type', 'tiered', 'group', 'duration_based');

-- CreateEnum
CREATE TYPE "PricingDirection" AS ENUM ('arrival', 'departure', 'both');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- AlterTable
ALTER TABLE "airport_services" ADD COLUMN     "direction_available" "PricingDirection" NOT NULL DEFAULT 'both',
ADD COLUMN     "max_lead_days" INTEGER NOT NULL DEFAULT 365,
ADD COLUMN     "minimum_lead_hours" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "pricing_rules" ADD COLUMN     "direction" "PricingDirection" NOT NULL DEFAULT 'both',
ADD COLUMN     "duration_hours" INTEGER,
ADD COLUMN     "extra_passenger_minor" INTEGER,
ADD COLUMN     "first_passenger_minor" INTEGER,
ADD COLUMN     "group_size_included" INTEGER,
ADD COLUMN     "pricing_model" "PricingModel" NOT NULL DEFAULT 'flat_per_type',
ADD COLUMN     "supplier_cost_extra_minor" INTEGER,
ADD COLUMN     "supplier_cost_first_minor" INTEGER;

-- CreateTable
CREATE TABLE "airport_service_translations" (
    "id" UUID NOT NULL,
    "airport_service_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "airport_service_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_availability" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "open_time" VARCHAR(5) NOT NULL,
    "close_time" VARCHAR(5) NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "supplier_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "airport_service_translations_airport_service_id_idx" ON "airport_service_translations"("airport_service_id");

-- CreateIndex
CREATE UNIQUE INDEX "airport_service_translations_airport_service_id_locale_key" ON "airport_service_translations"("airport_service_id", "locale");

-- CreateIndex
CREATE INDEX "supplier_availability_supplier_id_idx" ON "supplier_availability"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_availability_supplier_id_day_of_week_key" ON "supplier_availability"("supplier_id", "day_of_week");

-- AddForeignKey
ALTER TABLE "airport_service_translations" ADD CONSTRAINT "airport_service_translations_airport_service_id_fkey" FOREIGN KEY ("airport_service_id") REFERENCES "airport_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_availability" ADD CONSTRAINT "supplier_availability_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

