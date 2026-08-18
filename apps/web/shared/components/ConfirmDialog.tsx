'use client';

import { useEffect } from 'react';

interface ConfirmDialogProps {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Styled stand-in for `window.confirm()` — the OS dialog breaks out of the
 * app's indigo design system (DESIGN.md) into an unstyled native prompt,
 * which reads as jarring given every other surface composes `.card`/
 * `.btn-*` primitives. Rendered via useConfirm() rather than mounted
 * directly, since the whole point is to await a yes/no answer the same way
 * `window.confirm()` did.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancel();
      }
    }
    // Capture phase so this fires before any ancestor modal's own
    // window-level Escape listener (e.g. TaskDetailModal) — otherwise
    // pressing Escape to dismiss this dialog would also close the modal
    // underneath it.
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-foreground">
          {title}
        </h2>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-outline h-9 px-3 text-sm">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className={`${danger ? 'btn-danger' : 'btn-primary'} h-9 px-3 text-sm`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
