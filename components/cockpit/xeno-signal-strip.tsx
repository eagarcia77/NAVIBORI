import { assessSpatialTruth, PILOT_001_TRUTH } from "@/lib/spatial/truth-ledger";

export default function XenoSignalStrip() {
  const truth = assessSpatialTruth(PILOT_001_TRUTH);

  return (
    <div className="xeno-signal-strip" aria-label="XENO spatial trust signals">
      <div className="signal-navi">
        <img src="/brand/navi-coqui.webp" alt="" aria-hidden="true" />
        <span>
          <strong>Navi</strong>
          <small>Truth beacon</small>
        </span>
      </div>

      <div>
        <span>TRUTH</span>
        <strong>{truth.label}</strong>
      </div>
      <div>
        <span>DATASET</span>
        <strong>{truth.hasIdentity ? "Versioned" : "Pending"}</strong>
      </div>
      <div>
        <span>PROVENANCE</span>
        <strong>{truth.hasProvenance ? "Verified" : "Pending"}</strong>
      </div>
      <div>
        <span>IMMERSIVE</span>
        <strong>{truth.immersiveReady ? "Ready" : "Gated"}</strong>
      </div>
    </div>
  );
}
