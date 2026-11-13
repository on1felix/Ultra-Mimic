import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type {
  SpooferConfig,
  SpooferTickEvent,
  SpooferLogEvent,
  SpooferStatusEvent,
  FetchProgressEvent,
  SpoofableGameItem,
  FetchGamesResponse,
  SpooferStateResponse,
  FakeStatusConfig,
  HistoryGame,
  StorageInfo,
} from '@/types/spoofer';

export const isTauriRuntime = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const tauriApi = {
  // Commands
  startSpoofer: (config: SpooferConfig): Promise<void> => {
    return invoke('start_spoofer', { config });
  },

  pauseSpoofer: (): Promise<void> => {
    return invoke('pause_spoofer');
  },

  resumeSpoofer: (): Promise<void> => {
    return invoke('resume_spoofer');
  },

  stopSpoofer: (): Promise<void> => {
    return invoke('stop_spoofer');
  },

  // force skips the cached copy and asks Discord for a fresh database
  fetchGames: (force = false): Promise<FetchGamesResponse> => {
    return invoke('fetch_games', { force });
  },

  getGamesList: (): Promise<SpoofableGameItem[]> => {
    return invoke('get_games_list');
  },

  checkDiscordRunning: (): Promise<boolean> => {
    return invoke('check_discord_status');
  },

  clearHistory: (): Promise<void> => {
    return invoke('clear_history');
  },

  /** Already farmed games with names and icons, newest logic on the Rust side. */
  getHistoryGames: (): Promise<HistoryGame[]> => {
    if (!isTauriRuntime()) return Promise.resolve([]);
    return invoke('get_history_games');
  },

  /** Puts the games back into the pool so they can be farmed again. */
  removeHistoryEntries: (ids: string[]): Promise<number> => {
    return invoke('remove_history_entries', { ids });
  },

  // Storage hygiene: one data folder, re-downloadable cache only
  getStorageInfo: (): Promise<StorageInfo> => {
    if (!isTauriRuntime()) {
      return Promise.resolve({
        data_dir: '%APPDATA%\\Ultra Mimic',
        total_bytes: 0,
        cache_bytes: 0,
        history_bytes: 0,
        webview_bytes: 0,
      });
    }
    return invoke('get_storage_info');
  },

  clearAppCache: (): Promise<number> => {
    return invoke('clear_app_cache');
  },

  openDataFolder: (): Promise<void> => {
    return invoke('open_data_folder');
  },

  exportHistory: (): Promise<string> => {
    return invoke('export_history');
  },

  importHistory: (jsonData: string): Promise<number> => {
    return invoke('import_history', { jsonData });
  },

  getSpooferState: (): Promise<SpooferStateResponse> => {
    return invoke('get_spoofer_state');
  },

  // Fake status: one custom activity, independent of the spoofer run
  startFakeStatus: (config: FakeStatusConfig): Promise<void> => {
    return invoke('start_fake_status', { config });
  },

  stopFakeStatus: (): Promise<void> => {
    return invoke('stop_fake_status');
  },

  getFakeStatus: (): Promise<boolean> => {
    if (!isTauriRuntime()) return Promise.resolve(false);
    return invoke('get_fake_status');
  },

  // Fires when Discord itself dropped the status (closed or restarted)
  onFakeStatusEnded: (cb: () => void): Promise<UnlistenFn> => {
    return listen('fake_status_ended', () => cb());
  },

  // Keeps the Rust-side runtime logs in the language picked in Settings
  setLanguage: (language: string): Promise<void> => {
    if (!isTauriRuntime()) return Promise.resolve();
    return invoke('set_language', { language });
  },

  // Opens a GitHub link in the system default browser
  openExternalUrl: async (url: string): Promise<void> => {
    if (isTauriRuntime()) {
      await invoke('open_external_url', { url });
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  // Event Listeners
  onTick: (cb: (payload: SpooferTickEvent) => void): Promise<UnlistenFn> => {
    return listen<SpooferTickEvent>('spoofer_tick', (e) => cb(e.payload));
  },

  // Backend logs carry no time; the UI stamps them with the PC's local time
  onLog: (cb: (payload: Omit<SpooferLogEvent, 'id' | 'timestamp'>) => void): Promise<UnlistenFn> => {
    return listen<Omit<SpooferLogEvent, 'id' | 'timestamp'>>('spoofer_log', (e) => cb(e.payload));
  },

  onStatus: (cb: (payload: SpooferStatusEvent) => void): Promise<UnlistenFn> => {
    return listen<SpooferStatusEvent>('spoofer_status', (e) => cb(e.payload));
  },

  onFetchProgress: (cb: (payload: FetchProgressEvent) => void): Promise<UnlistenFn> => {
    return listen<FetchProgressEvent>('fetch_progress', (e) => cb(e.payload));
  },
};
