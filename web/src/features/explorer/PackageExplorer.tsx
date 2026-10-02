import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  Globe,
  Lock,
  Package,
  Plus,
  Trash2,
} from 'lucide-react';
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
  onDeletePackage,
  onDeleteLookup,
  onDeleteAtom,
}: {
  packages: PackageItem[];
  onSelectAtom?: (atomId: string, e?: React.MouseEvent) => void;
  onOpenLookup?: (lookupKey: string, e?: React.MouseEvent) => void;
  onDeletePackage?: (pkgName: string, e: React.MouseEvent) => void;
  onDeleteLookup?: (lookupKey: string, e: React.MouseEvent) => void;
  onDeleteAtom?: (atomId: string, e: React.MouseEvent) => void;
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
            <div className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-slate-800/40 text-xs font-mono transition-colors group">
              <button
                type="button"
                onClick={() => toggle(pkg.name)}
                className="flex items-center gap-2 flex-1 text-left cursor-pointer"
              >
                {isExp ? (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                )}
                <Package className="h-3.5 w-3.5 text-indigo-400" />
                <span className="font-semibold text-slate-200">{pkg.name}</span>
                <span className="text-[10px] text-slate-500 ml-1">({atomsCount})</span>
              </button>
              {onDeletePackage && (
                <button
                  type="button"
                  onClick={(e) => onDeletePackage(pkg.name, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity rounded cursor-pointer"
                  title={`删除组件包 ${pkg.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

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
                        <div
                          key={k}
                          className="w-full text-left text-xs font-mono text-slate-300 hover:text-emerald-300 flex items-center justify-between p-1 rounded hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        >
                          <button
                            type="button"
                            onClick={(e) => onOpenLookup?.(k, e)}
                            className="flex-1 text-left truncate flex items-center gap-1 cursor-pointer"
                            title="点击打开，按住 Ctrl 点击新建标签页"
                          >
                            <span className="truncate">{k}</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0">
                              {def.pillar}
                            </Badge>
                          </button>
                          {onDeleteLookup && (
                            <button
                              type="button"
                              onClick={(e) => onDeleteLookup(k, e)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 rounded cursor-pointer transition-opacity"
                              title="删除此公开接口"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
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
                      className="text-slate-400 hover:text-indigo-400 p-0.5 rounded cursor-pointer"
                      title="新建内部查找"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  {internalCount > 0 && (
                    <div className="space-y-1 pl-2">
                      {Object.entries(pkg.internal_lookups).map(([k, def]) => (
                        <div
                          key={k}
                          className="w-full text-left text-xs font-mono text-slate-400 hover:text-indigo-300 flex items-center justify-between p-1 rounded hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        >
                          <button
                            type="button"
                            onClick={(e) => onOpenLookup?.(k, e)}
                            className="flex-1 text-left truncate flex items-center gap-1 cursor-pointer"
                            title="点击打开，按住 Ctrl 点击新建标签页"
                          >
                            <span className="truncate">{k}</span>
                            <span className="text-[9px] text-slate-600">{def.pillar}</span>
                          </button>
                          {onDeleteLookup && (
                            <button
                              type="button"
                              onClick={(e) => onDeleteLookup(k, e)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 rounded cursor-pointer transition-opacity"
                              title="删除此内部查找"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 包含原子 */}
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1">
                      <FileCode className="h-3 w-3" /> 包含原子清单
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAtom?.(`draft:${pkg.name}`, e);
                      }}
                      className="text-slate-400 hover:text-indigo-400 p-0.5 rounded transition-colors cursor-pointer"
                      title={`在包 ${pkg.name} 中新建原子组件`}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  {atomsCount > 0 && (
                    <div className="space-y-1 pl-2">
                      {pkg.atoms.map((atom) => (
                        <div
                          key={atom.id}
                          className="w-full text-left text-xs font-mono text-slate-400 hover:text-indigo-300 hover:bg-slate-800/60 rounded px-1.5 py-1 truncate flex items-center justify-between transition-colors group cursor-pointer"
                        >
                          <button
                            type="button"
                            onClick={(e) => onSelectAtom?.(atom.id, e)}
                            className="flex items-center gap-1.5 flex-1 min-w-0 text-left cursor-pointer"
                            title="点击就地打开，按住 Ctrl 点击新建标签页"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-indigo-400 shrink-0" />
                            <span className="truncate">{atom.id}</span>
                          </button>
                          {onDeleteAtom && (
                            <button
                              type="button"
                              onClick={(e) => onDeleteAtom(atom.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 rounded cursor-pointer transition-opacity"
                              title="删除此原子组件"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
