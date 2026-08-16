/**
 * Row shape for `public.notes` (data-model.md "notes"). There is no
 * generated `database.types.ts` in this repo yet, so Supabase query builder
 * calls are effectively untyped (`any`) — these types exist purely to give
 * downstream components (NoteCard, NoteEditor, pickers, etc.) a typed
 * surface to work against once data crosses out of the Server Component
 * fetch.
 *
 * Deviation from tasks.md wording: data-model.md's `notes` table only has
 * `linked_task_id` / `linked_vocab_id` (no separate grammar-link column), so
 * that's the only link surface implemented here — see report.
 */
export type Note = {
  id: string;
  user_id: string;
  title: string;
  body_markdown: string;
  folder: string | null;
  tags: string[];
  pinned: boolean;
  linked_task_id: string | null;
  linked_vocab_id: string | null;
  search_vector?: unknown;
  created_at: string;
  updated_at: string;
};

/** Option shown in the task half of NoteLinkPicker. */
export type TaskOption = {
  id: string;
  title: string;
};

/** Option shown in the vocab half of NoteLinkPicker. */
export type VocabOption = {
  id: string;
  word: string;
  meaning: string;
};

/** Resolved label for a note's current link target, once looked up server-side. */
export type LinkedItemInfo = {
  id: string;
  label: string;
};
