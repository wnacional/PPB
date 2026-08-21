import type { AccountReference, Money, Transaction } from "./models.ts";
import { normalizeMoney, requireNonNegativeMoney } from "./money.ts";
import { parseMarkers } from "./transaction-markers.ts";

export interface AccountBalance extends AccountReference {
  openingBalance: Money;
  balance: Money;
  availableAboveMinimum: Money;
}

export function deriveAccounts(transactions: Transaction[]): AccountBalance[] {
  const accounts = new Map<number, AccountBalance>();

  for (const transaction of transactions) {
    const parsed = parseMarkers(transaction.note, transaction.id);
    if (!parsed.account) continue;
    const openingBalance = requireNonNegativeMoney(transaction.amount, "Opening balance");
    accounts.set(transaction.id, {
      ...parsed.account,
      openingBalance,
      balance: openingBalance,
      availableAboveMinimum: normalizeMoney(openingBalance - parsed.account.maintainingBalance)
    });
  }

  for (const transaction of transactions) {
    const parsed = parseMarkers(transaction.note, transaction.id);
    if (parsed.account) continue;

    if (parsed.incomeBank) {
      adjust(accounts, parsed.incomeBank.accountId, parsed.incomeBank.amount);
    }
    if (parsed.bankChargeAccountId !== undefined) {
      adjust(accounts, parsed.bankChargeAccountId, -transaction.amount);
    }
    if (parsed.savingsBankId !== undefined) {
      adjust(accounts, parsed.savingsBankId, -transaction.amount);
    }
  }

  return [...accounts.values()].map((account) => ({
    ...account,
    balance: normalizeMoney(Math.max(0, account.balance)),
    availableAboveMinimum: normalizeMoney(
      Math.max(0, account.balance - account.maintainingBalance)
    )
  }));
}

function adjust(accounts: Map<number, AccountBalance>, accountId: number, delta: number): void {
  const account = accounts.get(accountId);
  if (!account) return;
  account.balance = normalizeMoney(account.balance + delta);
}

export function validateMaintainingBalance(
  accountType: AccountReference["type"],
  balance: number,
  maintainingBalance: number
): Money {
  const normalizedBalance = requireNonNegativeMoney(balance, "Balance");
  const normalizedMinimum = requireNonNegativeMoney(maintainingBalance, "Maintaining balance");
  if (normalizedMinimum > normalizedBalance) {
    throw new RangeError("Maintaining balance cannot exceed the current balance.");
  }
  return accountType === "cash" ? 0 : normalizedMinimum;
}
