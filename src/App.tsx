import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar, type Tab } from '@/components/Sidebar';
import { TitleBar } from '@/components/TitleBar';
import { TopBar } from '@/components/TopBar';
import { OverviewView } from '@/components/views/OverviewView';
import { GamesFarmView } from '@/components/views/GamesFarmView';
import { HoursFarmView } from '@/components/views/HoursFarmView';
import { HistoryView } from '@/components/views/HistoryView';
import { DatabaseView } from '@/components/views/DatabaseView';
import { ConsoleView } from '@/components/views/ConsoleView';
import { DocumentationView } from '@/components/views/DocumentationView';
import { FakeStatusView } from '@/components/FakeStatusView';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDiscordStatus } from '@/hooks/useDiscordStatus';
import { useSpooferEvents } from '@/hooks/useSpooferEvents';
import { tauriApi } from '@/lib/tauri';
import { useUi } from '@/i18n/ui';
import type { SpooferConfig, SpoofableGameItem } from '@/types/spoofer';

const CONFIG_KEY = 'ultra-mimic.config';
const LEGACY_CONFIG_KEY = 'mimic2.config';
const HOLD_MIGRATION_KEY = 'ultra-mimic.config.hold-3m';
/** One-time repair: an accidental toggle-off re-ran games that were already done. */
const HISTORY_MIGRATION_KEY = 'ultra-mimic.config.skip-history-2';

/** Defaults: 100 games, 1 stream, 3 min hold, built-in 20 s pause after each game. */
const DEFAULT_CONFIG: SpooferConfig = {
  limit: 100,
  batch_size: 1,
  hold_duration_secs: 180,
  skip_previously_spoofed: true,
  spoof_mode: 'process_only',
  cooldown_enabled: true,
  cooldown_every_n_batches: 1,
  cooldown_seconds: 20,
  jitter_enabled: true,
  exclude_adult: true,
};

function readConfig(): SpooferConfig {
  let next: SpooferConfig = DEFAULT_CONFIG;
  try {
    const raw =
      window.localStorage.getItem(CONFIG_KEY) ??
      window.localStorage.getItem(LEGACY_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SpooferConfig>;
      next = {
        ...DEFAULT_CONFIG,
        ...parsed,
        batch_size: Math.min(20, Math.max(1, Number(parsed.batch_size) || DEFAULT_CONFIG.batch_size)),
        hold_duration_secs: Math.min(
          3600,
          Math.max(15, Number(parsed.hold_duration_secs) || DEFAULT_CONFIG.hold_duration_secs)
        ),
      };
    }
  } catch {
    next = DEFAULT_CONFIG;
  }

  // Built-in rhythm: a 20 s pause after every game, always on.
  next = {
    ...next,
    cooldown_enabled: true,
    cooldown_every_n_batches: 1,
    cooldown_seconds: 20,
  };

  // Move the old 185 s default to the new 3 min default once.
  try {
    if (window.localStorage.getItem(HOLD_MIGRATION_KEY) !== '1') {
      if (next.hold_duration_secs === 185) {
        next = { ...next, hold_duration_secs: 180 };
      }
      window.localStorage.setItem(HOLD_MIGRATION_KEY, '1');
    }
  } catch {
    // storage unavailable: keep the in-memory defaults
  }

  // Already spoofed games must never run again by accident: turn the history
  // filter back on once for installs where it was switched off.
  try {
    if (window.localStorage.getItem(HISTORY_MIGRATION_KEY) !== '1') {
      next = { ...next, skip_previously_spoofed: true };
      // Persist the repaired config right away so this is idempotent even if
      // the initializer runs twice (React StrictMode in development).
      window.localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
      window.localStorage.setItem(HISTORY_MIGRATION_KEY, '1');
    }
  } catch {
    // storage unavailable: keep the in-memory defaults
  }

  return next;
}

