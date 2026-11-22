/**
 * Risk-aware shortest path graph routing algorithms (Dijkstra, Yen's K-Shortest, Virtual Truck Node)
 */
import { EDGES, NetworkEdge, getEdgeBetween } from "./network";
import { PointTuple } from "./geo";

export interface RouteResult {
  nodes: string[];
  edges: NetworkEdge[];
  totalMinutes: number;
  baseMinutes: number;
  riskPenaltyMinutes: number;
  maxRisk: number;
  polyline: PointTuple[];
  isTurnaround?: boolean;
}

export const ROUTING_CONFIG = {
  PENALTY_MAX_MIN: 600, // Maximum penalty in minutes for near-closed roads
  CLOSURE_THRESHOLD: 85, // Road completely closed / impassable
};

export const REPLAN_CONFIG = {
  REPLAN_MIN_GAIN_MIN: 15,    // Must save >= 15 min to switch route non-emergency
  REPLAN_MIN_RISK_DROP: 20,   // Or reduce max risk by >= 20 points
  REPLAN_COOLDOWN_MIN: 30,    // 30 simulation minutes cooldown between non-emergency replans
};

export interface AdjacencyEdge {
  targetNode: string;
  edge: NetworkEdge;
  cost: number;
  baseMinutes: number;
  riskScore: number;
  isTurnaround?: boolean;
}

export interface CandidateAlternative {
  rank: number;
  nodes: string[];
  edges: NetworkEdge[];
  totalMinutes: number;
  baseMinutes: number;
  extraMinutes: number;
  maxRisk: number;
  polyline: PointTuple[];
  isTurnaround: boolean;
  rejected: boolean;
  rejectionReason?: string;
}

export interface VirtualTruckContext {
  truckId: string;
  currentEdge: NetworkEdge;
  fractionAlong: number; // 0 to 1 from edge.from to edge.to
  headingToNode: string; // the forward node
}

/**
 * Calculates exact geographical coordinates [lat, lng] along an edge at fraction (0..1)
 */
export function getPositionAlongEdge(edge: NetworkEdge, fraction: number): PointTuple {
  if (!edge.path || edge.path.length === 0) return [0, 0];
  if (edge.path.length === 1) return edge.path[0];
  const clampedF = Math.max(0, Math.min(1, fraction));
  const totalSegments = edge.path.length - 1;
  const scaled = clampedF * totalSegments;
  const segIdx = Math.min(Math.floor(scaled), totalSegments - 1);
  const segF = scaled - segIdx;
  const p1 = edge.path[segIdx];
  const p2 = edge.path[segIdx + 1];
  return [
    p1[0] + (p2[0] - p1[0]) * segF,
    p1[1] + (p2[1] - p1[1]) * segF,
  ];
}

/**
 * Slices an edge's polyline from the truck's exact position to the destination node
 */
export function sliceEdgePolyline(
  edge: NetworkEdge,
  fraction: number,
  headingToNode: string
): PointTuple[] {
  const truckPos = getPositionAlongEdge(edge, fraction);
  const fullPath = edge.to === headingToNode ? [...edge.path] : [...edge.path].reverse();
  const clampedF = Math.max(0, Math.min(1, edge.to === headingToNode ? fraction : 1 - fraction));
  const totalSegments = fullPath.length - 1;
  const startSegIdx = Math.min(Math.floor(clampedF * totalSegments), totalSegments - 1);

  const remainingPoints: PointTuple[] = [truckPos];
  for (let i = startSegIdx + 1; i < fullPath.length; i++) {
    remainingPoints.push(fullPath[i]);
  }
  return remainingPoints;
}

/**
 * Returns the nearest safe stop point on an edge (nodes or emergency laybys)
 */
