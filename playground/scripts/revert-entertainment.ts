#!/usr/bin/env tsx
import { config } from "dotenv";
import path from "path";
config({ path: path.join(process.cwd(), ".env.local") });

import { runUnsafe } from "../lib/db/client";

async function main() {
  // Revert Chrome sessions with no domain that were wrongly set to ENTERTAINMENT
  const result = await runUnsafe<{ count: number }>(`
    SELECT COUNT(*) as count FROM activity_sessions
    WHERE date = '2026-06-25'
      AND session_type = 'ENTERTAINMENT'
      AND dominant_app ILIKE '%chrome%'
      AND (websites_used = '[]' OR websites_used IS NULL OR websites_used = '')
  `);
  console.log("Will revert:", result[0]?.count, "rows");
  
  await runUnsafe(`
    UPDATE activity_sessions
    SET session_type = 'RESEARCH'
    WHERE date = '2026-06-25'
      AND session_type = 'ENTERTAINMENT'
      AND dominant_app ILIKE '%chrome%'
      AND (websites_used = '[]' OR websites_used IS NULL OR websites_used = '')
  `);
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
