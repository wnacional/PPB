import { createDebtChargeTransaction } from "../domain/debts.ts";
import type { DebtChargeInput, DebtPaymentInput, Money } from "../domain/models.ts";
import { normalizeMoney } from "../domain/money.ts";
import { createDebtPaymentTransaction } from "../domain/payments.ts";
import type { FinanceRepository } from "../data/finance-repository.ts";

export class ReconciliationRequiredError extends Error {
  readonly causeError: unknown;
  readonly rollbackError: unknown;

  constructor(message: string, causeError: unknown, rollbackError: unknown) {
    super(message);
    this.name = "ReconciliationRequiredError";
    this.causeError = causeError;
    this.rollbackError = rollbackError;
  }
}

export interface RecordedDebtChange {
  transactionId: number;
  previousBalance: Money;
  currentBalance: Money;
}

export class DebtAccountingService {
  private readonly repository: FinanceRepository;

  constructor(repository: FinanceRepository) {
    this.repository = repository;
  }

  async recordCharge(input: DebtChargeInput): Promise<RecordedDebtChange> {
    const transaction = createDebtChargeTransaction(input);
    if (this.repository.recordDebtChargeAtomic) {
      return this.repository.recordDebtChargeAtomic(input, transaction);
    }

    if (input.debt.type === "loan") {
      const loan = await this.repository.getLoan(input.userId, input.debt.id);
      const previousBalance = Number(loan.balance);
      const currentBalance = normalizeMoney(previousBalance + transaction.amount);
      await this.repository.updateLoan(input.userId, loan.id, { balance: currentBalance });
      try {
        await this.repository.insertTransaction(transaction);
      } catch (error) {
        await this.rollbackOrEscalate(
          () => this.repository.updateLoan(input.userId, loan.id, { balance: previousBalance }),
          error,
          "The loan charge needs manual reconciliation."
        );
        throw error;
      }
      return { transactionId: transaction.id, previousBalance, currentBalance };
    }

    const card = await this.repository.getCreditCard(input.userId, input.debt.id);
    const previousBalance = Number(card.current_balance);
    const previousStatement = Number(card.statement_balance);
    const currentBalance = normalizeMoney(previousBalance + transaction.amount);
    const currentStatement = normalizeMoney(previousStatement + transaction.amount);
    await this.repository.updateCreditCard(input.userId, card.id, {
      current_balance: currentBalance,
      statement_balance: currentStatement
    });
    try {
      await this.repository.insertTransaction(transaction);
    } catch (error) {
      await this.rollbackOrEscalate(
        () => this.repository.updateCreditCard(input.userId, card.id, {
          current_balance: previousBalance,
          statement_balance: previousStatement
        }),
        error,
        "The credit-card charge needs manual reconciliation."
      );
      throw error;
    }
    return { transactionId: transaction.id, previousBalance, currentBalance };
  }

  async recordPayment(
    input: DebtPaymentInput,
    availableAccountBalance: number
  ): Promise<RecordedDebtChange> {
    const currentDebt = input.debt.type === "loan"
      ? Number((await this.repository.getLoan(input.userId, input.debt.id)).balance)
      : Number((await this.repository.getCreditCard(input.userId, input.debt.id)).current_balance);
    const atomicPayment = createDebtPaymentTransaction(input, currentDebt, availableAccountBalance);
    if (this.repository.recordDebtPaymentAtomic) {
      return this.repository.recordDebtPaymentAtomic(input, atomicPayment.transaction);
    }

    if (input.debt.type === "loan") {
      const loan = await this.repository.getLoan(input.userId, input.debt.id);
      const previousBalance = Number(loan.balance);
      const payment = createDebtPaymentTransaction(input, previousBalance, availableAccountBalance);
      await this.repository.insertTransaction(payment.transaction);
      try {
        await this.repository.updateLoan(input.userId, loan.id, {
          balance: payment.remainingDebt,
          ...(input.advancedDueDate ? { due: input.advancedDueDate } : {})
        });
      } catch (error) {
        await this.rollbackOrEscalate(
          () => this.repository.deleteTransaction(input.userId, payment.transaction.id),
          error,
          "The loan payment needs manual reconciliation."
        );
        throw error;
      }
      return {
        transactionId: payment.transaction.id,
        previousBalance,
        currentBalance: payment.remainingDebt
      };
    }

    const card = await this.repository.getCreditCard(input.userId, input.debt.id);
    const previousBalance = Number(card.current_balance);
    const previousStatement = Number(card.statement_balance);
    const paymentInput = {
      ...input,
      previousStatementBalance: input.previousStatementBalance ?? previousStatement
    };
    const payment = createDebtPaymentTransaction(paymentInput, previousBalance, availableAccountBalance);
    const nextStatement = normalizeMoney(Math.max(0, previousStatement - payment.amountPaid));
    await this.repository.insertTransaction(payment.transaction);
    try {
      await this.repository.updateCreditCard(input.userId, card.id, {
        current_balance: payment.remainingDebt,
        statement_balance: nextStatement
      });
    } catch (error) {
      await this.rollbackOrEscalate(
        () => this.repository.deleteTransaction(input.userId, payment.transaction.id),
        error,
        "The credit-card payment needs manual reconciliation."
      );
      throw error;
    }
    return {
      transactionId: payment.transaction.id,
      previousBalance,
      currentBalance: payment.remainingDebt
    };
  }

  private async rollbackOrEscalate(
    rollback: () => Promise<void>,
    causeError: unknown,
    message: string
  ): Promise<void> {
    try {
      await rollback();
    } catch (rollbackError) {
      throw new ReconciliationRequiredError(message, causeError, rollbackError);
    }
  }
}
