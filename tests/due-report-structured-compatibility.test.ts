import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../supabase/functions/send-due-reports/index.ts", import.meta.url),
  "utf8",
);

test("due reports load structured adjustments and allocations", () => {
  assert.match(source, /from\("debt_adjustments"\)/);
  assert.match(source, /from\("payment_allocations"\)/);
  assert.match(source, /structuredChargeAmounts/);
});

test("linked legacy transactions are excluded from duplicate report rows", () => {
  assert.match(source, /source_transaction_id/);
  assert.match(source, /linkedSourceTransactionIds/);
  assert.match(source, /linkedSourceTransactionIds\?\.has\(Number\(item\.id\)\)/);
});

test("the report falls back when structured tables are unavailable", () => {
  assert.match(source, /!adjustmentsResult\.error && !allocationsResult\.error/);
  assert.match(source, /: null;/);
});
