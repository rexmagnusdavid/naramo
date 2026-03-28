import { Place, Coords } from "./types";
import { haversineDistance } from "./geo";

const WALK_SPEED_KMH = 4;
const VISIT_DURATION_MS = 45 * 60 * 1000;
const BUFFER_MS = 15 * 60 * 1000;

function travelTimeMs(a: Coords, b: Coords): number {
  return (haversineDistance(a, b) / 1000 / WALK_SPEED_KMH) * 3_600_000;
}

function deadlineMs(hardStopTime: string, referenceDate: Date): number {
  const [h, m] = hardStopTime.split(":").map(Number);
  const d = new Date(referenceDate);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

/** Total walking distance of a path: origin → places[0] → … → places[n-1] */
function pathDistance(origin: Coords, places: Place[]): number {
  if (places.length === 0) return 0;
  let d = haversineDistance(origin, { lat: places[0].lat, lng: places[0].lng });
  for (let i = 0; i < places.length - 1; i++) {
    d += haversineDistance(
      { lat: places[i].lat, lng: places[i].lng },
      { lat: places[i + 1].lat, lng: places[i + 1].lng }
    );
  }
  return d;
}

/** Nearest-neighbor greedy order — good starting seed for 2-opt. */
function nearestNeighbor(places: Place[], origin: Coords): Place[] {
  const remaining = [...places];
  const ordered: Place[] = [];
  let cur = origin;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = haversineDistance(cur, { lat: remaining[0].lat, lng: remaining[0].lng });
    for (let i = 1; i < remaining.length; i++) {
      const d = haversineDistance(cur, { lat: remaining[i].lat, lng: remaining[i].lng });
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    cur = { lat: next.lat, lng: next.lng };
  }
  return ordered;
}

/**
 * 2-opt local search: repeatedly reverse sub-sequences of the route while
 * doing so reduces total walking distance. Eliminates crossing/backtracking edges.
 * O(n²) per pass; converges fast for n ≤ 20.
 */
function twoOpt(places: Place[], origin: Coords): Place[] {
  if (places.length <= 2) return places;
  let best = [...places];
  let bestDist = pathDistance(origin, best);
  let improved = true;
  while (improved) {
    improved = false;
    outer: for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        // Reverse segment [i .. j]
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        const d = pathDistance(origin, candidate);
        if (d < bestDist - 1) { // 1 m tolerance to avoid float churn
          best = candidate;
          bestDist = d;
          improved = true;
          break outer; // restart with the improved solution
        }
      }
    }
  }
  return best;
}

/** Nearest-neighbor seed followed by 2-opt improvement. */
function optimizeFree(places: Place[], origin: Coords): Place[] {
  if (places.length <= 1) return places;
  return twoOpt(nearestNeighbor(places, origin), origin);
}

/**
 * Orders places into an efficient walking route that avoids backtracking.
 *
 * Strategy:
 *   1. Hard-stop places (with hardStopTime) act as fixed anchors, sorted by deadline.
 *   2. Free places are distributed into the gaps between anchors: only those that
 *      can physically fit (travel + visit time) before the next deadline are eligible.
 *   3. Each gap's free places are ordered with nearest-neighbor + 2-opt.
 *   4. Remaining free places after the last anchor are also 2-opt optimised.
 *
 * Falls back gracefully when startLocation is null (no GPS).
 */
export function optimizeRoute(
  places: Place[],
  startLocation: Coords | null,
  now: Date = new Date()
): Place[] {
  if (places.length <= 1) return places;

  const hardStops = places
    .filter((p) => p.hardStopTime)
    .sort((a, b) => {
      const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
      return toMin(a.hardStopTime!) - toMin(b.hardStopTime!);
    });

  const free = places.filter((p) => !p.hardStopTime);

  // ── No GPS fallback ──────────────────────────────────────────────────────────
  if (!startLocation) {
    if (hardStops.length === 0) return free;
    const lastAnchorCoords = { lat: hardStops[hardStops.length - 1].lat, lng: hardStops[hardStops.length - 1].lng };
    return [...hardStops, ...optimizeFree(free, lastAnchorCoords)];
  }

  // ── All free (common case) ───────────────────────────────────────────────────
  if (hardStops.length === 0) {
    return optimizeFree(free, startLocation);
  }

  // ── Mixed: anchors + free places ────────────────────────────────────────────
  const result: Place[] = [];
  let curPos: Coords = startLocation;
  let curTime = now.getTime();
  const remaining = [...free];

  for (const anchor of hardStops) {
    const dl = deadlineMs(anchor.hardStopTime!, now);
    const anchorCoords: Coords = { lat: anchor.lat, lng: anchor.lng };

    // Partition remaining free places: fitting (can be visited before anchor deadline)
    // vs not fitting (must wait until after this anchor).
    const fitting: Place[] = [];
    const notFitting: Place[] = [];
    for (const fp of remaining) {
      const fpCoords: Coords = { lat: fp.lat, lng: fp.lng };
      const toFp = travelTimeMs(curPos, fpCoords);
      const fpToAnchor = travelTimeMs(fpCoords, anchorCoords);
      if (curTime + toFp + VISIT_DURATION_MS + fpToAnchor + BUFFER_MS < dl) {
        fitting.push(fp);
      } else {
        notFitting.push(fp);
      }
    }
    remaining.length = 0;
    remaining.push(...notFitting);

    // Order the fitting segment with 2-opt and insert into result
    for (const fp of optimizeFree(fitting, curPos)) {
      result.push(fp);
      const fpCoords: Coords = { lat: fp.lat, lng: fp.lng };
      curTime += travelTimeMs(curPos, fpCoords) + VISIT_DURATION_MS;
      curPos = fpCoords;
    }

    result.push(anchor);
    curTime += travelTimeMs(curPos, anchorCoords) + VISIT_DURATION_MS;
    curPos = anchorCoords;
  }

  // Remaining free places after the last anchor
  for (const fp of optimizeFree(remaining, curPos)) {
    result.push(fp);
  }

  return result;
}
