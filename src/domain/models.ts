export type Money = number;
export type TransactionKind = "income" | "expense";
export type DebtType = "loan" | "credit_card";
export type AccountType = "bank_wallet" | "checking" | "cash";

export interface Transaction {
  id: number;
  user_id: string;
  kind: TransactionKind;
  amount: Money;
  category: string;
  note: string;
  date: string;
  created_at?: string;
}

export interface Loan {
  id: number;
  user_id: string;
  name: string;
  lender: string;
  original: Money;
  balance: Money;
  monthly: Money;
  due: string;
  created_at?: string;
}

export interface CreditCard {
  id: number;
  user_id: string;
  name: string;
  issuer: string;
  credit_limit: Money;
  current_balance: Money;
  statement_balance: Money;
  minimum_payment: Money;
  statement_day: number;
  due_day: number;
  created_at?: string;
}

export interface DebtAdjustment {
  id: number;
  user_id: string;
  debt_type: DebtType;
  loan_id: number | null;
  credit_card_id: number | null;
  adjustment_type: string;
  amount: Money;
  signed_amount: Money;
  effective_date: string;
  due_date: string;
  source_transaction_id: number | null;
  status: "posted" | "void";
}

export interface PaymentAllocation {
  id: number;
  user_id: string;
  payment_id: number;
  adjustment_id: number | null;
  component: PaymentComponent;
  amount: Money;
}

export interface AccountReference {
  id: number;
  name: string;
  provider: string;
  type: AccountType;
  maintainingBalance: Money;
}

export interface DebtReference {
  type: DebtType;
  id: number;
}

export type PaymentComponent =
  | "principal"
  | "interest"
  | "finance_charge"
  | "late_fee"
  | "penalty"
  | "fee"
  | "other";

export interface DebtChargeInput {
  userId: string;
  debt: DebtReference;
  debtName: string;
  chargeType: string;
  amount: Money;
  dueDate: string;
  note?: string;
  transactionId: number;
  transactionDate: string;
}

export interface DebtPaymentInput {
  userId: string;
  debt: DebtReference;
  debtName: string;
  accountId: number;
  amount: Money;
  dueDate: string;
  transactionId: number;
  transactionDate: string;
  previousStatementBalance?: Money;
  advancedDueDate?: string;
}
