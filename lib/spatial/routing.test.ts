import { describe, expect, it } from "vitest";
import { findRoute } from "./routing";
import type { RouteEdge, RouteNode } from "./types";

const nodes: RouteNode[] = [
  { id: "a", venueId: "v", location: { longitude: 0, latitude: 0 }, nodeType: "entrance", isAccessible: true },
  { id: "b", venueId: "v", location: { longitude: 0, latitude: 0 }, nodeType: "path", isAccessible: true },
  { id: "c", venueId: "v", location: { longitude: 0, latitude: 0 }, nodeType: "stairs", isAccessible: false },
  { id: "d", venueId: "v", location: { longitude: 0, latitude: 0 }, nodeType: "poi", isAccessible: true }
];

const edges: RouteEdge[] = [
  { id: "ab", venueId: "v", fromNodeId: "a", toNodeId: "b", distanceMeters: 10, isAccessible: true, hasStairs: false, usesElevator: false, indoor: true, temporarilyClosed: false },
  { id: "bd", venueId: "v", fromNodeId: "b", toNodeId: "d", distanceMeters: 10, isAccessible: true, hasStairs: false, usesElevator: false, indoor: true, temporarilyClosed: false },
  { id: "ac", venueId: "v", fromNodeId: "a", toNodeId: "c", distanceMeters: 2, isAccessible: false, hasStairs: true, usesElevator: false, indoor: true, temporarilyClosed: false },
  { id: "cd", venueId: "v", fromNodeId: "c", toNodeId: "d", distanceMeters: 2, isAccessible: false, hasStairs: true, usesElevator: false, indoor: true, temporarilyClosed: false }
];

describe("findRoute", () => {
  it("selects the shortest standard route", () => {
    expect(findRoute(nodes, edges, "a", "d", "standard")).toEqual({
      nodeIds: ["a", "c", "d"],
      edgeIds: ["ac", "cd"],
      distanceMeters: 4
    });
  });

  it("selects a longer accessible route when stairs are shorter", () => {
    expect(findRoute(nodes, edges, "a", "d", "accessible")).toEqual({
      nodeIds: ["a", "b", "d"],
      edgeIds: ["ab", "bd"],
      distanceMeters: 20
    });
  });

  it("excludes temporarily closed edges", () => {
    const closed = edges.map((edge) => edge.id === "bd" ? { ...edge, temporarilyClosed: true } : edge);
    expect(findRoute(nodes, closed, "a", "d", "accessible")).toBeNull();
  });

  it("fails safely for an unknown destination", () => {
    expect(findRoute(nodes, edges, "a", "missing", "standard")).toBeNull();
  });
});
