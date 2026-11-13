import React from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUi, type UIKey } from '@/i18n/ui';
import type { SpooferStatus } from '@/types/spoofer';
import type { Tab } from '@/components/Sidebar';

const SUBTITLES: Record<Tab, UIKey> = {
  overview: 'top.sub.overview',
  games: 'top.sub.games',
  hours: 'top.sub.hours',
  history: 'top.sub.history',
  database: 'top.sub.database',
  status: 'top.sub.status',
  console: 'top.sub.console',
  docs: 'top.sub.docs',
};

const TITLES: Record<Tab, UIKey> = {
  overview: 'nav.overview',
  games: 'nav.games',
  hours: 'nav.hours',
  history: 'nav.history',
  database: 'nav.database',
  status: 'nav.status',
  console: 'nav.console',
  docs: 'nav.docs',
};

const STATUS_META: Record<SpooferStatus, { key: UIKey; dot: string; text: string }> = {
  idle: { key: 'run.idle', dot: 'bg-faint', text: 'text-muted' },
  running: { key: 'run.running', dot: 'bg-mint', text: 'text-mint' },
  paused: { key: 'run.paused', dot: 'bg-amber', text: 'text-amber' },
  finished: { key: 'run.finished', dot: 'bg-accent-light', text: 'text-accent-soft' },
  error: { key: 'run.error', dot: 'bg-rose', text: 'text-rose' },
};

interface TopBarProps {
  tab: Tab;
  status: SpooferStatus;
  discordRunning: boolean | null;
  isCheckingDiscord: boolean;
  onCheckDiscord: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  tab,
  status,
  discordRunning,
  isCheckingDiscord,
  onCheckDiscord,
}) => {
  const { u } = useUi();
  const meta = STATUS_META[status];

  return (
    <div className="relative z-10 flex-shrink-0 px-6 pt-3">
      <header className="flex items-center justify-between gap-5 rounded-xl border border-white/[0.07] bg-[#141519]/55 px-4 py-2 backdrop-blur-xl">
        <div className="min-w-0">
          <h1 className="truncate text-[15.5px] font-semibold leading-tight tracking-tight text-white">
            {u(TITLES[tab])}
          </h1>
          <p className="truncate text-[10.5px] leading-tight text-muted">{u(SUBTITLES[tab])}</p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {/* Live run state */}
          <div className="hidden items-center gap-1.5 rounded-md border border-border bg-white/[0.03] px-2 py-0.5 md:flex">
            <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
            <span className={cn('text-[10.5px] font-semibold', meta.text)}>{u(meta.key)}</span>
          </div>

          {/* Discord */}
          <button
            type="button"
            onClick={onCheckDiscord}
            title={u('s.check')}
            className={cn(
              'flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10.5px] font-medium transition-colors duration-150',
              discordRunning
                ? 'border-mint/25 bg-mint/[0.08] text-mint hover:bg-mint/[0.14]'
                : 'border-rose/25 bg-rose/[0.08] text-rose hover:bg-rose/[0.14]'
            )}
          >
            {discordRunning ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            <span className="hidden sm:inline">
              {discordRunning === null ? u('top.discordChecking') : discordRunning ? u('top.discordOn') : u('top.discordOff')}
            </span>
            <RefreshCw className={cn('h-2.5 w-2.5 opacity-60', isCheckingDiscord && 'animate-spin')} />
          </button>
        </div>
      </header>
      <div className="mt-2.5 h-0.5 rounded-full bg-white/[0.08]" aria-hidden />
    </div>
  );
};