import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, FileCode, Globe, Lock, Package } from 'lucide-react';
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

export function PackageExplorer({ packages }: { packages: PackageItem[] }) {
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
                {exportsCount > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 mb-1">
                      <Globe className="h-3 w-3" /> 公开导出接口
                    </div>
                    <div className="space-y-1 pl-2">
                      {Object.entries(pkg.exports).map(([k, def]) => (
                        <div
                          key={k}
                          className="text-xs font-mono text-slate-300 flex items-center justify-between"
                        >
                          <span className="truncate">{k}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0">
                            {def.pillar}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 内部查找 */}
                {internalCount > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
                      <Lock className="h-3 w-3" /> 内部私有查找
                    </div>
                    <div className="space-y-1 pl-2">
                      {Object.entries(pkg.internal_lookups).map(([k, def]) => (
                        <div
                          key={k}
                          className="text-xs font-mono text-slate-400 flex items-center justify-between"
                        >
                          <span className="truncate">{k}</span>
                          <span className="text-[9px] text-slate-600">{def.pillar}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 包含原子 */}
                {atomsCount > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
                      <FileCode className="h-3 w-3" /> 包含原子清单
                    </div>
                    <div className="space-y-1 pl-2">
                      {pkg.atoms.map((atom) => (
                        <div
                          key={atom.id}
                          className="text-xs font-mono text-slate-400 truncate flex items-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                          <span>{atom.id}</span>
                        </div>
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