export function getNearestSafeStop(
  edge: NetworkEdge,
  fractionAlong: number,
  headingToNode: string
): { fraction: number; point: PointTuple; name: string } {
  const safeStops = edge.safeStopPoints && edge.safeStopPoints.length > 0
    ? [...edge.safeStopPoints]
    : [0, 1];

  const currentFrac = edge.to === headingToNode ? fractionAlong : 1 - fractionAlong;
  let nearestFrac = safeStops[0];
  let minDiff = Math.abs(currentFrac - nearestFrac);

  for (const stop of safeStops) {
    const diff = Math.abs(currentFrac - stop);
    if (diff < minDiff) {
      minDiff = diff;
      nearestFrac = stop;
    }
  }

  const point = getPositionAlongEdge(edge, edge.to === headingToNode ? nearestFrac : 1 - nearestFrac);
  const name = nearestFrac === 0
    ? edge.from
    : nearestFrac === 1
    ? edge.to
    : `${edge.name} km ${Math.round(nearestFrac * edge.lengthKm)} Layby`;

  return { fraction: nearestFrac, point, name };
}

/**
 * Builds bidirectional adjacency graph with risk penalties, optionally injecting a virtual truck node T
 */
export function buildGraph(
  riskMap: Map<string, number>,
  considerRisk: boolean,
  virtualTruck?: VirtualTruckContext
): Map<string, AdjacencyEdge[]> {
  const graph = new Map<string, AdjacencyEdge[]>();

  const addEdge = (u: string, v: string, e: NetworkEdge, cost: number, baseMinutes: number, risk: number, isTurnaround = false) => {
    if (!graph.has(u)) graph.set(u, []);
    graph.get(u)!.push({
      targetNode: v,
      edge: e,
      cost,
      baseMinutes,
      riskScore: risk,
      isTurnaround,
    });
  };

  EDGES.forEach((edge) => {
    // If this edge is where the truck is currently located, virtual node will bridge it
    const isTruckEdge = virtualTruck && virtualTruck.currentEdge.id === edge.id;

    const score = riskMap.get(edge.id) ?? 0;
    if (considerRisk && score >= ROUTING_CONFIG.CLOSURE_THRESHOLD) {
      return;
    }

    let penalty = 0;
    if (considerRisk) {
      penalty = Math.pow(score / 100, 2) * ROUTING_CONFIG.PENALTY_MAX_MIN;
    }
    const cost = edge.baseMinutes + penalty;

    // Normal network edge
    if (!isTruckEdge) {
      addEdge(edge.from, edge.to, edge, cost, edge.baseMinutes, score);
      addEdge(edge.to, edge.from, edge, cost, edge.baseMinutes, score);
    }
  });

  // Inject virtual truck node T
  if (virtualTruck) {
    const { currentEdge, fractionAlong, headingToNode } = virtualTruck;
    const truckNode = `TRUCK_${virtualTruck.truckId}`;

    const nextNode = headingToNode;
    const prevNode = currentEdge.from === nextNode ? currentEdge.to : currentEdge.from;

    const fracToNext = headingToNode === currentEdge.to ? 1 - fractionAlong : fractionAlong;
    const fracToPrev = 1 - fracToNext;

    const baseToNext = Math.round(currentEdge.baseMinutes * fracToNext);
    const baseToPrev = Math.round(currentEdge.baseMinutes * fracToPrev);

    const score = riskMap.get(currentEdge.id) ?? 0;
    const penaltyNext = considerRisk ? Math.pow(score / 100, 2) * (ROUTING_CONFIG.PENALTY_MAX_MIN * fracToNext) : 0;
    const penaltyPrev = considerRisk ? Math.pow(score / 100, 2) * (ROUTING_CONFIG.PENALTY_MAX_MIN * fracToPrev) : 0;

    // Link 1: T -> nextNode (Forward continuation)
    if (!considerRisk || score < ROUTING_CONFIG.CLOSURE_THRESHOLD) {
      addEdge(truckNode, nextNode, currentEdge, baseToNext + penaltyNext, baseToNext, score, false);
    }

    // Link 2: T -> prevNode (Turn-back / U-turn)
    // Only permitted if edge does NOT restrict turn-backs, or truck is still at entry gate (<= 10%)
    const canTurnBack = currentEdge.canTurnBack !== false || fractionAlong <= 0.1;
    if (canTurnBack && (!considerRisk || score < ROUTING_CONFIG.CLOSURE_THRESHOLD)) {
      addEdge(truckNode, prevNode, currentEdge, baseToPrev + penaltyPrev, baseToPrev, score, true);
    }
  }

  return graph;
}

/**
 * Executes Dijkstra's algorithm from startNode to destNode
 */
