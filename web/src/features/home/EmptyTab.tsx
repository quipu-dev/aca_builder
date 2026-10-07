import { AcaLogo } from '@/components/AcaLogo';
import { Button } from '@/components/ui/button';
import { Box, FilePlus2, Layers, MousePointerClick, Plus, Search } from 'lucide-react';

export function EmptyTab({
  manifestsCount,
  packagesCount,
  onOpenCommandPalette,
  onCreateManifest,
  onCreateAtom,
}: {
  manifestsCount: number;
  packagesCount: number;
  onOpenCommandPalette: () => void;
  onCreateManifest: () => void;
  onCreateAtom: () => void;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-6 text-slate-200 overflow-y-auto">
      <div className="max-w-md w-full space-y-6 text-center">
        {/* 顶部标题 */}
        <div className="space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-950/60 border border-indigo-800/40 mb-2 shadow-lg shadow-indigo-950/40">
            <AcaLogo className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold font-sans tracking-wide text-slate-100">
            ACA Studio 工作台
          </h1>
          <p className="text-xs text-slate-400 font-mono leading-relaxed">
            公理化组件架构（ACA）可视化装配与开发控制台
          </p>
        </div>

        {/* 快捷动作 */}
        <div className="grid grid-cols-2 gap-3 pt-2 text-left font-mono">
          <button
            type="button"
            onClick={onCreateManifest}
            className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-indigo-950/40 hover:border-indigo-500/50 transition-all text-xs group cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
              <FilePlus2 className="h-4 w-4" />
              <span>新建蓝图</span>
            </div>
            <span className="text-[11px] text-slate-500 font-sans">
              创建新的智能体装配清单 (Manifest)
            </span>
          </button>

          <button
            type="button"
            onClick={onCreateAtom}
            className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-emerald-950/40 hover:border-emerald-500/50 transition-all text-xs group cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Plus className="h-4 w-4" />
              <span>新建原子</span>
            </div>
            <span className="text-[11px] text-slate-500 font-sans">
              向组件包添加 D1 / D2 / D3 原子
            </span>
          </button>
        </div>

        {/* 全局搜索跳转入口 */}
        <div className="pt-1">
          <Button
            variant="outline"
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-mono border-slate-800 bg-slate-900/40 hover:bg-slate-800 text-slate-300"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-indigo-400" />
              <span>跳转到清单、原子或接口...</span>
            </div>
            <span className="text-[10px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              Ctrl + P
            </span>
          </Button>
        </div>

        {/* 交互提示与库统计 */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5 text-indigo-400" />
              {manifestsCount} 个清单
            </span>
            <span className="flex items-center gap-1">
              <Box className="h-3.5 w-3.5 text-purple-400" />
              {packagesCount} 个组件包
            </span>
          </div>

          <div
            className="flex items-center gap-1 text-slate-400"
            title="点击在当前标签页打开，按住 Ctrl 点击将在新标签页中打开"
          >
            <MousePointerClick className="h-3.5 w-3.5 text-indigo-400" />
            <span>按住 Ctrl 点击可新建标签页</span>
          </div>
        </div>
      </div>
    </div>
  );
}
