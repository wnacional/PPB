import type { SupabaseClientLike } from "../../data/supabase-finance-repository.ts";
import { useFinanceDashboard } from "../../controllers/use-finance-dashboard.ts";
import { FinanceDashboard } from "./FinanceDashboard.tsx";

export function AuthenticatedFinanceDashboard({ client }: { client: SupabaseClientLike & { auth: any } }) {
  const state = useFinanceDashboard(client);
  if (state.busy && !state.snapshot) return <main className="dashboard-state">Loading your private budget…</main>;
  if (state.error && !state.snapshot) return <main className="dashboard-state error" role="alert">{state.error}<button onClick={() => state.refresh()}>Try again</button></main>;
  if (!state.snapshot) return null;
  return <><FinanceDashboard readOnly diagnostics={{ email: state.snapshot.email, userId: state.snapshot.userId, ...state.snapshot.diagnostics }} accounts={state.snapshot.accounts} loans={state.snapshot.loans} creditCards={state.snapshot.creditCards} chargesByDebt={state.snapshot.chargesByDebt} busy={state.busy} onRefresh={state.refresh} onRecordCharge={async (debt, value) => { state.setBusy(true); state.setError(""); try { await state.controller.recordCharge(state.snapshot!, debt, value); } catch (reason) { state.setError(reason instanceof Error ? reason.message : "Could not record the charge."); throw reason; } finally { state.setBusy(false); } }} onRecordPayment={async (debt, value) => { state.setBusy(true); state.setError(""); try { await state.controller.recordPayment(state.snapshot!, debt, value); } catch (reason) { state.setError(reason instanceof Error ? reason.message : "Could not record the payment."); throw reason; } finally { state.setBusy(false); } }} />{state.error && <div className="dashboard-toast" role="alert">{state.error}</div>}</>;
}
