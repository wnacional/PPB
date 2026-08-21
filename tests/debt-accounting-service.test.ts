import assert from "node:assert/strict";
import test from "node:test";
import type {
  CreditCardBalanceUpdate,
  FinanceRepository,
  LoanBalanceUpdate
} from "../src/data/finance-repository.ts";
import type { CreditCard, Loan, Transaction } from "../src/domain/models.ts";
import { DebtAccountingService } from "../src/services/debt-accounting-service.ts";

class MemoryRepository implements FinanceRepository {
  recordDebtChargeAtomic?: FinanceRepository["recordDebtChargeAtomic"];
  recordDebtPaymentAtomic?: FinanceRepository["recordDebtPaymentAtomic"];
  loan: Loan = { id: 1, user_id: "u", name: "Home Loan", lender: "Bank", original: 100000, balance: 10000, monthly: 5000, due: "2026-08-18" };
  card: CreditCard = { id: 2, user_id: "u", name: "Card", issuer: "Bank", credit_limit: 50000, current_balance: 10000, statement_balance: 8000, minimum_payment: 500, statement_day: 5, due_day: 25 };
  transactions: Transaction[] = [];
  failTransactionInsert = false;

  async getLoan(): Promise<Loan> { return { ...this.loan }; }
  async getCreditCard(): Promise<CreditCard> { return { ...this.card }; }
  async insertTransaction(transaction: Transaction): Promise<void> {
    if (this.failTransactionInsert) throw new Error("insert failed");
    this.transactions.push(transaction);
  }
  async deleteTransaction(_userId: string, transactionId: number): Promise<void> {
    this.transactions = this.transactions.filter((item) => item.id !== transactionId);
  }
  async updateLoan(_userId: string, _loanId: number, values: LoanBalanceUpdate): Promise<void> {
    this.loan = { ...this.loan, ...values };
  }
  async updateCreditCard(_userId: string, _cardId: number, values: CreditCardBalanceUpdate): Promise<void> {
    this.card = { ...this.card, ...values };
  }
}

test("records a card finance charge in the debt and transaction ledger", async () => {
  const repository = new MemoryRepository();
  const service = new DebtAccountingService(repository);
  const result = await service.recordCharge({
    userId: "u",
    debt: { type: "credit_card", id: 2 },
    debtName: "Card",
    chargeType: "Finance charge",
    amount: 450,
    dueDate: "2026-09-05",
    transactionId: 10,
    transactionDate: "2026-08-21"
  });
  assert.equal(result.currentBalance, 10450);
  assert.equal(repository.card.statement_balance, 8450);
  assert.equal(repository.transactions.length, 1);
});

test("rolls back a debt balance when its transaction cannot be saved", async () => {
  const repository = new MemoryRepository();
  repository.failTransactionInsert = true;
  const service = new DebtAccountingService(repository);
  await assert.rejects(() => service.recordCharge({
    userId: "u",
    debt: { type: "loan", id: 1 },
    debtName: "Home Loan",
    chargeType: "Late-payment penalty",
    amount: 300,
    dueDate: "2026-08-18",
    transactionId: 11,
    transactionDate: "2026-08-21"
  }), /insert failed/);
  assert.equal(repository.loan.balance, 10000);
});

test("records a partial loan payment and leaves charges outstanding", async () => {
  const repository = new MemoryRepository();
  repository.loan.balance = 10750;
  const service = new DebtAccountingService(repository);
  const result = await service.recordPayment({
    userId: "u",
    debt: { type: "loan", id: 1 },
    debtName: "Home Loan",
    accountId: 99,
    amount: 10000,
    dueDate: "2026-08-18",
    transactionId: 12,
    transactionDate: "2026-08-21"
  }, 20000);
  assert.equal(result.currentBalance, 750);
  assert.equal(repository.loan.balance, 750);
  assert.equal(repository.transactions[0].amount, 10000);
});

test("prefers the atomic repository path when available", async () => {
  const repository = new MemoryRepository();
  let atomicCharges = 0, atomicPayments = 0;
  repository.recordDebtChargeAtomic = async (_input, transaction) => {
    atomicCharges++;
    return { transactionId: transaction.id, previousBalance: 10000, currentBalance: 10300 };
  };
  repository.recordDebtPaymentAtomic = async (_input, transaction) => {
    atomicPayments++;
    return { transactionId: transaction.id, previousBalance: 10300, currentBalance: 300 };
  };
  const service = new DebtAccountingService(repository);
  await service.recordCharge({ userId: "u", debt: { type: "loan", id: 1 }, debtName: "Home Loan", chargeType: "Late-payment penalty", amount: 300, dueDate: "2026-08-18", transactionId: 20, transactionDate: "2026-08-21" });
  await service.recordPayment({ userId: "u", debt: { type: "loan", id: 1 }, debtName: "Home Loan", accountId: 99, amount: 10000, dueDate: "2026-08-18", transactionId: 21, transactionDate: "2026-08-21" }, 20000);
  assert.equal(atomicCharges, 1);
  assert.equal(atomicPayments, 1);
  assert.equal(repository.transactions.length, 0);
});
