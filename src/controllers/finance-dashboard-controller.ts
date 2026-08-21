import { deriveAccounts, type AccountBalance } from "../domain/accounts.ts";
import { sumStructuredUnpaidDebtCharges, sumUnpaidDebtCharges } from "../domain/debts.ts";
import type { CreditCard, DebtAdjustment, Loan, PaymentAllocation, Transaction } from "../domain/models.ts";
import { SupabaseFinanceRepository, type SupabaseClientLike } from "../data/supabase-finance-repository.ts";
import { DebtAccountingService } from "../services/debt-accounting-service.ts";

interface AuthUser { id: string; email?: string; }
interface AuthClient { auth: { getUser(): Promise<{ data: { user: AuthUser | null }; error: { message?: string } | null }> }; }
type DashboardClient = SupabaseClientLike & AuthClient;

export interface FinanceDashboardSnapshot {
  userId: string;
  email: string;
  transactions: Transaction[];
  accounts: AccountBalance[];
  loans: Loan[];
  creditCards: CreditCard[];
  chargesByDebt: Record<string, number>;
  diagnostics: { transactionCount: number; loanCount: number; creditCardCount: number; errors: string[] };
}

export class FinanceDashboardController {
  private readonly accounting: DebtAccountingService;

  constructor(private readonly client: DashboardClient) {
    this.accounting = new DebtAccountingService(new SupabaseFinanceRepository(client));
  }

  async load(): Promise<FinanceDashboardSnapshot> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw new Error(error?.message || "Sign in to load your budget.");
    const userId = data.user.id;
    const [transactionsResult, loansResult, cardsResult, adjustmentsResult, allocationsResult] = await Promise.all([
      this.client.from("transactions").select("id,user_id,kind,amount,category,note,date,created_at").eq("user_id", userId).order("date", { ascending: false }),
      this.client.from("loans").select("id,user_id,name,lender,original,balance,monthly,due,created_at").eq("user_id", userId).order("created_at", { ascending: false }),
      this.client.from("credit_cards").select("id,user_id,name,issuer,credit_limit,current_balance,statement_balance,minimum_payment,statement_day,due_day,created_at").eq("user_id", userId).order("created_at", { ascending: false }),
      this.client.from("debt_adjustments").select("id,user_id,debt_type,loan_id,credit_card_id,adjustment_type,amount,signed_amount,effective_date,due_date,source_transaction_id,status").eq("user_id", userId).eq("status", "posted"),
      this.client.from("payment_allocations").select("id,user_id,payment_id,adjustment_id,component,amount").eq("user_id", userId)
    ]);
    const errors = [queryError(transactionsResult, "transactions"), queryError(loansResult, "loans"), queryError(cardsResult, "credit cards")].filter(Boolean) as string[];
    const transactions = (transactionsResult.data || []).map(normalizeTransaction);
    const loans = (loansResult.data || []).map(normalizeLoan);
    const creditCards = (cardsResult.data || []).map(normalizeCard);
    const structuredAvailable = !adjustmentsResult.error && !allocationsResult.error;
    const adjustments = structuredAvailable ? (adjustmentsResult.data || []).map(normalizeAdjustment) : [];
    const allocations = structuredAvailable ? (allocationsResult.data || []).map(normalizeAllocation) : [];
    const structuredTransactionIds = new Set<number>(adjustments.flatMap((item: DebtAdjustment) => item.source_transaction_id === null ? [] : [item.source_transaction_id]));
    const chargesByDebt: Record<string, number> = {};
    for (const loan of loans) chargesByDebt[`loan:${loan.id}`] = sumStructuredUnpaidDebtCharges(adjustments, allocations, "loan", loan.id) + sumUnpaidDebtCharges(transactions, "loan", loan.id, structuredTransactionIds);
    for (const card of creditCards) chargesByDebt[`credit_card:${card.id}`] = sumStructuredUnpaidDebtCharges(adjustments, allocations, "credit_card", card.id) + sumUnpaidDebtCharges(transactions, "credit_card", card.id, structuredTransactionIds);
    return { userId, email: data.user.email || "", transactions, accounts: deriveAccounts(transactions), loans, creditCards, chargesByDebt, diagnostics: { transactionCount: transactions.length, loanCount: loans.length, creditCardCount: creditCards.length, errors } };
  }

  async recordCharge(snapshot: FinanceDashboardSnapshot, debt: { type: "loan" | "credit_card"; id: number; name: string }, value: { chargeType: string; amount: number; dueDate: string; note: string }): Promise<void> {
    await this.accounting.recordCharge({ userId: snapshot.userId, debt: { type: debt.type, id: debt.id }, debtName: debt.name, chargeType: value.chargeType, amount: value.amount, dueDate: value.dueDate, note: value.note, transactionId: Date.now(), transactionDate: today() });
  }

  async recordPayment(snapshot: FinanceDashboardSnapshot, debt: { type: "loan" | "credit_card"; id: number; name: string; dueDate: string }, value: { accountId: number; amount: number }): Promise<void> {
    const account = snapshot.accounts.find((item) => item.id === value.accountId);
    if (!account) throw new Error("Select a valid payment account.");
    await this.accounting.recordPayment({ userId: snapshot.userId, debt: { type: debt.type, id: debt.id }, debtName: debt.name, accountId: account.id, amount: value.amount, dueDate: debt.dueDate, transactionId: Date.now(), transactionDate: today() }, account.balance);
  }
}

function queryError(result: { error: { message?: string } | null }, label: string): string | null { return result.error ? result.error.message || `Could not load ${label}.` : null; }
function normalizeTransaction(row: any): Transaction { return { ...row, id: Number(row.id), amount: Number(row.amount) }; }
function normalizeLoan(row: any): Loan { return { ...row, id: Number(row.id), original: Number(row.original), balance: Number(row.balance), monthly: Number(row.monthly) }; }
function normalizeCard(row: any): CreditCard { return { ...row, id: Number(row.id), credit_limit: Number(row.credit_limit), current_balance: Number(row.current_balance), statement_balance: Number(row.statement_balance), minimum_payment: Number(row.minimum_payment) }; }
function normalizeAdjustment(row: any): DebtAdjustment { return { ...row, id: Number(row.id), loan_id: row.loan_id === null ? null : Number(row.loan_id), credit_card_id: row.credit_card_id === null ? null : Number(row.credit_card_id), source_transaction_id: row.source_transaction_id === null ? null : Number(row.source_transaction_id), amount: Number(row.amount), signed_amount: Number(row.signed_amount) }; }
function normalizeAllocation(row: any): PaymentAllocation { return { ...row, id: Number(row.id), payment_id: Number(row.payment_id), adjustment_id: row.adjustment_id === null ? null : Number(row.adjustment_id), amount: Number(row.amount) }; }
function today(): string { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
