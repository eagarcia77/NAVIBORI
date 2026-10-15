export default function NaviboriBrand({
  compact = false
}: {
  compact?: boolean;
}) {
  return (
    <div className={"navibori-brand wordmark-only " + (compact ? "compact" : "")}>
      <div className="navibori-brand-copy">
        <div className="navibori-wordmark" aria-label="NAVIBORI XR">
          <span>NAVIBORI</span><strong>XR</strong>
        </div>
        <small>Puerto Rico Spatial Experience Platform</small>
      </div>
    </div>
  );
}
