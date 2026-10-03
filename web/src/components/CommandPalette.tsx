import { Badge } from '@/components/ui/badge';
import type { KernelInfo, PackageItem } from '@/features/explorer/PackageExplorer';
import { useIdeStore } from '@/stores/ide-store';
import { Command } from 'cmdk';
import { Box, Layers, Search, Sparkles } from 'lucide-react';
import { useEffect, useMemo } from 'react';

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

  const allItems = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col font-mono text-xs"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        <Command label="跳转资产或接口" className="flex flex-col">
          <div className="flex items-center px-3.5 py-3 border-b border-slate-800 bg-slate-950/80 gap-2.5">
            <Search className="h-4 w-4 text-indigo-400 shrink-0" />
            <Command.Input
              placeholder="跳转到原子、清单蓝图或接口定义... (按 Esc 退出)"
              className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-xs"
              autoFocus
            />
            <span className="text-[10px] text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
              Esc
            </span>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
            <Command.Empty className="p-6 text-center text-slate-500">
              未找到匹配的资产
            </Command.Empty>

            {allItems.map((item) => (
              <Command.Item
                key={item.id}
                value={`${item.title} ${item.subtitle || ''}`}
                onSelect={() => handleSelect(item)}
                className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-slate-300 aria-selected:bg-indigo-600/30 aria-selected:text-indigo-200 aria-selected:border aria-selected:border-indigo-500/40 border border-transparent"
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
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
