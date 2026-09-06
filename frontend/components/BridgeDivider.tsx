/**
 * Decorative section divider echoing the CourseBridge logo: a suspension
 * cable that draws itself as it scrolls into view, over a quiet deck line.
 * Colors come from the token system only; hidden from assistive tech.
 */
export default function BridgeDivider() {
  return (
    <div className="cb-reveal" aria-hidden="true" style={{ overflow: "hidden" }}>
      <svg
        viewBox="0 0 1200 96"
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: 72 }}
        fill="none"
      >
        {/* deck */}
        <line x1="0" y1="84" x2="1200" y2="84" stroke="var(--cb-border)" strokeWidth="1.5" />
        {/* hangers */}
        {[210, 360, 510, 690, 840, 990].map((x, i) => {
          const t = x / 1200;
          const y = 84 - 288 * t * (1 - t); // point on the quadratic cable
          return <line key={x} x1={x} y1={y} x2={x} y2={84} stroke="var(--cb-border)" strokeWidth="1.5" />;
        })}
        {/* cable — draws on reveal via .cb-bridge-path */}
        <path
          className="cb-bridge-path"
          pathLength={1}
          d="M0 84 Q 600 12 1200 84"
          stroke="var(--cb-accent-muted)"
          strokeWidth="2"
        />
        {/* towers */}
        <circle cx="210" cy="84" r="3.5" fill="var(--cb-accent)" />
        <circle cx="990" cy="84" r="3.5" fill="var(--cb-accent)" />
      </svg>
    </div>
  );
}
