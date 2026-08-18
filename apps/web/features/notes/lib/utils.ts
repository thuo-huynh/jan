/**
 * Strips the most common markdown syntax down to a plain-text excerpt for
 * NoteCard previews on the notes list page. Intentionally simple regex-based
 * stripping (not a full markdown parse) — good enough for a short preview,
 * not used anywhere content is actually rendered (that path always goes
 * through MarkdownPreview's sanitized react-markdown render instead).
 */
export function markdownExcerpt(markdown: string, maxLength = 160): string {
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_>~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (stripped.length <= maxLength) return stripped;
  return `${stripped.slice(0, maxLength).trimEnd()}…`;
}

/**
 * Short "edited 3h ago" style relative time for note cards/the editor
 * header — the list is sorted pinned-first then most-recently-updated, but
 * without a visible timestamp that ordering isn't legible to the user (two
 * notes edited a day apart look identical). Falls back to a short date
 * once it's more than a week old, where "Nd ago" stops being a useful unit.
 */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const diffSec = Math.round(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
