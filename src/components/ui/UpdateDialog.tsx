import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Clock3, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useUi } from '@/i18n/ui';
import type { UpdateInfo, UpdateProgress } from '@/types/update';

interface UpdateDialogProps {
  info: UpdateInfo | null;
  progress: UpdateProgress | null;
  waiting: boolean;
  installing: boolean;
  error: string | null;
  onRetry: () => void;
  onDismiss: () => void;
}

const mb = (bytes: number) => (bytes / 1048576).toFixed(1);

/**
 * Auto-update card: same glass as the confirm dialog, accent icon and a single
 * accent bar. There is nothing to press while it works - the app replaces
 * itself and restarts once the download is complete.
 */
export const UpdateDialog: React.FC<UpdateDialogProps> = ({
  info,
  progress,
  waiting,
  installing,
  error,
  onRetry,
  onDismiss,
}) => {
  const { u } = useUi();
  const percent = installing || waiting ? 100 : Math.min(progress?.percent ?? 0, 100);
  const total = info?.size || progress?.total || 0;
  const title = installing
    ? u('upd.installing')
    : waiting
      ? u('upd.waitingTitle')
      : u('upd.title');
  const note = installing
    ? u('upd.restarting')
    : waiting
      ? u('upd.waitingNote')
      : u('upd.note');

  return createPortal(
    <AnimatePresence>
      {info && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/65 p-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={u('upd.title')}
            className="card w-full max-w-[420px] p-5"
            initial={{ scale: 0.96, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-2 border-accent/30 bg-accent/10">
                {installing ? (
                  <Check className="h-5 w-5 text-accent-light" />
                ) : waiting ? (
                  <Clock3 className="h-5 w-5 text-accent-light" />
                ) : (
                  <Download className="h-5 w-5 text-accent-light" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{note}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-surface-300/60 px-3 py-2">
              <span className="num font-mono text-[12px] text-muted">v{info.current}</span>
              <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-faint" />
              <span className="num font-mono text-[12px] font-semibold text-accent-soft">
                v{info.latest}
              </span>
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[11px]">
              <span className="num font-mono text-white/85">{percent.toFixed(1)}%</span>
              {!installing && !waiting && progress && (
                <span className="num font-mono text-accent-soft">
                  {progress.speed_mbps.toFixed(1)} {u('upd.mbps')}
                </span>
              )}
            </div>

            <p className="mt-1 text-[11px] text-faint">
              {progress
                ? u('upd.downloaded', { a: mb(progress.downloaded), b: mb(total) })
                : u('upd.preparing')}
            </p>

            {error && (
              <div className="mt-3 rounded-lg border border-rose/30 bg-rose/10 px-3 py-2 text-[11px] leading-relaxed text-rose">
                {error}
              </div>
            )}

            {error && (
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onDismiss}>
                  {u('upd.later')}
                </Button>
                <Button variant="primary" size="sm" onClick={onRetry}>
                  {u('upd.retry')}
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};