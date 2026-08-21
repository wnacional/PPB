import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../supabase/migrations/20260821_debt_accounting_review_only.sql", import.meta.url), "utf8");
const dryRun = readFileSync(new URL("../supabase/dry-run-debt-accounting.sql", import.meta.url), "utf8");

test("dry run is the full migration with rollback instead of commit", () => {
  const normalizedMigration = migration
    .replace("-- Review only. Do not apply until the frontend and Edge Function changes are ready.", "-- HEADER")
    .replace(/commit;\s*$/, "rollback;\n");
  const normalizedDryRun = dryRun
    .replace("-- DRY RUN ONLY. The final ROLLBACK validates every statement without retaining changes.", "-- HEADER");
  assert.equal(normalizedDryRun, normalizedMigration);
  assert.match(dryRun, /begin;/);
  assert.match(dryRun, /rollback;\s*$/);
  assert.doesNotMatch(dryRun, /commit;\s*$/);
});
