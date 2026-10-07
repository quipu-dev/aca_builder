import { Badge, getPillarVariant } from '@/components/ui/badge';
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
import { useCallback, useMemo, useRef, useState } from 'react';
import type { AutocompleteOption } from './types';

export interface TagAutocompleteProps<T = unknown> {
  values: string[];
  onChange: (newValues: string[]) => void;
  options: AutocompleteOption<T>[];
  placeholder?: string;
  allowCustom?: boolean;
  className?: string;
  disabled?: boolean;
  badgeVariant?: 'default' | 'd1' | 'd2' | 'd3' | 'destructive';
  onTagClick?: (tag: string) => void;
}

export function TagAutocomplete<T = unknown>({
  values,
  onChange,
  options,
  placeholder = '+ 添加 (回车/逗号)',
  allowCustom = true,
  className,
  disabled = false,
  badgeVariant = 'default',
  onTagClick,
}: TagAutocompleteProps<T>) {
  const [inputVal, setInputVal] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
            maxHeight: '240px',
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'listbox' });
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role]);

  const addTag = useCallback(
    (tag: string) => {
      const clean = tag.trim().toLowerCase();
      if (!clean) return;
      if (!values.includes(clean)) {
        onChange([...values, clean]);
      }
      setInputVal('');
      setIsOpen(false);
    },
    [values, onChange],
  );

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(values.filter((t) => t !== tagToRemove));
    },
    [values, onChange],
  );

  const filteredOptions = useMemo(() => {
    const raw = inputVal.trim().toLowerCase();
    const isNeg = raw.startsWith('-');
    const query = isNeg ? raw.slice(1) : raw;

    return options
      .filter((opt) => {
        if (values.includes(opt.value.toLowerCase())) return false;
        if (!query) return true;
        return (
          opt.label.toLowerCase().includes(query) ||
          opt.group?.toLowerCase().includes(query) ||
          opt.value.toLowerCase().includes(query)
        );
      })
      .slice(0, 40);
  }, [options, values, inputVal]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !inputVal && values.length > 0) {
      removeTag(values[values.length - 1]);
      return;
    }

    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (isOpen && filteredOptions.length > 0 && highlightedIndex < filteredOptions.length) {
        const selected = filteredOptions[highlightedIndex];
        const isNeg = inputVal.trim().startsWith('-');
        addTag(isNeg ? `-${selected.value}` : selected.value);
      } else if (allowCustom && inputVal.trim()) {
        addTag(inputVal.trim());
      }
      return;
    }

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
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'w-full flex flex-wrap items-center gap-1.5 rounded border border-slate-800 bg-slate-950 p-1.5 text-xs font-mono transition-colors focus-within:border-indigo-500',
        className,
      )}
    >
      {values.map((tag) => (
        <span
          key={tag}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border font-medium transition-colors',
            badgeVariant === 'destructive'
              ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
              : badgeVariant === 'd2'
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                : badgeVariant === 'd3'
                  ? 'bg-purple-950/60 text-purple-300 border-purple-800/60'
                  : badgeVariant === 'd1'
                    ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60'
                    : 'bg-slate-850 bg-slate-800/80 text-slate-300 border-slate-700',
          )}
        >
          {onTagClick ? (
            <button
              type="button"
              onClick={() => onTagClick(tag)}
              className="hover:underline cursor-pointer truncate max-w-[220px]"
              title={`点击打开契约定义: ${tag}`}
            >
              {tag}
            </button>
          ) : (
            <span className="truncate max-w-[220px]">{tag}</span>
          )}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="text-slate-400 hover:text-rose-400 ml-0.5 cursor-pointer leading-none"
            title="移除"
          >
            ×
          </button>
        </span>
      ))}

      <div className="relative flex-1 min-w-[140px]">
        <input
          ref={refs.setReference}
          {...getReferenceProps()}
          type="text"
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            setHighlightedIndex(0);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={values.length === 0 ? placeholder : '+'}
          disabled={disabled}
          className="w-full bg-transparent text-slate-200 placeholder:text-slate-600 focus:outline-none text-xs font-mono py-0.5"
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
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => {
                      const isNeg = inputVal.trim().startsWith('-');
                      addTag(isNeg ? `-${opt.value}` : opt.value);
                    }}
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
    </div>
  );
}
