import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
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

/** How long the arc takes to settle home when a window opens, closes or resets. */
const RESET_SECS = 0.8;

/**
 * Big circular countdown used on the overview screen. It fills as the hold
 * window progresses and switches to red in the last moments.
 *
 * Countdown: the arc runs on its own clock. One anchor per window (a value plus
 * the moment it was reported) is projected forward at exactly one second per
 * second, so the speed is constant. Ticks never restart it; they only correct
 * the anchor when the two clocks really disagree. That avoids the
 * stall-then-hurry jolt caused by re-tweening on every whole-second tick.
 *
 * Transitions: start, stop and hold → pause make the arc glide to its new
 * place. The glide is stored as a decaying offset on top of the always-correct
 * countdown position, so the arc lands exactly on the countdown and never jumps
 * when the transition ends.
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

  const arc = useMotionValue(
    hasWindow ? Math.min(1, Math.max(0, cooldown ? remaining / total : (total - remaining) / total)) : 1
  );
  const dashoffset = useTransform(arc, (value) => circumference * (1 - value));

  /** Anchor of the current window: `at` (ms) ↔ `value` (seconds left). */
  const anchor = useRef({
    at: 0,
    value: remaining,
    key: '',
    primed: false,
    paused: false,
  });
  /** Decaying offset used by the transition, laid on top of the countdown. */
  const reset = useRef({ offset: 0, at: 0, dur: RESET_SECS });
  const windowKey = `${cooldown ? 'cooldown' : 'hold'}:${total}:${hasWindow}`;

  // Live values for the animation loop, so it never has to restart.
  const live = useRef({ paused, total, hasWindow, cooldown });
  live.current = { paused, total, hasWindow, cooldown };

  useEffect(() => {
    const now = performance.now();
    const a = anchor.current;
    const projected = a.primed ? a.value - (now - a.at) / 1000 : remaining;
    // A new window: first tick, another batch, or hold ↔ pause.
    const isNewWindow = !a.primed || a.key !== windowKey || remaining > projected + 2;

    if (!isNewWindow) {
      // Same window: keep the existing anchor, fix it only on a real desync.
      if (Math.abs(projected - remaining) > 1.2) {
        a.at = now;
        a.value = remaining;
      }
      return;
    }

    const target = !hasWindow || total <= 0
      ? 1
      : Math.min(1, Math.max(0, cooldown ? remaining / total : (total - remaining) / total));

    // Keep the current visual position, then let this offset fade out while the
    // countdown advances underneath it. Nothing jumps at the end of it.
    reset.current = { offset: arc.get() - target, at: now, dur: RESET_SECS };

    a.at = now;
    a.value = remaining;
    a.key = windowKey;
    a.primed = true;
    a.paused = paused;
  }, [remaining, windowKey, paused, hasWindow, total, cooldown, arc]);

  // Pause: freeze the anchor in place, then restart it on resume.
  useEffect(() => {
    const now = performance.now();
    const a = anchor.current;
    if (!a.primed) return;
    if (paused && !a.paused) {
      const spent = Math.max(0, now - a.at) / 1000;
      a.value = Math.max(0, a.value - spent);
      a.paused = true;
    } else if (!paused && a.paused) {
      a.at = now;
      a.paused = false;
    }
  }, [paused]);

  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      const a = anchor.current;
      if (a.primed) {
        const { total: window, hasWindow: bounded, cooldown: isCooldown } = live.current;
        const raw = a.paused ? a.value : a.value - (now - a.at) / 1000;
        const value = bounded ? Math.max(0, Math.min(window, raw)) : Math.max(0, raw);
        const target =
          !bounded || window <= 0 ? 1 : isCooldown ? value / window : (window - value) / window;

        const r = reset.current;
        let shown = target;
        if (r.offset !== 0) {
          const progress = (now - r.at) / (r.dur * 1000);
          if (progress >= 1) {
            r.offset = 0;
          } else {
            const eased = 1 - Math.pow(1 - Math.max(0, progress), 3);
            shown = target + r.offset * (1 - eased);
          }
        }

        arc.set(Math.min(1, Math.max(0, shown)));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [arc]);

  const ringColor = danger
    ? '#D97C86'
    : cooldown || paused
      ? '#D9AE5F'
      : '#8E85A3';

  // HH:MM:SS is 8 characters and just fits the ring. A ninth character only
  // appears in infinite runs past 100 hours; shrink the clock instead of
  // letting it run into the stroke.
  const clock = formatClock(hasWindow ? remaining : elapsed);
  const compactClock = clock.length > 8;

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
          style={{ strokeDashoffset: dashoffset }}
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
            'num mt-1 font-mono font-semibold leading-none tracking-tight transition-colors duration-500',
            compactClock ? 'text-[30px]' : 'text-[38px]',
            danger ? 'text-rose' : cooldown || paused ? 'text-amber' : 'text-foreground'
          )}
        >
          {clock}
        </span>
        {hint && (
          <span className="mt-2 max-w-[168px] break-words text-[11px] leading-snug text-muted">{hint}</span>
        )}
      </div>
    </div>
  );
};