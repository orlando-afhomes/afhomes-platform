/**
 * Presentation-only chart geometry. Values stay integer centavos; the few
 * floating-point operations here only position SVG points and format axis
 * labels, never an authoritative amount.
 */

export function compactPeso(centavos: number): string {
  const pesos = Math.round(centavos / 100);
  if (pesos === 0) return "₱0";
  const sign = pesos < 0 ? "-" : "";
  const size = Math.abs(pesos);
  if (size >= 1_000_000) return `${sign}₱${trim(size / 1_000_000)}M`;
  if (size >= 1_000) return `${sign}₱${trim(size / 1_000)}K`;
  return `${sign}₱${size.toLocaleString("en-PH")}`;
}

/** Full whole-peso axis label, for example "₱2,500,000" (axis ticks are whole pesos). */
export function axisPeso(centavos: number): string {
  const pesos = Math.round(centavos / 100);
  const sign = pesos < 0 ? "-" : "";
  return `${sign}₱${Math.abs(pesos).toLocaleString("en-PH")}`;
}

function trim(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}

export type ChartDomain = { bottomCentavos: number; topCentavos: number; ticks: number[] };

/**
 * Whole-peso axis domain that always includes zero and covers every value.
 * Negative values (reversals, net outflows) extend the axis below zero.
 */
export function niceDomain(minCentavos: number, maxCentavos: number, tickCount = 4): ChartDomain {
  const low = Math.min(0, Number.isFinite(minCentavos) ? minCentavos : 0);
  const high = Math.max(0, Number.isFinite(maxCentavos) ? maxCentavos : 0);
  if (high === low) return { bottomCentavos: 0, topCentavos: 0, ticks: [0] };

  const roughPesos = Math.ceil((high - low) / 100 / tickCount);
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(1, roughPesos)));
  let stepPesos = magnitude * 10;
  for (const candidate of [1, 2, 5, 10]) {
    if (magnitude * candidate >= roughPesos) {
      stepPesos = magnitude * candidate;
      break;
    }
  }
  const step = stepPesos * 100;
  const topCentavos = Math.ceil(high / step) * step;
  const bottomCentavos = Math.floor(low / step) * step;
  const ticks: number[] = [];
  for (let tick = bottomCentavos; tick <= topCentavos; tick += step) ticks.push(tick);
  return { bottomCentavos, topCentavos, ticks };
}

/** SVG y position as a percentage: 0 at the top of the domain, 100 at the bottom. */
export function yPercent(valueCentavos: number, domain: Pick<ChartDomain, "bottomCentavos" | "topCentavos">): number {
  const { bottomCentavos, topCentavos } = domain;
  if (topCentavos <= bottomCentavos) return 100;
  const clamped = Math.min(topCentavos, Math.max(bottomCentavos, valueCentavos));
  return ((topCentavos - clamped) / (topCentavos - bottomCentavos)) * 100;
}

/** SVG x position as a percentage. A single point sits in the middle. */
export function xPercent(index: number, length: number): number {
  if (length <= 1) return 50;
  return (index / (length - 1)) * 100;
}

/**
 * X-axis labels at a whole-day step (for example every 3 days), always
 * including the first and last date; a label too close to the last is dropped.
 */
export function tickIndexes(length: number, maxTicks = 6): number[] {
  if (length <= 0) return [];
  if (length <= maxTicks) return Array.from({ length }, (_, index) => index);
  const step = Math.ceil((length - 1) / (maxTicks - 1));
  const indexes: number[] = [];
  for (let index = 0; index < length - 1; index += step) indexes.push(index);
  if (indexes.length > 1 && length - 1 - indexes[indexes.length - 1] < step / 2) indexes.pop();
  indexes.push(length - 1);
  return indexes;
}

export type ChartPoint = { x: number; y: number };
export type CurveSegment = { c1: ChartPoint; c2: ChartPoint; end: ChartPoint };

/**
 * Monotone cubic (Fritsch-Carlson) segments: a smooth line that never
 * overshoots between two points, so a flat day stays flat and the curve never
 * suggests a value that was not recorded.
 */
export function monotoneSegments(points: readonly ChartPoint[]): CurveSegment[] {
  const n = points.length;
  if (n < 2) return [];
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx.push(points[i + 1].x - points[i].x || 1e-9);
    slope.push((points[i + 1].y - points[i].y) / dx[i]);
  }
  const tangent: number[] = new Array(n).fill(0);
  tangent[0] = slope[0];
  tangent[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i += 1) {
    if (slope[i - 1] * slope[i] <= 0) continue;
    tangent[i] = (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / slope[i - 1] + (dx[i] + 2 * dx[i - 1]) / slope[i]);
  }

  return points.slice(1).map((end, index) => {
    const start = points[index];
    const third = dx[index] / 3;
    return {
      c1: { x: start.x + third, y: start.y + tangent[index] * third },
      c2: { x: end.x - third, y: end.y - tangent[index + 1] * third },
      end,
    };
  });
}

/** SVG path for the monotone curve through the points. */
export function monotonePath(points: readonly ChartPoint[]): string {
  if (points.length === 0) return "";
  const fmt = (value: number) => value.toFixed(3);
  const head = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  return [
    head,
    ...monotoneSegments(points).map(({ c1, c2, end }) => `C ${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(end.x)} ${fmt(end.y)}`),
  ].join(" ");
}

/** Display-only share with at most one decimal, for example "41.7%". */
export function formatShare(count: number, total: number): string {
  if (total <= 0) return "—";
  return `${((count * 100) / total).toFixed(1).replace(/\.0$/, "")}%`;
}
