/**
 * Money utilities — all amounts are stored and handled as minor units (integers).
 * e.g. $12.50 USD = 1250, £5.00 GBP = 500
 * Never use floats for monetary values.
 */

export interface Money {
  amount: number; // minor units, integer
  currency: string; // ISO 4217 e.g. "USD", "GBP", "AED"
}

/**
 * Convert major units (e.g. 12.50) to minor units (e.g. 1250).
 * Only use for human input conversion — all internal values must be minor units.
 */
export function toMinorUnits(major: number, decimalPlaces = 2): number {
  return Math.round(major * Math.pow(10, decimalPlaces));
}

/**
 * Convert minor units to major units for display only.
 */
export function toMajorUnits(minor: number, decimalPlaces = 2): number {
  return minor / Math.pow(10, decimalPlaces);
}

/**
 * Format money for display.
 */
export function formatMoney(money: Money, locale = 'en-US'): string {
  const majorAmount = toMajorUnits(money.amount);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
  }).format(majorAmount);
}

/**
 * Add two Money values — must have the same currency.
 */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
  return { amount: a.amount + b.amount, currency: a.currency };
}

/**
 * Calculate percentage (e.g. commission) on a Money value.
 * Returns integer minor units rounded.
 */
export function calculatePercentage(money: Money, percentageBasisPoints: number): Money {
  // percentageBasisPoints: 1000 = 10%, 500 = 5%
  return {
    amount: Math.round((money.amount * percentageBasisPoints) / 10000),
    currency: money.currency,
  };
}
