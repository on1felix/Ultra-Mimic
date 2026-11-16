import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatClock } from '@/lib/format';

interface TimerRingProps {
  /** Seconds left in the current window. */
  remaining: number;
  /**
   * Exact time left in milliseconds. The clock is anchored on it, so a restore
   * after a hidden window lands on the true time instead of a whole second.
   */
  remainingMs?: number;
  /** Length of the current window in seconds (0 = no fixed window). */
  total: number;
  /** Seconds already spent in the current window. */
  elapsed: number;
  /** Freeze the ring while the run is paused. */
  paused?: boolean;
  /** Built-in pause between games: drain counter-clockwise in amber. */
  cooldown?: boolean;
  /** Reports the digits currently on screen (single source for the red state). */
  onClock?: (seconds: number) => void;
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

/**
 * Largest clock correction accepted inside one window. The local projection
 * runs on `performance.now`, so a real difference is only the latency of a
 * tick; anything bigger is a stale reading delivered after a hidden window.
 */
const MAX_FIX_SECS = 0.5;

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
 * - The anchor is taken from the millisecond value of the backend tick, so a
 *   restore after a hidden window lands on the exact remaining time (to the
 *   millisecond) instead of the nearest whole second.
 */
export const TimerRing: React.FC<TimerRingProps> = ({
  remaining,
  remainingMs,
  total,
  elapsed,
  paused = false,
  cooldown = false,
  onClock,
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
  /** Latest exact reading from the backend: `ms` left at `at` (performance.now). */
  const truth = useRef({
    ms: remainingMs ?? remaining * 1000,
    at: 0,
    has: remainingMs != null,
  });
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
    // Keep the exact reading of every tick: `at` is when it actually arrived,
    // so the value can be projected forward without losing precision.
    if (remainingMs != null && !paused) {
      truth.current = { ms: remainingMs, at: now, has: true };
    }
    // Truth projected to this instant (seconds). Falls back to the whole-second
    // prop when the backend sends no millisecond value.
    const exact = truth.current.has
      ? Math.max(0, truth.current.ms / 1000 - (now - truth.current.at) / 1000)
      : remaining;
    const projected = a.primed && !a.paused ? a.value - (now - a.at) / 1000 : exact;
    // The backend says this window is over: snap to 00:00 instead of waiting
    // for the local projection to reach zero. A late frame used to keep 00:01
    // on screen for the whole final frame.
    if (hasWindow && remaining === 0 && exact <= 0 && !paused) {
      a.at = now;
      a.value = 0;
      a.key = windowKey;
      a.primed = true;
      a.paused = false;
      return;
    }
    // A new window reports a value clearly ahead of the projection (a new hold
    // always starts at `total`), or the window key itself changed. The value
    // must be near the full window too: a tick that merely arrived late also
    // looks "ahead", and treating it as a new window used to push the whole
    // countdown back by the delivery delay.
    const startsAtFull = remaining >= total - 1;
    const isNewWindow =
      !a.primed || a.key !== windowKey || (remaining > projected + 2 && startsAtFull);

    if (!isNewWindow) {
      // Same window: re-anchor on the exact reading. The projection runs on
      // `performance.now`, so it never drifts by more than the delivery latency
      // of a tick; a small forward nudge keeps the clock on the true deadline.
      // A bigger jump means a stale queued tick arrived late (a hidden window),
      // and honouring it would throw the countdown forward.
      if (!a.paused) {
        const ahead = exact - projected;
        if (ahead > 0.001 && ahead < MAX_FIX_SECS) {
          a.at = now;
          a.value = exact;
        }
      }
      return;
    }

    a.at = now;
    a.value = exact;
    a.key = windowKey;
    a.primed = true;
    a.paused = paused;
  }, [remaining, remainingMs, windowKey, paused]);

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

  // Digits catch up with a short cross-fade when the window returns. The
  // projection never stops while hidden, so the truth is always the anchor.
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const syncTimer = useRef<number | undefined>(undefined);

