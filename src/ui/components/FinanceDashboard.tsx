import { useMemo, useState } from "react";
import type { AccountBalance } from "../../domain/accounts.ts";
import type { CreditCard, DebtReference, Loan } from "../../domain/models.ts";
import { calculateDashboardTotals } from "../dashboard-view-model.ts";
import { DebtChargeForm, type DebtChargeFormValue } from "./DebtChargeForm.tsx";
import { PaymentDialog } from "./PaymentDialog.tsx";

interface DebtSelection extends DebtReference {
  name: string;
  balance: number;
  scheduledAmount: number;
  assessedCharges: number;
  dueDate: string;
}

interface Props {
  accounts: AccountBalance[];
  loans: Loan[];
  creditCards: CreditCard[];
  chargesByDebt: Record<string, number>;
  busy?: boolean;
  readOnly?: boolean;
  diagnostics?: { email: string; userId: string; transactionCount: number; loanCount: number; creditCardCount: number; errors: string[] };
  onRefresh(): Promise<void> | void;
  onManualRefresh?(): Promise<void> | void;
  onRecordCharge(debt: DebtSelection, value: DebtChargeFormValue): Promise<void> | void;
  onRecordPayment(debt: DebtSelection, value: { accountId: number; amount: number }): Promise<void> | void;
}

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const keyOf = (type: DebtReference["type"], id: number) => `${type}:${id}`;

export function FinanceDashboard(props: Props) {
  const [chargeDebt, setChargeDebt] = useState<DebtSelection | null>(null);
  const [paymentDebt, setPaymentDebt] = useState<DebtSelection | null>(null);
  const totals = useMemo(() => calculateDashboardTotals(props.accounts, props.loans, props.creditCards), [props.accounts, props.loans, props.creditCards]);

  const loans = props.loans.map((loan): DebtSelection => {
    const assessedCharges = props.chargesByDebt[keyOf("loan", loan.id)] || 0;
    return {
      type: "loan", id: loan.id, name: loan.name, balance: Number(loan.balance),
      scheduledAmount: Math.min(Number(loan.monthly), Math.max(0, Number(loan.balance) - assessedCharges)),
      assessedCharges, dueDate: loan.due
    };
  });
  const cards = props.creditCards.map((card): DebtSelection => {
    const assessedCharges = props.chargesByDebt[keyOf("credit_card", card.id)] || 0;
    const statementBeforeCharges = Math.max(0, Number(card.statement_balance) - assessedCharges);
    return {
      type: "credit_card", id: card.id, name: card.name, balance: Number(card.current_balance),
      scheduledAmount: Math.min(statementBeforeCharges || Number(card.minimum_payment), Number(card.current_balance)),
      assessedCharges,
      dueDate: nextCardDueDate(card.due_day)
    };
  });

  async function saveCharge(value: DebtChargeFormValue) {
    if (!chargeDebt) return;
    await props.onRecordCharge(chargeDebt, value);
    setChargeDebt(null);
    await props.onRefresh();
  }

  async function savePayment(value: { accountId: number; amount: number }) {
    if (!paymentDebt) return;
    await props.onRecordPayment(paymentDebt, value);
    setPaymentDebt(null);
    await props.onRefresh();
  }

  return <main className="finance-dashboard">
    <header className="dashboard-heading"><div><p className="eyebrow">PINOY POCKET BUDGET</p><h1>Your money overview</h1></div><button onClick={() => (props.onManualRefresh || props.onRefresh)()} disabled={props.busy}>Refresh</button></header>
    {props.readOnly && props.diagnostics && <aside className="diagnostic-panel"><strong>Read-only diagnostic mode</strong><span>Signed in: {props.diagnostics.email || "Email unavailable"}</span><span>User ID: <code>{props.diagnostics.userId}</code></span><span>Records — Transactions: {props.diagnostics.transactionCount}, Loans: {props.diagnostics.loanCount}, Credit cards: {props.diagnostics.creditCardCount}</span>{props.diagnostics.errors.length ? <ul>{props.diagnostics.errors.map(error => <li key={error}>{error}</li>)}</ul> : <span>No Supabase query errors reported.</span>}<small>Charge and payment actions are disabled.</small></aside>}
    <section className="summary-grid" aria-label="Financial summary">
      <Summary label="Total available funds" value={totals.totalAvailableFunds} />
      <Summary label="Protected maintaining balance" value={totals.totalProtectedMinimum} />
      <Summary label="Total debt" value={totals.totalDebt} />
    </section>
    <section><h2>Accounts</h2><div className="dashboard-grid">{props.accounts.map((account) => <article className="dashboard-card" key={account.id}><p>{account.provider}</p><h3>{account.name}</h3><strong>{peso.format(account.balance)}</strong>{account.type !== "cash" && <small>{peso.format(account.availableAboveMinimum)} available above minimum</small>}</article>)}</div></section>
    <DebtSection title="Loans" debts={loans} readOnly={props.readOnly} onCharge={setChargeDebt} onPayment={setPaymentDebt} />
    <DebtSection title="Credit cards" debts={cards} readOnly={props.readOnly} onCharge={setChargeDebt} onPayment={setPaymentDebt} />
    {chargeDebt && <div className="dashboard-modal" role="dialog" aria-modal="true"><DebtChargeForm debtType={chargeDebt.type} debtName={chargeDebt.name} currentBalance={chargeDebt.balance} defaultDueDate={chargeDebt.dueDate} busy={props.busy} onCancel={() => setChargeDebt(null)} onSubmit={saveCharge} /></div>}
    {paymentDebt && <div className="dashboard-modal" role="dialog" aria-modal="true"><PaymentDialog debtName={paymentDebt.name} scheduledAmount={paymentDebt.scheduledAmount} assessedCharges={paymentDebt.assessedCharges} accounts={props.accounts.map(({ id, name, provider, balance }) => ({ id, name, provider, balance }))} busy={props.busy} onCancel={() => setPaymentDebt(null)} onConfirm={savePayment} /></div>}
  </main>;
}

function Summary({ label, value }: { label: string; value: number }) { return <article className="summary-card"><span>{label}</span><strong>{peso.format(value)}</strong></article>; }
function DebtSection({ title, debts, readOnly, onCharge, onPayment }: { title: string; debts: DebtSelection[]; readOnly?: boolean; onCharge(value: DebtSelection): void; onPayment(value: DebtSelection): void }) {
  return <section><h2>{title}</h2><div className="dashboard-grid">{debts.map((debt) => <article className="dashboard-card" key={keyOf(debt.type, debt.id)}><h3>{debt.name}</h3><strong>{peso.format(debt.balance)}</strong>{debt.assessedCharges > 0 && <small>{peso.format(debt.assessedCharges)} in recorded charges</small>}<div className="card-actions"><button onClick={() => onCharge(debt)} disabled={readOnly}>Add charge</button><button className="primary" onClick={() => onPayment(debt)} disabled={readOnly || debt.balance <= 0}>Record payment</button></div></article>)}</div></section>;
}
function nextCardDueDate(dueDay: number): string { const now = new Date(); const date = new Date(now.getFullYear(), now.getMonth(), Math.min(dueDay, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())); if (date < new Date(now.getFullYear(), now.getMonth(), now.getDate())) date.setMonth(date.getMonth() + 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
