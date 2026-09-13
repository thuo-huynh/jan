import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appRoot = new URL('../../', import.meta.url);

test('exposes Daily Tasks as the Kanban destination in the app shell', async () => {
  const layout = await readFile(new URL('app/(app)/layout.tsx', appRoot), 'utf8');
  const sidebar = await readFile(new URL('shared/components/AppSidebar.tsx', appRoot), 'utf8');

  assert.match(layout, /href:\s*'\/boards',\s*label:\s*'Daily Tasks'/);
  assert.match(sidebar, /'\/boards':\s*ListChecks/);
});

test('names the Kanban landing page for daily planning', async () => {
  const boardsPage = await readFile(new URL('app/(app)/boards/page.tsx', appRoot), 'utf8');

  assert.match(boardsPage, />Daily Tasks</);
  assert.match(boardsPage, /Chọn một ngày để lên kế hoạch/);
});