export const App: React.FC = () => {
  const { u } = useUi();
  const [tab, setTab] = useState<Tab>('overview');
  const [config, setConfig] = useState<SpooferConfig>(readConfig);
  const [runKind, setRunKind] = useState<'games' | 'hours' | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const [games, setGames] = useState<SpoofableGameItem[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);

  const {
    status,
    errorMessage,
    tickData,
    logs,
    totalDatabaseGames,
    processGamesCount,
    historyCount,
    historyProcessCount,
    historyGames,
    isFetchingDatabase,
    actions,
  } = useSpooferEvents();

  const {
    isRunning: isDiscordRunning,
    isChecking: isCheckingDiscord,
    refetch: recheckDiscord,
  } = useDiscordStatus(6000);

  // Remember the run settings between launches.
  useEffect(() => {
    try {
      window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      window.localStorage.removeItem(LEGACY_CONFIG_KEY);
    } catch {
      // storage unavailable: settings last for this session only
    }
  }, [config]);

  const loadGames = useCallback(async () => {
    setIsLoadingGames(true);
    try {
      const list = await tauriApi.getGamesList();
      setGames(list);
    } catch {
      // browser preview / IPC not ready
    } finally {
      setIsLoadingGames(false);
    }
  }, []);

  // Load the cached database first, then hydrate the full game list.
  useEffect(() => {
    void (async () => {
      await actions.fetchGames();
      await loadGames();
      // History rows need the game database for names and icons.
      await actions.refreshHistory();
    })();
    // Intentionally runs once: actions are recreated on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshDatabase = useCallback(() => {
    void actions.fetchGames(true).then(async () => {
      await loadGames();
      await actions.refreshHistory();
    });
  }, [actions, loadGames]);

  const updateConfig = useCallback((patch: Partial<SpooferConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const effectiveConfig = useMemo<SpooferConfig>(
    () => ({
      ...config,
      // Only native process emulation is supported: no beta/RPC modes.
      spoof_mode: 'process_only',
      // Single-stream farm: the batch control was removed from the UI.
      batch_size: 1,
    }),
    [config]
  );

  const historyIds = useMemo(() => new Set(historyGames.map((game) => game.id)), [historyGames]);
  const isHistoryGame = useCallback((id: string) => historyIds.has(id), [historyIds]);

  const startGames = useCallback(() => {
    setRunKind('games');
    setTab('overview');
    // Explicitly clear the hours-farm fields: a games run is never a farm, so
    // the history filter always applies and every finished game is recorded.
    void actions.start({ ...effectiveConfig, farm_game_ids: [], farm_duration_secs: null });
  }, [actions, effectiveConfig]);

  const startHours = useCallback(
    (ids: string[], durationSecs: number | null) => {
      setRunKind('hours');
      setTab('overview');
      void actions.start({
        ...effectiveConfig,
        farm_game_ids: ids,
        farm_duration_secs: durationSecs,
      });
    },
    [actions, effectiveConfig]
  );

  const requestStop = useCallback(() => setConfirmStop(true), []);

  const confirmStopRun = useCallback(() => {
    setConfirmStop(false);
    void actions.stop();
  }, [actions]);

  const view = (() => {
    switch (tab) {
      case 'overview':
        return (
          <OverviewView
            status={status}
            errorMessage={errorMessage}
            tick={tickData}
            config={effectiveConfig}
            runKind={runKind}
            historyCount={historyCount}
            discordRunning={isDiscordRunning}
            onStart={startGames}
            onStop={requestStop}
          />
        );
      case 'games':
        return (
          <GamesFarmView
            config={effectiveConfig}
            onConfigChange={updateConfig}
            status={status}
            tick={tickData}
            processGamesCount={processGamesCount}
            historyProcessCount={historyProcessCount}
            onStart={startGames}
            onStop={requestStop}
          />
        );
      case 'hours':
        return (
          <HoursFarmView
            games={games}
            isFetchingGames={isLoadingGames || isFetchingDatabase}
            status={status}
            tick={tickData}
            isHoursRun={runKind === 'hours'}
            excludeAdult={Boolean(config.exclude_adult)}
            onStart={startHours}
            onStop={requestStop}
          />
        );
      case 'history':
        return (
          <HistoryView
            games={historyGames}
            historyCount={historyCount}
            historyProcessCount={historyProcessCount}
            onRemove={actions.removeHistoryEntries}
            onClear={actions.clearHistory}
          />
        );
      case 'database':
        return (
          <DatabaseView
            games={games}
            isFetching={isFetchingDatabase || isLoadingGames}
            totalCount={totalDatabaseGames}
            processCount={processGamesCount}
            onRefresh={refreshDatabase}
            isHistoryGame={isHistoryGame}
            onOpenHistory={() => setTab('history')}
          />
        );
      case 'console':
        return <ConsoleView logs={logs} onClear={actions.clearLogs} />;
      case 'docs':
        return <DocumentationView />;
      case 'status':
        return (
          <div className="h-full">
            <FakeStatusView
              excludeAdult={Boolean(config.exclude_adult)}
              isFetching={isFetchingDatabase}
            />
          </div>
        );
      default:
        return null;
    }
  })();

  return (
    <div className="relative flex h-screen w-screen select-none flex-col overflow-hidden bg-background font-sans text-foreground">
      <div className="app-bg" aria-hidden />

      <TitleBar />

      <div className="relative z-10 flex min-h-0 flex-1">
        <Sidebar
          activeTab={tab}
          onTabChange={setTab}
          discordRunning={isDiscordRunning}
          isCheckingDiscord={isCheckingDiscord}
          onCheckDiscord={() => void recheckDiscord()}
          historyCount={historyCount}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            tab={tab}
            status={status}
            discordRunning={isDiscordRunning}
            isCheckingDiscord={isCheckingDiscord}
            onCheckDiscord={() => void recheckDiscord()}
          />

          <main className="min-h-0 flex-1 overflow-hidden px-6 pb-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                className="h-full"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
              >
                {view}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <ConfirmDialog
        open={confirmStop}
        title={u('stop.confirmTitle')}
        message={u('stop.confirmMessage')}
        confirmLabel={u('stop.confirmAction')}
        cancelLabel={u('stop.cancel')}
        onConfirm={confirmStopRun}
        onCancel={() => setConfirmStop(false)}
      />
    </div>
  );
};

export default App;
