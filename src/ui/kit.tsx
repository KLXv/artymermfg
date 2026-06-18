/**
 * The design-system kit — brass-on-graphite primitives.
 *
 * Small, composable, opinionated. Every measured value renders in the mono
 * voice; panels are machined graphite with hairline brass accents. These keep
 * the views terse and the language consistent across the whole cockpit.
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
  return <As className={cx("rounded-md border border-line bg-panel", className)}>{children}</As>;
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
    <div className={cx("mb-3 flex items-baseline gap-2 border-b border-line pb-2", className)}>
      <h2 className="font-disp text-sm font-semibold">{title}</h2>
      {kicker && <span className="font-mono text-[9px] uppercase tracking-wide text-faint">{kicker}</span>}
      {right && <span className="ml-auto">{right}</span>}
    </div>
  );
}

/* ---- Buttons --------------------------------------------------------- */

type BtnVariant = "primary" | "ghost" | "danger" | "quiet";

const BTN: Record<BtnVariant, string> = {
  primary: "border-brass bg-brass-dim text-brass hover:bg-[rgba(201,162,75,.2)]",
  ghost: "border-line text-dim hover:border-line2 hover:text-ink",
  danger: "border-line text-bad hover:border-bad",
  quiet: "border-transparent text-faint hover:text-dim",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }
>(function Button({ variant = "ghost", className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      className={cx(
        "inline-flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-[11px] uppercase tracking-label transition-colors disabled:cursor-not-allowed disabled:opacity-40",
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
  neutral: "border-line text-dim",
  brass: "border-brass/40 text-brass",
  ok: "border-[#6FB98F66] text-ok",
  warn: "border-[#D08A4566] text-warn",
  bad: "border-[#C25B5266] text-bad",
  pl: "border-pl-line text-pl",
};

export function Tag({ children, tone = "neutral", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-[20px] border px-2 py-0.5 font-mono text-[10px] uppercase tracking-label",
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
    tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : tone === "brass" ? "text-brass" : "text-ink";
  return (
    <div className="rounded border border-line bg-inset p-3">
      <div className="font-mono text-[9px] uppercase tracking-wide text-faint">{label}</div>
      <div className={cx("mt-1 font-mono text-xl", valueColor)}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-dim">{sub}</div>}
    </div>
  );
}

/* ---- Form fields ----------------------------------------------------- */

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block font-mono text-[9px] uppercase tracking-wide text-faint">
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded border border-line bg-inset px-2.5 py-1.5 font-mono text-xs text-ink placeholder:text-faint focus:border-brass focus:outline-none";

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  mono = true,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cx(inputCls, !mono && "font-body text-[13px]")}
      />
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
        className={cx(inputCls, "resize-y font-body text-[13px] leading-relaxed")}
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
          <option key={o.value} value={o.value} className="bg-panel">
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
          checked ? "border-brass bg-brass-dim" : "border-line bg-inset",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-2.5 w-2.5 rounded-full transition-all",
            checked ? "left-3.5 bg-brass" : "left-0.5 bg-faint",
          )}
        />
      </span>
      <span className="font-mono text-[11px] text-dim">{label}</span>
    </button>
  );
}

/* ---- Empty + misc ---------------------------------------------------- */

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-line bg-inset/40 p-8 text-center font-mono text-xs text-faint">
      {children}
    </div>
  );
}
