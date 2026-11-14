import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  Clock3,
  Gamepad2,
  History,
  Infinity as InfinityIcon,
  Play,
  Plus,
  Search,
  Square,
  Timer,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUi } from '@/i18n/ui';
import { formatClock, formatDuration, percent } from '@/lib/format';
import {
  Badge,
  Card,
  EmptyState,
  GameIcon,
  SectionLabel,
  Segmented,
  SearchInput,
} from '@/components/ui/kit';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import type { SpooferStatus, SpooferTickEvent, SpoofableGameItem } from '@/types/spoofer';

const MAX_FARM = 1;

const DURATIONS: Array<{ value: number | null; key: 'hf.untilStopped' | 'hf.d1' | 'hf.d2' | 'hf.d4' | 'hf.d8' | 'hf.d12' | 'hf.d24' }> = [
  { value: null, key: 'hf.untilStopped' },
  { value: 3600, key: 'hf.d1' },
  { value: 7200, key: 'hf.d2' },
  { value: 14400, key: 'hf.d4' },
  { value: 28800, key: 'hf.d8' },
  { value: 43200, key: 'hf.d12' },
  { value: 86400, key: 'hf.d24' },
];

interface HoursFarmViewProps {
  games: SpoofableGameItem[];
  isFetchingGames: boolean;
  status: SpooferStatus;
  tick: SpooferTickEvent;
  isHoursRun: boolean;
  excludeAdult: boolean;
  onStart: (ids: string[], durationSecs: number | null) => void;
  onStop: () => void;
}

