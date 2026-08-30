/**
 * Shared types/helpers for `GET /api/admin/content` (T088, ./route.ts) and
 * `DELETE /api/admin/content/[type]/[id]` (T088, ./[type]/[id]/route.ts).
 * Not a Route Handler itself (no HTTP method exports, not named `route.ts`),
 * so Next.js App Router does not treat it as a routable file.
 *
 * `grammar_notes` mapping note (per task brief — data-model.md has no
 * separate `grammar_notes` table): personal grammar notes/mnemonics live in
 * `user_grammar_status.notes_user`, a text column on the per-user grammar
 * status row (data-model.md "user_grammar_status", FR-014), not a standalone
 * table. "Listing" `grammar_notes` content means listing
 * `user_grammar_status` rows that have a non-empty `notes_user`; "deleting"
 * one means clearing that column (`notes_user = null`) rather than deleting
 * the row outright, since the row also carries unrelated `status`/SRS
 * scheduling state that moderation of a note's content shouldn't destroy.
 */
export const CONTENT_TYPES = [
  'tasks',
  'notes',
  'vocab',
  'grammar_notes',
  'reading_logs',
  'listening_logs',
  'reading_passages',
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export function isContentType(value: string | null | undefined): value is ContentType {
  return !!value && (CONTENT_TYPES as readonly string[]).includes(value);
}
