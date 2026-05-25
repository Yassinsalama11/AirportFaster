-- Add commission_percent to suppliers
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "commission_percent" DECIMAL(5,2);

-- Add display_name to pricing_rules
ALTER TABLE "pricing_rules" ADD COLUMN IF NOT EXISTS "display_name" VARCHAR(200);
