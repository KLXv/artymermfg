import type { QueueTarget } from "@/domain";

/** Map a pure queue target descriptor to a route path. */
export function targetPath(t: QueueTarget): string {
  switch (t.kind) {
    case "project":
      return `/projects/${t.id}`;
    case "account":
      return `/clients/${t.id}`;
    case "view":
      return t.view === "settings" ? "/settings" : `/${t.view}`;
  }
}
