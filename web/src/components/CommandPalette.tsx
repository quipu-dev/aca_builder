import { Badge } from '@/components/ui/badge';
import type { KernelInfo, PackageItem } from '@/features/explorer/PackageExplorer';
import { useIdeStore } from '@/stores/ide-store';
import { Box, Layers, Search, Sparkles } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface CommandItem {
  id: string;
  type: 'manifest' | 'lookup' | 'atom';
  title: string;
  subtitle?: string;
  badge?: string;
  atomId?: string;
  manifestName?: string;
  lookupKey?: string;
}

export function CommandPalette({
  isOpen,
  onClose,
  manifests,
  packages,
  kernel,
}: {
  isOpen: boolean;
  onClose: () => void;
  manifests: Array<string | { name: string; workspace?: string; workspace_path?: string }>;
  packages: PackageItem[];
  kernel?: KernelInfo | null;
}) {
  const openTab = useIdeStore((state) => state.openTab);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 汇聚系统中所有可索引跳转的实体
  const allItems = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];

    // 0. Kernel 核心协议
    if (kernel) {
      list.push({
        id: 'atom:kernel',
        type: 'atom',
        title: 'kernel.md (核心协议)',
        subtitle: 'ACA Runtime Protocol',
        badge: 'KERNEL',
        atomId: 'kernel',
      });
    }

    // 1. 清单
    for (const item of manifests) {
      const mName = typeof item === 'string' ? item : item.name;
      const mWs = typeof item === 'string' ? undefined : item.workspace;
      list.push({
        id: `manifest:${mName}`,
        type: 'manifest',
        title: mName,
        subtitle: mWs ? `清单蓝图 (@${mWs})` : '清单蓝图',
        badge: 'MANIFEST',
        manifestName: mName,
      });
    }

    // 2. 组件包公开与内部接口
    for (const pkg of packages) {
      for (const [k, def] of Object.entries(pkg.exports || {})) {
        list.push({
          id: `lookup:${k}`,
          type: 'lookup',
          title: k,
          subtitle: `公开接口 (@${pkg.name})`,
          badge: (def.pillar || 'd1').toUpperCase(),
          lookupKey: k,
        });
      }
      for (const [k, def] of Object.entries(pkg.internal_lookups || {})) {
        list.push({
          id: `lookup:${k}`,
          type: 'lookup',
          title: k,
          subtitle: `内部查找 (@${pkg.name})`,
          badge: (def.pillar || 'd1').toUpperCase(),
          lookupKey: k,
        });
      }

      // 3. 原子
      for (const atom of pkg.atoms || []) {
        list.push({
          id: `atom:${atom.id}`,
          type: 'atom',
          title: atom.id,
          subtitle: `原子组件 (@${pkg.name})`,
          badge: atom.type.toUpperCase(),
          atomId: atom.id,
        });
      }
    }

    return list;
  }, [manifests, packages, kernel]);

  // 极速匹配过滤
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 50);
    return allItems
      .filter(
        (item) => item.title.toLowerCase().includes(q) || item.subtitle?.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [allItems, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSelect = (item: CommandItem) => {
    if (item.type === 'atom' && item.atomId) {
      openTab({
        id: `atom:${item.atomId}`,
        type: 'atom',
        title: item.atomId,
        closable: true,
        atomId: item.atomId,
      });
    } else if (item.type === 'manifest' && item.manifestName) {
      openTab({
        id: `manifest:${item.manifestName}`,
        type: 'manifest',
        title: item.manifestName,
        closable: true,
        manifestName: item.manifestName,
      });
    } else if (item.type === 'lookup' && item.lookupKey) {
      openTab({
        id: `lookup:${item.lookupKey}`,
        type: 'lookup',
        title: item.lookupKey.split('::').pop() || item.lookupKey,
        closable: true,
        lookupKey: item.lookupKey,
      });
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length),
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col font-mono text-xs"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* 搜索输入栏 */}
        <div className="flex items-center px-3.5 py-3 border-b border-slate-800 bg-slate-950/80 gap-2.5">
          <Search className="h-4 w-4 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="跳转到原子、清单蓝图或接口定义... (按 Esc 退出)"
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-xs"
          />
          <span className="text-[10px] text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
            Esc
          </span>
        </div>

        {/* 结果列表 */}
        <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
          {filteredItems.length === 0 ? (
            <div className="p-6 text-center text-slate-500">未找到匹配的资产</div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40'
                      : 'text-slate-300 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {item.type === 'manifest' ? (
                      <Layers className="h-4 w-4 text-indigo-400 shrink-0" />
                    ) : item.type === 'lookup' ? (
                      <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
                    ) : (
                      <Box className="h-4 w-4 text-emerald-400 shrink-0" />
                    )}
                    <div className="flex flex-col truncate">
                      <span className="font-semibold truncate text-slate-100">{item.title}</span>
                      {item.subtitle && (
                        <span className="text-[10px] text-slate-500 truncate">{item.subtitle}</span>
                      )}
                    </div>
                  </div>

                  {item.badge && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase">
                      {item.badge}
                    </Badge>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
