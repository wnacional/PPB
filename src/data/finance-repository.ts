import type { CreditCard, DebtChargeInput, DebtPaymentInput, Loan, Transaction } from "../domain/models.ts";

export interface AtomicDebtChangeResult {
  transactionId: number;
  previousBalance: number;
  currentBalance: number;
}

export interface LoanBalanceUpdate {
  balance: number;
  due?: string;
}

export interface CreditCardBalanceUpdate {
  current_balance: number;
  statement_balance: number;
}

export interface FinanceRepository {
  recordDebtChargeAtomic?(input: DebtChargeInput, transaction: Transaction): Promise<AtomicDebtChangeResult>;
  recordDebtPaymentAtomic?(input: DebtPaymentInput, transaction: Transaction): Promise<AtomicDebtChangeResult>;
  getLoan(userId: string, loanId: number): Promise<Loan>;
  getCreditCard(userId: string, cardId: number): Promise<CreditCard>;
  insertTransaction(transaction: Transaction): Promise<void>;
  deleteTransaction(userId: string, transactionId: number): Promise<void>;
  updateLoan(userId: string, loanId: number, values: LoanBalanceUpdate): Promise<void>;
  updateCreditCard(
    userId: string,
    cardId: number,
    values: CreditCardBalanceUpdate
  ): Promise<void>;
}
