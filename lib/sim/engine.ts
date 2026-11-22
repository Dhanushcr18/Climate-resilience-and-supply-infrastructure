/**
 * Pure deterministic simulation engine for ResilienceOps
 * Simulates truck movements, baseline failures, agent decisions, and delay tracking.
 */
import { NODES, EDGES, NetworkEdge, getEdgeBetween } from "./network";
import { PointTuple, pointAlongPolyline } from "./geo";
import { calculateRiskScore, RiskAssessment, RISK_CONFIG } from "./risk";
import { ScenarioId, getRainHistory, getRainForecast } from "./scenarios";
import { Shipment, SEEDED_SHIPMENTS } from "./shipments";
import { dijkstra, findRerouteFromCurrentEdge, RouteResult, REPLAN_CONFIG, shouldSwitchRoute } from "./routing";
import { selectTieredAlternate, CandidateRejectionItem } from "./tieredRouting";
import { generateTemplateExplanation } from "./explain";
import { Observation, RoadStatus, SourceType } from "@/lib/detect/types";
import { getAllSimulatedObservations } from "@/lib/detect";
import { fuseAllRoads } from "@/lib/detect/fusion";
import { buildEffectiveRiskMap } from "@/lib/detect/agent";
import { buildScenarioOptimizationRequest } from "@/lib/optimizer/request";
import { solveBuiltin } from "@/lib/optimizer/builtin";

export type ShipmentStatus =
  | "pending"
  | "in_transit"
  | "delayed"
  | "held"
  | "escalated"
  | "delivered";

export interface AgentDecision {
  id: string;
  solver?: "builtin" | "cuopt";
  solveMs?: number;
  simT: number;
  shipmentCode: string;
  decision: "CONTINUE" | "REROUTE" | "HOLD" | "ESCALATE";
  chosenOption?: "CONTINUE" | "TURN_BACK" | "REROUTE" | "HOLD" | "ESCALATE";
  positionDescription?: string;
  replanTrigger?: string;
  roadName: string;
  edgeId: string;
  riskScore: number;
  reason: string;
  extraMinutes: number;
  estimatedDelayAvoidedMin: number;
  explanation: string;
  driverMessage: string;
  alternateRouteSummary: string;
  isAiWritten?: boolean;
  alternateRoute?: RouteResult;
  alternateType?: "safe" | "reduced_risk";
  alternateRisk?: number;
  candidateRejections?: CandidateRejectionItem[];
  evidenceTrail?: {
    probBlocked: number;
    state: string;
    sourceTypes: SourceType[];
    explanation: string;
    independentSources: number;
  };
}

export interface ShipmentSimState {
  code: string;
  shipment: Shipment;
  status: ShipmentStatus;
  currentEdgeId: string | null;
  lat: number;
  lng: number;
  bearing: number;
  fractionOnEdge: number;
  currentEdgeIndex: number;
  activeRoute: RouteResult;
  originalRoute: RouteResult;
  departureHour: number;
  arrivalHour: number | null;
  totalDelayHours: number;
  isBlocked: boolean;
  blockedReason: string | null;
  holdUntilT: number | null;
  lastReplanHour?: number;
  routeChangeCount?: number;
}

export interface SimulationResult {
  scenarioId: ScenarioId;
  mode: "agent" | "baseline";
  endT: number;
  timeline: Map<number, ShipmentSimState[]>; // by simulated hour (0 to 72)
  decisions: AgentDecision[];
  roadRisksByHour: Map<number, Map<string, RiskAssessment>>;
  closedEdgesByHour: Map<number, Set<string>>;
  shipmentDelays: Map<string, number>; // code -> delay hours
  roadStatusByHour?: Map<number, Map<string, RoadStatus>>;
  effectiveRisksByHour?: Map<number, Map<string, number>>;
  allObservations?: Observation[];
}

// Memory cache for deterministic runs of (scenarioId, mode)
const simCache = new Map<string, SimulationResult>();

/**
 * Pure deterministic simulation function
 */
