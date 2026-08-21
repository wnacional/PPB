import assert from "node:assert/strict";
import test from "node:test";
import { calculateDashboardTotals } from "../src/ui/dashboard-view-model.ts";

test("calculates funds, protected minimums, and debt totals", () => {
  const totals = calculateDashboardTotals([
    { id: 1, name: "Payroll", provider: "Bank", type: "checking", maintainingBalance: 3000, openingBalance: 15000, balance: 15000, availableAboveMinimum: 12000 },
    { id: 2, name: "Wallet", provider: "Wallet", type: "bank_wallet", maintainingBalance: 500, openingBalance: 2500, balance: 2500, availableAboveMinimum: 2000 }
  ], [{ id: 3, user_id: "u", name: "Loan", lender: "Bank", original: 50000, balance: 10000, monthly: 5000, due: "2026-09-01" }], [{ id: 4, user_id: "u", name: "Card", issuer: "Bank", credit_limit: 20000, current_balance: 4000, statement_balance: 3000, minimum_payment: 500, statement_day: 5, due_day: 25 }]);
  assert.equal(totals.totalAvailableFunds, 17500);
  assert.equal(totals.totalProtectedMinimum, 3500);
  assert.equal(totals.totalDebt, 14000);
});
