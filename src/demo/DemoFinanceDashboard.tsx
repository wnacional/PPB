import { useState } from "react";
import type { AccountBalance } from "../domain/accounts.ts";
import type { CreditCard, Loan } from "../domain/models.ts";
import { normalizeMoney } from "../domain/money.ts";
import { FinanceDashboard } from "../ui/components/FinanceDashboard.tsx";
import { demoAccounts, demoCards, demoCharges, demoLoans } from "./demo-data.ts";

export function DemoFinanceDashboard() {
  const [accounts, setAccounts] = useState<AccountBalance[]>(structuredClone(demoAccounts));
  const [loans, setLoans] = useState<Loan[]>(structuredClone(demoLoans));
  const [cards, setCards] = useState<CreditCard[]>(structuredClone(demoCards));
  const [charges, setCharges] = useState<Record<string, number>>({ ...demoCharges });

  return <><div className="demo-banner"><strong>Local demo mode</strong><span>Sample data only. Nothing is read from or written to Supabase.</span><span>Refresh the page to reset the demo.</span></div><FinanceDashboard accounts={accounts} loans={loans} creditCards={cards} chargesByDebt={charges} onRefresh={() => {}} onManualRefresh={() => location.reload()} onRecordCharge={async (debt, value) => {
    const amount = normalizeMoney(value.amount); const key = `${debt.type}:${debt.id}`;
    setCharges(current => ({ ...current, [key]: normalizeMoney((current[key] || 0) + amount) }));
    if (debt.type === "loan") setLoans(current => current.map(item => item.id === debt.id ? { ...item, balance: normalizeMoney(Number(item.balance) + amount) } : item));
    else setCards(current => current.map(item => item.id === debt.id ? { ...item, current_balance: normalizeMoney(Number(item.current_balance) + amount), statement_balance: normalizeMoney(Number(item.statement_balance) + amount) } : item));
  }} onRecordPayment={async (debt, value) => {
    const account = accounts.find(item => item.id === value.accountId); if (!account || value.amount > account.balance) throw Error("Payment exceeds the demo account balance.");
    setAccounts(current => current.map(item => item.id === value.accountId ? { ...item, balance: normalizeMoney(item.balance - value.amount), availableAboveMinimum: normalizeMoney(Math.max(0, item.balance - value.amount - item.maintainingBalance)) } : item));
    const key = `${debt.type}:${debt.id}`; const amountAppliedToCharges = Math.max(0, value.amount - debt.scheduledAmount); setCharges(current => ({ ...current, [key]: normalizeMoney(Math.max(0, (current[key] || 0) - amountAppliedToCharges)) }));
    if (debt.type === "loan") setLoans(current => current.map(item => item.id === debt.id ? { ...item, balance: normalizeMoney(Math.max(0, Number(item.balance) - value.amount)) } : item));
    else setCards(current => current.map(item => item.id === debt.id ? { ...item, current_balance: normalizeMoney(Math.max(0, Number(item.current_balance) - value.amount)), statement_balance: normalizeMoney(Math.max(0, Number(item.statement_balance) - value.amount)) } : item));
  }} /></>;
}
