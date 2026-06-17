import { describe, expect, it } from "vitest";
import { timeBucketSample } from "./time-bucket-sample";

type Row = { id: number; timestamp: string };

describe("timeBucketSample", () => {
  it("samples across the full window instead of only the tail", () => {
    const start = "2026-06-17T00:00:00.000Z";
    const end = "2026-06-17T01:00:00.000Z";
    const items: Row[] = [];
    for (let i = 0; i < 60; i++) {
      const minute = String(i).padStart(2, "0");
      items.push({
        id: i,
        timestamp: `2026-06-17T00:${minute}:00.000Z`,
      });
    }

    const sampled = timeBucketSample(items, start, end, 12, (r) => r.timestamp);
    expect(sampled.length).toBeGreaterThan(0);
    expect(sampled[0].id).toBeLessThan(10);
    expect(sampled[sampled.length - 1].id).toBeGreaterThan(40);
  });
});
