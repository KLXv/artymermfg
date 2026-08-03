/**
 * Cloud sync engine.
 *
 * Local-first: the Zustand store (persisted to localStorage) is always the live
 * copy. When a user is signed in, this provider loads their cloud workspace on
 * sign-in (seeding the cloud from local on first run if the cloud is empty),
 * then write-throughs debounced diffs on every change. Failures degrade
 * gracefully — the local copy stays authoritative and the status shows "error".
 */
import { useCallback, useEffect, useRef } from "react";
import { create } from "zustand";
import { isWorkspaceEmpty, loadWorkspace, mergeWorkspaces, pushWorkspaceDiff } from "@/data/repo";
import { useStore, type WorkspaceState } from "./store";
import { useAuth } from "./useAuth";

export type SyncStatus = "idle" | "loading" | "synced" | "saving" | "error";

interface SyncStore {
  status: SyncStatus;
  error: string;
  lastSyncedAt: number | null;
  /** Bumped to ask the provider to re-attempt a failed push. */
  retryNonce: number;
  retry: () => void;
  set: (patch: Partial<SyncStore>) => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  status: "idle",
  error: "",
  lastSyncedAt: null,
  retryNonce: 0,
  retry: () => set((s) => ({ retryNonce: s.retryNonce + 1 })),
  set: (patch) => set(patch),
}));

/**
 * Readable text for a failure. Postgres errors arrive from supabase-js as plain
 * objects ({ message, details, hint, code }), not Error instances — testing for
 * `instanceof Error` reduced every database rejection to a generic "save
 * failed", which is what made these failures impossible to diagnose.
 */
const errText = (e: unknown, fallback: string): string => {
  if (!e) return fallback;
  if (typeof e === "string") return e;
  if (e instanceof Error && e.message) return e.message;
  const o = e as { message?: string; details?: string; hint?: string; code?: string };
  const parts = [o.message, o.details, o.hint].filter(Boolean) as string[];
  const text = parts.join(" · ");
  if (!text) return o.code ? `${fallback} (${o.code})` : fallback;
  return o.code ? `${text} (${o.code})` : text;
};

const snapshot = (s: WorkspaceState): WorkspaceState => ({
  company: s.company,
  accounts: s.accounts,
  projects: s.projects,
  suppliers: s.suppliers,
  tasks: s.tasks,
  expenses: s.expenses,
  content: s.content,
  invoices: s.invoices,
  prospects: s.prospects,
  candidates: s.candidates,
});

const stateOf = (): WorkspaceState => snapshot(useStore.getState());

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const setSync = useSyncStore((s) => s.set);
  const lastSynced = useRef<WorkspaceState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load (and seed) on sign-in; clear on sign-out.
  useEffect(() => {
    if (!user) {
      lastSynced.current = null;
      setSync({ status: "idle", error: "" });
      return;
    }
    let cancelled = false;
    (async () => {
      setSync({ status: "loading", error: "" });
      try {
        const remote = await loadWorkspace();
        if (cancelled) return;
        const local = stateOf();
        if (isWorkspaceEmpty(remote) && !isWorkspaceEmpty(local)) {
          // First run on this account: push the local workspace up.
          await pushWorkspaceDiff(user.id, { ...remote }, local);
          lastSynced.current = local;
        } else {
          // Merge so any local-only records (e.g. from a previously failed
          // push) survive instead of being overwritten by a partial cloud copy.
          const merged = mergeWorkspaces(remote, local);
          useStore.getState().hydrate(merged);
          lastSynced.current = remote;
          if (JSON.stringify(merged) !== JSON.stringify(remote)) {
            await pushWorkspaceDiff(user.id, remote, merged);
            lastSynced.current = merged;
          }
        }
        setSync({ status: "synced", lastSyncedAt: Date.now(), error: "" });
      } catch (e) {
        if (!cancelled) setSync({ status: "error", error: errText(e, "load failed") });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, setSync]);

  /**
   * Push whatever differs from the last confirmed cloud state. On failure the
   * baseline deliberately does not advance, so the same changes are retried by
   * the next edit (or by retry()) instead of being stranded.
   */
  const flush = useCallback(async () => {
    if (!user) return;
    const prev = lastSynced.current;
    if (!prev) return; // not loaded yet
    const next = stateOf();
    if (JSON.stringify(prev) === JSON.stringify(next)) return;
    setSync({ status: "saving" });
    try {
      await pushWorkspaceDiff(user.id, prev, next);
      lastSynced.current = next;
      setSync({ status: "synced", lastSyncedAt: Date.now(), error: "" });
    } catch (e) {
      setSync({ status: "error", error: errText(e, "save failed") });
    }
  }, [user, setSync]);

  // Debounced write-through of diffs.
  useEffect(() => {
    if (!user) return;
    const unsub = useStore.subscribe(() => {
      if (!lastSynced.current) return; // not loaded yet
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 1500);
    });
    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [user, flush]);

  // Manual retry after a failure (the sidebar's "retry" button).
  const retryNonce = useSyncStore((s) => s.retryNonce);
  useEffect(() => {
    if (retryNonce > 0) void flush();
  }, [retryNonce, flush]);

  return <>{children}</>;
}
