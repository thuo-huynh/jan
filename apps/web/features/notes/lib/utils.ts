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
