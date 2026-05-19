import assert from 'node:assert/strict';
import { describe, it, mock, beforeEach } from 'node:test';

// We mock the repository so quote() is a pure unit test
let mockRules: unknown[] = [];
let mockPromo: unknown = null;
let mockRate: unknown = null;

mock.module('../repository.js', {
  namedExports: {
    findActiveRulesForService: async () => mockRules,
    findPromoCodeByCode: async () => mockPromo,
    findCurrencyRate: async () => mockRate,
  },
});

const { quote } = await import('../service.js');

const makeRule = (overrides: Record<string, unknown> = {}) => ({
  id: 'rule-1',
  airportServiceId: 'as-1',
  supplierId: null,
  mode: 'fixed' as const,
  basePriceMinor: 10000,
  supplierCostMinor: null,
  markupType: null,
  markupValue: null,
  currency: 'USD',
  passengerPricing: null,
  peakRules: null,
  validFrom: null,
  validTo: null,
  priority: 0,
  status: 'active' as const,
  createdById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('quote()', () => {
  beforeEach(() => {
    mockRules = [];
    mockPromo = null;
    mockRate = null;
  });

  it('returns null when no rules exist', async () => {
    mockRules = [];
    const result = await quote({ airportServiceId: 'as-1', passengers: 1, currency: 'USD' });
    assert.equal(result, null);
  });

  it('fixed mode returns basePriceMinor as customerPriceMinor', async () => {
    mockRules = [makeRule({ basePriceMinor: 5000 })];
    const result = await quote({ airportServiceId: 'as-1', passengers: 1, currency: 'USD' });
    assert.ok(result !== null);
    assert.equal(result.customerPriceMinor, 5000);
    assert.equal(result.markupMinor, 0);
    assert.equal(result.discountMinor, 0);
    assert.equal(result.taxEstimateMinor, 0);
    assert.equal(result.appliedRuleId, 'rule-1');
  });

  it('cost_plus_markup with percentage correctly computes price', async () => {
    // 1000 minor * (1 + 20%) = 1200
    mockRules = [makeRule({
      mode: 'cost_plus_markup',
      basePriceMinor: null,
      supplierCostMinor: 1000,
      markupType: 'percentage',
      markupValue: { toString: () => '20', toNumber: () => 20, valueOf: () => 20, toFixed: () => '20.0000' },
    })];
    const result = await quote({ airportServiceId: 'as-1', passengers: 1, currency: 'USD' });
    assert.ok(result !== null);
    assert.equal(result.customerPriceMinor, 1200);
    assert.equal(result.supplierCostMinor, 1000);
    assert.equal(result.markupMinor, 200);
  });

  it('cost_plus_markup with fixed_amount correctly computes price', async () => {
    // 1000 + 300 = 1300
    mockRules = [makeRule({
      mode: 'cost_plus_markup',
      basePriceMinor: null,
      supplierCostMinor: 1000,
      markupType: 'fixed_amount',
      markupValue: { toString: () => '300', toNumber: () => 300, valueOf: () => 300, toFixed: () => '300.0000' },
    })];
    const result = await quote({ airportServiceId: 'as-1', passengers: 1, currency: 'USD' });
    assert.ok(result !== null);
    assert.equal(result.customerPriceMinor, 1300);
    assert.equal(result.markupMinor, 300);
  });

  it('applies percentage promo code discount', async () => {
    mockRules = [makeRule({ basePriceMinor: 10000 })];
    mockPromo = {
      id: 'promo-1',
      code: 'SAVE10',
      discountType: 'percentage',
      discountValue: { toString: () => '10', toNumber: () => 10, valueOf: () => 10 },
      maxRedemptions: null,
      redemptionsUsed: 0,
      validFrom: null,
      validTo: null,
      minBookingMinor: null,
      status: 'active',
    };
    const result = await quote({
      airportServiceId: 'as-1',
      passengers: 1,
      currency: 'USD',
      promoCode: 'SAVE10',
    });
    assert.ok(result !== null);
    // 10000 - 10% = 9000
    assert.equal(result.customerPriceMinor, 9000);
    assert.equal(result.discountMinor, 1000);
    assert.equal(result.promoCodeApplied, 'SAVE10');
  });

  it('ignores expired promo code', async () => {
    mockRules = [makeRule({ basePriceMinor: 5000 })];
    mockPromo = {
      id: 'promo-2',
      code: 'EXPIRED',
      discountType: 'percentage',
      discountValue: { toString: () => '50', valueOf: () => 50 },
      maxRedemptions: null,
      redemptionsUsed: 0,
      validFrom: null,
      validTo: new Date(Date.now() - 86400000), // expired yesterday
      minBookingMinor: null,
      status: 'active',
    };
    const result = await quote({ airportServiceId: 'as-1', passengers: 1, currency: 'USD', promoCode: 'EXPIRED' });
    assert.ok(result !== null);
    assert.equal(result.customerPriceMinor, 5000);
    assert.equal(result.discountMinor, 0);
  });

  it('converts currency when rate is available', async () => {
    mockRules = [makeRule({ basePriceMinor: 10000, currency: 'USD' })];
    mockRate = { rate: { toString: () => '0.92', toNumber: () => 0.92, valueOf: () => 0.92 } };
    const result = await quote({ airportServiceId: 'as-1', passengers: 1, currency: 'EUR' });
    assert.ok(result !== null);
    // 10000 * 0.92 = 9200
    assert.equal(result.customerPriceMinor, 9200);
    assert.equal(result.displayCurrency, 'EUR');
    assert.equal(result.currency, 'USD');
  });

  it('falls back to rule currency when rate is not available', async () => {
    mockRules = [makeRule({ basePriceMinor: 10000, currency: 'USD' })];
    mockRate = null;
    const result = await quote({ airportServiceId: 'as-1', passengers: 1, currency: 'XYZ' });
    assert.ok(result !== null);
    assert.equal(result.customerPriceMinor, 10000);
    assert.equal(result.displayCurrency, 'USD'); // falls back
  });

  it('supplier-specific rule beats general rule', async () => {
    mockRules = [
      makeRule({ id: 'general', basePriceMinor: 10000, supplierId: null, priority: 0 }),
      makeRule({ id: 'specific', basePriceMinor: 7000, supplierId: 'sup-1', priority: 0 }),
    ];
    const result = await quote({
      airportServiceId: 'as-1',
      passengers: 1,
      currency: 'USD',
      supplierId: 'sup-1',
    });
    assert.ok(result !== null);
    assert.equal(result.appliedRuleId, 'specific');
    assert.equal(result.customerPriceMinor, 7000);
  });
});
