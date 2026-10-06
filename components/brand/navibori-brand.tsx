export default function NaviboriBrand({
  compact = false
}: {
  compact?: boolean;
}) {
  return (
    <div className={"navibori-brand " + (compact ? "compact" : "")}>
      <img
        className="navibori-brand-symbol"
        src="/brand/navibori-app-icon.webp"
        alt=""
        aria-hidden="true"
      />
      <div className="navibori-brand-copy">
        <div className="navibori-wordmark" aria-label="NAVIBORI XR">
          <span>NAVIBORI</span><strong>XR</strong>
        </div>
        <small>Puerto Rico Spatial Experience Platform</small>
      </div>
    </div>
  );
}
