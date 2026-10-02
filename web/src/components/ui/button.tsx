import { cn } from '@/lib/utils';
import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 disabled:pointer-events-none disabled:opacity-50';

    const variants = {
      default: 'bg-indigo-600 text-white shadow hover:bg-indigo-500',
      secondary: 'bg-slate-800 text-slate-200 shadow-sm hover:bg-slate-700',
      outline: 'border border-slate-800 bg-transparent shadow-sm hover:bg-slate-800 text-slate-200',
      ghost: 'hover:bg-slate-800 text-slate-300 hover:text-white',
      destructive: 'bg-rose-600 text-white shadow-sm hover:bg-rose-500',
    };

    const sizes = {
      default: 'h-9 px-4 py-2',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-10 rounded-md px-8',
      icon: 'h-9 w-9',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
