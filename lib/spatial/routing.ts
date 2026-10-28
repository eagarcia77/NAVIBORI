import type { RouteEdge, RouteNode, SpatialId } from "./types";

export type RouteProfile = "standard" | "accessible";

export interface RouteResult {
  nodeIds: SpatialId[];
  edgeIds: SpatialId[];
  distanceMeters: number;
}

export function findRoute(
  nodes: RouteNode[],
  edges: RouteEdge[],
  startNodeId: SpatialId,
  destinationNodeId: SpatialId,
  profile: RouteProfile = "standard"
): RouteResult | null {
  const nodeIds = new Set(nodes.map((node) => node.id));
  if (!nodeIds.has(startNodeId) || !nodeIds.has(destinationNodeId)) return null;

  const allowedEdges = edges.filter((edge) => {
    if (edge.temporarilyClosed) return false;
    if (profile === "accessible" && (!edge.isAccessible || edge.hasStairs)) return false;
    return nodeIds.has(edge.fromNodeId) && nodeIds.has(edge.toNodeId);
  });

  const adjacency = new Map<SpatialId, RouteEdge[]>();
  for (const edge of allowedEdges) {
    const list = adjacency.get(edge.fromNodeId) ?? [];
    list.push(edge);
    adjacency.set(edge.fromNodeId, list);
  }

  const distance = new Map<SpatialId, number>([[startNodeId, 0]]);
  const previous = new Map<SpatialId, { nodeId: SpatialId; edgeId: SpatialId }>();
  const unvisited = new Set(nodes.map((node) => node.id));

  while (unvisited.size > 0) {
    let current: SpatialId | undefined;
    let currentDistance = Number.POSITIVE_INFINITY;

    for (const nodeId of unvisited) {
      const candidate = distance.get(nodeId) ?? Number.POSITIVE_INFINITY;
      if (candidate < currentDistance) {
        currentDistance = candidate;
        current = nodeId;
      }
    }

    if (!current || !Number.isFinite(currentDistance)) break;
    if (current === destinationNodeId) break;

    unvisited.delete(current);

    for (const edge of adjacency.get(current) ?? []) {
      if (!unvisited.has(edge.toNodeId)) continue;
      const candidate = currentDistance + edge.distanceMeters;
      if (candidate < (distance.get(edge.toNodeId) ?? Number.POSITIVE_INFINITY)) {
        distance.set(edge.toNodeId, candidate);
        previous.set(edge.toNodeId, { nodeId: current, edgeId: edge.id });
      }
    }
  }

  const finalDistance = distance.get(destinationNodeId);
  if (finalDistance === undefined) return null;

  const nodePath: SpatialId[] = [destinationNodeId];
  const edgePath: SpatialId[] = [];
  let cursor = destinationNodeId;

  while (cursor !== startNodeId) {
    const step = previous.get(cursor);
    if (!step) return null;
    edgePath.push(step.edgeId);
    cursor = step.nodeId;
    nodePath.push(cursor);
  }

  nodePath.reverse();
  edgePath.reverse();

  return {
    nodeIds: nodePath,
    edgeIds: edgePath,
    distanceMeters: finalDistance
  };
}
