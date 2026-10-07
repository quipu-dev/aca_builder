import { Badge } from '@/components/ui/badge';
import { ConfirmIconButton } from '@/components/ui/confirm-button';
import { useIdeStore } from '@/stores/ide-store';
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  Globe,
  Lock,
  Package,
  Plus,
  Settings2,
} from 'lucide-react';
import type React from 'react';

export interface LookupExportItem {
  pillar?: string;
  description?: string;
  visibility?: string;
  selectors?: unknown[];
  union?: unknown[];
  exclude?: unknown[];
  intersect?: unknown[];
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
  version?: string;
  description?: string;
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
  onEditPackage,
  onDeletePackage,
  onDeleteLookup,
  onDeleteAtom,
}: {
  packages: PackageItem[];
  kernel?: KernelInfo | null;
  onSelectAtom?: (atomId: string, e?: React.MouseEvent) => void;
  onOpenLookup?: (lookupKey: string, e?: React.MouseEvent) => void;
  onCreateKernel?: () => void;
  onEditPackage?: (pkg: PackageItem) => void;
  onDeletePackage?: (pkgName: string, e: React.MouseEvent) => void;
  onDeleteLookup?: (lookupKey: string, e: React.MouseEvent) => void;
  onDeleteAtom?: (atomId: string, e: React.MouseEvent) => void;
}) {
  const explorerExpanded = useIdeStore((state) => state.explorerExpanded);
  const toggleExplorerExpanded = useIdeStore((state) => state.toggleExplorerExpanded);

  const sortedPackages = [...packages].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-2">
      {/* 置顶 Kernel 核心协议 */}
      <div className="rounded border border-slate-800/80 bg-slate-900/40 p-2 font-mono text-xs">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="text-[9px] uppercase font-bold px-1.5 py-0 text-amber-400/90 border-amber-700/40 bg-amber-950/20"
            >
              KERNEL
            </Badge>
            <span className="font-medium text-slate-400 text-[11px]">核心协议</span>
          </div>
          {kernel && onDeleteAtom && (
            <ConfirmIconButton
              onConfirm={(e) => onDeleteAtom('kernel', e)}
              title="删除 Kernel 核心协议 (Shift+点击快速删除)"
              iconClassName="h-3 w-3"
            />
          )}
        </div>

        {kernel ? (
          <button
            type="button"
            onClick={(e) => onSelectAtom?.('kernel', e)}
            className="w-full flex items-center justify-between px-2 py-1 rounded bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:text-slate-100 transition-colors text-slate-300 text-left cursor-pointer"
            title="点击打开编辑 Kernel 协议"
          >
            <span className="truncate font-medium">kernel</span>
            <span className="text-[10px] text-slate-500">已就绪</span>
          </button>
        ) : (
          <div className="space-y-1.5 pt-0.5">
            <div className="text-[11px] text-slate-400">当前工作区缺少 kernel 协议</div>
            <button
              type="button"
              onClick={onCreateKernel}
              className="w-full py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] flex items-center justify-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> 初始化 Kernel
            </button>
          </div>
        )}
      </div>

      {sortedPackages.length === 0 ? (
        <div className="py-6 text-center text-xs font-mono text-slate-500">暂无组件包</div>
      ) : (
        sortedPackages.map((pkg) => {
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
                  {pkg.version && (
                    <span className="text-[9px] text-slate-500 bg-slate-950 px-1 py-0.2 rounded border border-slate-800">
                      v{pkg.version}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 ml-auto shrink-0">
                    ({atomsCount})
                  </span>
                </button>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0 flex items-center gap-0.5">
                  {onEditPackage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditPackage(pkg);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800/80 transition-colors"
                      title="编辑包版本与说明"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {onDeletePackage && (
                    <ConfirmIconButton
                      onConfirm={(e) => onDeletePackage(pkg.name, e)}
                      title={`删除组件包 ${pkg.name} (Shift+点击快速删除)`}
                      iconClassName="h-3.5 w-3.5"
                    />
                  )}
                </div>
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
                        onClick={() => onOpenLookup?.(`draft:${pkg.name}:public_${Date.now()}`)}
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
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <ConfirmIconButton
                                  onConfirm={(e) => onDeleteLookup(k, e)}
                                  title="删除此公开接口 (Shift+点击快速删除)"
                                  iconClassName="h-3 w-3"
                                />
                              </div>
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
                        onClick={(e) =>
                          onOpenLookup?.(`draft:${pkg.name}:private_${Date.now()}`, e)
                        }
                        className="text-slate-400 hover:text-indigo-400 p-0.5 rounded cursor-pointer"
                        title="新建内部查找"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    {internalCount > 0 && (
                      <div className="space-y-1 pl-2">
                        {Object.entries(pkg.internal_lookups).map(([k, def]) => {
                          const displayKey = k.split('::').pop() || k;
                          return (
                            <div
                              key={k}
                              className="w-full text-left text-xs font-mono text-slate-400 hover:text-indigo-300 flex items-center justify-between p-1 rounded hover:bg-slate-800/40 transition-colors group cursor-pointer"
                            >
                              <button
                                type="button"
                                onClick={(e) => onOpenLookup?.(k, e)}
                                className="flex-1 text-left truncate flex items-center gap-1 cursor-pointer"
                                title={`点击打开 (${k})`}
                              >
                                <span className="truncate">{displayKey}</span>
                                <span className="text-[9px] text-slate-600">{def.pillar}</span>
                              </button>
                              {onDeleteLookup && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <ConfirmIconButton
                                    onConfirm={(e) => onDeleteLookup(k, e)}
                                    title="删除此内部查找 (Shift+点击快速删除)"
                                    iconClassName="h-3 w-3"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
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
                          onSelectAtom?.(`draft:${pkg.name}:${Date.now()}`, e);
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
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <ConfirmIconButton
                                  onConfirm={(e) => onDeleteAtom(atom.id, e)}
                                  title="删除此原子组件 (Shift+点击快速删除)"
                                  iconClassName="h-3 w-3"
                                />
                              </div>
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