export function dijkstra(
  startNode: string,
  destNode: string,
  riskMap: Map<string, number>,
  considerRisk: boolean,
  virtualTruck?: VirtualTruckContext,
  excludedEdgeIds?: Set<string>
): RouteResult | null {
  const actualStart = virtualTruck ? `TRUCK_${virtualTruck.truckId}` : startNode;

  if (actualStart === destNode) {
    return {
      nodes: [destNode],
      edges: [],
      totalMinutes: 0,
      baseMinutes: 0,
      riskPenaltyMinutes: 0,
      maxRisk: 0,
      polyline: [],
    };
  }

  const graph = buildGraph(riskMap, considerRisk, virtualTruck);
  const distances = new Map<string, number>();
  const baseMins = new Map<string, number>();
  const previous = new Map<
    string,
    { node: string; edge: NetworkEdge; edgeCost: number; baseMin: number; risk: number; isTurnaround?: boolean }
  >();
  const unvisited = new Set<string>();

  Array.from(graph.keys()).forEach((node) => {
    distances.set(node, Infinity);
    baseMins.set(node, Infinity);
    unvisited.add(node);
  });
  distances.set(actualStart, 0);
  baseMins.set(actualStart, 0);
  unvisited.add(actualStart);
  unvisited.add(destNode);

  while (unvisited.size > 0) {
    let currentMinNode: string | null = null;
    let minDistance = Infinity;

    for (const node of unvisited) {
      const dist = distances.get(node) ?? Infinity;
      if (dist < minDistance) {
        minDistance = dist;
        currentMinNode = node;
      }
    }

    if (!currentMinNode || minDistance === Infinity) {
      break;
    }

    if (currentMinNode === destNode) {
      break;
    }

    unvisited.delete(currentMinNode);

    const neighbors = graph.get(currentMinNode) || [];
    for (const neighbor of neighbors) {
      if (excludedEdgeIds && excludedEdgeIds.has(neighbor.edge.id)) {
        continue;
      }
      if (!unvisited.has(neighbor.targetNode)) continue;

      const alt = minDistance + neighbor.cost;
      const currentNeighborDist = distances.get(neighbor.targetNode) ?? Infinity;

      if (alt < currentNeighborDist) {
        distances.set(neighbor.targetNode, alt);
        baseMins.set(neighbor.targetNode, (baseMins.get(currentMinNode) || 0) + neighbor.baseMinutes);
        previous.set(neighbor.targetNode, {
          node: currentMinNode,
          edge: neighbor.edge,
          edgeCost: neighbor.cost,
          baseMin: neighbor.baseMinutes,
          risk: neighbor.riskScore,
          isTurnaround: neighbor.isTurnaround,
        });
      }
    }
  }

  if (!previous.has(destNode) && actualStart !== destNode) {
    return null;
  }

  // Reconstruct path
  const pathNodes: string[] = [destNode];
  const pathEdges: NetworkEdge[] = [];
  let curr = destNode;
  let totalBaseMinutes = 0;
  let maxRisk = 0;
  let isTurnaround = false;

  while (curr !== actualStart) {
    const prev = previous.get(curr);
    if (!prev) break;
    if (!virtualTruck || prev.node !== actualStart) {
      pathNodes.unshift(prev.node);
    }
    pathEdges.unshift(prev.edge);
    totalBaseMinutes += prev.baseMin;
    maxRisk = Math.max(maxRisk, prev.risk);
    if (prev.isTurnaround) isTurnaround = true;
    curr = prev.node;
  }

  // Build concatenated polyline
  const polyline: PointTuple[] = [];
  if (virtualTruck && pathEdges.length > 0) {
    // First segment starts directly at truck position
    const firstEdge = pathEdges[0];
    const firstTarget = pathNodes[0];
    const initialSlice = sliceEdgePolyline(firstEdge, virtualTruck.fractionAlong, firstTarget);
    polyline.push(...initialSlice);

    // Remaining edge segments
    for (let i = 1; i < pathEdges.length; i++) {
      const edge = pathEdges[i];
      const fromNode = pathNodes[i - 1];
      const pts = [...edge.path];
      if (edge.to === fromNode) pts.reverse();
      if (polyline.length > 0 && pts.length > 0) pts.shift();
      polyline.push(...pts);
    }
  } else {
    for (let i = 0; i < pathEdges.length; i++) {
      const edge = pathEdges[i];
      const fromNode = pathNodes[i];
      const pts = [...edge.path];
      if (edge.to === fromNode) pts.reverse();
      if (polyline.length > 0 && pts.length > 0) pts.shift();
      polyline.push(...pts);
    }
  }

  const totalMin = distances.get(destNode) || totalBaseMinutes;
  const riskPenaltyMinutes = Math.max(0, totalMin - totalBaseMinutes);

  return {
    nodes: pathNodes,
    edges: pathEdges,
    totalMinutes: Math.round(totalMin),
    baseMinutes: totalBaseMinutes,
    riskPenaltyMinutes: Math.round(riskPenaltyMinutes),
    maxRisk,
    polyline,
    isTurnaround,
  };
}

