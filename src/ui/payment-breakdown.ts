import type { Money } from "../domain/models.ts";
import { normalizeMoney, requireNonNegativeMoney, requirePositiveMoney } from "../domain/money.ts";

export interface PaymentBreakdownInput {
  scheduledAmount: number;
  assessedCharges: number;
  amountBeingPaid: number;
}

export interface PaymentBreakdown {
  scheduledAmount: Money;
  assessedCharges: Money;
  totalCurrentlyDue: Money;
  amountBeingPaid: Money;
  remainingDue: Money;
  fullyPaid: boolean;
}

export function calculatePaymentBreakdown(input: PaymentBreakdownInput): PaymentBreakdown {
  const scheduledAmount = requireNonNegativeMoney(input.scheduledAmount, "Scheduled amount");
  const assessedCharges = requireNonNegativeMoney(input.assessedCharges, "Assessed charges");
  const totalCurrentlyDue = normalizeMoney(scheduledAmount + assessedCharges);
  const requestedPayment = requirePositiveMoney(input.amountBeingPaid, "Payment");
  const amountBeingPaid = normalizeMoney(Math.min(requestedPayment, totalCurrentlyDue));
  const remainingDue = normalizeMoney(Math.max(0, totalCurrentlyDue - amountBeingPaid));

  return {
    scheduledAmount,
    assessedCharges,
    totalCurrentlyDue,
    amountBeingPaid,
    remainingDue,
    fullyPaid: remainingDue === 0
  };
}
