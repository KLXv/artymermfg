/**
 * The Σ maker's mark — the persistent brand anchor, rendered as brushed,
 * beveled chrome to echo the logo. Brushed-silver gradient fill, a hairline
 * bevel highlight, and a soft drop shadow give it dimension on the black ground.
 */
export function Sigma({ size = 22 }: { size?: number }) {
  return (
    <span
      className="metal font-disp font-bold leading-none"
      style={{
        fontSize: size,
        filter: "drop-shadow(0 1px 1px rgba(0,0,0,.6)) drop-shadow(0 0 6px rgba(87,169,255,.18))",
      }}
      aria-hidden
    >
      Σ
    </span>
  );
}
