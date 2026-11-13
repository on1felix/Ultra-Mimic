import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  className?: string;
  /** Animated shine while a run is active. */
  active?: boolean;
  height?: 'sm' | 'md' | 'lg';
  tone?: 'accent' | 'mint' | 'amber' | 'rose';
}

const tones: Record<NonNullable<ProgressProps['tone']>, string> = {
  accent: 'bg-accent',
  mint: 'bg-mint',
  amber: 'bg-amber',
  rose: 'bg-rose',
};

const heights = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' };

export const Progress: React.FC<ProgressProps> = ({
  value,
  className,
  active = false,
  height = 'md',
  tone = 'accent',
}) => {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-full bg-white/[0.06]',
        heights[height],
        className
      )}
      role="progressbar"
      data-active={active}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Linear 1 s = the tick interval: the bar glides at one constant speed
          between updates instead of easing in and out on every tick. */}
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-1000 ease-linear',
          tones[tone]
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};
