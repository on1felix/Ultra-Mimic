import React, { useEffect, useRef, useState } from 'react';
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
  size?: number;
  className?: string;
}

/**
 * How long the arc takes to refill when a new window opens. This mirrors the
 * reference site's `transition: stroke-dashoffset 0.3s linear`, so the ring
 * glides home instead of snapping when one game ends and the next one starts.
 */
const REFILL_SECS = 0.3;

/** Any jump bigger than this (in ring turns) is treated as a window change. */
const JUMP = 0.02;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Big circular countdown used on the overview screen.
 *
 * The arc shows how much of the current hold has already passed: it starts
 * empty at 12 o'clock and fills clockwise, like in the original build. The
 * built-in cooldown keeps a calm, full amber ring and only the digits move.
 *
 * Smoothness comes from one shared clock:
 *
 * - The countdown is projected from one anchor (a value plus the moment it was
 *   reported), so it advances at exactly one second per second. Backend ticks
 *   only correct the anchor when the clocks really diverge.
 * - The digits are derived from the same projected clock with `Math.ceil` (the
 *   reference site does the same), so they change once per second and never
 *   skip a number.
 * - The arc follows the projection every frame, so it never stutters, and a
 *   short 0.3 s linear glide finishes a hold without a visible snap.
 * - A new hold starts from an empty ring immediately: no backwards sweep and
 *   no freeze while the next game boots.
 */
export const TimerRing: React.FC<TimerRingProps> = ({
  remaining,
  total,
  elapsed,
  danger = false,
  paused = false,
  cooldown = false,
  caption,
  size = 210,
  className,
}) => {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const hasWindow = total > 0;

  /** Anchor of the current window: `at` (ms) ↔ `value` (seconds left). */
  const anchor = useRef({ at: 0, value: remaining, key: '', primed: false, paused: false });
  /** Current visual position of the arc (0 = empty, 1 = full ring). */
  const shown = useRef(hasWindow ? clamp01(remaining / total) : 1);
  /** Refill glide: `from` is where the jump started, `at` is its timestamp. */
  const glide = useRef({ from: shown.current, at: 0 });

  const circleRef = useRef<SVGCircleElement>(null);
  const windowKey = `${cooldown ? 'cooldown' : 'hold'}:${total}:${hasWindow}`;

  // Live values for the animation loop, so it never has to restart.
  const live = useRef({ total, elapsed, hasWindow, cooldown });
  live.current = { total, elapsed, hasWindow, cooldown };

  const initialSecs = hasWindow
    ? Math.max(0, Math.ceil(remaining))
    : Math.max(0, Math.floor(elapsed));
  const [clockSecs, setClockSecs] = useState(initialSecs);
  const clockRef = useRef(initialSecs);

  // Take a new anchor when a window opens, changes length or the run restarts.
  useEffect(() => {
    const now = performance.now();
    const a = anchor.current;
    const projected = a.primed && !a.paused ? a.value - (now - a.at) / 1000 : remaining;
    // A new window reports a value clearly ahead of the projection (a new hold
    // always starts at `total`), or the window key itself changed.
    const isNewWindow = !a.primed || a.key !== windowKey || remaining > projected + 2;

    if (!isNewWindow) {
      // Same window: keep the anchor, correct it only on a real desync.
      if (!a.paused && Math.abs(projected - remaining) > 1.5) {
        a.at = now;
        a.value = remaining;
      }
      return;
    }

    a.at = now;
    a.value = remaining;
    a.key = windowKey;
    a.primed = true;
    a.paused = paused;
  }, [remaining, windowKey, paused]);

  // Pause freezes the projected clock; resuming re-anchors it where it stopped.
  useEffect(() => {
    const now = performance.now();
    const a = anchor.current;
    if (!a.primed) return;
    if (paused && !a.paused) {
      a.value = Math.max(0, a.value - (now - a.at) / 1000);
      a.paused = true;
    } else if (!paused && a.paused) {
      a.at = now;
      a.paused = false;
    }
  }, [paused]);

  // One animation frame at a time: the arc and the digits share one clock.
  useEffect(() => {
    let raf = 0;
    const paint = (now: number) => {
      const a = anchor.current;
      const {
        total: window,
        hasWindow: bounded,
        elapsed: spent,
        cooldown: isCooldown,
      } = live.current;

      if (a.primed) {
        const raw = a.paused ? a.value : a.value - (now - a.at) / 1000;
        const left = Math.max(0, raw);

        // Digits: bounded windows count down with ceil (never skip a second),
        // open-ended farm runs count up with floor.
        const nextSecs = bounded ? Math.ceil(left) : Math.max(0, Math.floor(spent));
        if (nextSecs !== clockRef.current) {
          clockRef.current = nextSecs;
          setClockSecs(nextSecs);
        }

        // Arc: the hold fills from empty to full (like the original build).
        // The built-in cooldown keeps a calm, full amber ring: only the digits
        // move, the arc does not sweep.
        const target =
          isCooldown || !bounded || window <= 0
            ? 1
            : clamp01((window - left) / window);

        let value = shown.current;
        if (target < value - JUMP) {
          // A new hold after a pause: start from an empty ring right away.
          value = target;
          glide.current.at = 0;
        } else if (target > value + JUMP) {
          if (now - glide.current.at > REFILL_SECS * 1000) {
            glide.current = { from: value, at: now };
          }
          const age = (now - glide.current.at) / (REFILL_SECS * 1000);
          if (glide.current.at > 0 && age < 1) {
            // Linear 0.3 s glide, like the site's CSS transition.
            value = glide.current.from + (target - glide.current.from) * Math.max(0, age);
          } else {
            value = target;
            glide.current.at = 0;
          }
        } else {
          value = target;
          glide.current.at = 0;
        }
        shown.current = clamp01(value);

        if (circleRef.current) {
          circleRef.current.style.strokeDashoffset = String(
            circumference * (1 - shown.current)
          );
        }
      }

      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [circumference]);

  const ringColor = danger
    ? '#D97C86'
    : cooldown || paused
      ? '#D9AE5F'
      : '#8E85A3';

  // HH:MM:SS is 8 characters and just fits the ring. A ninth character only
  // appears in infinite runs past 100 hours; shrink the clock instead of
  // letting it run into the stroke.
  const clock = formatClock(clockSecs);
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

        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown.current)}
          style={{ transition: 'stroke 0.5s ease' }}
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
      </div>
    </div>
  );
};
