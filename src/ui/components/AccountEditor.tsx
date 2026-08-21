import { useMemo, useState, type FormEvent } from "react";
import type { AccountReference, AccountType } from "../../domain/models.ts";
import { validateMaintainingBalance } from "../../domain/accounts.ts";

export interface AccountEditorValue extends Omit<AccountReference, "id"> {
  balance: number;
}

interface Props {
  initialValue?: AccountEditorValue;
  busy?: boolean;
  onCancel(): void;
  onSave(value: AccountEditorValue): Promise<void> | void;
}

const emptyAccount: AccountEditorValue = {
  name: "",
  provider: "",
  type: "bank_wallet",
  balance: 0,
  maintainingBalance: 0
};

export function AccountEditor({ initialValue = emptyAccount, busy = false, onCancel, onSave }: Props) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");
  const supportsMaintainingBalance = value.type !== "cash";
  const availableAboveMinimum = useMemo(
    () => Math.max(0, Number(value.balance || 0) - Number(value.maintainingBalance || 0)),
    [value.balance, value.maintainingBalance]
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const maintainingBalance = validateMaintainingBalance(
        value.type,
        Number(value.balance),
        supportsMaintainingBalance ? Number(value.maintainingBalance) : 0
      );
      if (!value.name.trim() || !value.provider.trim()) {
        throw new Error("Enter both the account name and provider.");
      }
      await onSave({ ...value, maintainingBalance });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the account.");
    }
  }

  function update<K extends keyof AccountEditorValue>(key: K, next: AccountEditorValue[K]) {
    setValue((current) => ({ ...current, [key]: next }));
  }

  return (
    <form className="ppb-form" onSubmit={submit}>
      <header><p className="eyebrow">FINANCIAL ACCOUNT</p><h2>{initialValue.name ? "Edit account" : "Add account"}</h2></header>
      <label>Account type
        <select value={value.type} onChange={(event) => update("type", event.target.value as AccountType)} disabled={busy}>
          <option value="bank_wallet">Bank or e-wallet</option>
          <option value="checking">Checking account</option>
          <option value="cash">Cash on hand</option>
        </select>
      </label>
      <div className="form-grid">
        <label>Account name<input value={value.name} onChange={(event) => update("name", event.target.value)} disabled={busy} required /></label>
        <label>Bank or provider<input value={value.provider} onChange={(event) => update("provider", event.target.value)} disabled={busy} required /></label>
      </div>
      <label>Current balance<input type="number" min="0" step="0.01" inputMode="decimal" value={value.balance} onChange={(event) => update("balance", Number(event.target.value))} disabled={busy} required /></label>
      {supportsMaintainingBalance && (
        <label>Maintaining balance (optional)
          <input type="number" min="0" step="0.01" inputMode="decimal" value={value.maintainingBalance} onChange={(event) => update("maintainingBalance", Number(event.target.value))} disabled={busy} />
          <small>Available above maintaining balance: ₱{availableAboveMinimum.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</small>
        </label>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary" disabled={busy}>{busy ? "Saving…" : "Save account"}</button>
      <button className="secondary" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
    </form>
  );
}
