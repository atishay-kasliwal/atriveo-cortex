import { describe, expect, it } from "vitest";
import {
  computeAverageMentionsPerDay,
  computeDaysSeen,
  computeRecurrenceTrend,
} from "./recurrence";

describe("recurrence metrics", () => {
  it("computes days seen and average mentions per day", () => {
    const timestamps = [
      "2026-06-15T10:00:00.000Z",
      "2026-06-15T12:00:00.000Z",
      "2026-06-16T10:00:00.000Z",
    ];
    expect(computeDaysSeen(timestamps)).toBe(2);
    expect(computeAverageMentionsPerDay(3, 2)).toBe(1.5);
  });

  it("detects rising trend when recent mentions increase", () => {
    const now = new Date("2026-06-20T12:00:00.000Z");
    const timestamps = [
      "2026-06-18T10:00:00.000Z",
      "2026-06-19T10:00:00.000Z",
      "2026-06-19T14:00:00.000Z",
      "2026-06-20T09:00:00.000Z",
      "2026-06-20T11:00:00.000Z",
    ];
    expect(computeRecurrenceTrend(timestamps, now)).toBe("Rising");
  });

  it("detects dormant trend when last seen is old", () => {
    const now = new Date("2026-06-20T12:00:00.000Z");
    const timestamps = ["2026-06-01T10:00:00.000Z", "2026-06-02T10:00:00.000Z"];
    expect(computeRecurrenceTrend(timestamps, now)).toBe("Dormant");
  });

  it("detects stable trend for steady low activity", () => {
    const now = new Date("2026-06-20T12:00:00.000Z");
    const timestamps = ["2026-06-12T10:00:00.000Z", "2026-06-19T10:00:00.000Z"];
    expect(computeRecurrenceTrend(timestamps, now)).toBe("Stable");
  });
});
