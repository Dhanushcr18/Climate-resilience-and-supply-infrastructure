/**
 * Pure deterministic geographic calculation functions
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export type PointTuple = [number, number]; // [lat, lng]

/**
 * Calculates haversine distance between two points in kilometers
 */
export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Total length of a polyline in kilometers
 */
export function polylineLength(points: PointTuple[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversine(
      points[i][0],
      points[i][1],
      points[i + 1][0],
      points[i + 1][1]
    );
  }
  return Math.round(total * 10) / 10;
}

/**
 * Linear interpolation between two coordinates
 */
export function interpolate(
  p1: PointTuple,
  p2: PointTuple,
  fraction: number
): PointTuple {
  const f = Math.max(0, Math.min(1, fraction));
  const lat = p1[0] + (p2[0] - p1[0]) * f;
  const lng = p1[1] + (p2[1] - p1[1]) * f;
  return [lat, lng];
}

/**
 * Calculate bearing between two points in degrees (0 - 360)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Finds the exact point and bearing along a polyline given a fraction in [0, 1]
 */
export function pointAlongPolyline(
  points: PointTuple[],
  fraction: number
): { lat: number; lng: number; bearing: number } {
  if (points.length === 0) {
    return { lat: 0, lng: 0, bearing: 0 };
  }
  if (points.length === 1 || fraction <= 0) {
    const bearing =
      points.length > 1
        ? calculateBearing(
            points[0][0],
            points[0][1],
            points[1][0],
            points[1][1]
          )
        : 0;
    return { lat: points[0][0], lng: points[0][1], bearing };
  }
  if (fraction >= 1) {
    const last = points.length - 1;
    const bearing = calculateBearing(
      points[last - 1][0],
      points[last - 1][1],
      points[last][0],
      points[last][1]
    );
    return { lat: points[last][0], lng: points[last][1], bearing };
  }

  // Segment lengths
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const segLen = haversine(
      points[i][0],
      points[i][1],
      points[i + 1][0],
      points[i + 1][1]
    );
    segmentLengths.push(segLen);
    totalLength += segLen;
  }

  if (totalLength === 0) {
    return { lat: points[0][0], lng: points[0][1], bearing: 0 };
  }

  const targetDist = totalLength * fraction;
  let accumulated = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (accumulated + segLen >= targetDist || i === segmentLengths.length - 1) {
      const segFraction = segLen === 0 ? 0 : (targetDist - accumulated) / segLen;
      const interp = interpolate(points[i], points[i + 1], segFraction);
      const bearing = calculateBearing(
        points[i][0],
        points[i][1],
        points[i + 1][0],
        points[i + 1][1]
      );
      return { lat: interp[0], lng: interp[1], bearing };
    }
    accumulated += segLen;
  }

  const lastPoint = points[points.length - 1];
  return { lat: lastPoint[0], lng: lastPoint[1], bearing: 0 };
}
