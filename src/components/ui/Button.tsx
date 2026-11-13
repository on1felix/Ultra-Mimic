import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'soft' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

/**
 * Compact, understated buttons in the spirit of the servo app: a thin border,
 * a translucent tint and a plain colour transition on hover. No lift, no
 * scaling — the same calm feedback as servo's `.btn` class.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, type = 'button', children, ...props }, ref) => {
    const baseStyles =
      'inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border font-medium transition-[color,background-color,border-color,box-shadow,opacity] duration-150 focus:outline-none focus-ring disabled:cursor-not-allowed disabled:opacity-40';

    const variants = {
      primary:
        'border-accent/40 bg-accent/15 text-accent-soft hover:border-accent/60 hover:bg-accent/25 hover:text-white',
      secondary:
        'border-white/10 bg-white/[0.03] text-muted hover:border-white/20 hover:bg-white/[0.06] hover:text-foreground',
      soft: 'border-accent/30 bg-accent/10 text-accent-soft hover:border-accent/50 hover:bg-accent/20 hover:text-white',
      danger:
        'border-rose/25 bg-rose/[0.09] text-rose hover:border-rose/50 hover:bg-rose/[0.16]',
      outline: 'border-border bg-transparent text-muted hover:border-white/20 hover:text-foreground',
      ghost: 'border-transparent bg-transparent text-muted hover:bg-white/[0.05] hover:text-foreground',
    };

    const sizes = {
      sm: 'text-xs px-2.5 py-1.5',
      md: 'text-[13px] px-3.5 py-2',
      lg: 'text-sm px-5 py-2.5',
      icon: 'p-2 w-9 h-9',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
