/** The Σ maker's mark — the persistent brand anchor. */
export function Sigma({ size = 22 }: { size?: number }) {
  return (
    <span
      className="font-disp font-bold text-brass leading-none"
      style={{ fontSize: size }}
      aria-hidden
    >
      Σ
    </span>
  );
}
