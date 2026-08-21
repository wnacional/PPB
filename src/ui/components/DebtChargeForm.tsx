import { useState, type FormEvent } from "react";
import { creditCardChargeTypes, loanChargeTypes } from "../../domain/debts.ts";
import type { DebtType } from "../../domain/models.ts";

export interface DebtChargeFormValue {
  chargeType: string;
  amount: number;
  dueDate: string;
  note: string;
}

interface Props {
  debtType: DebtType;
  debtName: string;
  currentBalance: number;
  defaultDueDate: string;
  busy?: boolean;
  onCancel(): void;
  onSubmit(value: DebtChargeFormValue): Promise<void> | void;
}

export function DebtChargeForm(props: Props) {
  const chargeTypes = props.debtType === "loan" ? loanChargeTypes : creditCardChargeTypes;
  const [value, setValue] = useState<DebtChargeFormValue>({ chargeType: chargeTypes[0], amount: 0, dueDate: props.defaultDueDate, note: "" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await props.onSubmit(value);
  }

  return (
    <form className="ppb-form" onSubmit={submit}>
      <header><p className="eyebrow">DEBT ADJUSTMENT</p><h2>Add charge to {props.debtName}</h2></header>
      <p className="form-notice">Enter the actual amount assessed by the lender. This increases the debt but does not reduce available funds until payment is recorded.</p>
      <label>Charge type<select value={value.chargeType} onChange={(event) => setValue({ ...value, chargeType: event.target.value })} disabled={props.busy}>{chargeTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
      <label>Amount<input type="number" min="0.01" step="0.01" inputMode="decimal" value={value.amount || ""} onChange={(event) => setValue({ ...value, amount: Number(event.target.value) })} required disabled={props.busy} /></label>
      <label>Due date<input type="date" value={value.dueDate} onChange={(event) => setValue({ ...value, dueDate: event.target.value })} required disabled={props.busy} /></label>
      <label>Note (optional)<textarea rows={3} value={value.note} onChange={(event) => setValue({ ...value, note: event.target.value })} disabled={props.busy} /></label>
      <dl className="payment-math"><div><dt>Current debt</dt><dd>₱{props.currentBalance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</dd></div><div><dt>New debt</dt><dd>₱{(props.currentBalance + Number(value.amount || 0)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</dd></div></dl>
      <button className="primary" disabled={props.busy}>{props.busy ? "Recording…" : "Record charge"}</button>
      <button className="secondary" type="button" onClick={props.onCancel} disabled={props.busy}>Cancel</button>
    </form>
  );
}
