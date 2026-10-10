import { describe, expect, it } from "vitest";
import {
  createSessionHandoff,
  encodeSessionHandoff,
  decodeSessionHandoff
} from "./session-handoff";

describe("cross-reality session handoff", () => {
  it("preserves visitor intent across encoded handoff", () => {
    const payload = createSessionHandoff({
      venueId: "venue-1",
      mode: "ar",
      destinationPoiId: "poi-7",
      routeProfile: "accessible",
      selectedLayer: "accessibility"
    });

    const decoded = decodeSessionHandoff(encodeSessionHandoff(payload));
    expect(decoded?.venueId).toBe("venue-1");
    expect(decoded?.mode).toBe("ar");
    expect(decoded?.routeProfile).toBe("accessible");
  });

  it("rejects malformed handoff payloads", () => {
    expect(decodeSessionHandoff("not-valid-base64")).toBeNull();
  });
});
