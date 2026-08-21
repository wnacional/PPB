import type { CreditCard, Loan, Money } from "../domain/models.ts";
import { normalizeMoney } from "../domain/money.ts";
import type { AccountBalance } from "../domain/accounts.ts";

export interface DashboardTotals {
  totalAvailableFunds: Money;
  totalProtectedMinimum: Money;
  totalLoanDebt: Money;
  totalCreditCardDebt: Money;
  totalDebt: Money;
}

export function calculateDashboardTotals(
  accounts: AccountBalance[],
  loans: Loan[],
  creditCards: CreditCard[]
): DashboardTotals {
  const totalAvailableFunds = normalizeMoney(accounts.reduce((sum, account) => sum + account.balance, 0));
  const totalProtectedMinimum = normalizeMoney(accounts.reduce((sum, account) => sum + account.maintainingBalance, 0));
  const totalLoanDebt = normalizeMoney(loans.reduce((sum, loan) => sum + Number(loan.balance), 0));
  const totalCreditCardDebt = normalizeMoney(creditCards.reduce((sum, card) => sum + Number(card.current_balance), 0));
  return {
    totalAvailableFunds,
    totalProtectedMinimum,
    totalLoanDebt,
    totalCreditCardDebt,
    totalDebt: normalizeMoney(totalLoanDebt + totalCreditCardDebt)
  };
}
