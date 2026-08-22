import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

/**
 * Sanitized markdown renderer shared by the note editor's preview pane and
 * (if reused later) any other read-only note surface. Always goes through
 * rehype-sanitize's default schema — never render note body_markdown any
 * other way (US9 acceptance scenario 1 + general markdown-safety rule).
 */
export function MarkdownPreview({
  markdown,
  className = '',
}: {
  markdown: string;
  className?: string;
}) {
  if (!markdown.trim()) {
    return (
      <p className={`text-sm italic text-muted-foreground ${className}`}>
        Chưa có gì để xem trước.
      </p>
    );
  }

  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
