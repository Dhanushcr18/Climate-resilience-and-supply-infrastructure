/**
 * Tiered Alternate Route Selection & Traversal-Time Risk Engine
 * Implements pure deterministic candidate route enumeration and traversal-time risk scoring.
 */
import { EDGES, NODES, NetworkEdge, getEdgeBetween } from "./network";
import { PointTuple } from "./geo";
import { ScenarioId, getRainHistory, getRainForecast } from "./scenarios";
import { calculateRiskScore } from "./risk";
import { RouteResult } from "./routing";

export interface TraversalEdgeRisk {
  edgeId: string;
  edgeName: string;
  risk: number;
  isClosed: boolean;
  tEnter: number;
  tExit: number;
}

export interface CandidateRoute {
  nodes: string[];
  edges: NetworkEdge[];
  baseMinutes: number;
  extraMinutes: number;
  maxTraversalRisk: number;
  hasImpassable: boolean;
  impassableReason?: string;
  perEdgeRisk: TraversalEdgeRisk[];
  polyline: PointTuple[];
  tier: "safe" | "acceptable" | "rejected";
  tierLabel: string;
  rejectionReason?: string;
  isTurnaround?: boolean;
}

export interface CandidateRejectionItem {
  path: string;
  reason: string;
  status?: "active_detour" | "passable" | "time_exceeded" | "high_risk" | "impassable";
  statusLabel?: string;
  isPassable?: boolean;
  risk?: number;
  extraMinutes?: number;
}

export interface TieredRoutingResult {
  decision: "REROUTE" | "HOLD" | "ESCALATE";
  selectedRoute: RouteResult | null;
  tier: "safe" | "acceptable" | "none";
  tierLabel: string;
  maxTraversalRisk: number;
  extraMinutes: number;
  candidates: CandidateRoute[];
  rejections: CandidateRejectionItem[];
  holdDurationHours?: number;
  reason: string;
}

/**
 * Enumerates distinct simple paths between start and end nodes up to maxDepth.
 * Pure deterministic DFS sorted by base transit duration.
 */
export function enumerateCandidatePaths(
  startNode: string,
  destNode: string,
  maxDepth = 7,
  maxPaths = 6
): string[][] {
  const paths: string[][] = [];

  function dfs(curr: string, visited: Set<string>, currentPath: string[]) {
    if (currentPath.length > maxDepth) return;
    if (curr === destNode) {
      paths.push([...currentPath]);
      return;
    }
    const outgoing = EDGES.filter((e) => e.from === curr || e.to === curr);
    for (const e of outgoing) {
      const nxt = e.from === curr ? e.to : e.from;
      if (!visited.has(nxt)) {
        visited.add(nxt);
        currentPath.push(nxt);
        dfs(nxt, visited, currentPath);
        currentPath.pop();
        visited.delete(nxt);
      }
    }
  }

  const vis = new Set<string>([startNode]);
  dfs(startNode, vis, [startNode]);

  // Sort paths by base travel minutes (shortest physical distance first)
  paths.sort((a, b) => {
    let costA = 0;
    for (let i = 0; i < a.length - 1; i++) {
      const e = getEdgeBetween(a[i], a[i + 1]);
      if (e) costA += e.baseMinutes;
    }
    let costB = 0;
    for (let i = 0; i < b.length - 1; i++) {
      const e = getEdgeBetween(b[i], b[i + 1]);
      if (e) costB += e.baseMinutes;
    }
    return costA - costB;
  });

  return paths.slice(0, maxPaths);
}

/**
 * Calculates risk for an edge during the actual estimated traversal time window.
 */
export function getEdgeRiskAtTraversal(
  scenario: ScenarioId,
  edge: NetworkEdge,
  tEnter: number,
  tDurationH: number,
  effectiveRisksByHour?: Map<number, Map<string, number>>,
  closedEdgesByHour?: Map<number, Set<string>>
): { score: number; isClosed: boolean } {
  const hourKey = Math.min(72, Math.max(0, Math.floor(tEnter)));
  const effScore = effectiveRisksByHour?.get(hourKey)?.get(edge.id);

  // A verified clearance is authoritative for this edge. It must override
  // the stale hydrological forecast used to build static closure maps.
  if (effScore === 0) {
    return { score: 0, isClosed: false };
  }

  // If fused detection confirmed blocked (>=85) at traversal hour
  if (effScore !== undefined && effScore >= 85) {
    return { score: effScore, isClosed: true };
  }

  // Traversal-time risk: evaluate with lookahead covering actual edge transit window
  const hist = getRainHistory(scenario, edge.id, tEnter);
  const windowH = Math.max(4, Math.ceil(tDurationH + 1));
  const fore = getRainForecast(scenario, edge.id, tEnter, windowH);
  const assessment = calculateRiskScore(edge, hist, fore);

  let traversalScore = assessment.score;
  if (effScore !== undefined && effScore >= 70) {
    traversalScore = Math.max(traversalScore, effScore);
  }

  const closed = traversalScore >= 85;
  return { score: traversalScore, isClosed: closed };
}