export const HoursFarmView: React.FC<HoursFarmViewProps> = ({
  games,
  isFetchingGames,
  status,
  tick,
  isHoursRun,
  excludeAdult,
  onStart,
  onStop,
}) => {
  const { u, language } = useUi();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [duration, setDuration] = useState<number | null>(null);

  const active = status === 'running' || status === 'paused';
  const live = active && isHoursRun;

  const byId = useMemo(() => {
    const map = new Map<string, SpoofableGameItem>();
    for (const game of games) map.set(game.id, game);
    return map;
  }, [games]);

  const selectedGames = useMemo(
    () => selected.map((id) => byId.get(id)).filter((game): game is SpoofableGameItem => Boolean(game)),
    [selected, byId]
  );

  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = games.filter((game) => {
      if (excludeAdult && game.adult) return false;
      if (!query) return true;
      return (
        game.name.toLowerCase().includes(query) ||
        game.id.includes(query) ||
        (game.rel_path ?? '').toLowerCase().includes(query)
      );
    });
    return list.slice(0, 120);
  }, [games, search, excludeAdult]);

  const toggleGame = (game: SpoofableGameItem) => {
    setSelected((prev) => (prev.includes(game.id) ? [] : [game.id]));
  };

  const farmTotal = tick.hold_total_secs ?? 0;
  const remainingSecs = live && farmTotal > 0 ? Math.max(0, farmTotal - tick.elapsed_secs) : 0;
  const livePct = live ? (farmTotal > 0 ? percent(tick.elapsed_secs, farmTotal) : 0) : 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 pt-4">
      {live && (
        <Card className="shrink-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10">
                <Timer className="h-5 w-5 text-accent-light" />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-mint" />
              </div>
              <div>
                <SectionLabel>{u('hf.activeTitle')}</SectionLabel>
                <p className="text-lg font-semibold text-white">
                  {u('ov.sessionElapsed')} · {formatClock(tick.elapsed_secs)}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.16em] text-faint">{u('hf.left')}</p>
              <p className="num font-mono text-lg font-semibold text-accent-soft">
                {farmTotal > 0 ? formatClock(remainingSecs) : '∞'}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Progress value={livePct} active={status === 'running'} tone="amber" />
            <div className="flex flex-wrap gap-2">
              {tick.active_batch.map((game) => (
                <span
                  key={game.id}
                  className="flex items-center gap-2 rounded-full border border-border bg-surface-300/60 py-1 pl-1 pr-3"
                >
                  <GameIcon game={game} size={22} />
                  <span className="max-w-[160px] truncate text-[11px] text-foreground/85">{game.name}</span>
                  <span className="num font-mono text-[10px] text-faint">{formatClock(tick.elapsed_secs)}</span>
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
        {/* Selection */}
        <Card className="col-span-12 flex min-h-0 flex-col lg:col-span-5">
          <div className="flex shrink-0 items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-accent-light" />
              <h2 className="text-sm font-semibold text-white">{u('hf.selectedTitle')}</h2>
            </div>
            <Badge tone={selected.length > 0 ? 'accent' : 'neutral'}>
              {u('hf.selectedHint', { count: selected.length, max: MAX_FARM })}
            </Badge>
          </div>

          <div className="rule-t rule-b mt-3 min-h-0 flex-1 overflow-y-auto pb-2 pr-1 pt-2">
            {selectedGames.length === 0 ? (
              <EmptyState
                compact
                icon={<Gamepad2 className="h-4 w-4" />}
                title={u('hf.emptySelection')}
                className="h-full"
              />
            ) : (
              <div className="space-y-1.5">
                {selectedGames.map((game) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                    className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-300/40 px-2.5 py-2"
                  >
                    <GameIcon game={game} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-foreground/90">{game.name}</p>
                      <p className="truncate text-[10px] text-faint">{game.rel_path || game.id}</p>
                    </div>
                    {game.adult && <Badge tone="rose">18+</Badge>}
                    <button
                      type="button"
                      onClick={() => toggleGame(game)}
                      className="rounded-lg p-1 text-faint transition-colors hover:bg-rose/10 hover:text-rose"
                      title={u('hf.remove')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 shrink-0">
            <div className="flex items-baseline justify-between">
              <SectionLabel>{u('hf.durationTitle')}</SectionLabel>
              <span className="text-[11px] text-faint">
                {duration ? formatDuration(duration, language) : u('hf.noTime')}
              </span>
            </div>
            <Segmented<string>
              className="mt-2 grid grid-cols-4"
              size="sm"
              value={duration === null ? 'inf' : String(duration)}
              disabled={live}
              onChange={(value) => setDuration(value === 'inf' ? null : Number(value))}
              options={DURATIONS.map((item) => ({
                value: item.value === null ? 'inf' : String(item.value),
                label:
                  item.value === null ? (
                    <InfinityIcon className="mx-auto h-3.5 w-3.5" strokeWidth={2.2} />
                  ) : (
                    u(item.key)
                  ),
                title: item.value === null ? u(item.key) : undefined,
              }))}
            />
            <p className="mt-1.5 text-[11px] text-faint">{u('hf.durationHint')}</p>
          </div>

          <div className="mt-4 shrink-0">
            {active ? (
              <Button variant="secondary" className="w-full" onClick={onStop}>
                <Square className="h-3.5 w-3.5 fill-current" />
                {u('common.finish')}
              </Button>
            ) : (
              <Button
                className="w-full"
                disabled={selected.length === 0}
                onClick={() => onStart(selected, duration)}
              >
                <Play className="h-4 w-4 fill-current" />
                {selected.length === 0 ? u('hf.startHint') : u('hf.start')}
              </Button>
            )}
            {active && !live && (
              <p className="mt-2 rounded-lg border border-amber/20 bg-amber/[0.06] px-2.5 py-1.5 text-[11px] text-amber/90">
                {u('hf.busy')}
              </p>
            )}
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-faint">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber/70" />
              {u('hf.warn')}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-faint/80">{u('hf.cost')}</p>
          </div>
        </Card>

        {/* Database picker */}
        <Card className="col-span-12 flex min-h-0 flex-col lg:col-span-7">
          <div className="flex shrink-0 items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-accent-light" />
              <h2 className="text-sm font-semibold text-white">{u('hf.listTitle')}</h2>
            </div>
            <span className="num text-[11px] text-faint">{games.length}</span>
          </div>

          <SearchInput
            className="mt-3 shrink-0"
            value={search}
            onChange={setSearch}
            placeholder={u('hf.search')}
            icon={<Search className="h-4 w-4" />}
          />

          <div className="rule-t rule-b mt-3 min-h-0 flex-1 overflow-y-auto pb-2 pr-1 pt-2">
            {isFetchingGames && games.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[12px] text-faint">
                {u('common.loading')}
              </div>
            ) : results.length === 0 ? (
              <EmptyState compact icon={<Search className="h-4 w-4" />} title={u('hf.searchEmpty')} />
            ) : (
              <div className="space-y-1">
                {results.map((game) => {
                  const isSelected = selected.includes(game.id);

                  return (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => toggleGame(game)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition-all duration-200',
                        isSelected
                          ? 'border-accent/30 bg-accent/[0.08]'
                          : 'border-transparent hover:border-white/[0.07] hover:bg-white/[0.03]'
                      )}
                    >
                      <GameIcon game={game} size={30} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-foreground/90">{game.name}</p>
                        <p className="truncate text-[10px] text-faint">{game.rel_path || game.id}</p>
                      </div>
                      {game.adult && <Badge tone="rose">18+</Badge>}
                      <Badge tone={game.method === 'rpc' ? 'discord' : 'neutral'}>
                        {game.method === 'rpc' ? 'RPC' : 'EXE'}
                      </Badge>
                      <span
                        className={cn(
                          'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border',
                          isSelected
                            ? 'border-accent/40 bg-accent text-white'
                            : 'border-border bg-white/[0.03] text-faint'
                        )}
                      >
                        {isSelected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
