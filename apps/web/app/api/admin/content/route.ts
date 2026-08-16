import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/shared/supabase/admin-guard';
import { CONTENT_TYPES, isContentType, type ContentType } from './_shared';
import type { createAdminClient } from '@/shared/supabase/admin';

/**
 * T088 — GET /api/admin/content?type=tasks|notes|vocab|grammar_notes|reading_logs|listening_logs|mistakes&query=&page=
 * Lists/searches user-generated content across all owners for moderation
 * (FR-046). See `./_shared.ts` for the `grammar_notes` mapping decision.
 * Every branch embeds `profiles(email)` (directly, or via `boards` for
 * `tasks`, which has no direct `user_id` column — ownership is denormalized
 * via `board_id`, data-model.md) so the moderation UI can show who owns each
 * item without a second round trip.
 */
const PAGE_SIZE = 25;

type Admin = ReturnType<typeof createAdminClient>;

interface TaskContentRow {
  id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  due_date: string | null;
  progress_pct: number | null;
  created_at: string;
  updated_at: string;
  board: { user_id: string; name: string; profiles: { email: string } | null } | null;
}

async function queryTasks(admin: Admin, query: string, from: number, to: number) {
  let q = admin
    .from('tasks')
    .select(
      'id, title, description, tags, due_date, progress_pct, created_at, updated_at, board:boards(user_id, name, profiles(email))',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to);
  if (query) q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  const { data, error, count } = await q;
  if (error) throw error;
  const items = ((data ?? []) as unknown as TaskContentRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    tags: row.tags,
    dueDate: row.due_date,
    progressPct: row.progress_pct,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerId: row.board?.user_id ?? null,
    ownerEmail: row.board?.profiles?.email ?? null,
    boardName: row.board?.name ?? null,
  }));
  return { items, total: count ?? 0 };
}

interface NoteContentRow {
  id: string;
  title: string;
  body_markdown: string;
  folder: string | null;
  tags: string[] | null;
  pinned: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  profiles: { email: string } | null;
}

async function queryNotes(admin: Admin, query: string, from: number, to: number) {
  let q = admin
    .from('notes')
    .select(
      'id, title, body_markdown, folder, tags, pinned, user_id, created_at, updated_at, profiles(email)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to);
  if (query) q = q.or(`title.ilike.%${query}%,body_markdown.ilike.%${query}%`);
  const { data, error, count } = await q;
  if (error) throw error;
  const items = ((data ?? []) as unknown as NoteContentRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    bodyMarkdown: row.body_markdown,
    folder: row.folder,
    tags: row.tags,
    pinned: row.pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerId: row.user_id,
    ownerEmail: row.profiles?.email ?? null,
  }));
  return { items, total: count ?? 0 };
}

interface VocabContentRow {
  id: string;
  word: string;
  reading: string | null;
  meaning: string;
  example: string | null;
  jlpt_level: string | null;
  is_kanji: boolean;
  user_id: string;
  created_at: string;
  profiles: { email: string } | null;
}

async function queryVocab(admin: Admin, query: string, from: number, to: number) {
  // Only custom (user-authored) entries are user-generated content for
  // moderation purposes; global reference rows (user_id IS NULL) are managed
  // via /api/admin/reference-data/vocab (T090) instead.
  let q = admin
    .from('vocab_entries')
    .select(
      'id, word, reading, meaning, example, jlpt_level, is_kanji, user_id, created_at, profiles(email)',
      { count: 'exact' },
    )
    .not('user_id', 'is', null)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (query) q = q.or(`word.ilike.%${query}%,meaning.ilike.%${query}%`);
  const { data, error, count } = await q;
  if (error) throw error;
  const items = ((data ?? []) as unknown as VocabContentRow[]).map((row) => ({
    id: row.id,
    word: row.word,
    reading: row.reading,
    meaning: row.meaning,
    example: row.example,
    jlptLevel: row.jlpt_level,
    isKanji: row.is_kanji,
    createdAt: row.created_at,
    ownerId: row.user_id,
    ownerEmail: row.profiles?.email ?? null,
  }));
  return { items, total: count ?? 0 };
}

interface GrammarNoteContentRow {
  id: string;
  user_id: string;
  grammar_point_id: string;
  status: string;
  notes_user: string | null;
  updated_at: string;
  profiles: { email: string } | null;
  grammar_points: { pattern: string; meaning: string } | null;
}