/**
 * Evaluates a candidate path's traversal-time risk, extra travel minutes, and safety tier.
 */
export function evaluateCandidatePath(
  scenario: ScenarioId,
  pathNodes: string[],
  startT: number,
  origRemainingBaseMin: number,
  toleranceMin: number,
  isCriticalOrMedicine: boolean,
  avoidEdgeId?: string,
  effectiveRisksByHour?: Map<number, Map<string, number>>,
  closedEdgesByHour?: Map<number, Set<string>>,
  initialElapsedMin = 0,
  isTurnaround = false
): CandidateRoute {
  const edges: NetworkEdge[] = [];
  let baseMinutes = initialElapsedMin;
  let maxTraversalRisk = 0;
  let hasImpassable = false;
  let impassableReason: string | undefined;
  const perEdgeRisk: TraversalEdgeRisk[] = [];
  const polyline: PointTuple[] = [];

  let cumulativeMin = initialElapsedMin;

  for (let i = 0; i < pathNodes.length - 1; i++) {
    const fromNode = pathNodes[i];
    const toNode = pathNodes[i + 1];
    const edge = getEdgeBetween(fromNode, toNode);
    if (!edge) continue;

    edges.push(edge);
    const tEnter = startT + cumulativeMin / 60;
    const durH = edge.baseMinutes / 60;
    const tExit = tEnter + durH;
    cumulativeMin += edge.baseMinutes;
    baseMinutes += edge.baseMinutes;

    // Check if edge is explicitly the avoidEdgeId (the hazard corridor being avoided)
    if (avoidEdgeId && edge.id === avoidEdgeId) {
      hasImpassable = true;
      impassableReason = `Contains blocked hazard corridor ${edge.name} (${edge.id})`;
    }

    const { score, isClosed } = getEdgeRiskAtTraversal(
      scenario,
      edge,
      tEnter,
      durH,
      effectiveRisksByHour,
      closedEdgesByHour
    );

    if (isClosed && !hasImpassable) {
      hasImpassable = true;
      impassableReason = `${edge.name} is closed at estimated traversal time t=${tEnter.toFixed(1)}h (risk ${score}%)`;
    }

    if (score > maxTraversalRisk) {
      maxTraversalRisk = score;
    }

    perEdgeRisk.push({
      edgeId: edge.id,
      edgeName: edge.name,
      risk: score,
      isClosed,
      tEnter,
      tExit,
    });

    // Build polyline points
    const pts = [...edge.path];
    if (edge.to === fromNode) pts.reverse();
    if (polyline.length > 0 && pts.length > 0) pts.shift();
    polyline.push(...pts);
  }

  const extraMinutes = Math.max(0, baseMinutes - origRemainingBaseMin);
  const allowedTolerance = isCriticalOrMedicine ? toleranceMin * 1.5 : toleranceMin;

  let tier: "safe" | "acceptable" | "rejected" = "rejected";
  let tierLabel = "Rejected";
  let rejectionReason: string | undefined;

  if (hasImpassable) {
    tier = "rejected";
    tierLabel = "Impassable";
    rejectionReason = impassableReason || "Contains impassable closed road segment";
  } else if (maxTraversalRisk < 50 && extraMinutes <= toleranceMin) {
    tier = "safe";
    tierLabel = "Safe alternate (risk < 50%)";
  } else if (maxTraversalRisk < 70 && extraMinutes <= allowedTolerance) {
    tier = "acceptable";
    tierLabel = `Reduced-risk alternate (risk ${maxTraversalRisk}%)`;
  } else {
    tier = "rejected";
    tierLabel = "Out of Tolerance";
    if (extraMinutes > allowedTolerance) {
      rejectionReason = `Extra travel time (+${extraMinutes}m) exceeds cargo tolerance limit (+${allowedTolerance}m)`;
    } else {
      rejectionReason = `Traversal hazard risk (${maxTraversalRisk}%) exceeds acceptable safety ceiling (70%)`;
    }
  }

  return {
    nodes: pathNodes,
    edges,
    baseMinutes,
    extraMinutes,
    maxTraversalRisk,
    hasImpassable,
    impassableReason,
    perEdgeRisk,
    polyline,
    tier,
    tierLabel,
    rejectionReason,
    isTurnaround,
  };
}

