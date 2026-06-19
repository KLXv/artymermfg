/**
 * Tasks — the work list. Stage advances drop their canonical next-action here
 * (source "stage"); the operator adds the rest by hand. Overdue floats to the
 * top; done work sinks. Links jump back to the project or client in context.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { blankTask, dFromNow, type Task } from "@/domain";
import { Button, Empty, Field, Panel, Tag, cx } from "@/ui/kit";
import { useStore } from "@/state/store";
import { PageHeader } from "./PageHeader";

const SOURCE_TONE: Record<string, "brass" | "neutral"> = { stage: "brass", manual: "neutral" };

export function Tasks() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const accounts = useStore((s) => s.accounts);
  const toggleTask = useStore((s) => s.toggleTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const upsertTask = useStore((s) => s.upsertTask);
  const navigate = useNavigate();
  const [showDone, setShowDone] = useState(false);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");

  const linkLabel = (t: Task): string | null => {
    if (t.linkType === "project") return projects[t.linkId]?.name || "project";
    if (t.linkType === "account") return accounts[t.linkId]?.name || "client";
    return null;
  };
  const linkPath = (t: Task): string | null => {
    if (t.linkType === "project" && projects[t.linkId]) return `/projects/${t.linkId}`;
    if (t.linkType === "account" && accounts[t.linkId]) return `/clients/${t.linkId}`;
    return null;
  };

  const rows = useMemo(() => {
    const list = Object.values(tasks).filter((t) => showDone || !t.done);
    return list.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (a.due || "9999").localeCompare(b.due || "9999");
    });
  }, [tasks, showDone]);

  const openCount = Object.values(tasks).filter((t) => !t.done).length;

  const add = () => {
    if (!title.trim()) return;
    upsertTask({ ...blankTask(), title: title.trim(), due: due || blankTask().due });
    setTitle("");
    setDue("");
  };

  return (
    <div>
      <PageHeader
        title="Tasks"
        kicker={`${openCount} open`}
        actions={
          <Button variant="ghost" onClick={() => setShowDone((v) => !v)}>
            {showDone ? "Hide done" : "Show done"}
          </Button>
        }
      />

      <Panel className="mb-5 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <Field
            label="New task"
            value={title}
            onChange={setTitle}
            placeholder="What needs doing…"
            mono={false}
            className="min-w-[14rem] flex-1"
          />
          <Field label="Due" type="date" value={due} onChange={setDue} className="w-40" />
          <Button variant="primary" onClick={add}>
            + Add
          </Button>
        </div>
      </Panel>

      {rows.length === 0 ? (
        <Empty>No tasks. Advancing a project stage will drop its next action here.</Empty>
      ) : (
        <Panel>
          <ul className="flex flex-col divide-y divide-line">
            {rows.map((t) => {
              const days = dFromNow(t.due);
              const overdue = !t.done && days != null && days < 0;
              const path = linkPath(t);
              const label = linkLabel(t);
              return (
                <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <button
                    onClick={() => toggleTask(t.id)}
                    aria-label={t.done ? "Mark incomplete" : "Mark done"}
                    className={cx(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border font-mono text-[13px]",
                      t.done ? "border-ok bg-[#6FB98F22] text-ok" : "border-line text-transparent hover:border-line2",
                    )}
                  >
                    ✓
                  </button>
                  <span className="min-w-0 flex-1">
                    <span className={cx("block truncate text-[14px]", t.done ? "text-faint line-through" : "text-ink")}>
                      {t.title || "Untitled task"}
                    </span>
                    {label && (
                      <button
                        onClick={() => path && navigate(path)}
                        className="font-mono text-[12px] text-dim hover:text-brass"
                      >
                        {label} ↗
                      </button>
                    )}
                  </span>
                  {t.source === "stage" && <Tag tone={SOURCE_TONE.stage}>auto</Tag>}
                  <span
                    className={cx(
                      "w-24 text-right font-mono text-[13px]",
                      overdue ? "text-bad" : days === 0 ? "text-warn" : "text-faint",
                    )}
                  >
                    {t.due || "—"}
                    {!t.done && days != null && (overdue ? " · overdue" : days === 0 ? " · today" : "")}
                  </span>
                  <Button variant="quiet" onClick={() => deleteTask(t.id)} aria-label="Delete task">
                    ✕
                  </Button>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </div>
  );
}
