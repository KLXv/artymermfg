/** Memoized dashboard derivation bound to the live store. */
import { useMemo } from "react";
import { buildDashboard, type ClientResponse, type Dashboard } from "@/domain";
import { useStore } from "./store";
import { useSharesStore } from "./useSharesStore";

export function useDashboard(): Dashboard {
  const accounts = useStore((s) => s.accounts);
  const projects = useStore((s) => s.projects);
  const suppliers = useStore((s) => s.suppliers);
  const tasks = useStore((s) => s.tasks);
  const expenses = useStore((s) => s.expenses);
  const company = useStore((s) => s.company);
  const shares = useSharesStore((s) => s.shares);

  const responses = useMemo<ClientResponse[]>(
    () =>
      shares
        .filter((s) => !s.revoked && s.approval)
        .map((s) => ({
          projectId: s.project_id,
          title: s.title,
          decision: s.approval!.decision,
          signer: s.approval!.signer,
          note: s.approval!.note,
        })),
    [shares],
  );

  return useMemo(
    () => buildDashboard({ accounts, projects, suppliers, tasks, expenses, company }, responses),
    [accounts, projects, suppliers, tasks, expenses, company, responses],
  );
}
