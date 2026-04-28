'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  /** Controls visibility — parent owns open/closed state. */
  open: boolean;
  /** Called on Esc, backdrop click, or Cancel button. */
  onCancel: () => void;
  /** Called when the user clicks the primary (Confirm) button. */
  onConfirm: () => void;
  /** Short, action-oriented heading ("Delete category?"). */
  title: string;
  /** Body copy — plain string or any ReactNode for richer explanations. */
  description: ReactNode;
  /** Primary button label. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Cancel button label. Defaults to "Cancel". */
  cancelLabel?: string;
  /**
   * `destructive` paints the primary button red and adds a warning icon —
   * use for soft-deletes, cancellations, refunds, etc. `default` is used
   * for benign confirmations.
   */
  variant?: 'default' | 'destructive';
  /**
   * When `true`, the buttons are disabled and the confirm button shows
   * its loading state. The parent should keep the dialog open until the
   * async action resolves so the user sees the pending feedback.
   */
  isPending?: boolean;
}

/**
 * Accessible confirmation dialog — replacement for `window.confirm()`.
 *
 * Features:
 * - Portaled into `document.body` so it escapes parent `overflow`/`z-index`.
 * - Focus moves to the confirm button on open; previous focus is restored
 *   on close.
 * - `Esc` and backdrop-click both invoke `onCancel` (disabled while pending
 *   so the admin can't accidentally dismiss an in-flight request).
 * - `role="dialog" aria-modal="true"` with labelled heading + description
 *   for assistive tech.
 * - Body scroll is locked while open.
 */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isPending = false,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Focus the confirm button on open and restore focus on close. We
  // capture `document.activeElement` before the dialog mounts so the
  // admin snaps back to the button they clicked after dismissing.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current =
      (document.activeElement as HTMLElement | null) ?? null;
    // Defer focus so the portal has a chance to attach to the DOM.
    const t = window.setTimeout(() => {
      confirmRef.current?.focus();
    }, 0);
    return () => {
      window.clearTimeout(t);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Esc closes the dialog — guarded by `!isPending` so a user mid-request
  // can't cancel a server action that's already in flight.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) {
        e.preventDefault();
        onCancel();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, isPending, onCancel]);

  // Lock body scroll while the dialog is open so content behind the
  // backdrop can't move out from under the user.
  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const isDestructive = variant === 'destructive';

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      {/* Backdrop — clicking it cancels unless a request is in flight. */}
      <button
        type="button"
        aria-label="Dismiss dialog"
        tabIndex={-1}
        onClick={() => {
          if (!isPending) onCancel();
        }}
        className="bg-midnight/70 absolute inset-0 cursor-default backdrop-blur-sm"
      />

      <div
        className={cn(
          'border-slate bg-charcoal relative w-full max-w-md rounded-lg border p-6 shadow-2xl',
        )}
      >
        <div className="flex items-start gap-4">
          {isDestructive && (
            <div
              aria-hidden="true"
              className="bg-error/10 text-error flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="font-display text-ivory text-lg font-semibold"
            >
              {title}
            </h2>
            <div
              id={descId}
              className="text-silver mt-2 text-sm leading-relaxed"
            >
              {description}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            variant={isDestructive ? 'destructive' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isPending}
            disabled={isPending}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
