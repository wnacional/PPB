import type { AccountBalance } from "../domain/accounts.ts";
import type { CreditCard, Loan } from "../domain/models.ts";

export const demoAccounts: AccountBalance[] = [
  { id: 101, name: "Payroll Account", provider: "Sample Bank", type: "checking", openingBalance: 25000, balance: 25000, maintainingBalance: 3000, availableAboveMinimum: 22000 },
  { id: 102, name: "Daily Wallet", provider: "Sample Wallet", type: "bank_wallet", openingBalance: 8500, balance: 8500, maintainingBalance: 500, availableAboveMinimum: 8000 }
];
export const demoLoans: Loan[] = [{ id: 201, user_id: "demo", name: "Sample Personal Loan", lender: "Sample Lender", original: 50000, balance: 10750, monthly: 10000, due: "2026-08-18" }];
export const demoCards: CreditCard[] = [{ id: 301, user_id: "demo", name: "Sample Rewards Card", issuer: "Sample Bank", credit_limit: 30000, current_balance: 5450, statement_balance: 5450, minimum_payment: 500, statement_day: 5, due_day: 25 }];
export const demoCharges = { "loan:201": 750, "credit_card:301": 450 };
