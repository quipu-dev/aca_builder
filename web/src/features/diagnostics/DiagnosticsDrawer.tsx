import { AlertOctagon, AlertTriangle, CheckCircle, RefreshCw, X } from 'lucide-react';

export interface TargetLocation {
  type: 'atom' | 'lookup' | 'manifest';
  id: string;
}

export interface LintIssue {
  level: string;
  code: string;
  message: string;
  target?: TargetLocation | null;
}

export function DiagnosticsDrawer({
  isOpen,
  onClose,
  errorCount,
  warnCount,
  issues,
  onRefresh,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  errorCount: number;
  warnCount: number;
  issues: LintIssue[];
  onRefresh: () => void;
  loading: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100">
      {/* 抽屉头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">合规检查与架构诊断</span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="text-slate-400 hover:text-indigo-400 transition-colors p-1"
            title="重新检查"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 状态统计栏 */}
      <div className="flex items-center justify-around border-b border-slate-800 py-2 text-xs font-mono bg-slate-950/40">
        <span className="flex items-center gap-1.5 text-rose-400">
          <AlertOctagon className="h-4 w-4" /> 错误: {errorCount}
        </span>
        <span className="flex items-center gap-1.5 text-amber-400">
          <AlertTriangle className="h-4 w-4" /> 警告: {warnCount}
        </span>
      </div>

      {/* 问题清单 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 font-mono text-xs">
        {issues.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
            <CheckCircle className="h-10 w-10 text-emerald-400 mb-2" />
            <span>所有知识库与清单均严格合规</span>
          </div>
        ) : (
          issues.map((issue) => {
            const isErr = issue.level === '错误';
            return (
              <div
                key={`${issue.level}-${issue.code}-${issue.message}`}
                className={`rounded p-2.5 border ${
                  isErr
                    ? 'border-rose-900/60 bg-rose-950/20 text-rose-200'
                    : 'border-amber-900/60 bg-amber-950/20 text-amber-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`font-semibold text-[10px] px-1.5 py-0.2 rounded ${
                      isErr ? 'bg-rose-900/80 text-rose-100' : 'bg-amber-900/80 text-amber-100'
                    }`}
                  >
                    {issue.level}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
                    {issue.code}
                  </span>
                </div>
                <div className="text-[11px] leading-relaxed break-all font-sans">
                  {issue.message}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
