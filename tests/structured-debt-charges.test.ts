import assert from "node:assert/strict";
import test from "node:test";
import { sumStructuredUnpaidDebtCharges } from "../src/domain/debts.ts";
import type { DebtAdjustment, PaymentAllocation } from "../src/domain/models.ts";

const base: DebtAdjustment = {
  id: 1, user_id: "u", debt_type: "loan", loan_id: 7, credit_card_id: null,
  adjustment_type: "late_fee", amount: 750, signed_amount: 750,
  effective_date: "2026-08-21", due_date: "2026-08-18", source_transaction_id: 10, status: "posted"
};

test("structured charges remain outstanding after a principal-only payment", () => {
  assert.equal(sumStructuredUnpaidDebtCharges([base], [], "loan", 7), 750);
});

test("allocations reduce a structured charge", () => {
  const allocations: PaymentAllocation[] = [{ id: 2, user_id: "u", payment_id: 3, adjustment_id: 1, component: "penalty", amount: 250 }];
  assert.equal(sumStructuredUnpaidDebtCharges([base], allocations, "loan", 7), 500);
});

test("credits reduce outstanding structured charges without going negative", () => {
  const credit: DebtAdjustment = { ...base, id: 2, adjustment_type: "credit", amount: 300, signed_amount: -300 };
  assert.equal(sumStructuredUnpaidDebtCharges([base, credit], [], "loan", 7), 450);
  assert.equal(sumStructuredUnpaidDebtCharges([{ ...credit, amount: 900, signed_amount: -900 }], [], "loan", 7), 0);
});

test("void and unrelated adjustments are excluded", () => {
  const voided: DebtAdjustment = { ...base, status: "void" };
  const other: DebtAdjustment = { ...base, id: 3, loan_id: 8 };
  assert.equal(sumStructuredUnpaidDebtCharges([voided, other], [], "loan", 7), 0);
});
