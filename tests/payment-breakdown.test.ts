import assert from "node:assert/strict";
import test from "node:test";
import { calculatePaymentBreakdown } from "../src/ui/payment-breakdown.ts";

test("keeps reminders active when charges remain unpaid", () => {
  const result = calculatePaymentBreakdown({ scheduledAmount: 10000, assessedCharges: 750, amountBeingPaid: 10000 });
  assert.equal(result.totalCurrentlyDue, 10750);
  assert.equal(result.remainingDue, 750);
  assert.equal(result.fullyPaid, false);
});

test("clears the due when scheduled amount and charges are paid", () => {
  const result = calculatePaymentBreakdown({ scheduledAmount: 10000, assessedCharges: 750, amountBeingPaid: 10750 });
  assert.equal(result.remainingDue, 0);
  assert.equal(result.fullyPaid, true);
});
