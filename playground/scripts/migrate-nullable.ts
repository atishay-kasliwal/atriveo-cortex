import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const playgroundRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(playgroundRoot, ".env.local") });
config({ path: path.join(playgroundRoot, ".env.sync") });
config({ path: path.join(os.homedir(), "Library/Application Support/Atriveo/capture/.env.sync") });

import { runUnsafe } from "@/lib/db/client";

async function main() {
  await runUnsafe(`ALTER TABLE action_mentions ALTER COLUMN extraction_id DROP NOT NULL`);
  await runUnsafe(`ALTER TABLE idea_mentions ALTER COLUMN extraction_id DROP NOT NULL`);
  console.log("migration done: extraction_id is now nullable");
  process.exit(0);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
