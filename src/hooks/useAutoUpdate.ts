import { useCallback, useEffect, useRef, useState } from 'react';
import { isTauriRuntime, tauriApi } from '@/lib/tauri';
import type { UpdateInfo, UpdateProgress } from '@/types/update';

/** Let the window settle before asking GitHub, like the launcher does. */
const CHECK_DELAY_MS = 2000;
/** Keep the "installed" state on screen for a moment before restarting. */
const RESTART_DELAY_MS = 900;

interface AutoUpdate {
  info: UpdateInfo | null;
  progress: UpdateProgress | null;
  /** Finished downloading, but the app is waiting for an idle moment. */
  waiting: boolean;
  installing: boolean;
  error: string | null;
  retry: () => void;
  dismiss: () => void;
}

/**
 * Checks the latest GitHub release once per launch. When one is found it is
 * downloaded automatically and the app replaces itself and restarts.
 *
 * `busy` keeps the swap from interrupting an active run: the download may
 * finish, but the restart waits until the spoofer is idle again.
 */
export function useAutoUpdate(busy: boolean): AutoUpdate {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const appliedRef = useRef(false);
  const infoRef = useRef<UpdateInfo | null>(null);
  infoRef.current = info;

  const startDownload = useCallback(async (target: UpdateInfo) => {
    setError(null);
    setProgress(null);
    setInstalling(false);
    setDismissed(false);
    try {
      await tauriApi.downloadUpdate(target.download_url, target.sha256, target.size);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void tauriApi
      .onUpdateProgress((payload) => {
        if (!disposed) setProgress(payload);
      })
      .then((unsubscribe) => {
        if (disposed) unsubscribe();
        else unlisten = unsubscribe;
      });

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const found = await tauriApi.checkUpdate();
          if (disposed || !found) return;
          setInfo(found);
          await startDownload(found);
        } catch (e) {
          // A failed check must never interrupt a normal launch.
          console.warn('Update check failed:', e);
        }
      })();
    }, CHECK_DELAY_MS);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      unlisten?.();
    };
  }, [startDownload]);

  // Download finished: swap the exe. An active run is allowed to finish first.
  useEffect(() => {
    if (!progress || progress.percent < 99.95 || appliedRef.current || busy) return;
    appliedRef.current = true;
    setInstalling(true);
    const timer = window.setTimeout(() => {
      tauriApi.applyUpdate().catch((e) => {
        appliedRef.current = false;
        setInstalling(false);
        setError(e instanceof Error ? e.message : String(e));
      });
    }, RESTART_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [progress, busy]);

  const retry = useCallback(() => {
    const target = infoRef.current;
    if (target) void startDownload(target);
  }, [startDownload]);

  const dismiss = useCallback(() => setDismissed(true), []);

  const downloaded = !!progress && progress.percent >= 99.95;

  return {
    info: dismissed ? null : info,
    progress,
    waiting: downloaded && !installing && !error && busy,
    installing,
    error,
    retry,
    dismiss,
  };
}