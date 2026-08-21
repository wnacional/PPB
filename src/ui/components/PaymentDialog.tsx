import { useMemo, useState, type FormEvent } from "react";
import { calculatePaymentBreakdown } from "../payment-breakdown.ts";

interface PaymentAccount { id: number; name: string; provider: string; balance: number; }

interface Props {
  debtName: string;
  scheduledAmount: number;
  assessedCharges: number;
  accounts: PaymentAccount[];
  busy?: boolean;
  onCancel(): void;
  onConfirm(value: { accountId: number; amount: number }): Promise<void> | void;
}

export function PaymentDialog(props: Props) {
  const totalDue = props.scheduledAmount + props.assessedCharges;
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState(totalDue);
  const breakdown = useMemo(() => calculatePaymentBreakdown({ scheduledAmount: props.scheduledAmount, assessedCharges: props.assessedCharges, amountBeingPaid: Math.max(0.01, amount) }), [props.scheduledAmount, props.assessedCharges, amount]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await props.onConfirm({ accountId: Number(accountId), amount: breakdown.amountBeingPaid });
  }

  return (
    <form className="ppb-form" onSubmit={submit}>
      <header><p className="eyebrow">RECORD PAYMENT</p><h2>{props.debtName}</h2></header>
      <dl className="payment-math">
        <div><dt>Scheduled amount</dt><dd>₱{breakdown.scheduledAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</dd></div>
        <div><dt>Finance charges and penalties</dt><dd>₱{breakdown.assessedCharges.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</dd></div>
        <div className="total"><dt>Total currently due</dt><dd>₱{breakdown.totalCurrentlyDue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</dd></div>
      </dl>
      <label>Amount being paid<input type="number" min="0.01" max={totalDue} step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(Number(event.target.value))} required disabled={props.busy} /></label>
      <label>Deduct payment from<select value={accountId} onChange={(event) => setAccountId(event.target.value)} required disabled={props.busy}><option value="">Select an account</option>{props.accounts.map((account) => <option key={account.id} value={account.id}>{account.provider} · {account.name} (₱{account.balance.toLocaleString("en-PH", { minimumFractionDigits: 2 })})</option>)}</select></label>
      <p className={breakdown.fullyPaid ? "payment-status paid" : "payment-status remaining"}>{breakdown.fullyPaid ? "This payment clears the current amount due." : `Remaining due after payment: ₱${breakdown.remainingDue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}. Reminders remain active.`}</p>
      <p className="form-note">The charge was already recorded as an expense. This payment reduces the selected account and debt without counting the charge twice.</p>
      <button className="primary" disabled={props.busy || !accountId}>{props.busy ? "Recording…" : "Record payment"}</button>
      <button className="secondary" type="button" onClick={props.onCancel} disabled={props.busy}>Cancel</button>
    </form>
  );
}
