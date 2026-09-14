import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appRoot = new URL('../../', import.meta.url);
const repoRoot = new URL('../../../../', import.meta.url);

async function source(root, path) {
  return readFile(new URL(path, root), 'utf8');
}

test('stores an optional bounded estimate on a task', async () => {
  const migration = await source(repoRoot, 'apps/supabase/migrations/0038_task_planning_metadata.sql');
  const types = await source(appRoot, 'features/kanban/types.ts');
  const schemas = await source(appRoot, 'shared/validation/schemas.ts');

  assert.match(migration, /estimated_minutes\s+smallint/i);
  assert.match(migration, /between\s+5\s+and\s+720/i);
  assert.match(types, /estimated_minutes:\s*number\s*\|\s*null/);
  assert.match(schemas, /estimatedMinutes:\s*z\.number\(\)\.int\(\)\.min\(5\)\.max\(720\).*optional\(\)\.nullable\(\)/s);
});

test('keeps date-key conversion in a dedicated local-date helper', async () => {
  const helper = await source(appRoot, 'features/kanban/lib/dates.ts');

  assert.match(helper, /export function toDateKey/);
  assert.match(helper, /getFullYear\(\)/);
  assert.match(helper, /getMonth\(\) \+ 1/);
  assert.doesNotMatch(helper, /toISOString\(\)/);
});