export function simulate(params: {
  scenario: ScenarioId;
  mode: "agent" | "baseline";
  endT?: number;
  agentIntervalH?: number;
  observations?: Observation[];
  effectiveRiskMapByHour?: Map<number, Map<string, number>>;
  enabledSources?: Partial<Record<SourceType, boolean>>;
  useDetection?: boolean;
}): SimulationResult {
  const {
    scenario,
    mode,
    endT = 72,
    agentIntervalH = 1,
    observations,
    effectiveRiskMapByHour: customEffectiveRisks,
    enabledSources,
    useDetection = false,
  } = params;

  const hasDetection = useDetection || (observations && observations.length > 0) || !!customEffectiveRisks;
  const cacheKey = `${scenario}_${mode}_${endT}_${agentIntervalH}_${hasDetection ? "det" : "nodet"}_${observations?.length || 0}`;

  if (simCache.has(cacheKey)) {
    return simCache.get(cacheKey)!;
  }

  // Pre-calculate risk assessments for every edge across all hours (0 to 72)
  const roadRisksByHour = new Map<number, Map<string, RiskAssessment>>();
  const closedEdgesByHour = new Map<number, Set<string>>();

  for (let t = 0; t <= endT; t++) {
    const riskMap = new Map<string, RiskAssessment>();
    const closedSet = new Set<string>();

    EDGES.forEach((edge) => {
      const history = getRainHistory(scenario, edge.id, t);
      // Forecast available up to 24h ahead
      const forecast = getRainForecast(scenario, edge.id, t, 24);
      const assessment = calculateRiskScore(edge, history, forecast);
      riskMap.set(edge.id, assessment);

      if (assessment.isClosed) {
        closedSet.add(edge.id);
      }
    });

    roadRisksByHour.set(t, riskMap);
    closedEdgesByHour.set(t, closedSet);
  }

  // Multi-source detection pre-calculation if enabled
  let roadStatusByHour: Map<number, Map<string, RoadStatus>> | undefined;
  let effectiveRisksByHour: Map<number, Map<string, number>> | undefined;
  let allObservations: Observation[] | undefined;

  if (hasDetection) {
    roadStatusByHour = new Map();
    effectiveRisksByHour = new Map();

    const simSnapshot = getAllSimulatedObservations(scenario, EDGES, endT, enabledSources);
    allObservations = [...simSnapshot.observations];
    if (observations && observations.length > 0) {
      allObservations.push(...observations);
    }

    for (let t = 0; t <= endT; t++) {
      const currentObs = allObservations.filter((o) => o.receivedAtT <= t);
      const priorMap = new Map<string, number>();
      const riskMap = roadRisksByHour.get(t);
      if (riskMap) {
        riskMap.forEach((v, k) => priorMap.set(k, v.score));
      }

      const fused = fuseAllRoads(EDGES, currentObs, priorMap, t);
      roadStatusByHour.set(t, fused);

      if (customEffectiveRisks && customEffectiveRisks.has(t)) {
        effectiveRisksByHour.set(t, customEffectiveRisks.get(t)!);
      } else if (riskMap) {
        effectiveRisksByHour.set(t, buildEffectiveRiskMap(riskMap, fused));
      }
    }
  }

  // If in agent mode, we also run a baseline simulation to get ground-truth baseline delays
  // for calculating real "estimatedDelayAvoidedMin"
  let baselineShipmentDelays = new Map<string, number>();
  if (mode === "agent") {
    const baselineRun = simulate({
      scenario,
      mode: "baseline",
      endT,
      agentIntervalH,
    });
    baselineShipmentDelays = baselineRun.shipmentDelays;
  }

  // Initialize initial route for all shipments (fastest route ignoring risk)
  const initialZeroRiskMap = new Map<string, number>();
  const initialStates: Map<string, ShipmentSimState> = new Map();

  SEEDED_SHIPMENTS.forEach((shipment) => {
    const origRoute = dijkstra(
      shipment.origin,
      shipment.destination,
      initialZeroRiskMap,
      false
    )!;

    const originNode = NODES[shipment.origin];

    initialStates.set(shipment.code, {
      code: shipment.code,
      shipment,
      status: "pending",
      currentEdgeId: null,
      lat: originNode.lat,
      lng: originNode.lng,
      bearing: 0,
      fractionOnEdge: 0,
      currentEdgeIndex: 0,
      activeRoute: origRoute,
      originalRoute: origRoute,
      departureHour: shipment.departureHour,
      arrivalHour: null,
      totalDelayHours: 0,
      isBlocked: false,
      blockedReason: null,
      holdUntilT: null,
    });
  });

  const timeline = new Map<number, ShipmentSimState[]>();
  const decisions: AgentDecision[] = [];
  const shipmentDelays = new Map<string, number>();
  const decidedShipments = new Set<string>();

  // Current working state copy
  const activeStates = new Map<string, ShipmentSimState>();
  initialStates.forEach((val, key) => {
    activeStates.set(key, { ...val });
  });

  // Step hour by hour through the simulation
  for (let t = 0; t <= endT; t++) {
    const currentClosedEdges = closedEdgesByHour.get(t) || new Set<string>();
    const currentRisks = roadRisksByHour.get(t) || new Map<string, RiskAssessment>();

    // 1. In 'agent' mode, run agent decision loop every agentIntervalH
    if (mode === "agent" && t % agentIntervalH === 0) {
      const currentEffectiveRisks = effectiveRisksByHour?.get(t);
      const currentRoadStatuses = roadStatusByHour?.get(t);
      const optimizerRiskMap = new Map<string, number>();
      currentRisks.forEach((assessment, edgeId) => {
        optimizerRiskMap.set(
          edgeId,
          currentEffectiveRisks?.get(edgeId) ?? assessment.score
        );
      });
      const optimizerRequest = buildScenarioOptimizationRequest({
        scenario,
        nowT: t,
        riskByEdge: optimizerRiskMap,
      });
      const optimizerPlan = solveBuiltin(optimizerRequest);
      const globalTruckOrder = new Map<string, number>();
      optimizerPlan.assignments.forEach((assignment, assignmentIndex) => {
        const firstStop = assignment.sequence.find((stop) => stop.kind === "pickup");
        if (firstStop) globalTruckOrder.set(firstStop.orderId, assignmentIndex);
      });

      // Prioritize critical and perishable shipments first
      const sortedCodes = Array.from(activeStates.keys()).sort((a, b) => {
        const sA = activeStates.get(a)!.shipment;
        const sB = activeStates.get(b)!.shipment;
        const pOrder: Record<string, number> = { critical: 3, high: 2, normal: 1 };
        const globalPriority = (globalTruckOrder.get(a) ?? 99) - (globalTruckOrder.get(b) ?? 99);
        return globalPriority || (pOrder[sB.priority] || 0) - (pOrder[sA.priority] || 0);
      });

      sortedCodes.forEach((code) => {
        const truck = activeStates.get(code)!;
        if (truck.status === "delivered" || t < truck.departureHour) return;

        // Check the remaining edges ahead of the truck on its active route
        const remainingEdges = truck.activeRoute.edges.slice(
          truck.currentEdgeIndex
        );
        if (remainingEdges.length === 0) return;

        let maxRiskAhead = 0;
        let worstEdge: NetworkEdge | null = null;
        let worstAssessment: RiskAssessment | null = null;

        remainingEdges.forEach((edge) => {
          const assess = currentRisks.get(edge.id);
          const effScore = currentEffectiveRisks?.get(edge.id);
          const score = effScore !== undefined ? effScore : assess ? assess.score : 0;
          if (score > maxRiskAhead) {
            maxRiskAhead = score;
            worstEdge = edge;
            worstAssessment = assess || null;
          }
        });

        // Tolerances for rerouting:
        // Critical: +240 min, Perishable: +150 min, Normal: +90 min
        const toleranceMin =
          truck.shipment.priority === "critical"
            ? 240
            : truck.shipment.perishable
            ? 150
            : 90;

        // If max risk ahead >= 50, Agent triggers decision
        if (maxRiskAhead >= 50 && worstEdge && worstAssessment) {
          const currentWorstEdge: NetworkEdge = worstEdge;
          const currentWorstAssessment: RiskAssessment = worstAssessment;
          const currentStatus = currentRoadStatuses?.get(currentWorstEdge.id);

          // If a road is only in 'watch' state and forecast risk is low, flag a human dispatcher instead of auto-rerouting everyone
          const isLoneWatchAnomaly = currentStatus?.state === "watch" && currentWorstAssessment.score < 60;

          // Evidence trail for transparent decision audit
          const evidenceTrail = currentStatus
            ? {
                probBlocked: currentStatus.probBlocked,
                state: currentStatus.state,
                sourceTypes: Array.from(new Set(currentStatus.evidence.map((e) => e.sourceType))),
                explanation: currentStatus.explanation,
                independentSources: currentStatus.independentSources,
              }
            : undefined;

          const firstEdgeBase = remainingEdges[0]?.baseMinutes || 0;
          const currentRemainingBase =
            Math.round((1 - truck.fractionOnEdge) * firstEdgeBase) +
            remainingEdges.slice(1).reduce((acc, e) => acc + e.baseMinutes, 0);

          const isCriticalOrMedicine =
            truck.shipment.priority === "critical" ||
            truck.shipment.cargo === "medicine";

          const forecastDropsWithin12h =
            currentWorstAssessment.forecast24hMm < 40 || currentStatus?.state === "probable";

          const currentEdge = truck.currentEdgeId
            ? EDGES.find((e) => e.id === truck.currentEdgeId) || null
            : null;
          const nextNode =
            truck.activeRoute.nodes[truck.currentEdgeIndex + 1] || null;

          if (isLoneWatchAnomaly) {
            if (!decidedShipments.has(`${code}_ESCALATE`)) {
              decidedShipments.add(`${code}_ESCALATE`);
              truck.status = "escalated";

              decisions.push({
                id: `DEC-${t}-${code}-ESC`,
                solver: "builtin",
                solveMs: optimizerPlan.solveMs,
                simT: t,
                shipmentCode: code,
                decision: "ESCALATE",
                roadName: currentWorstEdge.name,
                edgeId: currentWorstEdge.id,
                riskScore: maxRiskAhead,
                reason: "ESCALATE: Lone sensor anomaly (traffic jam/watch) flagged for human verification",
                extraMinutes: 0,
                estimatedDelayAvoidedMin: 0,
                explanation: `${currentWorstEdge.name} experienced single-source probe anomaly. Confidence is watch level only; human dispatcher flagged to verify before rerouting fleet.`,
                driverMessage: `DISPATCH ALERT: Hold speed on ${currentWorstEdge.name}. Sensor anomaly flagged for verification.`,
                alternateRouteSummary: "Human Dispatch Escalate",
                isAiWritten: false,
                evidenceTrail,
                candidateRejections: [
                  {
                    path: "Single-source anomaly",
                    reason: "Flagged for manual dispatcher verification before reroute",
                  },
                ],
              });
            }
          } else {
            // Tiered Alternate Selection (Safe -> Acceptable -> Hold -> Escalate)
            const tiered = selectTieredAlternate({
              scenario,
              currentT: t,
              originNode: truck.shipment.origin,
              destNode: truck.shipment.destination,
              currentEdge,
              fractionOnEdge: truck.fractionOnEdge,
              headingToNode: nextNode,
              toleranceMin,
              isCriticalOrMedicine,
              blockedEdgeId: currentWorstEdge.id,
              origRemainingBaseMin: currentRemainingBase,
              truckStatus: truck.status,
              effectiveRisksByHour,
              closedEdgesByHour,
              forecastDropsWithin12h,
            });

            const posDesc = currentEdge
              ? `${Math.round(truck.fractionOnEdge * 100)}% along ${currentEdge.from} to ${currentEdge.to}, ${currentEdge.name}`
              : `At dispatch origin ${truck.shipment.origin}`;

            // Tier 1 & Tier 2: REROUTE
            if (tiered.decision === "REROUTE" && tiered.selectedRoute) {
              const newRoute = tiered.selectedRoute;
              const isCurrentRouteUnsafe = currentWorstAssessment.score >= 85 || currentStatus?.state === "confirmed";

              // Stability / Hysteresis check against flip-flopping
              const switchCheck = shouldSwitchRoute({
                currentRouteTimeMin: currentRemainingBase,
                newRouteTimeMin: newRoute.totalMinutes,
                currentRouteMaxRisk: maxRiskAhead,
                newRouteMaxRisk: tiered.maxTraversalRisk,
                lastReplanT: truck.lastReplanHour ?? -999,
                currentT: t,
                isCurrentRouteUnsafe,
              });

              if (!switchCheck.switch && truck.activeRoute !== truck.originalRoute) {
                // Defer switch due to cooldown or marginal gain
                return;
              }

              if (!decidedShipments.has(`${code}_REROUTE`)) {
                decidedShipments.add(`${code}_REROUTE`);

                truck.activeRoute = newRoute;
                truck.currentEdgeIndex = 0;
                truck.currentEdgeId = newRoute.edges[0]?.id || null;
                truck.fractionOnEdge = 0;
                truck.status = "in_transit";
                truck.isBlocked = false;
                truck.lastReplanHour = t;
                truck.routeChangeCount = (truck.routeChangeCount || 0) + 1;

                const baselineDelayHr = baselineShipmentDelays.get(code) || 4.5;
                const delayAvoidedMin = Math.max(
                  0,
                  Math.round(baselineDelayHr * 60 - tiered.extraMinutes)
                );

                const viaSummary = newRoute.nodes.join(" → ");
                const explanationData = generateTemplateExplanation({
                  shipment: truck.shipment,
                  decision: "REROUTE",
                  riskyRoadName: currentWorstEdge.name,
                  riskScore: maxRiskAhead,
                  rain48hMm: currentWorstAssessment.rain48hMm,
                  extraMinutes: tiered.extraMinutes,
                  estimatedDelayAvoidedHours: delayAvoidedMin / 60,
                  viaRouteDescription: viaSummary,
                });

                let rerouteReason =
                  tiered.tier === "safe"
                    ? `Rerouted via safe corridor (${viaSummary}) avoiding hazard on ${currentWorstEdge.name}`
                    : `Rerouted via ${tiered.tierLabel} (${viaSummary}) avoiding hazard on ${currentWorstEdge.name}`;

                if (currentStatus?.state === "confirmed") {
                  rerouteReason = `Rerouted: road confirmed blocked by ${currentStatus.independentSources} sources; taking ${tiered.tierLabel}`;
                }

                const chosenOption = newRoute.isTurnaround ? "TURN_BACK" : "REROUTE";
                const driverActionMsg = newRoute.isTurnaround
                  ? `Turn back to ${currentEdge?.from || "origin"}, then take ${viaSummary}. +${tiered.extraMinutes} min.`
                  : `Continue forward to ${nextNode || "next junction"}, then take ${viaSummary}. +${tiered.extraMinutes} min.`;

                decisions.push({
                  id: `DEC-${t}-${code}`,
                  solver: "builtin",
                  solveMs: optimizerPlan.solveMs,
                  simT: t,
                  shipmentCode: code,
                  decision: "REROUTE",
                  chosenOption,
                  positionDescription: posDesc,
                  replanTrigger: isCurrentRouteUnsafe ? "CORRIDOR_CLOSED" : maxRiskAhead >= 70 ? "RISK_BAND_70" : "RISK_BAND_50",
                  roadName: currentWorstEdge.name,
                  edgeId: currentWorstEdge.id,
                  riskScore: maxRiskAhead,
                  reason: rerouteReason,
                  extraMinutes: tiered.extraMinutes,
                  estimatedDelayAvoidedMin: delayAvoidedMin,
                  explanation: explanationData.explanation,
                  driverMessage: driverActionMsg,
                  alternateRouteSummary: viaSummary,
                  isAiWritten: false,
                  evidenceTrail,
                  alternateRoute: newRoute,
                  alternateType: tiered.tier as "safe" | "reduced_risk",
                  alternateRisk: tiered.maxTraversalRisk,
                  candidateRejections: tiered.rejections,
                });
              }
            }
            // Tier 3: HOLD
            else if (tiered.decision === "HOLD") {
              if (!decidedShipments.has(`${code}_HOLD`)) {
                decidedShipments.add(`${code}_HOLD`);
                truck.status = "held";
                const holdDuration = tiered.holdDurationHours || 8;
                truck.holdUntilT = t + holdDuration;

                const explanationData = generateTemplateExplanation({
                  shipment: truck.shipment,
                  decision: "HOLD",
                  riskyRoadName: currentWorstEdge.name,
                  riskScore: maxRiskAhead,
                  rain48hMm: currentWorstAssessment.rain48hMm,
                  extraMinutes: 480,
                  estimatedDelayAvoidedHours: 3.5,
                  holdDurationHours: holdDuration,
                });

                decisions.push({
                  id: `DEC-${t}-${code}-HOLD`,
                  solver: "builtin",
                  solveMs: optimizerPlan.solveMs,
                  simT: t,
                  shipmentCode: code,
                  decision: "HOLD",
                  chosenOption: "HOLD",
                  positionDescription: posDesc,
                  replanTrigger: "FORECAST_EASING_HOLD",
                  roadName: currentWorstEdge.name,
                  edgeId: currentWorstEdge.id,
                  riskScore: maxRiskAhead,
                  reason: tiered.reason,
                  extraMinutes: 480,
                  estimatedDelayAvoidedMin: 210,
                  explanation: explanationData.explanation,
                  driverMessage: `Stop at the next safe stop and wait. Road expected to reopen in about ${holdDuration} h.`,
                  alternateRouteSummary: "Holding at safe interchange node",
                  isAiWritten: false,
                  evidenceTrail,
                  candidateRejections: tiered.rejections,
                });
              }
            }
            // Tier 4: ESCALATE
            else if (!decidedShipments.has(`${code}_ESCALATE`)) {
              decidedShipments.add(`${code}_ESCALATE`);
              truck.status = "escalated";

              // Retrieve the best evaluated candidate detour corridor avoiding the blocked edge
              let candidateBest =
                tiered.candidates.find((c) => !c.hasImpassable && !c.edges.some((e) => e.id === currentWorstEdge.id) && c.polyline?.length > 1) ||
                tiered.candidates.find((c) => !c.edges.some((e) => e.id === currentWorstEdge.id) && c.polyline?.length > 1) ||
                null;

              // If no candidate exists in tiered pre-enumeration, compute a bypass route avoiding the blocked edge
              if (!candidateBest) {
                const closureMap = new Map<string, number>();
                closureMap.set(currentWorstEdge.id, 99);
                closedEdgesByHour.get(t)?.forEach((eid) => closureMap.set(eid, 99));
                const altBypass = dijkstra(truck.shipment.origin, truck.shipment.destination, closureMap, true);
                if (altBypass && altBypass.polyline && altBypass.polyline.length >= 2) {
                  candidateBest = {
                    nodes: altBypass.nodes,
                    edges: altBypass.edges,
                    baseMinutes: altBypass.baseMinutes,
                    extraMinutes: altBypass.riskPenaltyMinutes,
                    maxTraversalRisk: altBypass.maxRisk,
                    polyline: altBypass.polyline,
                    hasImpassable: false,
                    isTurnaround: false,
                    tier: "acceptable",
                    tierLabel: "Alternate bypass",
                    perEdgeRisk: [],
                  };
                }
              }

              const alternateRouteResult: RouteResult | undefined = candidateBest
                ? {
                    nodes: candidateBest.nodes,
                    edges: candidateBest.edges,
                    baseMinutes: candidateBest.baseMinutes,
                    riskPenaltyMinutes: candidateBest.extraMinutes,
                    totalMinutes: candidateBest.baseMinutes + candidateBest.extraMinutes,
                    maxRisk: candidateBest.maxTraversalRisk,
                    polyline: candidateBest.polyline,
                  }
                : undefined;

              const explanation = `${truck.shipment.code} (${truck.shipment.cargo}) flagged for Human Dispatcher Escalation: All candidate corridors evaluated and impassable or exceed risk thresholds.`;

              decisions.push({
                id: `DEC-${t}-${code}-ESC`,
                solver: "builtin",
                solveMs: optimizerPlan.solveMs,
                simT: t,
                shipmentCode: code,
                decision: "ESCALATE",
                chosenOption: "ESCALATE",
                positionDescription: posDesc,
                replanTrigger: "ALL_CANDIDATES_IMPASSABLE_OR_TOLERANCE_EXCEEDED",
                roadName: currentWorstEdge.name,
                edgeId: currentWorstEdge.id,
                riskScore: maxRiskAhead,
                reason: `All ${tiered.candidates.length} candidate corridors impassable or exceed priority tolerance limits`,
                extraMinutes: candidateBest?.extraMinutes || 0,
                estimatedDelayAvoidedMin: 0,
                explanation,
                driverMessage: `${truck.shipment.code} ALERT: Ahead road ${currentWorstEdge.name} impassable. Pull over at nearest safe point. Standby for dispatcher clearance.`,
                alternateRouteSummary: candidateBest ? candidateBest.nodes.join(" → ") : "Human Dispatch Escalate",
                isAiWritten: false,
                evidenceTrail,
                alternateRoute: alternateRouteResult,
                alternateType: "reduced_risk",
                alternateRisk: candidateBest?.maxTraversalRisk ?? 46,
                candidateRejections: tiered.rejections,
              });
            }
          }
        }
      });
    }

    // 2. Advance trucks along their route for hour t
    activeStates.forEach((truck) => {
      // If delivered, keep at destination
      if (truck.status === "delivered") return;

      // If departure hour not reached, hold at origin
      if (t < truck.departureHour) {
        truck.status = "pending";
        return;
      }

      // If held by agent, check if hold time elapsed
      if (truck.status === "held") {
        if (truck.holdUntilT && t >= truck.holdUntilT) {
          truck.status = "in_transit";
          truck.holdUntilT = null;
        } else {
          truck.totalDelayHours += 1;
          return;
        }
      }

      // If in baseline mode or moving truck, check for closed road blockage
      const currentEdge = truck.activeRoute.edges[truck.currentEdgeIndex];

      if (!currentEdge) {
        // All edges completed -> delivered
        truck.status = "delivered";
        const destNode = NODES[truck.shipment.destination];
        truck.lat = destNode.lat;
        truck.lng = destNode.lng;
        truck.arrivalHour = t;
        return;
      }

      truck.currentEdgeId = currentEdge.id;

      // Check if current edge is CLOSED
      const edgeIsClosed = currentClosedEdges.has(currentEdge.id);

      if (mode === "baseline" && edgeIsClosed) {
        // Baseline truck gets stuck and delayed
        truck.status = "delayed";
        truck.isBlocked = true;
        truck.blockedReason = `Road CLOSED: ${currentEdge.name} sustained flash flood / landslide hazard.`;
        truck.totalDelayHours += 1;
        return;
      }

      // If previously blocked but edge now open, resume
      if (truck.isBlocked && !edgeIsClosed) {
        truck.isBlocked = false;
        truck.blockedReason = null;
      }

      truck.status = "in_transit";

      // Advance truck along edge:
      // In 1 simulated hour (60 min), advance fraction = 60 / edge.baseMinutes
      const deltaFraction = 60 / currentEdge.baseMinutes;
      const nextFraction = truck.fractionOnEdge + deltaFraction;

      if (nextFraction >= 1) {
        // Truck completes this edge and moves to next edge
        truck.currentEdgeIndex += 1;
        truck.fractionOnEdge = 0;

        if (truck.currentEdgeIndex >= truck.activeRoute.edges.length) {
          truck.status = "delivered";
          const destNode = NODES[truck.shipment.destination];
          truck.lat = destNode.lat;
          truck.lng = destNode.lng;
          truck.arrivalHour = t;
        } else {
          const nextEdge = truck.activeRoute.edges[truck.currentEdgeIndex];
          truck.currentEdgeId = nextEdge.id;
          const pos = pointAlongPolyline(nextEdge.path, 0);
          truck.lat = pos.lat;
          truck.lng = pos.lng;
          truck.bearing = pos.bearing;
        }
      } else {
        truck.fractionOnEdge = nextFraction;
        const pos = pointAlongPolyline(currentEdge.path, truck.fractionOnEdge);
        truck.lat = pos.lat;
        truck.lng = pos.lng;
        truck.bearing = pos.bearing;
      }
    });

    // Record snapshot of all trucks at hour t
    const snapshot: ShipmentSimState[] = [];
    activeStates.forEach((val) => {
      snapshot.push({ ...val });
      shipmentDelays.set(val.code, val.totalDelayHours);
    });
    timeline.set(t, snapshot);
  }

  const result: SimulationResult = {
    scenarioId: scenario,
    mode,
    endT,
    timeline,
    decisions,
    roadRisksByHour,
    closedEdgesByHour,
    shipmentDelays,
    roadStatusByHour,
    effectiveRisksByHour,
    allObservations,
  };

  simCache.set(cacheKey, result);
  return result;
}
