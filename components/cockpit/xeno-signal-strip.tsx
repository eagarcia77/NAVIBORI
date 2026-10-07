import { assessSpatialTruth, PILOT_001_TRUTH } from "@/lib/spatial/truth-ledger";
import { attestReality } from "@/lib/spatial/reality-attestation";

export default function XenoSignalStrip() {
  const truth = assessSpatialTruth(PILOT_001_TRUTH);
  const attestation = attestReality({
    published: truth.published,
    datasetVersioned: truth.hasIdentity,
    provenanceVerified: truth.hasProvenance,
    integrityVerified: truth.hasHash,
    routeGraphVerified: false,
    accessibilityVerified: false,
    deviceCompatible: false,
    consentGranted: false
  });

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
        <span>ATTESTATION</span>
        <strong>{attestation.level}</strong>
      </div>
    </div>
  );
}
