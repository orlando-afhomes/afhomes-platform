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

/** Evenly spaced x-axis labels, including the first and last date. */
export function tickIndexes(length: number, maxTicks = 6): number[] {
  if (length <= 0) return [];
  if (length <= maxTicks) return Array.from({ length }, (_, index) => index);
  const indexes = new Set<number>();
  for (let index = 0; index < maxTicks; index += 1) {
    indexes.add(Math.round((index * (length - 1)) / (maxTicks - 1)));
  }
  return [...indexes].sort((a, b) => a - b);
}

/** Display-only share with at most one decimal, for example "41.7%". */
export function formatShare(count: number, total: number): string {
  if (total <= 0) return "—";
  return `${((count * 100) / total).toFixed(1).replace(/\.0$/, "")}%`;
}
