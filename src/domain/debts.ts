import type { DebtAdjustment, DebtChargeInput, Money, PaymentAllocation, Transaction } from "./models.ts";
import { normalizeMoney, requirePositiveMoney } from "./money.ts";
import { markers, parseMarkers } from "./transaction-markers.ts";

export const loanChargeTypes = [
  "Late-payment penalty",
  "Additional interest",
  "Collection fee",
  "Restructuring fee",
  "Other loan charge"
] as const;

export const creditCardChargeTypes = [
  "Finance charge",
  "Late-payment fee",
  "Over-limit fee",
  "Annual fee",
  "Other card charge"
] as const;

export function createDebtChargeTransaction(input: DebtChargeInput): Transaction {
  const amount = requirePositiveMoney(input.amount, "Charge");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
    throw new TypeError("A valid due date is required.");
  }

  return {
    id: input.transactionId,
    user_id: input.userId,
    kind: "expense",
    amount,
    category: `${input.debt.type === "loan" ? "Loan charge" : "Credit card charge"} · ${input.debtName}`,
    note: `${input.note?.trim() || input.chargeType}` +
      markers.debtCharge(input.debt, input.chargeType) +
      markers.due(input.dueDate),
    date: input.transactionDate
  };
}

export function sumUnpaidDebtCharges(
  transactions: Transaction[],
  debtType: "loan" | "credit_card",
  debtId: number,
  excludedTransactionIds: ReadonlySet<number> = new Set()
): Money {
  const paidDueKeys = new Set(
    transactions.map((transaction) => parseMarkers(transaction.note).paidDueKey).filter(Boolean)
  );

  return normalizeMoney(transactions.reduce((total, transaction) => {
    if (excludedTransactionIds.has(transaction.id)) return total;
    const parsed = parseMarkers(transaction.note);
    if (!parsed.debtCharge || parsed.debtCharge.type !== debtType || parsed.debtCharge.id !== debtId) {
      return total;
    }
    const dueKey = parsed.dueDate ? `${debtType}:${debtId}:${parsed.dueDate}` : undefined;
    return dueKey && paidDueKeys.has(dueKey) ? total : total + transaction.amount;
  }, 0));
}

export function sumStructuredUnpaidDebtCharges(
  adjustments: DebtAdjustment[],
  allocations: PaymentAllocation[],
  debtType: "loan" | "credit_card",
  debtId: number
): Money {
  const allocatedByAdjustment = new Map<number, number>();
  for (const allocation of allocations) {
    if (allocation.adjustment_id === null) continue;
    allocatedByAdjustment.set(
      allocation.adjustment_id,
      normalizeMoney((allocatedByAdjustment.get(allocation.adjustment_id) || 0) + Number(allocation.amount))
    );
  }

  const total = adjustments.reduce((sum, adjustment) => {
    const targetId = debtType === "loan" ? adjustment.loan_id : adjustment.credit_card_id;
    if (adjustment.status !== "posted" || adjustment.debt_type !== debtType || targetId !== debtId) return sum;
    if (Number(adjustment.signed_amount) <= 0) return sum + Number(adjustment.signed_amount);
    return sum + Math.max(0, Number(adjustment.signed_amount) - (allocatedByAdjustment.get(adjustment.id) || 0));
  }, 0);

  return normalizeMoney(Math.max(0, total));
}
