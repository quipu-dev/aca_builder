import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, FileCode, Globe, Lock, Package, Plus } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

export interface LookupExportItem {
  pillar?: string;
  description?: string;
  visibility?: string;
  selectors?: unknown[];
}

export interface PackageItem {
  name: string;
  exports: Record<string, LookupExportItem>;
  internal_lookups: Record<string, LookupExportItem>;
  atoms: Array<{
    id: string;
    type: string;
    priority?: number;
    domain: string[];
  }>;
}

export function PackageExplorer({
  packages,
  onSelectAtom,
  onOpenLookup,
}: {
  packages: PackageItem[];
  onSelectAtom?: (atomId: string, e?: React.MouseEvent) => void;
  onOpenLookup?: (lookupKey: string, e?: React.MouseEvent) => void;
}) {
  const [expandedPkg, setExpandedPkg] = useState<Record<string, boolean>>({});

  const toggle = (pkgName: string) => {
    setExpandedPkg((prev) => ({ ...prev, [pkgName]: !prev[pkgName] }));
  };

  return (
    <div className="space-y-1">
      {packages.map((pkg) => {
        const isExp = !!expandedPkg[pkg.name];
        const exportsCount = Object.keys(pkg.exports || {}).length;
        const internalCount = Object.keys(pkg.internal_lookups || {}).length;
        const atomsCount = pkg.atoms?.length || 0;

        return (
          <div
            key={pkg.name}
            className="rounded border border-slate-800/60 bg-slate-900/30 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggle(pkg.name)}
              className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-slate-800/40 text-xs font-mono transition-colors"
            >
              <div className="flex items-center gap-2">
                {isExp ? (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                )}
                <Package className="h-3.5 w-3.5 text-indigo-400" />
                <span className="font-semibold text-slate-200">{pkg.name}</span>
              </div>
              <div className="flex gap-1 text-[10px]">
                <span className="text-slate-500">{atomsCount} 个原子</span>
              </div>
            </button>

            {isExp && (
              <div className="px-3 pb-2.5 pt-1 space-y-2 border-t border-slate-800/40 bg-slate-950/40">
                {/* 公开导出 */}
                <div>
                  <div className="text-[10px] font-semibold text-emerald-400 flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" /> 公开导出接口
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenLookup?.(`draft:${pkg.name}`)}
                      className="text-slate-400 hover:text-emerald-400 p-0.5 rounded"
                      title="新建公开导出接口"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  {exportsCount > 0 && (
                    <div className="space-y-1 pl-2">
                      {Object.entries(pkg.exports).map(([k, def]) => (
                        <button
                          type="button"
                          key={k}
                          onClick={(e) => onOpenLookup?.(k, e)}
                          className="w-full text-left text-xs font-mono text-slate-300 hover:text-emerald-300 flex items-center justify-between p-1 rounded hover:bg-slate-800/40 transition-colors"
                          title="点击就地打开，按住 Ctrl 点击新建标签页"
                        >
                          <span className="truncate">{k}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0">
                            {def.pillar}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 内部查找 */}
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1">
                      <Lock className="h-3 w-3" /> 内部私有查找
                    </span>
                    <button
                      type="button"
                      onClick={(e) => onOpenLookup?.(`draft:${pkg.name}`, e)}
                      className="text-slate-400 hover:text-indigo-400 p-0.5 rounded"
                      title="新建内部查找"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  {internalCount > 0 && (
                    <div className="space-y-1 pl-2">
                      {Object.entries(pkg.internal_lookups).map(([k, def]) => (
                        <button
                          type="button"
                          key={k}
                          onClick={(e) => onOpenLookup?.(k, e)}
                          className="w-full text-left text-xs font-mono text-slate-400 hover:text-indigo-300 flex items-center justify-between p-1 rounded hover:bg-slate-800/40 transition-colors"
                          title="点击就地打开，按住 Ctrl 点击新建标签页"
                        >
                          <span className="truncate">{k}</span>
                          <span className="text-[9px] text-slate-600">{def.pillar}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 包含原子 */}
                {atomsCount > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
                      <FileCode className="h-3 w-3" /> 包含原子清单
                    </div>
                    <div className="space-y-1 pl-2">
                      {pkg.atoms.map((atom) => (
                        <button
                          type="button"
                          key={atom.id}
                          onClick={(e) => onSelectAtom?.(atom.id, e)}
                          className="w-full text-left text-xs font-mono text-slate-400 hover:text-indigo-300 hover:bg-slate-800/60 rounded px-1.5 py-1 truncate flex items-center gap-1.5 transition-colors group"
                          title="点击就地打开，按住 Ctrl 点击新建标签页"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-indigo-400" />
                          <span className="truncate">{atom.id}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
