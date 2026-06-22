/**
 * The design-system kit — liquid chrome on black.
 *
 * Dimensional, glassy surfaces with a top-edge highlight and soft depth; an
 * electric accent that glows on intent; brushed-silver headline numbers; and
 * deliberately readable type (no sub-10px body text, high-contrast labels).
 */
import { forwardRef, type ReactNode } from "react";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
export { cx };

/* ---- Layout ---------------------------------------------------------- */

export function Panel({
  children,
  className,
  as: As = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}) {
  return <As className={cx("glass rounded-lg", className)}>{children}</As>;
}

export function SectionHead({
  title,
  kicker,
  right,
  className,
}: {
  title: ReactNode;
  kicker?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("mb-4 flex items-center gap-2.5 border-b border-line/70 pb-2.5", className)}>
      <span
        className="h-3.5 w-[3px] shrink-0 rounded-full bg-gradient-to-b from-brass to-brass-deep shadow-glow-sm"
        aria-hidden
      />
      <h2 className="font-disp text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
      {kicker && <span className="font-mono text-[12px] uppercase tracking-label text-faint">{kicker}</span>}
      {right && <span className="ml-auto">{right}</span>}
    </div>
  );
}

/* ---- Buttons --------------------------------------------------------- */

type BtnVariant = "primary" | "ghost" | "danger" | "quiet";

const BTN: Record<BtnVariant, string> = {
  primary:
    "border-brass/50 bg-accent-grad text-[#CFF8EC] shadow-[0_0_22px_-12px_rgba(47,232,172,.8)] hover:border-brass hover:shadow-glow-sm active:translate-y-px",
  ghost: "border-line bg-white/[.02] text-dim hover:border-line2 hover:text-ink hover:bg-white/[.04]",
  danger: "border-line bg-white/[.02] text-bad hover:border-bad hover:bg-[rgba(255,107,107,.08)]",
  quiet: "border-transparent text-faint hover:text-ink",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }
>(function Button({ variant = "ghost", className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-[13px] uppercase tracking-label transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40",
        BTN[variant],
        className,
      )}
      {...rest}
    />
  );
});

/* ---- Tags / status --------------------------------------------------- */

type Tone = "neutral" | "brass" | "ok" | "warn" | "bad" | "pl";

const TONE: Record<Tone, string> = {
  neutral: "border-line2/70 bg-white/[.03] text-dim",
  brass: "border-brass/40 bg-brass-dim text-brass",
  ok: "border-[#3DDC9755] bg-[#3DDC9714] text-ok",
  warn: "border-[#F5B44555] bg-[#F5B44514] text-warn",
  bad: "border-[#FF6B6B55] bg-[#FF6B6B14] text-bad",
  pl: "border-pl-line bg-[#C3B1F014] text-pl",
};

export function Tag({ children, tone = "neutral", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[12px] uppercase tracking-label",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "ok" | "warn" | "bad" | "brass";
}) {
  const valueColor =
    tone === "ok"
      ? "text-ok"
      : tone === "warn"
        ? "text-warn"
        : tone === "bad"
          ? "text-bad"
          : tone === "brass"
            ? "glow-text"
            : "metal";
  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-inset-grad p-3.5 shadow-inset">
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brass/55 to-transparent" />
      <div className="font-mono text-[12px] uppercase tracking-label text-faint">{label}</div>
      <div className={cx("tnum mt-1.5 font-mono text-[23px] font-medium leading-none", valueColor)}>{value}</div>
      {sub && <div className="mt-1.5 text-[13px] text-dim">{sub}</div>}
    </div>
  );
}

/* ---- Form fields ----------------------------------------------------- */

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block font-mono text-[12px] uppercase tracking-label text-faint">
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-line bg-inset px-2.5 py-2 font-mono text-[14px] text-ink placeholder:text-faint transition-shadow [color-scheme:dark] focus:border-brass focus:shadow-focus focus:outline-none";

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  mono = true,
  className,
  list,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
  className?: string;
  list?: readonly string[];
}) {
  const listId = list ? `dl-${label || placeholder || "f"}`.replace(/\s+/g, "-") : undefined;
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        list={listId}
        onChange={(e) => onChange(e.target.value)}
        className={cx(inputCls, !mono && "font-body")}
      />
      {list && (
        <datalist id={listId}>
          {list.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      )}
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cx(inputCls, "resize-y font-body leading-relaxed")}
      />
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[] | readonly { value: string; label: string }[];
  className?: string;
}) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, "appearance-none")}>
        {opts.map((o) => (
          <option key={o.value} value={o.value} className="bg-panel text-ink">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2"
    >
      <span
        className={cx(
          "relative h-4 w-7 rounded-full border transition-colors",
          checked ? "border-brass/60 bg-brass-dim shadow-glow-sm" : "border-line bg-inset",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-2.5 w-2.5 rounded-full transition-all",
            checked ? "left-3.5 bg-brass" : "left-0.5 bg-faint",
          )}
        />
      </span>
      <span className="font-mono text-[13px] text-dim">{label}</span>
    </button>
  );
}

/* ---- Empty + misc ---------------------------------------------------- */

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white/[.015] p-8 text-center font-mono text-[13px] text-faint">
      {children}
    </div>
  );
}