  // Digits live on their own timer, not on an animation frame. Chromium throttles
  // (or pauses) rAF when the window is occluded, minimized or the machine is
  // busy, and one skipped frame used to swallow a whole second on screen.
  useEffect(() => {
    const tick = () => {
      const a = anchor.current;
      if (!a.primed || syncingRef.current) return;
      const { hasWindow: bounded, elapsed: spent } = live.current;
      const now = performance.now();
      const raw = a.paused ? a.value : a.value - (now - a.at) / 1000;
      const next = bounded ? Math.ceil(Math.max(0, raw)) : Math.max(0, Math.floor(spent));
      // No "one missed second per 100 ms" replay: after a hidden window the gap
      // can be many seconds, and replaying it looked like the countdown was
      // fast-forwarding. Show the true digit instead; a real resync is animated
      // once by the visibility handler below.
      if (next !== clockRef.current) {
        clockRef.current = next;
        setClockSecs(next);
      }
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, []);

  // Coming back from a minimised or covered window: swap the digits for the
  // real remaining time with a quick cross-fade instead of counting back
  // through every missed second.
  useEffect(() => {
    const restore = () => {
      if (document.visibilityState !== 'visible') return;
      if (syncingRef.current) return;
      const a = anchor.current;
      if (!a.primed) return;

      // Re-anchor on the exact backend reading before reading the digits: any
      // drift is corrected here, down to a single millisecond. `performance.now`
      // keeps running while the window is hidden, so projecting the last tick
      // gives the true remaining time and the ring lands exactly where the run
      // really is, without replaying the missed seconds.
      const now = performance.now();
      const t = truth.current;
      if (!a.paused && t.has) {
        const exactNow = Math.max(0, t.ms / 1000 - (now - t.at) / 1000);
        const projected = a.value - (now - a.at) / 1000;
        const ahead = exactNow - projected;
        if (ahead > 0 && ahead < MAX_FIX_SECS) {
          a.value = exactNow;
          a.at = now;
        }
      }

      const read = () => {
        const { hasWindow: bounded, elapsed: spent } = live.current;
        const raw = a.paused ? a.value : a.value - (performance.now() - a.at) / 1000;
        return bounded
          ? Math.max(0, Math.ceil(Math.max(0, raw)))
          : Math.max(0, Math.floor(spent));
      };

      const target = read();
      if (target === clockRef.current) return;
      if (Math.abs(target - clockRef.current) === 1) {
        clockRef.current = target;
        setClockSecs(target);
        return;
      }

      syncingRef.current = true;
      setSyncing(true);
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => {
        const fresh = read();
        clockRef.current = fresh;
        setClockSecs(fresh);
        syncingRef.current = false;
        setSyncing(false);
      }, 110);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') restore();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
      window.clearTimeout(syncTimer.current);
    };
  }, []);

  // Mirror the digits that are actually on screen to the parent, so the red
  // state switches on the same second the user sees 00:30.
  useEffect(() => {
    onClock?.(clockSecs);
  }, [clockSecs, onClock]);

  // One animation frame at a time: the arc follows the same anchor.
  useEffect(() => {
    let raf = 0;
    const paint = (now: number) => {
      const a = anchor.current;
      const {
        total: window,
        hasWindow: bounded,
        cooldown: isCooldown,
      } = live.current;

      if (a.primed) {
        const raw = a.paused ? a.value : a.value - (now - a.at) / 1000;
        const left = Math.max(0, raw);

        // Arc: the hold fills from empty to full (like the original build).
        // The built-in cooldown keeps a calm, full amber ring: only the digits
        // move, the arc does not sweep.
        const target =
          isCooldown || !bounded || window <= 0
            ? 1
            : clamp01((window - left) / window);

        let value = shown.current;
        if (target < value - JUMP) {
          // Backwards only happens when a fresh hold opens: start from an empty
          // ring at once, so there is no visible backwards sweep.
          value = target;
          glide.current.at = 0;
        } else if (target > value + JUMP) {
          // Forward always glides, even when the window changes: finishing a
          // run, dropping to the idle ring or returning from a hidden window
          // should ease home instead of snapping.
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

  // The digits themselves decide when the ring turns red: 30 seconds left
  // means the moment 00:30 is on screen, not a tick that may arrive slightly
  // before the digits catch up. Windows shorter than a minute keep half of
  // their length so a 15 second hold does not start out red.
  const dangerAt = total > 60 ? 30 : Math.max(5, Math.floor(total / 2));
  const danger = hasWindow && !cooldown && !paused && clockSecs <= dangerAt;
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
            'num mt-1 font-mono font-semibold leading-none tracking-tight',
            compactClock ? 'text-[30px]' : 'text-[38px]',
            danger ? 'text-rose' : cooldown || paused ? 'text-amber' : 'text-foreground'
          )}
          style={{
            opacity: syncing ? 0.35 : 1,
            transition: 'opacity 130ms ease, color 500ms ease',
          }}
        >
          {clock}
        </span>
      </div>
    </div>
  );
};
