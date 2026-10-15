export type SpatialId = string;

export type VenueStatus = "draft" | "active" | "inactive";

export interface Coordinate {
  longitude: number;
  latitude: number;
}

export interface SpatialProvenance {
  sourceType: "official-plan" | "survey" | "field-verification" | "public-map" | "other";
  sourceLabel: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface Poi {
  id: SpatialId;
  venueId: SpatialId;
  floorId?: SpatialId;
  spaceId?: SpatialId;
  name: string;
  category: string;
  location?: Coordinate;
  isPublic: boolean;
  isAccessible?: boolean;
  provenance?: SpatialProvenance;
}

export interface RouteNode {
  id: SpatialId;
  venueId: SpatialId;
  floorId?: SpatialId;
  location: Coordinate;
  nodeType: "path" | "entrance" | "poi" | "stairs" | "elevator" | "anchor";
  isAccessible: boolean;
}

export interface RouteEdge {
  id: SpatialId;
  venueId: SpatialId;
  fromNodeId: SpatialId;
  toNodeId: SpatialId;
  distanceMeters: number;
  travelTimeSeconds?: number;
  isAccessible: boolean;
  hasStairs: boolean;
  usesElevator: boolean;
  indoor: boolean;
  temporarilyClosed: boolean;
}
