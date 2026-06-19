/**
 * The selected-build + designed-dial specification editor. These are the exact
 * fields the production spec indexes into — grouped as the spec document reads:
 * selected build (pinned), the designed dial, engraving, finished-watch
 * tolerances.
 */
import { type DialColor, type Project } from "@/domain";
import { Button, Field, Panel, SectionHead, Label, cx } from "@/ui/kit";
import { WatchDial, type DialSpec } from "@/ui/WatchDial";
import { makeBind, type Patch } from "./bind";

/** A segmented toggle for preset choices (water resistance, accuracy window…). */
function Segmented({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label?: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={cx(
              "rounded-md border px-2.5 py-1.5 font-mono text-[12px] transition-colors",
              value === o ? "border-brass bg-brass-dim text-brass" : "border-line text-dim hover:border-line2 hover:text-ink",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel className="p-4">
      <SectionHead title={title} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </Panel>
  );
}

function DialPreview({ p }: { p: Project }) {
  const firstColor = p.colors.find((c) => c.ref || c.name);
  const spec: DialSpec = {
    caseDia: p.caseDia,
    dialColor: firstColor?.ref || firstColor?.name,
    texture: p.tex,
    markers: p.marker,
    hasDate: !!p.date && p.date !== "none",
    engraving: p.engLoc.toLowerCase().includes("dial") ? p.engTxt : "",
    lume: p.lume !== "none" && p.lume !== "",
    pieceName: p.pieceName || p.name,
    caseMaterial: p.caseMat,
    caseFinish: p.caseFin,
    handStyle: `${p.handRef} ${p.handFin}`,
    crystalShape: p.crysShape,
  };
  return (
    <Panel className="flex items-center gap-4 p-3">
      <div className="shrink-0 rounded-lg border border-line bg-inset-grad p-2 shadow-inset">
        <WatchDial size={150} mode="preview" spec={spec} showConstruction showLogo />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-disp text-[15px] font-semibold text-ink">Live dial</span>
          <span className="font-mono text-[11px] uppercase tracking-label text-faint">redraws as you design</span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {p.colors.filter((c) => c.name || c.ref).map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/[.03] px-2 py-0.5 font-mono text-[11px] text-dim">
              <span className="h-2.5 w-2.5 rounded-full border border-line2" style={{ background: parseSwatch(c.ref || c.name) }} />
              {c.name || c.ref}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

// Reuse the dial's colour parsing for the swatch chips.
function parseSwatch(s: string): string {
  const hex = s.toLowerCase().match(/#?([0-9a-f]{6})\b/);
  return hex ? "#" + hex[1] : "#2a3140";
}

export function BuildTab({ p, patch }: { p: Project; patch: Patch }) {
  const f = makeBind(p, patch);

  const setColor = (i: number, key: keyof DialColor, v: string) => {
    const colors = p.colors.map((c, idx) => (idx === i ? { ...c, [key]: v } : c));
    patch({ colors });
  };
  const addColor = () => patch({ colors: [...p.colors, { name: "", ref: "" }] });
  const removeColor = (i: number) => patch({ colors: p.colors.filter((_, idx) => idx !== i) });

  return (
    <div className="flex flex-col gap-5">
      <DialPreview p={p} />
      <Group title="Case — selected, not designed">
        <Field label="Case ref" {...f("caseRef")} />
        <Field label="Material" {...f("caseMat")} />
        <Field label="Finish" {...f("caseFin")} />
        <Field label="Ø diameter (mm)" {...f("caseDia")} />
        <Field label="Ø tolerance" {...f("caseDiaT")} />
        <Field label="Lug-to-lug (mm)" {...f("l2l")} />
        <Field label="Thickness (mm)" {...f("thick")} />
        <Field label="Lug width (mm)" {...f("lugW")} />
        <div className="sm:col-span-2 lg:col-span-3">
          <Segmented
            label="Water resistance"
            value={p.wr}
            onChange={(v) => patch({ wr: v })}
            options={["3 ATM", "5 ATM", "6 ATM", "10 ATM", "20 ATM"]}
          />
          <Field {...f("wr")} className="mt-2" placeholder="…or a custom rating" />
        </div>
      </Group>

      <Group title="Movement">
        <Field label="Caliber" {...f("cal")} />
        <Field label="Function" {...f("calFn")} />
        <Field label="Accuracy (seconds)" {...f("acc")} />
        <Segmented
          label="Accuracy window"
          value={p.accUnit === "month" ? "/ month" : "/ day"}
          onChange={(v) => patch({ accUnit: v === "/ month" ? "month" : "day" })}
          options={["/ day", "/ month"]}
        />
        <Field label="Hands ref" {...f("handRef")} />
        <Field label="Hand length" {...f("handLen")} />
        <Field label="Hand finish" {...f("handFin")} />
        <Field label="Lume" {...f("lume")} />
      </Group>

      <Group title="Crystal & exterior">
        <Field label="Crystal material" {...f("crysMat")} />
        <Field label="Shape" {...f("crysShape")} />
        <Field label="AR coating" {...f("ar")} />
        <Field label="Ø diameter (mm)" {...f("crysDia")} />
        <Field label="Ø tolerance" {...f("crysDiaT")} />
        <Field label="Crown" {...f("crown")} />
        <Field label="Caseback" {...f("back")} />
        <Field label="Strap" {...f("strap")} />
      </Group>

      <Group title="Dial — designed by Artymer">
        <Field label="Base material" {...f("dialMat")} />
        <Field label="Ø diameter (mm)" {...f("dialDia")} />
        <Field label="Ø tolerance" {...f("dialDiaT")} />
        <Field label="Feet (match caliber)" {...f("feet")} />
        <Field label="Finish / texture (sunburst…)" {...f("tex")} />
        <Field label="Texture depth (mm)" {...f("texDepth")} />
        <Field label="Depth tolerance" {...f("texDepthT")} />
        <Field label="Gloss (GU)" {...f("gloss")} />
        <Field label="Printing" {...f("print")} />
        <Field label="Registration (mm)" {...f("reg")} />
        <Field label="Markers" {...f("marker")} />
        <Field label="Marker placement (mm)" {...f("markerPos")} />
        <Field label="Marker attachment" {...f("markerAtt")} />
        <Field label="Date" {...f("date")} />
      </Group>

      <Panel className="p-4">
        <SectionHead
          title="Dial colours"
          kicker="locked to approved sample under D65"
          right={
            <Button variant="ghost" onClick={addColor}>
              + Colour
            </Button>
          }
        />
        <div className="flex flex-col gap-2">
          {p.colors.map((c, i) => (
            <div key={i} className="flex items-end gap-2">
              <span className="pb-2 font-mono text-[12px] text-faint">{String(i + 1).padStart(2, "0")}</span>
              <div>
                {i === 0 && <Label>Swatch</Label>}
                <input
                  type="color"
                  aria-label={`Colour ${i + 1} swatch`}
                  value={parseSwatch(c.ref || c.name)}
                  onChange={(e) => setColor(i, "ref", e.target.value)}
                  className="h-[38px] w-11 cursor-pointer rounded-md border border-line bg-inset p-1 [color-scheme:dark]"
                />
              </div>
              <Field
                label={i === 0 ? "Name" : undefined}
                value={c.name}
                onChange={(v) => setColor(i, "name", v)}
                className="flex-1"
              />
              <Field
                label={i === 0 ? "Reference / hex" : undefined}
                value={c.ref}
                onChange={(v) => setColor(i, "ref", v)}
                className="flex-1"
              />
              <Button variant="danger" onClick={() => removeColor(i)} className="mb-0">
                ✕
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-2 font-mono text-[11px] text-faint">
          The first colour drives the live dial. Pick a swatch for an exact match, or type a hex / Pantone in the
          reference.
        </p>
      </Panel>

      <Group title="Engraving">
        <Field label="Location" {...f("engLoc")} />
        <Field label="Text" {...f("engTxt")} />
        <Field label="Method" {...f("engMethod")} />
        <Field label="Depth (mm)" {...f("engDepth")} />
      </Group>

      <Panel className="p-4">
        <SectionHead title="Finished-watch tolerances" kicker="verify vs factory" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Dial centering (mm)" {...f("center")} />
          <Field label="Hand alignment (°)" {...f("align")} />
          <Field label="Hand-to-crystal (mm)" {...f("clear")} />
          <Field label="Bezel/chapter (mm)" {...f("bezel")} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Label>Water-resistance test</Label>
            <Field {...f("wrTest")} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Label>Cleanliness standard</Label>
            <Field {...f("clean")} />
          </div>
          {p.lume !== "none" && (
            <div className="sm:col-span-2 lg:col-span-3">
              <Label>Lume standard</Label>
              <Field {...f("lumeStd")} />
            </div>
          )}
        </div>
      </Panel>

      <p className="px-1 text-[13px] text-faint">
        Movement and case are <span className="text-dim">selected</span>; the dial is{" "}
        <span className="text-brass">designed</span>. Artymer holds design + QC authority — the watch is built by the
        OEM partner.
      </p>
    </div>
  );
}
