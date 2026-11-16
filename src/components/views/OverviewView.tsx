import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Gamepad2,
  Hourglass,
  Layers,
  ListChecks,
  Square,
  Timer,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUi } from '@/i18n/ui';
import { formatClock, formatDuration, formatHold, percent } from '@/lib/format';
import { Badge, Card, EmptyState, GameIcon, SectionLabel, StatTile } from '@/components/ui/kit';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { TimerRing } from '@/components/ui/TimerRing';
import type { SpooferConfig, SpooferStatus, SpooferTickEvent } from '@/types/spoofer';

interface OverviewViewProps {
  status: SpooferStatus;
  errorMessage: string | null;
  tick: SpooferTickEvent;
  config: SpooferConfig;
  runKind: 'games' | 'hours' | null;
  historyCount: number;
  discordRunning: boolean | null;
  onStop: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  status,
  errorMessage,
  tick,
  config,
  runKind,
  historyCount,
  discordRunning,
  onStop,
}) => {
  const { u, language } = useUi();
  const phase = tick.phase ?? 'idle';
  const active = status === 'running' || status === 'paused';

  const holdTotal = tick.hold_total_secs ?? 0;
  const holdRemaining = tick.hold_remaining_secs ?? 0;
  const cooldownRemaining = tick.cooldown_remaining_secs ?? 0;
  // Millisecond values come from the backend deadlines, so the ring can land on
  // the exact remaining time after a hidden window instead of a whole second.
  const holdRemainingMs = tick.hold_remaining_ms ?? holdRemaining * 1000;
  const cooldownRemainingMs = tick.cooldown_remaining_ms ?? cooldownRemaining * 1000;

  const isCooldown = phase === 'cooldown' && active;
  const isFarm = phase === 'farm' && active;
  const isHold = phase === 'hold' && active;

  const ringTotal = isCooldown ? config.cooldown_seconds : holdTotal;
  const ringRemaining = isCooldown ? cooldownRemaining : holdRemaining;
  const ringRemainingMs = isCooldown ? cooldownRemainingMs : holdRemainingMs;
  // The timer ring reports the digits it draws; red switches on the same
  // second those digits read 00:30.
  const [ringSecs, setRingSecs] = useState(0);
  const dangerAt = ringTotal > 60 ? 30 : Math.max(5, Math.floor(ringTotal / 2));
  const danger =
    active &&
    status !== 'paused' &&
    !isFarm &&
    !isCooldown &&
    ringTotal > 0 &&
    ringSecs <= dangerAt;

  const headline = !active
    ? status === 'finished'
      ? u('ov.finished')
      : u('ov.idleTitle')
    : status === 'paused'
      ? u('ov.paused')
      : isCooldown
        ? u('ov.cooldown')
        : isFarm
          ? u('ov.farm')
          : u('ov.holdLeft');

  const caption = status === 'paused'
    ? u('ov.pausedCaption')
    : isCooldown
      ? u('ov.cooldownCaption')
      : isFarm
        ? u('ov.farmCaption')
        : isHold
          ? u('ov.holdCaption')
          : status === 'finished'
            ? u('ov.finishedCaption')
            : u('ov.idleCaption');

  const done = tick.current_index;
  const total = tick.total_games;
  const pct = percent(done, total);
  const nextGame = tick.next_batch?.[0];
  const poolRemaining =
    tick.pool_remaining && tick.pool_remaining > 0
      ? tick.pool_remaining
      : Math.max(0, total - done);

  const sessionProgress = isFarm && holdTotal > 0
    ? percent(tick.elapsed_secs, holdTotal)
    : pct;

  return (
    <div className="h-full -mr-2 space-y-4 overflow-y-auto overflow-x-hidden pb-8 pt-4 rule-b">
      {errorMessage && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose/25 bg-rose/[0.08] px-4 py-3 text-[12px] text-rose">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {discordRunning === false && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber/25 bg-amber/[0.07] px-4 py-3">
          <WifiOff className="h-4 w-4 flex-shrink-0 text-amber" />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-amber">{u('ov.discordOff')}</p>
            <p className="text-[11px] text-amber/70">{u('ov.discordOffHint')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* Hero */}
        <Card className="col-span-12 flex flex-col items-center gap-6 p-6 lg:col-span-8 lg:flex-row lg:items-center lg:gap-7">
          <TimerRing
            remaining={ringRemaining}
            remainingMs={ringRemainingMs}
            total={ringTotal}
            elapsed={tick.elapsed_secs}
            onClock={setRingSecs}
            paused={status === 'paused'}
            cooldown={isCooldown}
            caption={caption}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={active ? (danger ? 'rose' : 'accent') : 'neutral'}>
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    active ? (danger ? 'bg-rose' : 'bg-accent-light') : 'bg-faint'
                  )}
                />
                {u(status === 'running' ? 'run.running' : status === 'paused' ? 'run.paused' : 'run.idle')}
              </Badge>
              {isFarm && <Badge tone="amber">{u('ov.modeHours')}</Badge>}
              {historyCount > 0 && <Badge tone="mint">{u('ov.gamesDone', { count: historyCount })}</Badge>}
            </div>

            <h2 className="mt-3 text-[26px] font-semibold leading-tight tracking-tight text-white">
              {headline}
            </h2>

            {active && !isFarm && total > 0 && (
              <p className="mt-1 text-[12px] text-muted">
                {u('ov.progressGames', { done, total })}
              </p>
            )}

            {status === 'idle' && (
              <p className="mt-1 max-w-md text-[12px] leading-relaxed text-muted">{u('ov.idleHint')}</p>
            )}

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-faint">{isFarm ? u('ov.sessionElapsed') : u('ov.progress')}</span>
                <span className="num font-mono text-foreground/80">
                  {isFarm
                    ? holdTotal > 0
                      ? `${formatClock(tick.elapsed_secs)} / ${formatClock(holdTotal)}`
                      : formatClock(tick.elapsed_secs)
                    : `${Math.round(pct)}%`}
                </span>
              </div>
              <Progress
                value={sessionProgress}
                active={status === 'running'}
                tone="accent"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {active && (
                <Button variant="secondary" onClick={onStop} className="px-4">
                  <Square className="h-3 w-3 fill-current" />
                  {u('common.finish')}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Session summary */}
        <Card className="col-span-12 flex flex-col lg:col-span-4">
          <div className="flex items-center justify-between">
            <SectionLabel>{u('ov.runMode')}</SectionLabel>
            <Layers className="h-4 w-4 text-faint" />
          </div>
          <p className="mt-1.5 text-lg font-semibold text-white">
            {runKind === 'hours' ? u('ov.modeHours') : runKind === 'games' ? u('ov.modeGames') : u('ov.modeNone')}
          </p>

          <div className="mt-4 space-y-2.5 text-[12px]">
            <Row label={u('gf.holdTitle')} value={formatHold(config.hold_duration_secs, language)} />
            <Row
              label={u('ov.eta')}
              value={
                active && !isFarm ? formatDuration(tick.estimated_remaining_secs, language) : '—'
              }
              accent
            />
            <Row label={u('ov.pool')} value={`${poolRemaining}`} />
            <Row
              label={u('nav.history')}
              value={`${historyCount}`}
              icon={<ListChecks className="h-3 w-3" />}
            />
          </div>

          <div className="mt-4 rounded-xl border border-border bg-surface-300/50 p-3">
            <div className="flex items-center justify-between">
              <SectionLabel>{u('ov.succeeded')}</SectionLabel>
              <span className="num font-mono text-[11px] text-mint">{tick.succeeded_count ?? 0}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <SectionLabel>{u('ov.failed')}</SectionLabel>
              <span className="num font-mono text-[11px] text-rose">{tick.failed_count ?? 0}</span>
            </div>
          </div>

          <div className="mt-auto pt-4">
            <div className="flex items-center justify-between text-[11px] text-faint">
              <span>{u('ov.batchElapsed')}</span>
              <span className="num font-mono">{formatClock(tick.elapsed_secs)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={u('ov.done')}
          value={
            isFarm ? `${tick.active_batch.length}` : `${done}`
          }
          hint={isFarm ? u('hf.activeTitle') : u('ov.progressGames', { done, total: total || '—' })}
          tone="accent"
          icon={<Gamepad2 className="h-4 w-4" />}
        />
        <StatTile
          label={u('ov.succeeded')}
          value={tick.succeeded_count ?? 0}
          hint={u('ov.gamesDone', { count: historyCount })}
          tone="mint"
          icon={<ListChecks className="h-4 w-4" />}
        />
        <StatTile
          label={u('ov.failed')}
          value={tick.failed_count ?? 0}
          hint={u('ov.errorsHint')}
          tone="rose"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatTile
          label={u('ov.eta')}
          value={active ? formatDuration(tick.estimated_remaining_secs, language) : '—'}
          hint={active ? u('gf.estimateHint') : u('ov.idleCaption')}
          tone="amber"
          icon={<Timer className="h-4 w-4" />}
        />
      </div>

      {/* Active + next batch */}
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SectionLabel>{u('ov.activeTitle')}</SectionLabel>
              <span className="num rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-muted">
                {tick.active_batch.length}
              </span>
            </div>
            {active && status === 'running' && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-mint">
                <span className="h-1.5 w-1.5 rounded-full bg-mint" /> live
              </span>
            )}
          </div>

          {tick.active_batch.length === 0 ? (
            <EmptyState
              compact
              icon={<Gamepad2 className="h-4 w-4" />}
              title={u('ov.activeEmpty')}
              className="mt-3"
            />
          ) : (
            <div className="mt-3 space-y-1.5">
              {tick.active_batch.slice(0, 8).map((game) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-xl border border-transparent px-2 py-1.5 transition-colors hover:border-white/[0.06] hover:bg-white/[0.03]"
                >
                  <GameIcon game={game} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-foreground/90">{game.name}</p>
                    <p className="truncate text-[10px] text-faint">
                      {game.executable || game.id}
                    </p>
                  </div>
                  <Badge tone={game.method === 'rpc' ? 'discord' : 'accent'}>
                    {game.method === 'rpc' ? 'RPC' : 'EXE'}
                  </Badge>
                  <span className="num font-mono text-[11px] text-muted">
                    {formatClock(tick.elapsed_secs)}
                  </span>
                </motion.div>
              ))}
              {tick.active_batch.length > 8 && (
                <p className="px-2 pt-1 text-[11px] text-faint">
                  {u('common.more', { count: tick.active_batch.length - 8 })}
                </p>
              )}
            </div>
          )}
        </Card>

        <Card className="col-span-12 lg:col-span-6">
          <div className="flex items-center justify-between">
            <SectionLabel>{u('ov.nextTitle')}</SectionLabel>
            {active && ringTotal > 0 && (
              <span className="num rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[10px] text-accent-soft">
                {u('ov.nextIn', { time: formatClock(ringRemaining) })}
              </span>
            )}
          </div>

          {!nextGame ? (
            <EmptyState
              compact
              icon={<Hourglass className="h-4 w-4" />}
              title={u('ov.nextEmpty')}
              className="mt-3"
            />
          ) : (
            <div className="mt-3 space-y-1.5">
              {(tick.next_batch ?? []).slice(0, 8).map((game, index) => (
                <div
                  key={`${game.id}-${index}`}
                  className="flex items-center gap-3 rounded-xl border border-transparent px-2 py-1.5 transition-colors hover:border-white/[0.06] hover:bg-white/[0.03]"
                >
                  <span className="num w-4 text-center font-mono text-[10px] text-faint">
                    {index + 1}
                  </span>
                  <GameIcon game={game} size={30} />
                  <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground/90">
                    {game.name}
                  </p>
                  <Badge tone={game.method === 'rpc' ? 'discord' : 'accent'}>
                    {game.method === 'rpc' ? 'RPC' : 'EXE'}
                  </Badge>
                </div>
              ))}
              {(tick.next_batch?.length ?? 0) > 8 && (
                <p className="px-2 pt-1 text-[11px] text-faint">
                  {u('common.more', { count: (tick.next_batch?.length ?? 0) - 8 })}
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

const Row: React.FC<{
  label: React.ReactNode;
  value: React.ReactNode;
  accent?: boolean;
  icon?: React.ReactNode;
}> = ({ label, value, accent, icon }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="flex items-center gap-1.5 text-faint">
      {icon}
      {label}
    </span>
    <span className={cn('num font-mono text-[12px]', accent ? 'text-accent-soft' : 'text-foreground/85')}>
      {value}
    </span>
  </div>
);
