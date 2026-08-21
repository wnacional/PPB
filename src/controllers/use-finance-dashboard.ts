import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClientLike } from "../data/supabase-finance-repository.ts";
import { FinanceDashboardController, type FinanceDashboardSnapshot } from "./finance-dashboard-controller.ts";

export function useFinanceDashboard(client: SupabaseClientLike & { auth: any }) {
  const controller = useMemo(() => new FinanceDashboardController(client), [client]);
  const [snapshot, setSnapshot] = useState<FinanceDashboardSnapshot | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => { setBusy(true); setError(""); try { setSnapshot(await controller.load()); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load the dashboard."); } finally { setBusy(false); } }, [controller]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { controller, snapshot, busy, error, refresh, setBusy, setError };
}