/**
 * Yen's K-Shortest Loopless Paths Algorithm (k up to 5)
 */
export function findKShortestRoutes(
  startNode: string,
  destNode: string,
  riskMap: Map<string, number>,
  considerRisk = true,
  k = 3,
  virtualTruck?: VirtualTruckContext
): CandidateAlternative[] {
  const candidates: CandidateAlternative[] = [];
  const shortest = dijkstra(startNode, destNode, riskMap, considerRisk, virtualTruck);
  if (!shortest) return candidates;

  const A: RouteResult[] = [shortest];
  const B: { route: RouteResult; isTurnaround: boolean }[] = [];

  for (let i = 1; i < k; i++) {
    const prevRoute = A[i - 1];
    for (let j = 0; j < prevRoute.nodes.length - 1; j++) {
      const spurNode = prevRoute.nodes[j];
      const excludedEdges = new Set<string>();

      // Exclude edges in previous paths sharing identical root path
      for (const p of A) {
        if (p.nodes.length > j + 1 && p.nodes.slice(0, j + 1).join("-") === prevRoute.nodes.slice(0, j + 1).join("-")) {
          const edge = getEdgeBetween(p.nodes[j], p.nodes[j + 1]);
          if (edge) excludedEdges.add(edge.id);
        }
      }

      // Compute spur route from spurNode to destNode
      const spurRoute = dijkstra(spurNode, destNode, riskMap, considerRisk, undefined, excludedEdges);
      if (spurRoute) {
        const rootNodes = prevRoute.nodes.slice(0, j);
        const rootEdges = prevRoute.edges.slice(0, j);
        const totalNodes = [...rootNodes, ...spurRoute.nodes];
        const totalEdges = [...rootEdges, ...spurRoute.edges];

        // Ensure path is loopless
        const nodeSet = new Set(totalNodes);
        if (nodeSet.size === totalNodes.length) {
          const totalMin = spurRoute.totalMinutes + rootEdges.reduce((acc, e) => acc + e.baseMinutes, 0);
          const baseMin = spurRoute.baseMinutes + rootEdges.reduce((acc, e) => acc + e.baseMinutes, 0);
          const maxRisk = Math.max(spurRoute.maxRisk, ...rootEdges.map((e) => riskMap.get(e.id) || 0));

          // Concat polylines
          const polyline: PointTuple[] = [];
          for (let eIdx = 0; eIdx < totalEdges.length; eIdx++) {
            const edge = totalEdges[eIdx];
            const from = totalNodes[eIdx];
            const pts = [...edge.path];
            if (edge.to === from) pts.reverse();
            if (polyline.length > 0 && pts.length > 0) pts.shift();
            polyline.push(...pts);
          }

          const candidateRoute: RouteResult = {
            nodes: totalNodes,
            edges: totalEdges,
            totalMinutes: totalMin,
            baseMinutes: baseMin,
            riskPenaltyMinutes: totalMin - baseMin,
            maxRisk,
            polyline,
          };

          if (
            !A.some((a) => a.nodes.join("-") === totalNodes.join("-")) &&
            !B.some((b) => b.route.nodes.join("-") === totalNodes.join("-"))
          ) {
            B.push({ route: candidateRoute, isTurnaround: prevRoute.isTurnaround || false });
          }
        }
      }
    }

    if (B.length === 0) break;
    B.sort((a, b) => a.route.totalMinutes - b.route.totalMinutes);
    const bestB = B.shift()!;
    A.push(bestB.route);
  }

  const baselineBase = A[0].baseMinutes;
  return A.map((route, idx) => {
    const extraMinutes = Math.max(0, route.baseMinutes - baselineBase);
    const rejected = idx > 0;
    let rejectionReason: string | undefined;
    if (idx > 0) {
      rejectionReason = `Candidate rank #${idx + 1} (+${extraMinutes}m, max risk ${route.maxRisk}%) superseded by optimal rank #1 route`;
    }
    return {
      rank: idx + 1,
      nodes: route.nodes,
      edges: route.edges,
      totalMinutes: route.totalMinutes,
      baseMinutes: route.baseMinutes,
      extraMinutes,
      maxRisk: route.maxRisk,
      polyline: route.polyline,
      isTurnaround: route.isTurnaround || false,
      rejected,
      rejectionReason,
    };
  });
}

