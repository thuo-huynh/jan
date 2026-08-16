import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

/**
 * Sanitized markdown renderer shared by the personal note editor (T044) and
 * the confusable-pair comparison note (T047). `rehype-sanitize` strips any
 * markup outside the safe-defaults schema before it reaches the DOM — notes
 * and comparison_note are both user/admin-authored markdown, never trusted
 * as-is. No client-only APIs are used, so this also renders fine from a
 * Server Component (see ConfusablePairCard).
 */
export function GrammarMarkdown({ children }: { children: string }) {
  return (
    <div
      className="text-sm leading-relaxed text-foreground [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_h1]:mb-1 [&_h1]:mt-3 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-1 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold [&_li]:ml-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