async function queryGrammarNotes(admin: Admin, query: string, from: number, to: number) {
  let q = admin
    .from('user_grammar_status')
    .select(
      'id, user_id, grammar_point_id, status, notes_user, updated_at, profiles(email), grammar_points(pattern, meaning)',
      { count: 'exact' },
    )
    .not('notes_user', 'is', null)
    .neq('notes_user', '')
    .order('updated_at', { ascending: false })
    .range(from, to);
  if (query) q = q.ilike('notes_user', `%${query}%`);
  const { data, error, count } = await q;
  if (error) throw error;
  const items = ((data ?? []) as unknown as GrammarNoteContentRow[]).map((row) => ({
    id: row.id,
    status: row.status,
    notesUser: row.notes_user,
    updatedAt: row.updated_at,
    ownerId: row.user_id,
    ownerEmail: row.profiles?.email ?? null,
    grammarPointId: row.grammar_point_id,
    grammarPattern: row.grammar_points?.pattern ?? null,
    grammarMeaning: row.grammar_points?.meaning ?? null,
  }));
  return { items, total: count ?? 0 };
}

interface ReadingLogContentRow {
  id: string;
  user_id: string;
  source: string;
  passage_type: string | null;
  duration_min: number;
  comprehension_score: number | null;
  notes: string | null;
  practiced_at: string;
  profiles: { email: string } | null;
}

async function queryReadingLogs(admin: Admin, query: string, from: number, to: number) {
  let q = admin
    .from('reading_logs')
    .select(
      'id, user_id, source, passage_type, duration_min, comprehension_score, notes, practiced_at, profiles(email)',
      { count: 'exact' },
    )
    .order('practiced_at', { ascending: false })
    .range(from, to);
  if (query) q = q.or(`source.ilike.%${query}%,notes.ilike.%${query}%`);
  const { data, error, count } = await q;
  if (error) throw error;
  const items = ((data ?? []) as unknown as ReadingLogContentRow[]).map((row) => ({
    id: row.id,
    source: row.source,
    passageType: row.passage_type,
    durationMin: row.duration_min,
    comprehensionScore: row.comprehension_score,
    notes: row.notes,
    practicedAt: row.practiced_at,
    ownerId: row.user_id,
    ownerEmail: row.profiles?.email ?? null,
  }));
  return { items, total: count ?? 0 };
}

interface ListeningLogContentRow {
  id: string;
  user_id: string;
  source: string;
  duration_min: number;
  comprehension_score: number | null;
  notes: string | null;
  practiced_at: string;
  profiles: { email: string } | null;
}

async function queryListeningLogs(admin: Admin, query: string, from: number, to: number) {
  let q = admin
    .from('listening_logs')
    .select(
      'id, user_id, source, duration_min, comprehension_score, notes, practiced_at, profiles(email)',
      { count: 'exact' },
    )
    .order('practiced_at', { ascending: false })
    .range(from, to);
  if (query) q = q.or(`source.ilike.%${query}%,notes.ilike.%${query}%`);
  const { data, error, count } = await q;
  if (error) throw error;
  const items = ((data ?? []) as unknown as ListeningLogContentRow[]).map((row) => ({
    id: row.id,
    source: row.source,
    durationMin: row.duration_min,
    comprehensionScore: row.comprehension_score,
    notes: row.notes,
    practicedAt: row.practiced_at,
    ownerId: row.user_id,
    ownerEmail: row.profiles?.email ?? null,
  }));
  return { items, total: count ?? 0 };
}

interface MistakeContentRow {
  id: string;
  user_id: string;
  source: string;
  content: string;
  linked_vocab_id: string | null;
  linked_grammar_id: string | null;
  resolved: boolean;
  created_at: string;
  profiles: { email: string } | null;
}

async function queryMistakes(admin: Admin, query: string, from: number, to: number) {
  let q = admin
    .from('mistake_notebook')
    .select(
      'id, user_id, source, content, linked_vocab_id, linked_grammar_id, resolved, created_at, profiles(email)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to);
  if (query) q = q.ilike('content', `%${query}%`);
  const { data, error, count } = await q;
  if (error) throw error;
  const items = ((data ?? []) as unknown as MistakeContentRow[]).map((row) => ({
    id: row.id,
    source: row.source,
    content: row.content,
    linkedVocabId: row.linked_vocab_id,
    linkedGrammarId: row.linked_grammar_id,
    resolved: row.resolved,
    createdAt: row.created_at,
    ownerId: row.user_id,
    ownerEmail: row.profiles?.email ?? null,
  }));
  return { items, total: count ?? 0 };
}

type ContentQueryFn = (
  admin: Admin,
  query: string,
  from: number,
  to: number,
) => Promise<{ items: unknown[]; total: number }>;

const QUERY_BY_TYPE: Record<ContentType, ContentQueryFn> = {
  tasks: queryTasks,
  notes: queryNotes,
  vocab: queryVocab,
  grammar_notes: queryGrammarNotes,
  reading_logs: queryReadingLogs,
  listening_logs: queryListeningLogs,
  mistakes: queryMistakes,
};

export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  if (!isContentType(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${CONTENT_TYPES.join(', ')}` },
      { status: 400 },
    );
  }

  const query = searchParams.get('query')?.trim() ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  try {
    const { items, total } = await QUERY_BY_TYPE[type](admin, query, from, to);
    return NextResponse.json({ type, items, total, page, pageSize: PAGE_SIZE });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
