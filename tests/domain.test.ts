import assert from "node:assert/strict";
import test from "node:test";
import {
  createDebtChargeTransaction,
  createDebtPaymentTransaction,
  deriveAccounts,
  markers,
  parseMarkers,
  visibleNote
} from "../src/domain/index.ts";

test("round-trips existing account markers", () => {
  const note = "Daily account" + markers.account({
    name: "Bills & Payroll",
    provider: "BPI",
    type: "checking",
    maintainingBalance: 3000
  });
  const parsed = parseMarkers(note, 101);
  assert.deepEqual(parsed.account, {
    id: 101,
    name: "Bills & Payroll",
    provider: "BPI",
    type: "checking",
    maintainingBalance: 3000
  });
  assert.equal(visibleNote(note), "Daily account");
});

test("creates a backward-compatible debt charge", () => {
  const transaction = createDebtChargeTransaction({
    userId: "user-1",
    debt: { type: "credit_card", id: 9 },
    debtName: "Rewards Card",
    chargeType: "Finance charge",
    amount: 450,
    dueDate: "2026-09-05",
    transactionId: 200,
    transactionDate: "2026-08-21"
  });
  const parsed = parseMarkers(transaction.note);
  assert.deepEqual(parsed.debtCharge, {
    type: "credit_card",
    id: 9,
    chargeType: "Finance charge"
  });
  assert.equal(parsed.dueDate, "2026-09-05");
});

test("creates a payment without double-counting an ordinary expense", () => {
  const payment = createDebtPaymentTransaction({
    userId: "user-1",
    debt: { type: "loan", id: 7 },
    debtName: "Car Loan",
    accountId: 101,
    amount: 10000,
    dueDate: "2026-08-18",
    advancedDueDate: "2026-09-18",
    transactionId: 201,
    transactionDate: "2026-08-21"
  }, 10750, 20000);
  assert.equal(payment.amountPaid, 10000);
  assert.equal(payment.remainingDebt, 750);
  assert.equal(parseMarkers(payment.transaction.note).bankChargeAccountId, 101);
});

test("derives balances and maintaining-balance availability", () => {
  const accountNote = "Payroll" + markers.account({
    name: "Payroll",
    provider: "BDO",
    type: "bank_wallet",
    maintainingBalance: 2000
  });
  const accounts = deriveAccounts([
    { id: 1, user_id: "u", kind: "income", amount: 10000, category: "Bank account · BDO", note: accountNote, date: "2026-08-01" },
    { id: 2, user_id: "u", kind: "expense", amount: 500, category: "Bank charge", note: "Fee" + markers.bankCharge(1), date: "2026-08-02" },
    { id: 3, user_id: "u", kind: "income", amount: 1000, category: "Income", note: "Refund" + markers.incomeBank(1, 1000), date: "2026-08-03" }
  ]);
  assert.equal(accounts[0].balance, 10500);
  assert.equal(accounts[0].availableAboveMinimum, 8500);
});
