import { Button } from '@/components/ui/button';
import { markdown } from '@codemirror/lang-markdown';
import CodeMirror from '@uiw/react-codemirror';
import { BarChart3, Check, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import React, { useState } from 'react';

export interface AtomTokenProfile {
  id: string;
  type: string;
  priority?: number;
  package?: string;
  source_file?: string;
  char_count: number;
  estimated_tokens: number;
  via_lookups: string[];
}

export interface ProfileSummary {
  total_tokens: number;
  by_pillar: Record<string, number>;
  atoms: AtomTokenProfile[];
}

export function PromptViewer({
  value,
  profile,
  onSelectAtom,
}: {
  value: string;
  profile?: ProfileSummary | null;
  onSelectAtom?: (atomId: string) => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = value ? value.split('\n').length : 0;
  const charCount = value ? value.length : 0;
  const estimatedTokens = profile?.total_tokens ?? Math.round(charCount / 3.8);

  const d3Tokens = profile?.by_pillar?.d3 || 0;
  const d2Tokens = profile?.by_pillar?.d2 || 0;
  const d1Tokens = profile?.by_pillar?.d1 || 0;
  const kernelTokens = profile?.by_pillar?.kernel || 0;
  const totalProfileTokens = Math.max(1, profile?.total_tokens || 1);

  const d3Pct = Math.round((d3Tokens / totalProfileTokens) * 100);
  const d2Pct = Math.round((d2Tokens / totalProfileTokens) * 100);
  const d1Pct = Math.round((d1Tokens / totalProfileTokens) * 100);
  const kernelPct = Math.round((kernelTokens / totalProfileTokens) * 100);

  return (
    <div className="flex h-full flex-col bg-slate-950 border border-slate-800/80 rounded-lg overflow-hidden">
      {/* 状态统计条 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/60 bg-slate-900/60 text-xs font-mono text-slate-400">
        <div className="flex items-center space-x-4">
          <span>
            行数: <strong className="text-slate-200">{lineCount}</strong>
          </span>
          <span>
            字符: <strong className="text-slate-200">{charCount}</strong>
          </span>
          <span>
            估算词元: <strong className="text-indigo-400">~{estimatedTokens}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {profile && profile.atoms.length > 0 && (
            <button
              type="button"
              onClick={() => setShowBreakdown((prev) => !prev)}
              className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-2 py-1 rounded transition-colors"
            >
              <BarChart3 className="h-3 w-3 text-indigo-400" />
              <span>Token 构成</span>
              {showBreakdown ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!value}
            className="h-7 text-xs flex items-center gap-1.5"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? '已复制' : '复制输出'}
          </Button>
        </div>
      </div>

      {/* Token 构成堆叠比例条 */}
      {profile && (
        <div className="px-4 py-2 border-b border-slate-800/60 bg-slate-950">
          <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-900 border border-slate-800/50">
            {kernelTokens > 0 && (
              <div
                style={{ width: `${kernelPct}%` }}
                className="bg-amber-500 hover:brightness-125 transition-all"
                title={`Kernel 核心协议: ${kernelTokens} tokens (${kernelPct}%)`}
              />
            )}
            {d3Tokens > 0 && (
              <div
                style={{ width: `${d3Pct}%` }}
                className="bg-purple-500 hover:brightness-125 transition-all"
                title={`D3 控制基质: ${d3Tokens} tokens (${d3Pct}%)`}
              />
            )}
            {d2Tokens > 0 && (
              <div
                style={{ width: `${d2Pct}%` }}
                className="bg-emerald-500 hover:brightness-125 transition-all"
                title={`D2 程序基质: ${d2Tokens} tokens (${d2Pct}%)`}
              />
            )}
            {d1Tokens > 0 && (
              <div
                style={{ width: `${d1Pct}%` }}
                className="bg-cyan-500 hover:brightness-125 transition-all"
                title={`D1 陈述基质: ${d1Tokens} tokens (${d1Pct}%)`}
              />
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Kernel: {kernelTokens} ({kernelPct}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              D3: {d3Tokens} ({d3Pct}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              D2: {d2Tokens} ({d2Pct}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              D1: {d1Tokens} ({d1Pct}%)
            </span>
          </div>
        </div>
      )}

      {/* 详细原子 Token 消耗排行榜抽屉面板 */}
      {showBreakdown && profile && (
        <div className="max-h-48 overflow-y-auto border-b border-slate-800 bg-slate-900/95 p-3 space-y-1.5 text-xs font-mono">
          <div className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
            <span>组件词元消耗排行 (按估算 Token 降序)</span>
            <span className="text-[10px] text-slate-500 font-normal">点击原子可定位编辑</span>
          </div>
          {profile.atoms.map((atom, idx) => {
            const pct = Math.round((atom.estimated_tokens / totalProfileTokens) * 100);
            return (
              <div
                key={atom.id}
                className="flex items-center justify-between p-1.5 rounded bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/50 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-slate-600 font-bold w-4 text-right">{idx + 1}.</span>
                  <button
                    type="button"
                    onClick={() => onSelectAtom?.(atom.id)}
                    className="text-slate-200 hover:text-indigo-400 font-medium truncate text-left"
                    title={atom.id}
                  >
                    {atom.id}
                  </button>
                  <span className="text-[9px] uppercase px-1 rounded bg-slate-800 text-slate-400">
                    {atom.type}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-slate-400 text-[11px]">
                  <span>{atom.estimated_tokens} tokens</span>
                  <span className="text-indigo-400 w-8 text-right">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 代码视口 */}
      <div className="flex-1 overflow-auto">
        <CodeMirror
          value={value}
          height="100%"
          extensions={[markdown()]}
          editable={false}
          theme="dark"
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: false,
          }}
          className="text-xs font-mono"
        />
      </div>
    </div>
  );
}
