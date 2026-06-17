import { describe, expect, it } from "vitest";
import {
  buildReviewQueue,
  mergeConfidenceTier,
} from "./memory-audit";
import type { ProjectAuditRow, ProjectHistoryRow } from "./types";

describe("mergeConfidenceTier", () => {
  it("maps numeric scores to HIGH/MEDIUM/LOW", () => {
    expect(mergeConfidenceTier(0.9)).toBe("HIGH");
    expect(mergeConfidenceTier(0.85)).toBe("HIGH");
    expect(mergeConfidenceTier(0.7)).toBe("MEDIUM");
    expect(mergeConfidenceTier(0.6)).toBe("MEDIUM");
    expect(mergeConfidenceTier(0.5)).toBe("LOW");
  });
});

describe("buildReviewQueue", () => {
  const history: ProjectHistoryRow[] = [
    {
      id: 1,
      extraction_id: 1,
      canonical_project: "Atriveo Cortex",
      observed_name: "Memory Engine",
      confidence: 0.5,
      timestamp: "2026-06-16T10:00:00.000Z",
    },
    {
      id: 2,
      extraction_id: 2,
      canonical_project: "Other Project",
      observed_name: "Memory Engine",
      confidence: 0.5,
      timestamp: "2026-06-16T11:00:00.000Z",
    },
  ];

  const projects: ProjectAuditRow[] = [
    {
      summary: {
        canonical_project: "Atriveo Cortex",
        first_seen: "2026-06-16T10:00:00.000Z",
        last_seen: "2026-06-16T10:00:00.000Z",
        mention_count: 1,
        extraction_count: 1,
      },
      aliases: [
        {
          observed_name: "Memory Engine",
          merge_confidence: "LOW",
          numeric_confidence: 0.5,
          observation_count: 1,
          review_status: null,
        },
      ],
      actions: [],
      ideas: [],
      growth_timeline: [],
    },
  ];

  it("queues single-observation and conflicting aliases", () => {
    const queue = buildReviewQueue(projects, history, new Map());
    expect(queue).toHaveLength(1);
    expect(queue[0].reasons).toContain("single_observation");
    expect(queue[0].reasons).toContain("conflicting");
    expect(queue[0].reasons).toContain("low_confidence");
  });

  it("skips approved and rejected items", () => {
    const approvedProjects: ProjectAuditRow[] = [
      {
        ...projects[0],
        aliases: [{ ...projects[0].aliases[0], review_status: "approved" }],
      },
    ];
    const queue = buildReviewQueue(approvedProjects, history, new Map());
    expect(queue).toHaveLength(0);
  });
});
