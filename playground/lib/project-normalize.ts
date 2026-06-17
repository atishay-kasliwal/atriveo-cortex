import { getProjectAliases, getRejectedAliasPairs, seedProjectAliases } from "./memory-db";
import type { ExtractionSchema } from "./types";

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeProjectName(
  name: string,
  aliases: Array<{ canonical_name: string; alias: string }>,
  rejected?: Array<{ observed_name: string; canonical_project: string }>,
): string {
  const key = norm(name);
  if (!key) return name;

  for (const row of aliases) {
    if (norm(row.alias) !== key) continue;
    const isRejected = rejected?.some(
      (r) =>
        norm(r.observed_name) === key &&
        norm(r.canonical_project) === norm(row.canonical_name),
    );
    if (isRejected) return name;
    return row.canonical_name;
  }
  return name;
}

export async function normalizeExtractionProjects(
  parsed: ExtractionSchema | null,
): Promise<ExtractionSchema | null> {
  if (!parsed) return null;
  await seedProjectAliases();
  const aliases = await getProjectAliases();
  const rejected = await getRejectedAliasPairs();
  return {
    ...parsed,
    projects: parsed.projects.map((p) => ({
      ...p,
      name: normalizeProjectName(p.name, aliases, rejected),
    })),
  };
}
