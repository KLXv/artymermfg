/**
 * Command palette model.
 *
 * An action is a small, declarative description of "what happens when" — chosen
 * from a fixed, safe vocabulary. The operator composes their own commands from
 * these in Settings (label + action), and the palette + built-ins execute them.
 * Declarative so they persist and sync trivially and can never run arbitrary code.
 */
export type CommandAction =
  | { kind: "navigate"; to: string }
  | { kind: "newProject"; accountId?: string }
  | { kind: "newClient" }
  | { kind: "newTask"; title?: string }
  | { kind: "openProject"; id: string }
  | { kind: "openClient"; id: string }
  | { kind: "exportData" };

export interface CustomCommand {
  id: string;
  label: string;
  action: CommandAction;
}

/** The action types a user can pick when composing a command, with labels. */
export const ACTION_KINDS: { value: CommandAction["kind"]; label: string }[] = [
  { value: "navigate", label: "Go to a screen" },
  { value: "newProject", label: "New project (optionally for a client)" },
  { value: "newClient", label: "New client" },
  { value: "newTask", label: "New task (with a title)" },
  { value: "openProject", label: "Open a specific project" },
  { value: "openClient", label: "Open a specific client" },
  { value: "exportData", label: "Export a backup" },
];

export const NAV_TARGETS: { value: string; label: string }[] = [
  { value: "/", label: "Deck" },
  { value: "/pipeline", label: "Pipeline" },
  { value: "/projects", label: "Projects" },
  { value: "/clients", label: "Clients" },
  { value: "/suppliers", label: "Suppliers" },
  { value: "/tasks", label: "Tasks" },
  { value: "/money", label: "Money" },
  { value: "/invoices", label: "Invoices" },
  { value: "/marketing", label: "Marketing" },
  { value: "/strategy", label: "Strategy" },
  { value: "/assistant", label: "Assistant" },
  { value: "/guide", label: "Manual" },
  { value: "/settings", label: "Settings" },
];

/** A runnable item shown in the palette. */
export interface PaletteItem {
  id: string;
  label: string;
  hint: string;
  group: "Custom" | "Go to" | "Create" | "Open" | "Action";
  action: CommandAction;
}

export const describeAction = (a: CommandAction): string => {
  switch (a.kind) {
    case "navigate":
      return `Go to ${NAV_TARGETS.find((n) => n.value === a.to)?.label ?? a.to}`;
    case "newProject":
      return a.accountId ? "New project for a client" : "New project";
    case "newClient":
      return "New client";
    case "newTask":
      return a.title ? `New task: ${a.title}` : "New task";
    case "openProject":
      return "Open project";
    case "openClient":
      return "Open client";
    case "exportData":
      return "Export backup";
  }
};
