/**
 * The linear sibling of the IndexRing — the same machined-tick language laid
 * out as a bar for project rows and detail headers. Done ticks are brass,
 * the current tick is illuminated and taller, future ticks are faint.
 */
import { motion } from "framer-motion";

export function StageTrack({
  count,
  current,
  height = 22,
  className,
}: {
  count: number;
  current: number;
  height?: number;
  className?: string;
}) {
  const ticks = Array.from({ length: count });
  return (
    <div className={className} style={{ display: "flex", alignItems: "flex-end", gap: 3, height }}>
      {ticks.map((_, i) => {
        const done = i < current;
        const cur = i === current;
        const h = cur ? height : done ? height * 0.7 : height * 0.5;
        const color = cur ? "var(--brass)" : done ? "rgba(201,162,75,.5)" : "var(--line2)";
        return (
          <motion.span
            key={i}
            initial={false}
            animate={{ height: h, backgroundColor: color }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{ width: cur ? 3 : 2, borderRadius: 2, display: "block" }}
          />
        );
      })}
    </div>
  );
}
