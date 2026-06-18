/** Memoized dashboard derivation bound to the live store. */
import { useMemo } from "react";
import { buildDashboard, type Dashboard } from "@/domain";
import { useStore } from "./store";

export function useDashboard(): Dashboard {
  const accounts = useStore((s) => s.accounts);
  const projects = useStore((s) => s.projects);
  const suppliers = useStore((s) => s.suppliers);
  const tasks = useStore((s) => s.tasks);
  const expenses = useStore((s) => s.expenses);
  const company = useStore((s) => s.company);
  return useMemo(
    () => buildDashboard({ accounts, projects, suppliers, tasks, expenses, company }),
    [accounts, projects, suppliers, tasks, expenses, company],
  );
}
