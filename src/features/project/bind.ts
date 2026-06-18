/**
 * Field binding helper for the project editor. The original cockpit stored most
 * fields as raw strings and coerced at calculation time; we preserve that, so
 * the binder just shuttles strings to `patchProject`.
 */
import type { Project } from "@/domain";

export type Patch = (patch: Partial<Project>) => void;

// Keys whose values are strings (the vast majority of the spec form).
type StringKeys = {
  [K in keyof Project]: Project[K] extends string ? K : never;
}[keyof Project];

export function makeBind(p: Project, patch: Patch) {
  return (k: StringKeys) => ({
    value: (p[k] as string) ?? "",
    onChange: (v: string) => patch({ [k]: v } as Partial<Project>),
  });
}
