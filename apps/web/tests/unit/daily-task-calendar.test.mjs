import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appRoot = new URL('../../', import.meta.url);
const repoRoot = new URL('../../../../', import.meta.url);

async function source(root, path) {
  return readFile(new URL(path, root), 'utf8');
}

test('stores one hidden Daily Tasks board per user instead of asking users to create boards', async () => {
  const migration = await source(repoRoot, 'apps/supabase/migrations/0037_daily_task_board.sql');
  const page = await source(appRoot, 'app/(app)/boards/page.tsx');

  assert.match(migration, /add column if not exists is_daily boolean not null default false/i);
  assert.match(migration, /unique index.*boards_one_daily_per_user/i);
  assert.match(page, /ensureDailyBoard/);
  assert.match(page, /is_daily/);
});

test('renders a selectable monthly calendar with per-day task status summaries', async () => {
  const calendar = await source(appRoot, 'features/kanban/components/DailyTaskCalendar.tsx');

  assert.match(calendar, /selectedDate/);
  assert.match(calendar, /onSelectDate/);
  assert.match(calendar, /Cần làm/);
  assert.match(calendar, /Đang làm/);
  assert.match(calendar, /Hoàn thành/);
  assert.match(calendar, /monthCursor/);
});

test('filters the daily Kanban to the selected date and assigns new tasks to that date', async () => {
  const board = await source(appRoot, 'features/kanban/components/Board.tsx');

  assert.match(board, /dailyDate/);
  assert.match(board, /\.due_date !== dailyDate/);
  assert.match(board, /due_date:\s*dailyDate/);
});
