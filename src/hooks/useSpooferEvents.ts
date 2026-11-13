import { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { tauriApi } from '@/lib/tauri';
import type {
  HistoryGame,
  SpooferStatus,
  SpooferTickEvent,
  SpooferLogEvent,
  SpooferConfig,
} from '@/types/spoofer';

const MAX_LOGS = 600;

const EMPTY_TICK: SpooferTickEvent = {
  current_index: 0,
  total_games: 0,
  active_batch: [],
  elapsed_secs: 0,
  estimated_remaining_secs: 0,
  games_per_minute: 0,
  succeeded_count: 0,
  failed_count: 0,
  phase: 'idle',
  hold_total_secs: 0,
  hold_remaining_secs: 0,
  cooldown_remaining_secs: 0,
  next_batch: [],
  pool_remaining: 0,
};

export function useSpooferEvents() {
  const { t, formatNumber } = useI18n();
  const [status, setStatus] = useState<SpooferStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [tickData, setTickData] = useState<SpooferTickEvent>(EMPTY_TICK);

  const [logs, setLogs] = useState<SpooferLogEvent[]>([]);
  const [totalDatabaseGames, setTotalDatabaseGames] = useState<number>(0);
  const [processGamesCount, setProcessGamesCount] = useState<number>(0);
  const [rpcGamesCount, setRpcGamesCount] = useState<number>(0);
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [historyProcessCount, setHistoryProcessCount] = useState<number>(0);
  const [historyRpcCount, setHistoryRpcCount] = useState<number>(0);
  const [historyGames, setHistoryGames] = useState<HistoryGame[]>([]);
  const [isFetchingDatabase, setIsFetchingDatabase] = useState<boolean>(false);

  const logIdCounter = useRef(0);
  const wasRunning = useRef(false);
  const lastHistoryIndex = useRef(0);

  const addLog = useCallback((level: SpooferLogEvent['level'], message: string) => {
    const time = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    logIdCounter.current += 1;
    const newLog: SpooferLogEvent = {
      id: `log-${Date.now()}-${logIdCounter.current}`,
      timestamp: time,
      level,
      message,
    };

    setLogs((prev) => {
      const updated = [...prev, newLog];
      return updated.length > MAX_LOGS ? updated.slice(updated.length - MAX_LOGS) : updated;
    });
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  const refreshHistory = useCallback(async () => {
    try {
      const [state, games] = await Promise.all([
        tauriApi.getSpooferState(),
        tauriApi.getHistoryGames(),
      ]);
      setHistoryCount(state.history_count || 0);
      setHistoryProcessCount(state.history_process_count ?? 0);
      setHistoryRpcCount(state.history_rpc_count ?? 0);
      setHistoryGames(games);
    } catch {
      // outside Tauri / mock mode — nothing to sync
    }
  }, []);

  // Listen to Tauri events
  useEffect(() => {
    let disposed = false;
    const unlistenCallbacks: (() => void)[] = [];

    const subscribe = async <T,>(
      listen: (handler: (payload: T) => void) => Promise<() => void>,
      handler: (payload: T) => void
    ) => {
      const unlisten = await listen((payload) => {
        if (!disposed) handler(payload);
      });

      // Cleanup can run before Tauri finishes registering the listener.
      if (disposed) {
        unlisten();
      } else {
        unlistenCallbacks.push(unlisten);
      }
    };

    const setupListeners = async () => {
      try {
        await Promise.all([
          subscribe(tauriApi.onTick, (payload) => {
            setTickData({ ...EMPTY_TICK, ...payload });
            // Each completed batch appends to history, so keep the list live.
            const index = payload.current_index ?? 0;
            if (index > lastHistoryIndex.current) {
              lastHistoryIndex.current = index;
              void refreshHistory();
            }
          }),
          subscribe(tauriApi.onLog, (payload) => addLog(payload.level, payload.message)),
          subscribe(tauriApi.onStatus, (payload) => {
            setStatus(payload.status);
            if (payload.status === 'error' && payload.message) {
              setErrorMessage(payload.message);
            } else if (payload.status !== 'error') {
              setErrorMessage(null);
            }
          }),
          subscribe(tauriApi.onFetchProgress, (payload) => {
            setTotalDatabaseGames(payload.total_fetched);
            setProcessGamesCount(payload.process_count);
            setRpcGamesCount(payload.rpc_count);
            if (payload.history_process_count !== undefined) {
              setHistoryProcessCount(payload.history_process_count);
            }
            if (payload.history_rpc_count !== undefined) {
              setHistoryRpcCount(payload.history_rpc_count);
            }
            setIsFetchingDatabase(payload.is_loading);
          }),
        ]);
        if (disposed) return;

        // Initialize state snapshot from Rust
        try {
          const state = await tauriApi.getSpooferState();
          if (disposed) return;
          setStatus(state.status);
          setTotalDatabaseGames(state.total_count);
          setProcessGamesCount(state.process_count);
          setRpcGamesCount(state.rpc_count);
          setHistoryCount(state.history_count || 0);
          setHistoryProcessCount(state.history_process_count ?? 0);
          setHistoryRpcCount(state.history_rpc_count ?? 0);
          const games = await tauriApi.getHistoryGames();
          if (!disposed) setHistoryGames(games);
        } catch {
          // outside tauri / mock mode
        }
      } catch (err) {
        console.warn('Tauri event listener setup failed:', err);
      }
    };

    setupListeners();

    return () => {
      disposed = true;
      unlistenCallbacks.forEach((unlisten) => unlisten());
    };
  }, [addLog, refreshHistory]);

  // When a run ends, the backend has just written new history entries.
  useEffect(() => {
    if (status === 'running' || status === 'paused') {
      wasRunning.current = true;
      return;
    }
    if (status === 'finished' && wasRunning.current) {
      wasRunning.current = false;
      void refreshHistory();
    }
    if (status === 'idle' && wasRunning.current) {
      wasRunning.current = false;
      void refreshHistory();
    }
  }, [status, refreshHistory]);

  // Actions
  const start = useCallback(
    async (config: SpooferConfig) => {
      try {
        setErrorMessage(null);
        setStatus('running');
        lastHistoryIndex.current = 0;
        await tauriApi.startSpoofer(config);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setErrorMessage(msg);
        setStatus('error');
        addLog('error', t('logs.startFailed', { error: msg }));
      }
    },
    [addLog, t]
  );

  const pause = useCallback(async () => {
    try {
      setStatus('paused');
      await tauriApi.pauseSpoofer();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog('error', t('logs.pauseFailed', { error: msg }));
    }
  }, [addLog, t]);

  const resume = useCallback(async () => {
    try {
      setStatus('running');
      await tauriApi.resumeSpoofer();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog('error', t('logs.resumeFailed', { error: msg }));
    }
  }, [addLog, t]);

  const stop = useCallback(async () => {
    try {
      setStatus('idle');
      setTickData((prev) => ({ ...prev, active_batch: [], phase: 'idle' }));
      await tauriApi.stopSpoofer();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog('error', t('logs.stopFailed', { error: msg }));
    }
  }, [addLog, t]);

  const fetchGames = useCallback(
    async (force = false) => {
      try {
        setIsFetchingDatabase(true);
        addLog('info', t('logs.fetching'));
        const res = await tauriApi.fetchGames(force);
        setTotalDatabaseGames(res.total);
        setProcessGamesCount(res.process_count);
        setRpcGamesCount(res.rpc_count);
        addLog(
          'success',
          t(res.from_cache ? 'logs.fetchedCache' : 'logs.fetched', {
            total: formatNumber(res.total),
            process: formatNumber(res.process_count),
            rpc: formatNumber(res.rpc_count),
          })
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        addLog('error', t('logs.fetchFailed', { error: msg }));
      } finally {
        setIsFetchingDatabase(false);
      }
    },
    [addLog, t, formatNumber]
  );

  const clearHistory = useCallback(async () => {
    try {
      await tauriApi.clearHistory();
      setHistoryCount(0);
      setHistoryProcessCount(0);
      setHistoryRpcCount(0);
      setHistoryGames([]);
      addLog('info', t('logs.historyCleared'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog('error', t('logs.historyClearFailed', { error: msg }));
    }
  }, [addLog, t]);

  const removeHistoryEntries = useCallback(
    async (ids: string[]) => {
      try {
        const removed = await tauriApi.removeHistoryEntries(ids);
        await refreshHistory();
        if (removed > 0) {
          addLog('success', t('logs.historyReturned', { count: formatNumber(removed) }));
        }
        return removed;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        addLog('error', t('logs.historyReturnFailed', { error: msg }));
        throw e;
      }
    },
    [addLog, t, formatNumber, refreshHistory]
  );

  const exportHistory = useCallback(async () => {
    try {
      const json = await tauriApi.exportHistory();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ultra-mimic-history-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addLog('success', t('logs.historyExported'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog('error', t('logs.historyExportFailed', { error: msg }));
    }
  }, [addLog, t]);

  const importHistory = useCallback(
    async (jsonData: string) => {
      try {
        const added = await tauriApi.importHistory(jsonData);
        await refreshHistory();
        addLog('success', t('logs.historyImported', { count: formatNumber(added) }));
        return added;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        addLog('error', t('logs.historyImportFailed', { error: msg }));
        throw e;
      }
    },
    [addLog, t, formatNumber, refreshHistory]
  );

  return {
    status,
    errorMessage,
    tickData,
    logs,
    totalDatabaseGames,
    processGamesCount,
    rpcGamesCount,
    historyCount,
    historyProcessCount,
    historyRpcCount,
    historyGames,
    isFetchingDatabase,
    actions: {
      start,
      pause,
      resume,
      stop,
      fetchGames,
      clearLogs,
      clearHistory,
      removeHistoryEntries,
      exportHistory,
      importHistory,
      refreshHistory,
      addLog,
    },
  };
}
