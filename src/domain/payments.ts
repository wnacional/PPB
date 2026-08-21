import type { DebtPaymentInput, Money, Transaction } from "./models.ts";
import { normalizeMoney, requirePositiveMoney } from "./money.ts";
import { markers } from "./transaction-markers.ts";

export interface PaymentResult {
  transaction: Transaction;
  amountPaid: Money;
  remainingDebt: Money;
}

export function createDebtPaymentTransaction(
  input: DebtPaymentInput,
  currentDebtBalance: number,
  availableAccountBalance: number
): PaymentResult {
  const requestedAmount = requirePositiveMoney(input.amount, "Payment");
  const debtBalance = requirePositiveMoney(currentDebtBalance, "Debt balance");
  const accountBalance = normalizeMoney(availableAccountBalance);
  const amountPaid = normalizeMoney(Math.min(requestedAmount, debtBalance));

  if (amountPaid > accountBalance) {
    throw new RangeError("Payment exceeds the selected account balance.");
  }

  let note = `Due-date payment for ${input.debtName}` +
    markers.bankCharge(input.accountId) +
    markers.debt(input.debt) +
    markers.duePaid(input.debt, input.dueDate);

  if (input.debt.type === "credit_card" && input.previousStatementBalance !== undefined) {
    note += markers.previousStatement(input.previousStatementBalance);
  }
  if (input.advancedDueDate) {
    note += markers.dueAdvanced(input.dueDate, input.advancedDueDate);
  }

  return {
    transaction: {
      id: input.transactionId,
      user_id: input.userId,
      kind: "expense",
      amount: amountPaid,
      category: `${input.debt.type === "loan" ? "Loan payment" : "Credit card payment"} · ${input.debtName}`,
      note,
      date: input.transactionDate
    },
    amountPaid,
    remainingDebt: normalizeMoney(Math.max(0, debtBalance - amountPaid))
  };
}
