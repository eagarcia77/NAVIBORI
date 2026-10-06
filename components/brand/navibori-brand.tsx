export default function NaviboriBrand({
  compact = false
}: {
  compact?: boolean;
}) {
  return (
    <div className={"navibori-brand " + (compact ? "compact" : "")}>
      <img
        src="/brand/navibori-logo.webp"
        alt="NAVIBORI XR — Puerto Rico Spatial Experience Platform"
      />
    </div>
  );
}
