import { Badge, getPillarVariant } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils';
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AutocompleteOption } from './types';

export interface AutocompleteProps<T = unknown> {
  value: string;
  onChange: (val: string) => void;
  options: AutocompleteOption<T>[];
  onSelectOption?: (option: AutocompleteOption<T>) => void;
  placeholder?: string;
  allowCustom?: boolean;
  prefixTrigger?: string[];
  className?: string;
  disabled?: boolean;
  id?: string;
}

export function Autocomplete<T = unknown>({
  value,
  onChange,
  options,
  onSelectOption,
  placeholder,
  allowCustom = true,
  className,
  disabled = false,
  id,
}: AutocompleteProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset(4),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${Math.max(rects.reference.width, 240)}px`,
            maxHeight: '260px',
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'listbox' });
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role]);

  const listRef = useRef<HTMLDivElement>(null);

  // 针对否定排除前缀（如 `-` 开头）与大小写模糊过滤
  const filteredOptions = useMemo(() => {
    const rawQuery = value.trim().toLowerCase();
    const isNegation = rawQuery.startsWith('-');
    const query = isNegation ? rawQuery.slice(1) : rawQuery;

    if (!query) {
      return options.slice(0, 50);
    }

    return options
      .filter((opt) => {
        const target = opt.label.toLowerCase();
        const grp = opt.group?.toLowerCase() || '';
        return target.includes(query) || grp.includes(query);
      })
      .slice(0, 50);
  }, [options, value]);

  // 自动滚动高亮项至视口
  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const activeEl = listRef.current.querySelector('[data-highlighted="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const selectItem = useCallback(
    (opt: AutocompleteOption<T>) => {
      const isNegation = value.trim().startsWith('-');
      const finalVal = isNegation ? `-${opt.value}` : opt.value;
      onChange(finalVal);
      onSelectOption?.(opt);
      setIsOpen(false);
    },
    [value, onChange, onSelectOption],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, filteredOptions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev <= 0 ? Math.max(0, filteredOptions.length - 1) : prev - 1,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0 && highlightedIndex < filteredOptions.length) {
        selectItem(filteredOptions[highlightedIndex]);
      } else if (allowCustom) {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Tab') {
      if (filteredOptions.length > 0 && highlightedIndex < filteredOptions.length) {
        selectItem(filteredOptions[highlightedIndex]);
      }
    }
  };

  return (
    <div className="relative w-full">
      <Input
        id={id}
        ref={refs.setReference}
        {...getReferenceProps()}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlightedIndex(0);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn('text-xs font-mono', className)}
        autoComplete="off"
      />

      {isOpen && filteredOptions.length > 0 && (
        <FloatingPortal>
          <div
            ref={(node) => {
              refs.setFloating(node);
              // @ts-expect-error listRef mutable assignment
              listRef.current = node;
            }}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-[9999] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/95 p-1 shadow-2xl backdrop-blur-md font-mono text-xs text-slate-200"
          >
            {filteredOptions.map((opt, idx) => {
              const isHighlighted = idx === highlightedIndex;
              return (
                <button
                  type="button"
                  key={`${opt.value}-${idx}`}
                  data-highlighted={isHighlighted ? 'true' : 'false'}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => selectItem(opt)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer outline-none border border-transparent',
                    isHighlighted
                      ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/40'
                      : 'text-slate-300 hover:bg-slate-800/60',
                  )}
                >
                  <div className="flex flex-col truncate flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold truncate">{opt.label}</span>
                      {opt.group && (
                        <span className="text-[10px] text-slate-500 shrink-0">{opt.group}</span>
                      )}
                    </div>
                    {opt.description && (
                      <span className="text-[10px] text-slate-400 truncate mt-0.5 font-sans leading-tight">
                        {opt.description}
                      </span>
                    )}
                  </div>

                  {opt.badge && (
                    <Badge
                      variant={
                        opt.badgeVariant || getPillarVariant(opt.badge.toLowerCase(), 'secondary')
                      }
                      className="text-[9px] uppercase px-1.5 py-0 shrink-0 font-bold"
                    >
                      {opt.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}
