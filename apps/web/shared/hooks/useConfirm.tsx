'use client';

import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

/**
 * Promise-based, design-system-styled replacement for `window.confirm()`.
 * Usage:
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   async function handleDelete() {
 *     if (!(await confirm({ title: 'Delete this board?' }))) return;
 *     ...
 *   }
 *   return <div>{confirmDialog}...</div>;
 *
 * `confirmDialog` renders nothing until `confirm()` is called, so it's safe
 * to include unconditionally in JSX.
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const settle = useCallback((result: boolean) => {
    setOptions(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }, []);

  // Portalled to <body> rather than rendered inline: several callers open a
  // confirm from inside another overlay (e.g. TaskDetailModal), and an
  // inline dialog would nest inside that overlay's own backdrop `onClick` —
  // clicking the confirm dialog's backdrop would then bubble up and also
  // dismiss the parent modal underneath it.
  const confirmDialog =
    options && typeof document !== 'undefined'
      ? createPortal(
          <ConfirmDialog
            title={options.title}
            description={options.description}
            confirmLabel={options.confirmLabel}
            cancelLabel={options.cancelLabel}
            danger={options.danger}
            onConfirm={() => settle(true)}
            onCancel={() => settle(false)}
          />,
          document.body,
        )
      : null;

  return { confirm, confirmDialog };
}
