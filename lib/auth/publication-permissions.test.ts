import { describe, expect, it } from "vitest";
import {
  canPerformPublicationAction,
  satisfiesSeparationOfDuties
} from "./publication-permissions";

describe("publication permissions", () => {
  it("allows a content editor to draft but not approve", () => {
    expect(canPerformPublicationAction("content_editor", "create_draft")).toBe(true);
    expect(canPerformPublicationAction("content_editor", "approve")).toBe(false);
  });

  it("allows venue managers to approve and publish", () => {
    expect(canPerformPublicationAction("venue_manager", "approve")).toBe(true);
    expect(canPerformPublicationAction("venue_manager", "publish")).toBe(true);
  });

  it("does not give merchants spatial publication privileges", () => {
    expect(canPerformPublicationAction("merchant", "create_draft")).toBe(false);
    expect(canPerformPublicationAction("merchant", "publish")).toBe(false);
  });

  it("requires author, reviewer and publisher separation", () => {
    expect(satisfiesSeparationOfDuties("a", "b", "c")).toBe(true);
    expect(satisfiesSeparationOfDuties("a", "a", "c")).toBe(false);
    expect(satisfiesSeparationOfDuties("a", "b", "b")).toBe(false);
  });
});