/**
 * Tiered alternate route selector for autonomous dispatcher engine.
 * Selects Tier 1 (Safe) -> Tier 2 (Acceptable) -> Tier 3 (Hold) -> Tier 4 (Escalate).
 */
export function selectTieredAlternate(options: {
  scenario: ScenarioId;
  currentT: number;
  originNode: string;
  destNode: string;
  currentEdge: NetworkEdge | null;
  fractionOnEdge: number;
  headingToNode: string | null;
  toleranceMin: number;
  isCriticalOrMedicine: boolean;
  blockedEdgeId: string;
  origRemainingBaseMin: number;
  truckStatus?: string;
  effectiveRisksByHour?: Map<number, Map<string, number>>;
  closedEdgesByHour?: Map<number, Set<string>>;
  forecastDropsWithin12h?: boolean;
}): TieredRoutingResult {
  const {
    scenario,
    currentT,
    originNode,
    destNode,
    currentEdge,
    fractionOnEdge,
    headingToNode,
    toleranceMin,
    isCriticalOrMedicine,
    blockedEdgeId,
    origRemainingBaseMin,
    truckStatus = "pending",
    effectiveRisksByHour,
    closedEdgesByHour,
    forecastDropsWithin12h = false,
  } = options;

  const allCandidateEvaluations: CandidateRoute[] = [];

  // Case 1: Truck is at origin (pending departure)
  const isAtOrigin = truckStatus === "pending" || !currentEdge;
  if (isAtOrigin) {
    const rawPaths = enumerateCandidatePaths(originNode, destNode, 7, 6);
    rawPaths.forEach((pathNodes) => {
      allCandidateEvaluations.push(
        evaluateCandidatePath(
          scenario,
          pathNodes,
          currentT,
          origRemainingBaseMin,
          toleranceMin,
          isCriticalOrMedicine,
          blockedEdgeId,
          effectiveRisksByHour,
          closedEdgesByHour
        )
      );
    });
  } else {
    // Case 2: Mid-edge position
    // Option A: Continue forward to headingToNode
    const nextNode = headingToNode || currentEdge.to;
    const prevNode = currentEdge.from === nextNode ? currentEdge.to : currentEdge.from;

    const remainingToNextMin = Math.round(currentEdge.baseMinutes * (1 - fractionOnEdge));
    const forwardPaths = enumerateCandidatePaths(nextNode, destNode, 7, 5);

    forwardPaths.forEach((pathNodes) => {
      // Full node list: includes current forward node
      allCandidateEvaluations.push(
        evaluateCandidatePath(
          scenario,
          pathNodes,
          currentT + remainingToNextMin / 60,
          origRemainingBaseMin,
          toleranceMin,
          isCriticalOrMedicine,
          blockedEdgeId,
          effectiveRisksByHour,
          closedEdgesByHour,
          remainingToNextMin,
          false
        )
      );
    });

    // Option B: Turn back to prevNode (permitted if edge allows turn-backs, or if still at entry toll gate/rotary <= 10%)
    const canTurnBack = currentEdge.canTurnBack !== false || fractionOnEdge <= 0.1;
    if (canTurnBack) {
      const timeToTurnBackMin = Math.round(currentEdge.baseMinutes * fractionOnEdge);
      const turnaroundPaths = enumerateCandidatePaths(prevNode, destNode, 7, 5);

      turnaroundPaths.forEach((pathNodes) => {
        allCandidateEvaluations.push(
          evaluateCandidatePath(
            scenario,
            pathNodes,
            currentT + timeToTurnBackMin / 60,
            origRemainingBaseMin,
            toleranceMin,
            isCriticalOrMedicine,
            blockedEdgeId,
            effectiveRisksByHour,
            closedEdgesByHour,
            timeToTurnBackMin,
            true
          )
        );
      });
    }
  }

  // Filter out any paths that had zero edges (invalid)
  const validEvaluations = allCandidateEvaluations.filter((c) => c.edges.length > 0);

  // Group into tiers
  const tier1Safe = validEvaluations
    .filter((c) => c.tier === "safe")
    .sort((a, b) => a.extraMinutes - b.extraMinutes);

  const tier2Acceptable = validEvaluations
    .filter((c) => c.tier === "acceptable")
    .sort((a, b) => a.maxTraversalRisk - b.maxTraversalRisk || a.extraMinutes - b.extraMinutes);

  const allowedTolerance = isCriticalOrMedicine ? toleranceMin * 1.5 : toleranceMin;

  const buildRejectionsList = (selectedNodes?: string[]): CandidateRejectionItem[] => {
    return validEvaluations.map((c) => {
      const pathStr = c.nodes.join(" → ");
      const isSelected = !!selectedNodes && selectedNodes.join(" → ") === pathStr;

      let status: "active_detour" | "passable" | "time_exceeded" | "high_risk" | "impassable";
      let statusLabel: string;
      let isPassable: boolean;

      if (isSelected) {
        status = "active_detour";
        statusLabel = "Active Alternate";
        isPassable = true;
      } else if (c.hasImpassable) {
        status = "impassable";
        statusLabel = "Impassable";
        isPassable = false;
      } else if (c.tier === "safe" || c.tier === "acceptable") {
        status = "passable";
        statusLabel = "Possible (Clear)";
        isPassable = true;
      } else if (c.extraMinutes > allowedTolerance) {
        status = "time_exceeded";
        statusLabel = `Possible (+${c.extraMinutes}m)`;
        isPassable = true;
      } else {
        status = "high_risk";
        statusLabel = `High Risk (${c.maxTraversalRisk}%)`;
        isPassable = false;
      }

      return {
        path: pathStr,
        reason: isSelected
          ? `Selected optimal alternate detour (Safe verified, +${c.extraMinutes}m delay, risk ${c.maxTraversalRisk}%)`
          : c.rejectionReason || (isPassable ? `Corridor is open and passable (+${c.extraMinutes} min standard)` : "Hazard closure active on path"),
        status,
        statusLabel,
        isPassable,
        risk: c.maxTraversalRisk,
        extraMinutes: c.extraMinutes,
      };
    });
  };

  // 1. TIER 1: SAFE ALTERNATE
  if (tier1Safe.length > 0) {
    const best = tier1Safe[0];
    const routeResult: RouteResult = {
      nodes: best.nodes,
      edges: best.edges,
      totalMinutes: best.baseMinutes,
      baseMinutes: best.baseMinutes,
      riskPenaltyMinutes: 0,
      maxRisk: best.maxTraversalRisk,
      polyline: best.polyline,
    };

    return {
      decision: "REROUTE",
      selectedRoute: routeResult,
      tier: "safe",
      tierLabel: "Safe alternate",
      maxTraversalRisk: best.maxTraversalRisk,
      extraMinutes: best.extraMinutes,
      candidates: validEvaluations,
      rejections: buildRejectionsList(best.nodes),
      reason: `Rerouted via safe corridor (${best.nodes.join(" → ")}), traversal risk ${best.maxTraversalRisk}%`,
    };
  }

  // 2. TIER 2: ACCEPTABLE ALTERNATE (Reduced-Risk)
  if (tier2Acceptable.length > 0) {
    const best = tier2Acceptable[0];
    const routeResult: RouteResult = {
      nodes: best.nodes,
      edges: best.edges,
      totalMinutes: best.baseMinutes,
      baseMinutes: best.baseMinutes,
      riskPenaltyMinutes: 0,
      maxRisk: best.maxTraversalRisk,
      polyline: best.polyline,
    };

    return {
      decision: "REROUTE",
      selectedRoute: routeResult,
      tier: "acceptable",
      tierLabel: `Reduced-risk alternate (risk ${best.maxTraversalRisk}%)`,
      maxTraversalRisk: best.maxTraversalRisk,
      extraMinutes: best.extraMinutes,
      candidates: validEvaluations,
      rejections: buildRejectionsList(best.nodes),
      reason: `Rerouted via reduced-risk alternate (${best.nodes.join(" → ")}), traversal risk ${best.maxTraversalRisk}%`,
    };
  }

  // 3. TIER 3: HOLD
  if (forecastDropsWithin12h) {
    return {
      decision: "HOLD",
      selectedRoute: null,
      tier: "none",
      tierLabel: "Hold at Safe Staging Node",
      maxTraversalRisk: 0,
      extraMinutes: 480,
      candidates: validEvaluations,
      rejections: buildRejectionsList(),
      holdDurationHours: 8,
      reason: "No alternate within tolerance; holding at staging hub until rainfall subsides (<12h)",
    };
  }

  // 4. TIER 4: ESCALATE
  return {
    decision: "ESCALATE",
    selectedRoute: null,
    tier: "none",
    tierLabel: "Escalate to Human Dispatcher",
    maxTraversalRisk: 0,
    extraMinutes: 0,
    candidates: validEvaluations,
    rejections: buildRejectionsList(),
    reason: `All ${validEvaluations.length} candidate corridors impassable or out of tolerance. Flagged for human clearance.`,
  };
}
