import React, { useMemo } from 'react';
import {
  Coffee,
  EyeOff,
  Gauge,
  ListFilter,
  Play,
  SlidersHorizontal,
  Square,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUi } from '@/i18n/ui';
import { formatDuration, formatHold, percent } from '@/lib/format';
import {
  Badge,
  Card,
  Field,
  Segmented,
  Slider,
  Toggle,
} from '@/components/ui/kit';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import type { SpooferConfig, SpooferStatus, SpooferTickEvent } from '@/types/spoofer';

interface GamesFarmViewProps {
  config: SpooferConfig;
  onConfigChange: (patch: Partial<SpooferConfig>) => void;
  status: SpooferStatus;
  tick: SpooferTickEvent;
  /** Games the backend can actually pick: filters and history applied. */
  availableCount: number;
  onStart: () => void;
  onStop: () => void;
}

const HOLD_PRESETS = [
  { value: 15, key: 'gf.presetTurbo' },
  { value: 60, key: 'gf.preset1m' },
  { value: 180, key: 'gf.preset3m' },
  { value: 300, key: 'gf.preset5m' },
  { value: 3600, key: 'gf.preset1h' },
] as const;

const LIMIT_PRESETS: Array<number | null> = [1, 5, 10, 25, 100, null];

export const GamesFarmView: React.FC<GamesFarmViewProps> = ({
  config,
  onConfigChange,
  status,
  tick,
  availableCount,
  onStart,
  onStop,
}) => {
  const { u, language } = useUi();
  const locked = status === 'running' || status === 'paused';

  const available = Math.max(0, availableCount);
  const target = config.limit == null ? available : Math.min(config.limit, available);

  const estimate = useMemo(() => {
    const batches = target;
    const hold = config.hold_duration_secs;
    let seconds = batches * hold;
    if (config.cooldown_enabled && config.cooldown_every_n_batches > 0) {
      const pauses = Math.max(0, Math.ceil(batches / config.cooldown_every_n_batches) - 1);
      seconds += pauses * config.cooldown_seconds;
    }
    return { batches, seconds };
  }, [config, target]);

  const pct = percent(tick.current_index, tick.total_games);

  const holdStep = 30;

  const limitMatchesPreset = LIMIT_PRESETS.includes(config.limit ?? null);

  return (
    <div className="grid h-full -mr-2 grid-cols-12 content-start gap-4 overflow-y-auto overflow-x-hidden pb-8 pt-4 rule-b">
      {/* Main settings */}
      <Card className="col-span-12 lg:col-span-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-accent-light" />
            <h2 className="text-sm font-semibold text-white">{u('gf.title')}</h2>
          </div>
          <Badge tone={locked ? 'amber' : 'accent'}>
            {u(locked ? 'run.running' : 'run.idle')}
          </Badge>
        </div>

        {locked && (
          <p className="mt-2 rounded-lg border border-amber/20 bg-amber/[0.06] px-2.5 py-1.5 text-[11px] text-amber/90">
            {u('gf.runningNote')}
          </p>
        )}

        {/* Hold */}
        <div className="mt-5">
          <Field
            label={
              <span className="flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5 text-faint" />
                {u('gf.holdTitle')}
              </span>
            }
            hint={<span className="num font-mono text-accent-soft">{formatHold(config.hold_duration_secs, language)}</span>}
          >
            <Segmented<number>
              className="mt-1 grid grid-cols-5"
              size="sm"
              value={config.hold_duration_secs}
              disabled={locked}
              onChange={(value) => onConfigChange({ hold_duration_secs: value })}
              options={HOLD_PRESETS.map((preset) => ({
                value: preset.value,
                label: u(preset.key),
              }))}
            />

            <Slider
              min={15}
              max={3600}
              step={holdStep}
              value={config.hold_duration_secs}
              disabled={locked}
              label={u('gf.holdTitle')}
              onChange={(next) => onConfigChange({ hold_duration_secs: next })}
            />
            <p className="text-[11px] leading-relaxed text-faint">{u('gf.holdHint')}</p>
          </Field>
        </div>

        {/* Limit */}
        <div className="mt-5">
          <Field label={u('gf.limitTitle')} hint={u('gf.available', { count: available })}>
            <Segmented<string>
              className="mt-1 grid grid-cols-6"
              size="sm"
              value={config.limit === null || config.limit === undefined ? 'all' : String(config.limit)}
              disabled={locked}
              onChange={(value) => onConfigChange({ limit: value === 'all' ? null : Number(value) })}
              options={LIMIT_PRESETS.map((preset) => ({
                value: preset === null ? 'all' : String(preset),
                label: preset === null ? u('gf.limitAll') : String(preset),
              }))}
            />

            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={available}
                value={config.limit ?? ''}
                placeholder={u('gf.targetGames', { count: available })}
                disabled={locked || available === 0}
                onChange={(event) => {
                  const raw = event.target.value;
                  if (!raw) {
                    onConfigChange({ limit: null });
                    return;
                  }
                  const parsed = Number(raw);
                  if (Number.isFinite(parsed) && parsed > 0) {
                    onConfigChange({ limit: Math.floor(parsed) });
                  }
                }}
                className={cn(
                  'h-9 w-full rounded-lg border border-border bg-surface-300/70 px-3 text-[12px] text-foreground transition-colors placeholder:text-faint focus:border-accent/40 focus:outline-none',
                  !limitMatchesPreset && 'border-accent/30'
                )}
              />
              <span className="whitespace-nowrap text-[11px] text-faint">{u('gf.limitHint')}</span>
            </div>
            <p className="text-[11px] text-faint">{u('gf.availableHint')}</p>
          </Field>
        </div>
      </Card>

      {/* Filters + estimate */}
      <div className="col-span-12 space-y-4 lg:col-span-5">
        <Card>
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-accent-light" />
            <h2 className="text-sm font-semibold text-white">{u('gf.filtersTitle')}</h2>
          </div>

          <div className="mt-3 space-y-2">
            <div className="rounded-xl border border-border bg-white/[0.02] px-3">
              <Toggle
                checked={Boolean(config.exclude_adult)}
                onChange={(value) => onConfigChange({ exclude_adult: value })}
                label={
                  <span className="flex items-center gap-1.5">
                    <EyeOff className="h-3.5 w-3.5 text-faint" />
                    {u('gf.adult')}
                  </span>
                }
                hint={u('gf.adultHint')}
                disabled={locked}
              />
            </div>
          </div>
        </Card>

        {/* Estimate */}
        <Card>
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-accent-light" />
            <h2 className="text-sm font-semibold text-white">{u('gf.estimateTitle')}</h2>
          </div>

          <div className="mt-3 space-y-2.5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
                  {u('gf.estimateTotal')}
                </p>
                <p className="num mt-1 text-2xl font-semibold text-white">
                  {target > 0 ? formatDuration(estimate.seconds, language) : '—'}
                </p>
              </div>
              <Badge tone="accent">{u('gf.targetGames', { count: target })}</Badge>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-surface-300/50 px-3 py-2 text-[11px]">
              <span className="flex items-center gap-1.5 text-faint">
                <Coffee className="h-3.5 w-3.5" />
                {u('gf.estimateRuns', { batches: estimate.batches, games: target })}
              </span>
              <span className="num font-mono text-muted">{formatHold(config.hold_duration_secs, language)}</span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-surface-300/50 px-3 py-2 text-[11px]">
              <span className="flex items-center gap-1.5 text-faint">
                <Timer className="h-3.5 w-3.5" />
                {u('gf.builtinPause')}
              </span>
              <span className="num font-mono text-muted">{config.cooldown_seconds} s</span>
            </div>

            {target === 0 && (
              <p className="text-[11px] text-amber/90">
                {u('gf.tooFew', { count: available })}
              </p>
            )}

            {status === 'running' && tick.total_games > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-faint">
                  <span>{u('gf.everyBatch')}</span>
                  <span className="num font-mono">{Math.round(pct)}%</span>
                </div>
                <Progress value={pct} active tone="accent" height="sm" />
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            {status === 'idle' || status === 'finished' || status === 'error' ? (
              <Button className="flex-1" onClick={onStart} disabled={target === 0}>
                <Play className="h-4 w-4 fill-current" />
                {u('gf.start')}
              </Button>
            ) : (
              <Button variant="secondary" className="flex-1" onClick={onStop}>
                <Square className="h-3.5 w-3.5 fill-current" />
                {u('common.finish')}
              </Button>
            )}
          </div>

          {status === 'running' && (
            <p className="mt-2 text-center text-[11px] text-faint">
              {tick.current_index} / {tick.total_games} · {formatHold(config.hold_duration_secs, language)}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};
