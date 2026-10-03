import { Badge } from '@/components/ui/badge';
import { useIdeStore } from '@/stores/ide-store';
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

export interface LookupExportItem {
  pillar?: string;
  description?: string;
  visibility?: string;
  selectors?: unknown[];
}

export interface KernelInfo {
  id: string;
  type: string;
  source_file?: string;
  content?: string;
  meta?: Record<string, unknown>;
}

export interface PackageItem {
  name: string;
  workspace?: string;
  workspace_path?: string;
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
  kernel,
  onSelectAtom,
  onOpenLookup,
  onCreateKernel,
  onDeletePackage,
  onDeleteLookup,
  onDeleteAtom,
}: {
  packages: PackageItem[];
  kernel?: KernelInfo | null;
  onSelectAtom?: (atomId: string, e?: React.MouseEvent) => void;
  onOpenLookup?: (lookupKey: string, e?: React.MouseEvent) => void;
  onCreateKernel?: () => void;
  onDeletePackage?: (pkgName: string, e: React.MouseEvent) => void;
  onDeleteLookup?: (lookupKey: string, e: React.MouseEvent) => void;
  onDeleteAtom?: (atomId: string, e: React.MouseEvent) => void;
}) {
  const explorerExpanded = useIdeStore((state) => state.explorerExpanded);
  const toggleExplorerExpanded = useIdeStore((state) => state.toggleExplorerExpanded);

  return (
    <div className="space-y-2">
      {/* 置顶 Kernel 核心协议卡片 */}
      <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-2 font-mono text-xs">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Badge variant="kernel" className="text-[9px] uppercase font-bold px-1.5 py-0">
              KERNEL
            </Badge>
            <span className="font-semibold text-amber-200 text-[11px]">核心协议</span>
          </div>
          {kernel && onDeleteAtom && (
            <button
              type="button"
              onClick={(e) => onDeleteAtom('kernel', e)}
              className="p-0.5 text-slate-500 hover:text-rose-400 rounded transition-colors"
              title="删除 Kernel 核心协议"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>

        {kernel ? (
          <button
            type="button"
            onClick={(e) => onSelectAtom?.('kernel', e)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded bg-slate-900/80 border border-amber-900/40 hover:border-amber-500/60 hover:text-amber-100 transition-colors text-slate-300 text-left cursor-pointer"
            title="点击打开编辑 Kernel 协议"
          >
            <span className="truncate font-semibold">kernel.md</span>
            <span className="text-[10px] text-amber-400/80">已就绪</span>
          </button>
        ) : (
          <div className="space-y-1.5 pt-0.5">
            <div className="text-[11px] text-amber-300/80">当前工作区缺少 kernel.md 协议</div>
            <button
              type="button"
              onClick={onCreateKernel}
              className="w-full py-1 px-2 rounded bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-200 text-[11px] flex items-center justify-center gap-1 font-semibold transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> 初始化 Kernel
            </button>
          </div>
        )}
      </div>

      {packages.length === 0 ? (
        <div className="py-6 text-center text-xs font-mono text-slate-500">暂无组件包</div>
      ) : (
        packages.map((pkg) => {
          const pkgKey = `pkg:${pkg.name}`;
          const isExp = explorerExpanded[pkgKey] === true; // 默认折叠
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
                  onClick={() => toggleExplorerExpanded(pkgKey)}
                  className="flex items-center gap-2 flex-1 text-left cursor-pointer truncate"
                >
                  {isExp ? (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  )}
                  <Package className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span className="font-semibold text-slate-200 truncate">{pkg.name}</span>
                  <span className="text-[10px] text-slate-500 ml-auto shrink-0">
                    ({atomsCount})
                  </span>
                </button>
                {onDeletePackage && (
                  <button
                    type="button"
                    onClick={(e) => onDeletePackage(pkg.name, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity rounded cursor-pointer shrink-0 ml-1"
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
                        className="text-slate-400 hover:text-emerald-400 p-0.5 rounded cursor-pointer"
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
                              title="点击打开"
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
                              title="点击打开"
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
                        title="新建原子组件"
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
                              title="点击打开原子"
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
        })
      )}
    </div>
  );
}
