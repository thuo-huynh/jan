import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appRoot = new URL('../../', import.meta.url);
const repoRoot = new URL('../../../../', import.meta.url);

async function source(root, path) {
  return readFile(new URL(path, root), 'utf8');
}

test('defines global-only shared flashcard deck storage and published read policies', async () => {
  const migration = await source(
    repoRoot,
    'apps/supabase/migrations/0035_shared_flashcard_decks.sql'
  );
  const rls = await source(
    repoRoot,
    'apps/supabase/migrations/0036_rls_shared_flashcard_decks.sql'
  );

  assert.match(migration, /create table if not exists public\.shared_flashcard_decks/i);
  assert.match(migration, /create table if not exists public\.shared_flashcard_deck_entries/i);
  assert.match(migration, /validate_shared_flashcard_deck_vocab/i);
  assert.match(rls, /shared_flashcard_decks_select_published/i);
  assert.match(rls, /shared_flashcard_deck_entries_select_published/i);
});

test('uses an admin guard and validated membership to curate shared flashcard decks', async () => {
  const route = await source(appRoot, 'app/api/admin/reference-data/flashcard-decks/route.ts');
  const schemas = await source(appRoot, 'shared/validation/schemas.ts');

  assert.match(route, /requireAdmin/);
  assert.match(route, /sharedFlashcardDeckSchema/);
  assert.match(route, /is\('user_id', null\)/);
  assert.match(schemas, /sharedFlashcardDeckSchema/);
});

test('renders a shared deck catalog and studies an explicitly selected deck', async () => {
  const page = await source(appRoot, 'app/(app)/learn/vocab/flashcards/page.tsx');
  const catalog = await source(appRoot, 'features/vocab-srs/components/FlashcardCatalog.tsx');

  assert.match(page, /searchParams\.deck/);
  assert.match(page, /FlashcardCatalog/);
  assert.match(page, /loadSharedFlashcardDecks/);
  assert.match(catalog, /Học bộ này/);
  assert.match(catalog, /Cấp độ/);
});
