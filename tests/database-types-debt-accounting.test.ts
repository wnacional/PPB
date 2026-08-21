import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const types = readFileSync(
  new URL("../supabase/database.types.ts", import.meta.url),
  "utf8",
);

test("planned database types include structured accounting tables", () => {
  assert.match(types, /debt_adjustments:/);
  assert.match(types, /debt_payments:/);
  assert.match(types, /payment_allocations:/);
  assert.match(types, /signed_amount: number/);
  assert.match(types, /due_date: string/);
});

test("planned database types include atomic procedures", () => {
  assert.match(types, /record_debt_adjustment:/);
  assert.match(types, /record_debt_payment:/);
  assert.match(types, /p_reverses_adjustment_id\?: number \| null/);
});
