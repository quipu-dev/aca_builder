import { cn } from '@/utils';
import type React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'd1' | 'd2' | 'd3' | 'kernel';
}

export function getPillarVariant(
  type?: string,
  fallback: BadgeProps['variant'] = 'default',
): BadgeProps['variant'] {
  switch (type?.toLowerCase()) {
    case 'd1':
      return 'd1';
    case 'd2':
      return 'd2';
    case 'd3':
      return 'd3';
    case 'kernel':
      return 'kernel';
    default:
      return fallback;
  }
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantStyles = {
    default: 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40',
    secondary: 'bg-slate-800 text-slate-300 border-slate-700',
    outline: 'border-slate-700 text-slate-400',
    destructive: 'bg-rose-950/60 text-rose-300 border-rose-800/60',
    d1: 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60',
    d2: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
    d3: 'bg-purple-950/60 text-purple-300 border-purple-800/60',
    kernel: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold tracking-wide transition-colors',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
