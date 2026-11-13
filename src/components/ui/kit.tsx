import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { gameIconUrl } from '@/lib/format';

/* ------------------------------------------------------------------ Card */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Removes the default padding. */
  flush?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  flush = false,
  children,
  ...props
}) => (
  <div
    className={cn(
      'card card-hover',
      flush ? 'p-0' : 'p-4',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

/* ----------------------------------------------------------------- Badge */

type BadgeTone = 'neutral' | 'accent' | 'mint' | 'amber' | 'rose' | 'discord';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-white/[0.06] text-muted border-white/10',
  accent: 'bg-accent/15 text-accent-soft border-accent/30',
  mint: 'bg-mint/12 text-mint border-mint/25',
  amber: 'bg-amber/12 text-amber border-amber/25',
  rose: 'bg-rose/12 text-rose border-rose/25',
  discord: 'bg-discord/15 text-indigo-300 border-discord/30',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', className, children, ...props }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
      badgeTones[tone],
      className
    )}
    {...props}
  >
    {children}
  </span>
);

/* ------------------------------------------------------------- SectionLabel */

export const SectionLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <span
    className={cn(
      'text-[10px] font-semibold uppercase tracking-[0.2em] text-faint',
      className
    )}
  >
    {children}
  </span>
);

/* ----------------------------------------------------------------- Toggle */

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  hint,
  disabled,
  className,
}) => (
  <label
    className={cn(
      'flex cursor-pointer select-none items-center justify-between gap-4 rounded-xl border border-transparent px-1 py-2 transition-colors hover:border-white/[0.06] hover:bg-white/[0.02]',
      disabled && 'cursor-not-allowed opacity-50',
      className
    )}
  >
    <span className="min-w-0">
      <span className="block text-[13px] font-medium text-foreground/90">{label}</span>
      {hint && <span className="mt-0.5 block text-[11px] leading-relaxed text-faint">{hint}</span>}
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative h-6 w-11 flex-shrink-0 rounded-md border p-0.5 transition-[background-color,border-color,transform] duration-200 active:scale-[0.95]',
        checked
          ? 'border-accent/35 bg-accent/[0.1]'
          : 'border-white/[0.08] bg-white/[0.04]'
      )}
    >
      <motion.span
        initial={false}
        className={cn(
          'block h-full w-[18px] rounded-[5px] border-2 bg-black/20',
          checked ? 'border-accent/50' : 'border-white/15'
        )}
        animate={{ x: checked ? 22 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      />
    </button>
  </label>
);

/* -------------------------------------------------------------- Segmented */

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
  title?: string;
}

