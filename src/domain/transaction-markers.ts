import type { AccountReference, AccountType, DebtReference, DebtType } from "./models.ts";
import { moneyMarker } from "./money.ts";

const markerPatterns = {
  accountMeta: /\n\[\[PPB_ACCOUNT_META:(bank_wallet|checking|cash):([0-9.]+)\]\]/,
  bankAccount: /\n\[\[PPB_BANK_ACCOUNT:([^:\]]+):([^\]]+)\]\]/,
  bankCharge: /\n\[\[PPB_CHARGE:bank:(\d+)\]\]/,
  cardCharge: /\n\[\[PPB_CHARGE:credit_card:(\d+)\]\]/,
  debt: /\n\[\[PPB_DEBT:(loan|credit_card):(\d+)\]\]/,
  debtCharge: /\n\[\[PPB_DEBT_CHARGE:(loan|credit_card):(\d+):([^\]]+)\]\]/,
  due: /\n\[\[PPB_DUE:(\d{4}-\d{2}-\d{2})\]\]/,
  duePaid: /\n\[\[PPB_DUE_PAID:((?:loan|credit_card):\d+:\d{4}-\d{2}-\d{2})\]\]/,
  dueApplied: /\n\[\[PPB_DUE_APPLIED:((?:loan|credit_card):\d+:\d{4}-\d{2}-\d{2}):([0-9.]+)\]\]/g,
  dueAdvanced: /\n\[\[PPB_DUE_ADVANCED:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})\]\]/,
  incomeBank: /\n\[\[PPB_INCOME_BANK:(\d+):([0-9.]+)\]\]/,
  savingsBank: /\n\[\[PPB_SAVINGS_BANK:(\d+)\]\]/,
  previousStatement: /\n\[\[PPB_PREV_STATEMENT:([0-9.]+)\]\]/,
  expenseCategory: /\n\[\[PPB_EXPENSE_CAT:([^\]]+)\]\]/
} as const;

export interface ParsedMarkers {
  account?: AccountReference;
  bankChargeAccountId?: number;
  cardChargeId?: number;
  debt?: DebtReference;
  debtCharge?: DebtReference & { chargeType: string };
  dueDate?: string;
  paidDueKey?: string;
  dueApplications: Array<{ dueKey: string; amount: number }>;
  advancedDue?: { from: string; to: string };
  incomeBank?: { accountId: number; amount: number };
  savingsBankId?: number;
  previousStatementBalance?: number;
  expenseCategory?: string;
}

export function parseMarkers(note: string, transactionId?: number): ParsedMarkers {
  const accountMeta = note.match(markerPatterns.accountMeta);
  const bankAccount = note.match(markerPatterns.bankAccount);
  const debt = note.match(markerPatterns.debt);
  const debtCharge = note.match(markerPatterns.debtCharge);
  const due = note.match(markerPatterns.due);
  const duePaid = note.match(markerPatterns.duePaid);
  const advanced = note.match(markerPatterns.dueAdvanced);
  const incomeBank = note.match(markerPatterns.incomeBank);
  const savingsBank = note.match(markerPatterns.savingsBank);
  const previousStatement = note.match(markerPatterns.previousStatement);
  const expenseCategory = note.match(markerPatterns.expenseCategory);
  const bankCharge = note.match(markerPatterns.bankCharge);
  const cardCharge = note.match(markerPatterns.cardCharge);

  const dueApplications = [...note.matchAll(markerPatterns.dueApplied)].map((match) => ({
    dueKey: match[1],
    amount: Number(match[2])
  }));

  return {
    account: accountMeta && bankAccount && transactionId !== undefined
      ? {
          id: transactionId,
          name: decodeURIComponent(bankAccount[1]),
          provider: decodeURIComponent(bankAccount[2]),
          type: accountMeta[1] as AccountType,
          maintainingBalance: Number(accountMeta[2])
        }
      : undefined,
    bankChargeAccountId: bankCharge ? Number(bankCharge[1]) : undefined,
    cardChargeId: cardCharge ? Number(cardCharge[1]) : undefined,
    debt: debt ? { type: debt[1] as DebtType, id: Number(debt[2]) } : undefined,
    debtCharge: debtCharge
      ? {
          type: debtCharge[1] as DebtType,
          id: Number(debtCharge[2]),
          chargeType: decodeURIComponent(debtCharge[3])
        }
      : undefined,
    dueDate: due?.[1],
    paidDueKey: duePaid?.[1],
    dueApplications,
    advancedDue: advanced ? { from: advanced[1], to: advanced[2] } : undefined,
    incomeBank: incomeBank
      ? { accountId: Number(incomeBank[1]), amount: Number(incomeBank[2]) }
      : undefined,
    savingsBankId: savingsBank ? Number(savingsBank[1]) : undefined,
    previousStatementBalance: previousStatement ? Number(previousStatement[1]) : undefined,
    expenseCategory: expenseCategory ? decodeURIComponent(expenseCategory[1]) : undefined
  };
}

export function visibleNote(note: string): string {
  return note.replace(/\n\[\[PPB_[A-Z_]+:[^\]]+\]\]/g, "").trim();
}

export const markers = {
  account(account: Omit<AccountReference, "id">): string {
    return `\n[[PPB_BANK_ACCOUNT:${encodeURIComponent(account.name)}:${encodeURIComponent(account.provider)}]]` +
      `\n[[PPB_ACCOUNT_META:${account.type}:${moneyMarker(account.maintainingBalance)}]]`;
  },
  bankCharge(accountId: number): string {
    return `\n[[PPB_CHARGE:bank:${accountId}]]`;
  },
  cardCharge(cardId: number): string {
    return `\n[[PPB_CHARGE:credit_card:${cardId}]]`;
  },
  debt(debt: DebtReference): string {
    return `\n[[PPB_DEBT:${debt.type}:${debt.id}]]`;
  },
  debtCharge(debt: DebtReference, chargeType: string): string {
    return `\n[[PPB_DEBT_CHARGE:${debt.type}:${debt.id}:${encodeURIComponent(chargeType)}]]`;
  },
  due(dueDate: string): string {
    return `\n[[PPB_DUE:${dueDate}]]`;
  },
  duePaid(debt: DebtReference, dueDate: string): string {
    return `\n[[PPB_DUE_PAID:${debt.type}:${debt.id}:${dueDate}]]`;
  },
  dueAdvanced(from: string, to: string): string {
    return `\n[[PPB_DUE_ADVANCED:${from}:${to}]]`;
  },
  previousStatement(amount: number): string {
    return `\n[[PPB_PREV_STATEMENT:${moneyMarker(amount)}]]`;
  },
  incomeBank(accountId: number, amount: number): string {
    return `\n[[PPB_INCOME_BANK:${accountId}:${moneyMarker(amount)}]]`;
  },
  savingsBank(accountId: number): string {
    return `\n[[PPB_SAVINGS_BANK:${accountId}]]`;
  }
};