/**
 * Hysteresis and stability protection against route flip-flopping
 */
export function shouldSwitchRoute(options: {
  currentRouteTimeMin: number;
  newRouteTimeMin: number;
  currentRouteMaxRisk: number;
  newRouteMaxRisk: number;
  lastReplanT: number;
  currentT: number;
  isCurrentRouteUnsafe: boolean; // e.g. closed edge ahead (risk >= 85)
}): { switch: boolean; reason: string } {
  const {
    currentRouteTimeMin,
    newRouteTimeMin,
    currentRouteMaxRisk,
    newRouteMaxRisk,
    lastReplanT,
    currentT,
    isCurrentRouteUnsafe,
  } = options;

  // Emergency: road closed / unsafe ahead -> always bypass cooldown and switch!
  if (isCurrentRouteUnsafe) {
    return {
      switch: true,
      reason: "Emergency override: current corridor impassable or exceeds closure threshold",
    };
  }

  // Cooldown check for non-emergency replans
  const elapsedMinutes = (currentT - lastReplanT) * 60;
  if (elapsedMinutes < REPLAN_CONFIG.REPLAN_COOLDOWN_MIN) {
    return {
      switch: false,
      reason: `Route switch deferred: in cooldown period (${Math.round(elapsedMinutes)}m / ${REPLAN_CONFIG.REPLAN_COOLDOWN_MIN}m elapsed)`,
    };
  }

  // Minimum time gain check
  const timeGain = currentRouteTimeMin - newRouteTimeMin;
  if (timeGain >= REPLAN_CONFIG.REPLAN_MIN_GAIN_MIN) {
    return {
      switch: true,
      reason: `Saves ${Math.round(timeGain)}m (exceeds ${REPLAN_CONFIG.REPLAN_MIN_GAIN_MIN}m threshold)`,
    };
  }

  // Minimum risk drop check
  const riskDrop = currentRouteMaxRisk - newRouteMaxRisk;
  if (riskDrop >= REPLAN_CONFIG.REPLAN_MIN_RISK_DROP) {
    return {
      switch: true,
      reason: `Reduces peak traversal risk by ${riskDrop} pts (exceeds ${REPLAN_CONFIG.REPLAN_MIN_RISK_DROP} pts threshold)`,
    };
  }

  return {
    switch: false,
    reason: `Marginal gain (${Math.round(timeGain)}m / ${riskDrop} pts risk) below switching thresholds`,
  };
}

/**
 * Returns both fastest (ignoring risk) and safest (risk-aware) routes
 */
export function findRoutes(
  from: string,
  to: string,
  riskMap: Map<string, number>
): { fastest: RouteResult | null; safest: RouteResult | null } {
  const fastest = dijkstra(from, to, riskMap, false);
  const safest = dijkstra(from, to, riskMap, true);
  return { fastest, safest };
}

/**
 * Mid-edge rerouting using the unified virtual truck node
 */
export function findRerouteFromCurrentEdge(
  currentEdge: NetworkEdge,
  fractionAlong: number,
  headingToNode: string,
  destNode: string,
  riskMap: Map<string, number>
): RouteResult | null {
  const virtualTruck: VirtualTruckContext = {
    truckId: "MID",
    currentEdge,
    fractionAlong,
    headingToNode,
  };

  return dijkstra("", destNode, riskMap, true, virtualTruck);
}
