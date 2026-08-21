import type { CreditCard, Loan, Transaction } from "../domain/models.ts";
import type {
  CreditCardBalanceUpdate,
  FinanceRepository,
  LoanBalanceUpdate
} from "./finance-repository.ts";

interface QueryResult<T> {
  data: T | null;
  error: { message?: string } | null;
}

export interface SupabaseClientLike {
  from(table: string): any;
  rpc(functionName: string, args: Record<string, unknown>): Promise<QueryResult<any>>;
}

export class SupabaseFinanceRepository implements FinanceRepository {
  private readonly client: SupabaseClientLike;

  constructor(client: SupabaseClientLike) {
    this.client = client;
  }

  async recordDebtChargeAtomic(input: import("../domain/models.ts").DebtChargeInput, transaction: Transaction) {
    const result = await this.client.rpc("record_debt_adjustment", {
      p_user_id: input.userId,
      p_debt_type: input.debt.type,
      p_debt_id: input.debt.id,
      p_adjustment_type: adjustmentTypeKey(input.chargeType),
      p_amount: transaction.amount,
      p_effective_date: transaction.date,
      p_due_date: input.dueDate,
      p_description: input.note?.trim() || input.chargeType,
      p_transaction_id: transaction.id,
      p_transaction_category: transaction.category,
      p_transaction_note: transaction.note,
      p_reverses_adjustment_id: null
    });
    const data = requireData(result, "recorded debt adjustment");
    return { transactionId: Number(data.transaction_id), previousBalance: Number(data.previous_balance), currentBalance: Number(data.current_balance) };
  }

  async recordDebtPaymentAtomic(input: import("../domain/models.ts").DebtPaymentInput, transaction: Transaction) {
    const result = await this.client.rpc("record_debt_payment", {
      p_user_id: input.userId,
      p_debt_type: input.debt.type,
      p_debt_id: input.debt.id,
      p_amount: transaction.amount,
      p_payment_date: transaction.date,
      p_due_date: input.dueDate,
      p_source_account_key: String(input.accountId),
      p_transaction_id: transaction.id,
      p_transaction_category: transaction.category,
      p_transaction_note: transaction.note,
      p_advanced_due_date: input.advancedDueDate || null
    });
    const data = requireData(result, "recorded debt payment");
    return { transactionId: Number(data.transaction_id), previousBalance: Number(data.previous_balance), currentBalance: Number(data.current_balance) };
  }

  async getLoan(userId: string, loanId: number): Promise<Loan> {
    const result = await this.client
      .from("loans")
      .select("id,user_id,name,lender,original,balance,monthly,due,created_at")
      .eq("id", loanId)
      .eq("user_id", userId)
      .single() as QueryResult<Loan>;
    return requireData(result, "loan");
  }

  async getCreditCard(userId: string, cardId: number): Promise<CreditCard> {
    const result = await this.client
      .from("credit_cards")
      .select("id,user_id,name,issuer,credit_limit,current_balance,statement_balance,minimum_payment,statement_day,due_day,created_at")
      .eq("id", cardId)
      .eq("user_id", userId)
      .single() as QueryResult<CreditCard>;
    return requireData(result, "credit card");
  }

  async insertTransaction(transaction: Transaction): Promise<void> {
    const { created_at: _createdAt, ...row } = transaction;
    const result = await this.client.from("transactions").insert(row) as QueryResult<unknown>;
    requireSuccess(result, "save the transaction");
  }

  async deleteTransaction(userId: string, transactionId: number): Promise<void> {
    const result = await this.client
      .from("transactions")
      .delete()
      .eq("id", transactionId)
      .eq("user_id", userId) as QueryResult<unknown>;
    requireSuccess(result, "reverse the transaction");
  }

  async updateLoan(userId: string, loanId: number, values: LoanBalanceUpdate): Promise<void> {
    const result = await this.client
      .from("loans")
      .update(values)
      .eq("id", loanId)
      .eq("user_id", userId) as QueryResult<unknown>;
    requireSuccess(result, "update the loan");
  }

  async updateCreditCard(
    userId: string,
    cardId: number,
    values: CreditCardBalanceUpdate
  ): Promise<void> {
    const result = await this.client
      .from("credit_cards")
      .update(values)
      .eq("id", cardId)
      .eq("user_id", userId) as QueryResult<unknown>;
    requireSuccess(result, "update the credit card");
  }
}

function adjustmentTypeKey(label: string): string {
  const values: Record<string, string> = {
    "Finance charge": "finance_charge", "Late-payment fee": "late_fee",
    "Late-payment penalty": "late_fee", "Over-limit fee": "over_limit_fee",
    "Annual fee": "annual_fee", "Additional interest": "additional_interest",
    "Collection fee": "collection_fee", "Restructuring fee": "restructuring_fee",
    "Other loan charge": "other_charge", "Other card charge": "other_charge"
  };
  return values[label] || "other_charge";
}

function requireData<T>(result: QueryResult<T>, recordName: string): T {
  if (result.error || !result.data) {
    throw new Error(result.error?.message || `Could not load the ${recordName}.`);
  }
  return result.data;
}

function requireSuccess(result: QueryResult<unknown>, action: string): void {
  if (result.error) throw new Error(result.error.message || `Could not ${action}.`);
}
