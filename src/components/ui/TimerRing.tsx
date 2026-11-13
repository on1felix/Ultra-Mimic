import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatClock } from '@/lib/format';

interface TimerRingProps {
  /** Seconds left in the current window. */
  remaining: number;
  /** Length of the current window in seconds (0 = no fixed window). */
  total: number;
  /** Seconds already spent in the current window. */
  elapsed: number;
  /** Turn the ring red when the window is about to expire. */
  danger?: boolean;
  /** Freeze the ring while the run is paused. */
  paused?: boolean;
  /** Built-in pause between games: drain counter-clockwise in amber. */
  cooldown?: boolean;
  /** Small uppercase caption above the clock. */
  caption: string;
  /** Secondary line below the clock. */
  hint?: string;
  size?: number;
  className?: string;
}

/**
 * Big circular countdown used on the overview screen. It fills as the hold
 * window progresses and switches to red in the last moments.
 */
export const TimerRing: React.FC<TimerRingProps> = ({
  remaining,
  total,
  elapsed,
  danger = false,
  paused = false,
  cooldown = false,
  caption,
  hint,
  size = 210,
  className,
}) => {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const hasWindow = total > 0;
  const progress = hasWindow
    ? cooldown
      ? Math.min(1, Math.max(0, remaining / total))
      : Math.min(1, Math.max(0, (total - remaining) / total))
    : 1;
  const offset = circumference * (1 - progress);

  const ringColor = danger
    ? '#D97C86'
    : cooldown || paused
      ? '#D9AE5F'
      : '#8E85A3';

  return (
    <div
      className={cn('relative flex flex-col items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="absolute inset-0 -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />

        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.05, ease: 'linear' }}
        />
      </svg>

      {/* Rotating tick marks when no fixed window is active */}
      {!hasWindow && (
        <motion.div
          className="absolute inset-2 rounded-full border border-dashed border-white/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
          aria-hidden
        />
      )}

      <div className="relative flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-faint">
          {caption}
        </span>
        <span
          className={cn(
            'num mt-1 font-mono text-[38px] font-semibold leading-none tracking-tight transition-colors duration-500',
            danger ? 'text-rose' : cooldown || paused ? 'text-amber' : 'text-foreground'
          )}
        >
          {formatClock(hasWindow ? remaining : elapsed)}
        </span>
        {hint && (
          <span className="mt-2 max-w-[168px] break-words text-[11px] leading-snug text-muted">{hint}</span>
        )}
      </div>
    </div>
  );
};
