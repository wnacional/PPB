import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  new URL("../supabase/preflight-debt-accounting.sql", import.meta.url),
  "utf8",
);

test("migration preflight is read-only", () => {
  assert.doesNotMatch(sql, /^\s*(insert|update|delete|create|alter|drop|truncate|grant|revoke)\b/gim);
});

test("migration preflight checks required and conflicting objects", () => {
  for (const name of ["transactions", "loans", "credit_cards", "debt_adjustments", "debt_payments", "payment_allocations"]) {
    assert.match(sql, new RegExp(name));
  }
  assert.match(sql, /record_debt_adjustment/);
  assert.match(sql, /record_debt_payment/);
});

test("migration preflight checks invalid balances and legacy compatibility markers", () => {
  assert.match(sql, /balance < 0/);
  assert.match(sql, /PPB_DEBT_CHARGE/);
  assert.match(sql, /PPB_DUE_PAID/);
});
