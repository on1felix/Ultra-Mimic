import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** Red action icon and confirm button, used for destructive operations. */
  tone?: 'danger' | 'accent';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Single confirmation dialog used across the app instead of the native
 * `window.confirm`, so destructive actions match the dark glass styling.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          onClick={() => !busy && onCancel()}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            className="card w-full max-w-[400px] p-5"
            initial={{ scale: 0.96, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl border-2',
                tone === 'danger' ? 'border-rose/25 bg-rose/10' : 'border-accent/30 bg-accent/10'
              )}
            >
              <AlertTriangle
                className={cn('h-5 w-5', tone === 'danger' ? 'text-rose' : 'text-accent-light')}
              />
            </div>

            <h3 className="mt-3 text-base font-semibold text-white">{title}</h3>
            <div className="mt-1 text-[12px] leading-relaxed text-muted">{message}</div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" disabled={busy} onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button
                variant={tone === 'danger' ? 'danger' : 'primary'}
                size="sm"
                disabled={busy}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};