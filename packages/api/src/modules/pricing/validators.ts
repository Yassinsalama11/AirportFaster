import { z } from 'zod';

export const PricingModeSchema = z.enum(['fixed', 'cost_plus_markup']);
export const PricingModelSchema = z.enum(['flat_per_type', 'tiered', 'group', 'duration_based']);
export const PricingDirectionSchema = z.enum(['arrival', 'departure', 'both']);
export const MarkupTypeSchema = z.enum(['percentage', 'fixed_amount']);
export const PricingRuleStatusSchema = z.enum(['active', 'inactive']);
export const DiscountTypeSchema = z.enum(['percentage', 'fixed']);
export const PromoStatusSchema = z.enum(['active', 'inactive', 'expired']);

export const PricingRuleBaseSchema = z.object({
  airportServiceId: z.string().uuid(),
  supplierId: z.string().uuid().optional().nullable(),
  mode: PricingModeSchema,
  direction: PricingDirectionSchema.default('both'),
  pricingModel: PricingModelSchema.default('flat_per_type'),
  basePriceMinor: z.number().int().min(0).optional().nullable(),
  firstPassengerMinor: z.number().int().min(0).optional().nullable(),
  extraPassengerMinor: z.number().int().min(0).optional().nullable(),
  groupSizeIncluded: z.number().int().min(1).optional().nullable(),
  durationHours: z.number().int().min(1).optional().nullable(),
  supplierCostMinor: z.number().int().min(0).optional().nullable(),
  supplierCostFirstMinor: z.number().int().min(0).optional().nullable(),
  supplierCostExtraMinor: z.number().int().min(0).optional().nullable(),
  markupType: MarkupTypeSchema.optional().nullable(),
  markupValue: z.number().optional().nullable(),
  currency: z.string().length(3).toUpperCase(),
  passengerPricing: z.record(z.string(), z.number()).optional().nullable(),
  peakRules: z.unknown().optional().nullable(),
  validFrom: z.string().datetime().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
  priority: z.number().int().default(0),
  status: PricingRuleStatusSchema.default('active'),
});

export const CreatePricingRuleSchema = PricingRuleBaseSchema.refine(
  (data) => {
    if (data.mode === 'fixed') return data.basePriceMinor != null;
    if (data.mode === 'cost_plus_markup') {
      return data.supplierCostMinor != null && data.markupType != null && data.markupValue != null;
    }
    return true;
  },
  { message: 'Invalid pricing rule: fixed mode requires basePriceMinor; cost_plus_markup requires supplierCostMinor, markupType, markupValue' },
);

export const UpdatePricingRuleSchema = PricingRuleBaseSchema.partial();

export const QuoteRequestSchema = z.object({
  airportServiceId: z.string().uuid(),
  pricingRuleId: z.string().uuid().optional(),
  passengers: z.coerce.number().int().min(1).max(20).default(1),
  direction: z.enum(['arrival', 'departure']).optional(),
  currency: z.string().length(3).toUpperCase().default('EUR'),
  promoCode: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  serviceDateTime: z.string().datetime().optional(),
});

export const PromoCodeBaseSchema = z.object({
  code: z.string().trim().min(1).max(50).toUpperCase(),
  discountType: DiscountTypeSchema,
  discountValue: z.number().min(0),
  currency: z.string().length(3).toUpperCase().optional(),
  maxRedemptions: z.number().int().min(1).optional().nullable(),
  validFrom: z.string().datetime().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
  minBookingMinor: z.number().int().min(0).optional().nullable(),
  status: PromoStatusSchema.default('active'),
});

export const CreatePromoCodeSchema = PromoCodeBaseSchema.refine(
  (data) => !(data.discountType === 'fixed' && !data.currency),
  { message: 'currency is required when discountType is fixed' },
);

export const UpdatePromoCodeSchema = PromoCodeBaseSchema.partial();

export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;
export type CreatePricingRule = z.infer<typeof CreatePricingRuleSchema>;
export type UpdatePricingRule = z.infer<typeof UpdatePricingRuleSchema>;
export type CreatePromoCode = z.infer<typeof CreatePromoCodeSchema>;
