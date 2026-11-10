import { describe, expect, it } from "vitest";
import {
  axisPeso,
  compactPeso,
  formatShare,
  monotonePath,
  monotoneSegments,
  niceDomain,
  tickIndexes,
  xPercent,
  yPercent,
} from "./dashboard-chart-model";

describe("monotone curve", () => {
  const points = [
    { x: 0, y: 100 },
    { x: 10, y: 100 },
    { x: 20, y: 20 },
    { x: 30, y: 60 },
    { x: 40, y: 60 },
  ];

  it("passes through every point", () => {
    const segments = monotoneSegments(points);
    expect(segments).toHaveLength(4);
    expect(segments.map((segment) => segment.end)).toEqual(points.slice(1));
    expect(monotonePath(points).startsWith("M 0.000 100.000 C")).toBe(true);
  });

  it("never overshoots between neighbouring points, so flat days stay flat", () => {
    monotoneSegments(points).forEach((segment, index) => {
      const low = Math.min(points[index].y, points[index + 1].y);
      const high = Math.max(points[index].y, points[index + 1].y);
      for (const control of [segment.c1, segment.c2]) {
        expect(control.y).toBeGreaterThanOrEqual(low - 1e-9);
        expect(control.y).toBeLessThanOrEqual(high + 1e-9);
      }
    });
  });

  it("handles short inputs", () => {
    expect(monotonePath([])).toBe("");
    expect(monotonePath([{ x: 50, y: 10 }])).toBe("M 50.000 10.000");
    expect(monotoneSegments([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toHaveLength(1);
  });
});

describe("axis labels", () => {
  it("formats full whole-peso labels", () => {
    expect(axisPeso(250_000_000)).toBe("₱2,500,000");
    expect(axisPeso(0)).toBe("₱0");
    expect(axisPeso(-24_000_000)).toBe("-₱240,000");
  });
});

describe("dashboard chart model", () => {
  it("formats compact peso axis labels, including negatives", () => {
    expect(compactPeso(0)).toBe("₱0");
    expect(compactPeso(24_000_000)).toBe("₱240K");
    expect(compactPeso(100_000_000)).toBe("₱1M");
    expect(compactPeso(1_250_000)).toBe("₱12.5K");
    expect(compactPeso(-24_000_000)).toBe("-₱240K");
    expect(compactPeso(50_000)).toBe("₱500");
  });

  it("builds a whole-peso domain from zero that covers the maximum", () => {
    const { bottomCentavos, topCentavos, ticks } = niceDomain(0, 24_000_000);
    expect(bottomCentavos).toBe(0);
    expect(topCentavos).toBeGreaterThanOrEqual(24_000_000);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBe(topCentavos);
    expect([...ticks].sort((a, b) => a - b)).toEqual(ticks);
  });

  it("extends the domain below zero for negative values", () => {
    const { bottomCentavos, topCentavos, ticks } = niceDomain(-24_000_000, 31_200_000);
    expect(bottomCentavos).toBeLessThanOrEqual(-24_000_000);
    expect(topCentavos).toBeGreaterThanOrEqual(31_200_000);
    expect(ticks).toContain(0);
  });

  it("returns a flat domain when there is no value", () => {
    expect(niceDomain(0, 0)).toEqual({ bottomCentavos: 0, topCentavos: 0, ticks: [0] });
  });

  it("maps values to SVG percentages", () => {
    const domain = { bottomCentavos: -1000, topCentavos: 1000 };
    expect(yPercent(1000, domain)).toBe(0);
    expect(yPercent(0, domain)).toBe(50);
    expect(yPercent(-1000, domain)).toBe(100);
    expect(yPercent(5000, domain)).toBe(0);
    expect(yPercent(500, { bottomCentavos: 0, topCentavos: 0 })).toBe(100);
    expect(xPercent(0, 1)).toBe(50);
    expect(xPercent(0, 3)).toBe(0);
    expect(xPercent(2, 3)).toBe(100);
  });

  it("spaces x-axis labels including the first and last date", () => {
    expect(tickIndexes(3)).toEqual([0, 1, 2]);
    expect(tickIndexes(0)).toEqual([]);
    const ticks = tickIndexes(28, 6);
    expect(ticks).toHaveLength(6);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBe(27);
  });

  it("formats display shares", () => {
    expect(formatShare(5, 12)).toBe("41.7%");
    expect(formatShare(1, 2)).toBe("50%");
    expect(formatShare(0, 0)).toBe("—");
  });
});