interface SegmentedProps<T extends string | number> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
  className,
  size = 'md',
}: SegmentedProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = options.findIndex((option) => option.value === value);

  // The highlight is one element that slides between the options, so the
  // selected cell is measured rather than redrawn on every change.
  const [pill, setPill] = useState({ x: 0, y: 0, width: 0, height: 0, ready: false });

  useEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const item = itemRefs.current[activeIndex];
      if (!container || !item) {
        setPill((prev) => (prev.ready ? { ...prev, ready: false } : prev));
        return;
      }
      setPill({
        x: item.offsetLeft,
        y: item.offsetTop,
        width: item.offsetWidth,
        height: item.offsetHeight,
        ready: true,
      });
    };

    measure();
    if (!containerRef.current) return;
    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [activeIndex, options.length, size]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative inline-flex w-full items-center gap-1 rounded-xl border border-border bg-surface-300/60 p-1',
        disabled && 'opacity-50',
        className
      )}
    >
      {pill.ready && (
        <motion.span
          className="pointer-events-none absolute left-0 top-0 rounded-lg bg-accent/[0.16] ring-1 ring-inset ring-accent/30"
          initial={false}
          animate={{ x: pill.x, y: pill.y, width: pill.width, height: pill.height }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        />
      )}

      {options.map((option, index) => {
        const active = option.value === value;
        const isDisabled = disabled || option.disabled;
        return (
          <button
            key={String(option.value)}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            type="button"
            title={option.title}
            disabled={isDisabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex-1 rounded-lg px-2 text-center font-medium transition-colors duration-150',
              size === 'sm' ? 'py-1 text-[11px]' : 'py-1.5 text-xs',
              active ? 'text-white' : 'text-muted hover:text-foreground',
              isDisabled && 'cursor-not-allowed'
            )}
          >
            <span className="whitespace-nowrap">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- Slider */

const SLIDER_THUMB = 32;

interface SliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

/**
 * Range control that follows the RU/EN switch language: a bordered track with
 * a sliding outlined thumb. Drag, click and arrow keys all update the value.
 */
export const Slider: React.FC<SliderProps> = ({
  min,
  max,
  step,
  value,
  onChange,
  disabled,
  className,
  label,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = trackRef.current;
    if (!element) return;
    const measure = () => setWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const ratio = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const travel = Math.max(0, width - 4 - SLIDER_THUMB);

  const clampValue = (next: number) => {
    if (next <= min) return min;
    const stepped = Math.round(next / step) * step;
    return Math.min(max, Math.max(min, Math.round(stepped * 1000) / 1000));
  };

  const commit = (clientX: number) => {
    const element = trackRef.current;
    if (!element || max <= min) return;
    const rect = element.getBoundingClientRect();
    const usable = rect.width - 4 - SLIDER_THUMB;
    const position = (clientX - rect.left - 2 - SLIDER_THUMB / 2) / Math.max(1, usable);
    onChange(clampValue(min + Math.min(1, Math.max(0, position)) * (max - min)));
  };

  const nudge = (delta: number) => {
    if (disabled) return;
    const raw = value === min && delta > 0 ? min + 1 : value + delta;
    onChange(clampValue(raw));
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      aria-disabled={disabled}
      onPointerDown={(event) => {
        if (disabled) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragging.current = true;
        commit(event.clientX);
      }}
      onPointerMove={(event) => {
        if (dragging.current) commit(event.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
          event.preventDefault();
          nudge(-step);
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
          event.preventDefault();
          nudge(step);
        } else if (event.key === 'Home') {
          event.preventDefault();
          onChange(clampValue(min));
        } else if (event.key === 'End') {
          event.preventDefault();
          onChange(clampValue(max));
        }
      }}
      className={cn(
        'focus-ring relative h-8 w-full touch-none select-none rounded-lg border border-white/[0.08] bg-white/[0.04] p-0.5 transition-colors',
        !disabled && 'cursor-pointer hover:border-white/[0.14] hover:bg-white/[0.055]',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <motion.span
        initial={false}
        animate={{ x: ratio * travel }}
        transition={{ type: 'spring', stiffness: 480, damping: 34 }}
        className="pointer-events-none absolute left-0.5 top-0.5 flex h-6 w-8 items-center justify-center rounded-[5px] border-2 border-accent/45 bg-[#1c1c22]"
      >
        <span className="h-1 w-3 rounded-full bg-accent/45" />
      </motion.span>
    </div>
  );
};

/* --------------------------------------------------------------- GameIcon */

interface GameIconProps {
  game: { id: string; name?: string; icon_hash?: string | null };
  size?: number;
  className?: string;
}

export const GameIcon: React.FC<GameIconProps> = ({ game, size = 36, className }) => {
  const [failed, setFailed] = useState(false);
  const url = failed ? null : gameIconUrl(game, Math.max(64, size * 2));
  const letter = (game.name || game.id || '?').trim().charAt(0).toUpperCase();

  return (
    <span
      className={cn(
        'relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-surface-300',
        className
      )}
      style={{ width: size, height: size }}
    >
      {url ? (
        <img
          src={url}
          alt=""
          draggable={false}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : letter ? (
        <span className="text-[13px] font-semibold text-accent-soft">{letter}</span>
      ) : (
        <Gamepad2 className="h-4 w-4 text-accent-soft" />
      )}
    </span>
  );
};

/* ------------------------------------------------------------- EmptyState */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  hint,
  action,
  className,
  compact,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] text-center',
      compact ? 'gap-1.5 px-4 py-6' : 'gap-3 px-8 py-12',
      className
    )}
  >
    {icon && (
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-muted">
        {icon}
      </div>
    )}
    <div>
      <p className={cn('font-medium text-foreground/85', compact ? 'text-xs' : 'text-sm')}>
        {title}
      </p>
      {hint && <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-faint">{hint}</p>}
    </div>
    {action}
  </div>
);

/* --------------------------------------------------------------- StatTile */

type StatTone = 'default' | 'accent' | 'mint' | 'amber' | 'rose';

interface StatTileProps {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: StatTone;
  className?: string;
}

const statTones: Record<StatTone, { value: string; icon: string }> = {
  default: { value: 'text-foreground', icon: 'text-muted bg-white/[0.05]' },
  accent: { value: 'text-accent-soft', icon: 'text-muted bg-white/[0.05]' },
  mint: { value: 'text-mint', icon: 'text-muted bg-white/[0.05]' },
  amber: { value: 'text-amber', icon: 'text-muted bg-white/[0.05]' },
  rose: { value: 'text-rose', icon: 'text-muted bg-white/[0.05]' },
};

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  className,
}) => (
  <div className={cn('rounded-xl border border-border bg-surface-200/60 p-3.5', className)}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">{label}</p>
        <p className={cn('num mt-1.5 text-[17px] font-semibold leading-none', statTones[tone].value)}>
          {value}
        </p>
        {hint && <p className="mt-1.5 break-words text-[11px] leading-snug text-muted">{hint}</p>}
      </div>
      {icon && (
        <span
          className={cn(
            'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg',
            statTones[tone].icon
          )}
        >
          {icon}
        </span>
      )}
    </div>
  </div>
);

/* --------------------------------------------------------------- Field */

interface FieldProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}

export const Field: React.FC<FieldProps> = ({ label, hint, children, className, htmlFor }) => (
  <div className={cn('space-y-2', className)}>
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="min-w-0 text-[13px] font-medium text-foreground/90">
        {label}
      </label>
      {hint && <span className="min-w-0 break-words text-right text-[11px] leading-snug text-faint">{hint}</span>}
    </div>
    {children}
  </div>
);

/* --------------------------------------------------------------- Search */

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder,
  className,
  icon,
}) => (
  <div className={cn('relative', className)}>
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
      {icon}
    </span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-xl border border-border bg-surface-300/70 pl-9 pr-3 text-[13px] text-foreground placeholder:text-faint/80 transition-colors focus:border-accent/40 focus:bg-surface-300 focus:outline-none"
    />
  </div>
);
