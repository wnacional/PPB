import type { Money } from "./models.ts";

export function normalizeMoney(value: number): Money {
  if (!Number.isFinite(value)) throw new TypeError("Money must be a finite number.");
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function requirePositiveMoney(value: number, label = "Amount"): Money {
  const normalized = normalizeMoney(value);
  if (normalized <= 0) throw new RangeError(`${label} must be greater than zero.`);
  return normalized;
}

export function requireNonNegativeMoney(value: number, label = "Amount"): Money {
  const normalized = normalizeMoney(value);
  if (normalized < 0) throw new RangeError(`${label} cannot be negative.`);
  return normalized;
}

export function moneyMarker(value: number): string {
  return requireNonNegativeMoney(value).toFixed(2);
}
