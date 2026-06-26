#!/usr/bin/env tsx
import { config } from "dotenv";
import path from "path";
config({ path: path.join(process.cwd(), ".env.local") });

import { runUnsafe } from "../lib/db/client";
import { resolveSessionType } from "../lib/analytics/category-map";

async function main() {
  const date = process.argv[2] ?? "2026-06-25";
  const rows = await runUnsafe<{
    id: number;
    dominant_app: string | null;
    websites_used: string;
    session_type: string;
  }>(`SELECT id, dominant_app, websites_used, session_type FROM activity_sessions WHERE date = '${date}'`);

  let updated = 0;
  for (const r of rows) {
    const sites = JSON.parse(r.websites_used || "[]") as string[];
    const primaryDomain = sites[0] ?? null;
    const newType = resolveSessionType(r.dominant_app, primaryDomain);
    if (newType !== r.session_type) {
      await runUnsafe(`UPDATE activity_sessions SET session_type = '${newType}' WHERE id = ${r.id}`);
      console.log(`  ${r.id}: ${r.session_type} → ${newType} (${r.dominant_app}, ${primaryDomain})`);
      updated++;
    }
  }
  console.log(`Done. ${updated}/${rows.length} sessions updated.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
