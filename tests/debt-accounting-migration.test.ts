import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  new URL("../supabase/migrations/20260821_debt_accounting_review_only.sql", import.meta.url),
  "utf8",
);

test("debt adjustments give credits and reversals a negative balance effect", () => {
  assert.match(sql, /signed_amount[\s\S]*adjustment_type in \('credit', 'reversal'\)[\s\S]*then -amount/);
});

test("debt adjustments retain a due date for reports", () => {
  assert.match(sql, /due_date date not null/);
});

test("only one posted reversal is allowed per adjustment", () => {
  assert.match(sql, /create unique index debt_adjustments_single_posted_reversal/);
  assert.match(sql, /where reverses_adjustment_id is not null and status = 'posted'/);
});

test("transaction links and allocations are serialized before validation", () => {
  assert.match(sql, /ppb-source-transaction:/);
  assert.match(sql, /ppb-payment-allocation:/);
  assert.match(sql, /ppb-adjustment-allocation:/);
});

test("authenticated accounting access is append-only", () => {
  for (const table of ["debt_adjustments", "debt_payments", "payment_allocations"]) {
    assert.match(sql, new RegExp(`grant select, insert on table public\\.${table} to authenticated`));
    assert.doesNotMatch(sql, new RegExp(`grant select, insert, update, delete on table public\\.${table} to authenticated`));
  }
});

test("allocation validation caps both payment and adjustment totals", () => {
  assert.match(sql, /Allocations cannot exceed the payment amount/);
  assert.match(sql, /Allocations cannot exceed the adjustment amount/);
  assert.match(sql, /Allocation component does not match the adjustment type/);
});

test("atomic procedures save adjustments and payments", () => {
  assert.match(sql, /create or replace function public\.record_debt_adjustment/);
  assert.match(sql, /create or replace function public\.record_debt_payment/);
  assert.match(sql, /for update/);
  assert.match(sql, /Payment allocation could not be reconciled/);
  assert.match(sql, /balance_delta := case when p_adjustment_type in \('credit', 'reversal'\) then -p_amount/);
  assert.match(sql, /reversed_row\.amount <> new\.amount/);
  assert.match(sql, /grant execute on function public\.record_debt_adjustment/);
  assert.match(sql, /grant execute on function public\.record_debt_payment/);
});
