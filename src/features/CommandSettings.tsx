/**
 * Compose your own ⌘K commands. Pick a label and an action ("what happens
 * when") from the safe vocabulary; some actions take a target (a screen, a
 * project, a client, a task title). Stored locally and runnable instantly.
 */
import { useState } from "react";
import { rid } from "@/domain";
import { ACTION_KINDS, NAV_TARGETS, describeAction, type CommandAction } from "@/app/commands";
import { Button, Empty, Field, Panel, SectionHead, SelectField, Tag } from "@/ui/kit";
import { useStore } from "@/state/store";

export function CommandSettings() {
  const commands = useStore((s) => s.customCommands);
  const addCommand = useStore((s) => s.addCommand);
  const deleteCommand = useStore((s) => s.deleteCommand);
  const projects = useStore((s) => s.projects);
  const accounts = useStore((s) => s.accounts);

  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<CommandAction["kind"]>("navigate");
  const [navTo, setNavTo] = useState("/");
  const [projectId, setProjectId] = useState("");
  const [clientId, setClientId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");

  const projectOpts = Object.values(projects).map((p) => ({ value: p.id, label: p.name || "Untitled" }));
  const clientOpts = Object.values(accounts).map((a) => ({ value: a.id, label: a.name || "Unnamed" }));

  const buildAction = (): CommandAction | null => {
    switch (kind) {
      case "navigate":
        return { kind, to: navTo };
      case "newProject":
        return { kind, accountId: clientId || undefined };
      case "newClient":
        return { kind };
      case "newTask":
        return { kind, title: taskTitle || undefined };
      case "openProject":
        return projectId ? { kind, id: projectId } : null;
      case "openClient":
        return clientId ? { kind, id: clientId } : null;
      case "exportData":
        return { kind };
    }
  };

  const add = () => {
    const action = buildAction();
    if (!label.trim() || !action) return;
    addCommand({ id: rid("cmd"), label: label.trim(), action });
    setLabel("");
    setTaskTitle("");
  };

  // Which extra target field this action needs.
  const needsNav = kind === "navigate";
  const needsProject = kind === "openProject";
  const needsClient = kind === "openClient" || kind === "newProject";
  const needsTitle = kind === "newTask";

  return (
    <Panel className="mt-5 p-4">
      <SectionHead title="Your commands" kicker="press ⌘K to run · compose your own" />

      {commands.length === 0 ? (
        <Empty>No custom commands yet. Build one below — e.g. "New LóFő order" → New project for LóFő.</Empty>
      ) : (
        <ul className="mb-4 flex flex-col divide-y divide-line">
          {commands.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{c.label}</span>
              <Tag>{describeAction(c.action)}</Tag>
              <Button variant="quiet" onClick={() => deleteCommand(c.id)} aria-label="Delete command">
                ✕
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 rounded-lg border border-line bg-inset-grad p-3 sm:grid-cols-2">
        <Field label="Command name" value={label} onChange={setLabel} placeholder="e.g. New LóFő order" mono={false} />
        <SelectField label="What it does" value={kind} onChange={(v) => setKind(v as CommandAction["kind"])} options={ACTION_KINDS} />
        {needsNav && <SelectField label="Screen" value={navTo} onChange={setNavTo} options={NAV_TARGETS} />}
        {needsProject && (
          <SelectField
            label="Project"
            value={projectId}
            onChange={setProjectId}
            options={[{ value: "", label: "— pick —" }, ...projectOpts]}
          />
        )}
        {needsClient && (
          <SelectField
            label={kind === "newProject" ? "For client (optional)" : "Client"}
            value={clientId}
            onChange={setClientId}
            options={[{ value: "", label: kind === "newProject" ? "— none —" : "— pick —" }, ...clientOpts]}
          />
        )}
        {needsTitle && <Field label="Task title" value={taskTitle} onChange={setTaskTitle} placeholder="e.g. Chase QC video" mono={false} />}
        <div className="flex items-end">
          <Button variant="primary" onClick={add} className="w-full justify-center">
            + Add command
          </Button>
        </div>
      </div>
      <p className="mt-2 font-mono text-[11px] text-faint">
        Tip: open any time with ⌘K (Ctrl-K) — it also jumps to any screen, project ({Object.keys(projects).length}) or
        client ({Object.keys(accounts).length}).
      </p>
    </Panel>
  );
}
