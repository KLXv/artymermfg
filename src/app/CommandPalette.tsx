/**
 * Command palette — ⌘K / Ctrl-K anywhere.
 *
 * Combines the operator's own custom commands (composed in Settings) with
 * built-ins: jump to any screen, open any project/client, and quick-create.
 * Pure keyboard: type to filter, ↑/↓ to move, Enter to run, Esc to close.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { acctName, blankAccount, blankProject, blankTask } from "@/domain";
import { useStore } from "@/state/store";
import { NAV_TARGETS, describeAction, type CommandAction, type PaletteItem } from "./commands";
import { cx } from "@/ui/kit";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const projects = useStore((s) => s.projects);
  const accounts = useStore((s) => s.accounts);
  const custom = useStore((s) => s.customCommands);
  const upsertProject = useStore((s) => s.upsertProject);
  const upsertAccount = useStore((s) => s.upsertAccount);
  const upsertTask = useStore((s) => s.upsertTask);
  const exportJSON = useStore((s) => s.exportJSON);

  // Global hotkey.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("artymer:command", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("artymer:command", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [];
    custom.forEach((c) => list.push({ id: "c-" + c.id, label: c.label, hint: describeAction(c.action), group: "Custom", action: c.action }));
    NAV_TARGETS.forEach((n) => list.push({ id: "nav-" + n.value, label: n.label, hint: "screen", group: "Go to", action: { kind: "navigate", to: n.value } }));
    list.push({ id: "new-proj", label: "New project", hint: "create", group: "Create", action: { kind: "newProject" } });
    list.push({ id: "new-client", label: "New client", hint: "create", group: "Create", action: { kind: "newClient" } });
    list.push({ id: "new-task", label: "New task", hint: "create", group: "Create", action: { kind: "newTask" } });
    list.push({ id: "export", label: "Export backup", hint: "download JSON", group: "Action", action: { kind: "exportData" } });
    Object.values(projects).forEach((p) =>
      list.push({ id: "p-" + p.id, label: p.name || "Untitled project", hint: acctName(p, accounts), group: "Open", action: { kind: "openProject", id: p.id } }),
    );
    Object.values(accounts).forEach((a) =>
      list.push({ id: "a-" + a.id, label: a.name || "Unnamed client", hint: "client", group: "Open", action: { kind: "openClient", id: a.id } }),
    );
    return list;
  }, [custom, projects, accounts]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items.slice(0, 40);
    return items.filter((i) => (i.label + " " + i.hint + " " + i.group).toLowerCase().includes(t)).slice(0, 40);
  }, [items, q]);

  useEffect(() => setSel(0), [q]);

  const run = (action: CommandAction) => {
    setOpen(false);
    switch (action.kind) {
      case "navigate":
        navigate(action.to);
        break;
      case "newProject": {
        const p = blankProject(action.accountId || "");
        upsertProject(p);
        navigate(`/projects/${p.id}`);
        break;
      }
      case "newClient": {
        const a = blankAccount();
        upsertAccount(a);
        navigate(`/clients/${a.id}`);
        break;
      }
      case "newTask": {
        upsertTask({ ...blankTask(), title: action.title || "" });
        navigate("/tasks");
        break;
      }
      case "openProject":
        navigate(`/projects/${action.id}`);
        break;
      case "openClient":
        navigate(`/clients/${action.id}`);
        break;
      case "exportData": {
        const blob = new Blob([exportJSON()], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const el = document.createElement("a");
        el.href = url;
        el.download = `artymer-cockpit-${new Date().toISOString().slice(0, 10)}.json`;
        el.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        break;
      }
    }
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && filtered[sel]) {
      e.preventDefault();
      run(filtered[sel].action);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-lg border border-line2 bg-panel-grad shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onInputKey}
          placeholder="Jump to, create, or run a command…"
          className="w-full border-b border-line bg-transparent px-4 py-3.5 font-body text-[15px] text-ink placeholder:text-faint focus:outline-none"
        />
        <ul className="max-h-[52vh] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center font-mono text-[12px] text-faint">No matches</li>
          ) : (
            filtered.map((item, i) => (
              <li key={item.id}>
                <button
                  onMouseEnter={() => setSel(i)}
                  onClick={() => run(item.action)}
                  className={cx(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left",
                    i === sel ? "bg-brass-dim" : "hover:bg-white/[.03]",
                  )}
                >
                  <span className={cx("min-w-0 flex-1 truncate text-[14px]", i === sel ? "text-brass" : "text-ink")}>
                    {item.label}
                  </span>
                  <span className="shrink-0 truncate font-mono text-[11px] text-faint">{item.hint}</span>
                  <span className="shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-label text-faint">
                    {item.group}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="flex items-center gap-3 border-t border-line px-4 py-2 font-mono text-[10px] uppercase tracking-label text-faint">
          <span>↑↓ move</span>
          <span>↵ run</span>
          <span>esc close</span>
          <span className="ml-auto">⌘K</span>
        </div>
      </div>
    </div>
  );
}
