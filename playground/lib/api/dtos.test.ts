import { describe, expect, it } from "vitest";
import { paginateArray } from "./pagination";
import { toActionDTO, toProjectDTO } from "./dtos";
import type { ActionRecord, ProjectSummary } from "@/lib/types";

describe("api dtos", () => {
  it("maps project summary to ProjectDTO", () => {
    const row: ProjectSummary = {
      canonical_project: "Atriveo Cortex",
      first_seen: "2026-06-15T10:00:00.000Z",
      last_seen: "2026-06-17T10:00:00.000Z",
      mention_count: 5,
      extraction_count: 3,
    };
    expect(toProjectDTO(row)).toEqual({
      canonicalProject: "Atriveo Cortex",
      firstSeen: "2026-06-15T10:00:00.000Z",
      lastSeen: "2026-06-17T10:00:00.000Z",
      mentionCount: 5,
      extractionCount: 3,
    });
  });

  it("paginates arrays with metadata", () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1);
    const page = paginateArray(items, 2, 10);
    expect(page.items).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(page.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it("maps action record to ActionDTO", () => {
    const row: ActionRecord = {
      id: 1,
      text: "Improve extraction",
      normalized_text: "improve extraction",
      first_seen: "2026-06-15T10:00:00.000Z",
      last_seen: "2026-06-17T10:00:00.000Z",
      mention_count: 4,
      status: "open",
    };
    expect(toActionDTO(row).mentionCount).toBe(4);
  });
});
