import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { markdown } from '@codemirror/lang-markdown';
import CodeMirror from '@uiw/react-codemirror';
import {
  BarChart3,
  Box,
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Edit3,
  ExternalLink,
  Layers,
  Loader2,
  Save,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface PromptChunk {
  id: string;
  type: string;
  priority?: number;
  package?: string;
  source_file?: string;
  meta: Record<string, unknown>;
  content: string;
  via_lookups: string[];
}

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

function AtomChunkCard({
  chunk,
  onUpdated,
  onOpenObsidian,
  onSelectAtom,
  onOpenLookup,
}: {
  chunk: PromptChunk;
  onUpdated?: () => void;
  onOpenObsidian?: (path: string) => void;
  onSelectAtom?: (atomId: string) => void;
  onOpenLookup?: (lookupKey: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(chunk.content);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [editorHeight, setEditorHeight] = useState<number>(200);

  const previewContainerRef = useRef<HTMLDivElement>(null);

  // 同步正文 (仅在非就地编辑态下同步，避免打断输入法组合状态)
  React.useEffect(() => {
    if (!isEditing) {
      setEditContent(chunk.content);
    }
  }, [chunk.content, isEditing]);

  // 测量只读视图精确高度以实现进入编辑器无感防跳变
  const handleStartEditing = () => {
    if (previewContainerRef.current) {
      const measuredHeight = previewContainerRef.current.getBoundingClientRect().height;
      // 保持与当前视图一致，同时设立最小舒适编辑高度
      setEditorHeight(Math.max(160, Math.round(measuredHeight)));
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/atoms/${encodeURIComponent(chunk.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setIsEditing(false);
        // 清除全局持久快照，避免点击原子 Tab 打开时还原旧内容
        const { useIdeStore } = await import('@/stores/ide-store');
        useIdeStore.getState().clearSnapshot(`atom:${chunk.id}`);
        // 派发全局事件通知已打开的对应 Atom Tab 静默更新正文
        window.dispatchEvent(
          new CustomEvent('aca:atom-updated', {
            detail: { atomId: chunk.id, content: editContent },
          }),
        );
        onUpdated?.();
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        const data = await res.json();
        setErrorMsg(data.detail || '保存失败');
      }
    } catch (_err) {
      setErrorMsg('网络请求异常');
    } finally {
      setSaving(false);
    }
  };

  const getPillarBadgeVariant = (type: string) => {
    switch (type.toLowerCase()) {
      case 'd1':
        return 'd1';
      case 'd2':
        return 'd2';
      case 'd3':
        return 'd3';
      case 'kernel':
        return 'kernel';
      default:
        return 'secondary';
    }
  };

  return (
    <div
      className={`rounded-lg border transition-all duration-200 overflow-hidden shadow-sm ${
        isEditing
          ? 'border-indigo-500/80 bg-slate-900/90 ring-1 ring-indigo-500/40'
          : saveSuccess
            ? 'border-emerald-500/80 bg-slate-900/40 ring-1 ring-emerald-500/40'
            : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700'
      }`}
    >
      {/* 块顶元数据条 */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800/70 bg-slate-950/70 text-xs font-mono">
        <div className="flex items-center gap-2 truncate">
          <Badge
            variant={getPillarBadgeVariant(chunk.type)}
            className="text-[10px] uppercase font-bold px-1.5 py-0"
          >
            {chunk.type}
            {typeof chunk.priority === 'number' ? `-P${chunk.priority}` : ''}
          </Badge>
          <button
            type="button"
            onClick={() => onSelectAtom?.(chunk.id)}
            className="font-semibold text-slate-200 truncate hover:text-indigo-300 hover:underline cursor-pointer text-left"
            title="点击打开原子组件编辑"
          >
            {chunk.id}
          </button>
          <span className="text-[10px] text-slate-500 truncate">@{chunk.package || '全局'}</span>
          {chunk.via_lookups && chunk.via_lookups.length > 0 && (
            <div className="flex items-center gap-1 truncate">
              <span className="text-[10px] text-slate-500">via:</span>
              {chunk.via_lookups.map((lKey, i) => (
                <button
                  key={lKey}
                  type="button"
                  onClick={() => onOpenLookup?.(lKey)}
                  className="text-[10px] text-indigo-400/80 bg-indigo-950/60 border border-indigo-900/50 px-1.5 py-0.2 rounded truncate hover:text-indigo-200 hover:border-indigo-700 cursor-pointer"
                  title={`点击打开 Lookup 接口: ${lKey}`}
                >
                  {lKey}
                  {i < chunk.via_lookups.length - 1 ? ',' : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {errorMsg && <span className="text-[10px] text-rose-400 font-sans">{errorMsg}</span>}
          {chunk.source_file && (
            <button
              type="button"
              onClick={() => {
                if (chunk.source_file) onOpenObsidian?.(chunk.source_file);
              }}
              className="p-1 text-slate-400 hover:text-purple-300 rounded transition-colors"
              title="在 Obsidian 中打开并编辑"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}

          {isEditing ? (
            <>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="h-6 text-[11px] px-2 flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                保存
              </Button>
              <button
                type="button"
                onClick={() => {
                  setEditContent(chunk.content);
                  setIsEditing(false);
                }}
                className="p-1 text-slate-400 hover:text-white rounded"
                title="取消编辑"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleStartEditing}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-300 hover:bg-slate-800/80 px-2 py-0.5 rounded transition-colors"
              title="就地编辑该原子正文"
            >
              <Edit3 className="h-3 w-3" />
              <span>编辑</span>
            </button>
          )}
        </div>
      </div>

      {/* 块正文内容 */}
      <div className="p-3 text-xs">
        {isEditing ? (
          <div className="rounded border border-slate-800 overflow-hidden bg-slate-950">
            <div
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSave();
                }
              }}
            >
              <CodeMirror
                value={editContent}
                height={`${editorHeight}px`}
                extensions={[markdown()]}
                theme="dark"
                onChange={(val) => setEditContent(val)}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  highlightActiveLine: true,
                  closeBrackets: false,
                }}
                className="text-xs font-mono"
              />
            </div>
          </div>
        ) : (
          <div
            ref={previewContainerRef}
            onDoubleClick={handleStartEditing}
            className="cursor-text text-slate-300 select-text selection:bg-indigo-600/40 selection:text-indigo-100"
            title="双击进入就地编辑模式"
          >
            {chunk.content ? (
              <div className="markdown-render">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{chunk.content}</ReactMarkdown>
              </div>
            ) : (
              <span className="text-slate-600 italic font-mono">（该原子内容为空）</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function PromptViewer({
  value,
  hookedValue,
  chunks = [],
  profile,
  onSelectAtom,
  onOpenLookup,
  onReload,
  isHookActive = false,
  onToggleHook,
}: {
  value: string;
  hookedValue?: string | null;
  chunks?: PromptChunk[];
  profile?: ProfileSummary | null;
  onSelectAtom?: (atomId: string) => void;
  onOpenLookup?: (lookupKey: string) => void;
  onReload?: () => void;
  isHookActive?: boolean;
  onToggleHook?: (active: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [displayMode, setDisplayMode] = useState<'chunks' | 'raw'>('chunks');

  const currentDisplayPrompt = isHookActive && hookedValue ? hookedValue : value;

  const handleCopy = () => {
    if (!currentDisplayPrompt) return;
    navigator.clipboard.writeText(currentDisplayPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenObsidian = async (filePath: string) => {
    try {
      await fetch('/api/system/open-obsidian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: filePath }),
      });
    } catch (_err) {
      // 忽略调起异常
    }
  };

  const lineCount = currentDisplayPrompt ? currentDisplayPrompt.split('\n').length : 0;
  const charCount = currentDisplayPrompt ? currentDisplayPrompt.length : 0;
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
      {/* 状态统计与视口开关条 */}
      <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-slate-800/60 bg-slate-900/60 text-xs font-mono text-slate-400 shrink-0">
        <div className="flex items-center gap-2 text-[11px]">
          <span>
            <strong className="text-slate-200">{chunks.length}</strong> 块
          </span>
          <span className="text-slate-600">·</span>
          <span>
            <strong className="text-slate-200">{lineCount}</strong> 行
          </span>
          <span className="text-slate-600">·</span>
          <span>
            <strong className="text-indigo-400">~{estimatedTokens}</strong> tokens
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 模式切换 */}
          <div className="flex items-center rounded bg-slate-950 border border-slate-800/80 p-0.5">
            <button
              type="button"
              onClick={() => setDisplayMode('chunks')}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                displayMode === 'chunks'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="分块卡片流呈现"
            >
              <Layers className="h-3 w-3" />
              <span>分块</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('raw')}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                displayMode === 'raw'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="完整纯文本视口"
            >
              <Code2 className="h-3 w-3" />
              <span>文本</span>
            </button>
          </div>

          {/* After 钩子微型开关 */}
          <button
            type="button"
            onClick={() => onToggleHook?.(!isHookActive)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border font-mono transition-colors ${
              isHookActive
                ? 'border-amber-500/80 bg-amber-950/60 text-amber-200 font-semibold'
                : 'border-slate-800 text-slate-400 hover:text-slate-200 bg-slate-950/50'
            }`}
            title={`Post-process 钩子处理管道: ${isHookActive ? '已开启' : '已关闭'}`}
          >
            <Wand2 className="h-3 w-3" />
            <span>Hook</span>
          </button>

          {/* Token 分布抽屉开关 */}
          {profile && profile.atoms.length > 0 && (
            <button
              type="button"
              onClick={() => setShowBreakdown((prev) => !prev)}
              className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors ${
                showBreakdown
                  ? 'border-indigo-500/80 bg-indigo-950/60 text-indigo-200'
                  : 'border-slate-800 text-slate-400 hover:text-slate-200 bg-slate-950/50'
              }`}
              title="查看各原子 Token 消耗排行"
            >
              <BarChart3 className="h-3 w-3 text-indigo-400" />
              <span>分布</span>
              {showBreakdown ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          )}

          {/* 复制按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!currentDisplayPrompt}
            className="h-6 text-[11px] px-2 flex items-center gap-1 border-slate-800 bg-slate-950/50 hover:bg-slate-800"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? '已复制' : '复制'}</span>
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
                title={`Kernel: ${kernelTokens} tokens (${kernelPct}%)`}
              />
            )}
            {d3Tokens > 0 && (
              <div
                style={{ width: `${d3Pct}%` }}
                className="bg-purple-500 hover:brightness-125 transition-all"
                title={`D3: ${d3Tokens} tokens (${d3Pct}%)`}
              />
            )}
            {d2Tokens > 0 && (
              <div
                style={{ width: `${d2Pct}%` }}
                className="bg-emerald-500 hover:brightness-125 transition-all"
                title={`D2: ${d2Tokens} tokens (${d2Pct}%)`}
              />
            )}
            {d1Tokens > 0 && (
              <div
                style={{ width: `${d1Pct}%` }}
                className="bg-cyan-500 hover:brightness-125 transition-all"
                title={`D1: ${d1Tokens} tokens (${d1Pct}%)`}
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

      {/* 主展示区：分块视图 VS 纯代码视图 */}
      <div className="flex-1 overflow-auto p-3">
        {displayMode === 'chunks' && !isHookActive ? (
          chunks.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-xs text-slate-600 font-mono">
              <Box className="h-8 w-8 text-slate-700 mb-2" />
              暂无装配好的原子块
            </div>
          ) : (
            <div className="space-y-3">
              {chunks.map((chunk) => (
                <AtomChunkCard
                  key={chunk.id}
                  chunk={chunk}
                  onUpdated={onReload}
                  onOpenObsidian={handleOpenObsidian}
                  onSelectAtom={onSelectAtom}
                  onOpenLookup={onOpenLookup}
                />
              ))}
            </div>
          )
        ) : (
          <div className="h-full">
            {isHookActive && (
              <div className="mb-2 px-3 py-1.5 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs font-mono flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>当前正处于 After 钩子处理后的纯文本视口（只读）。</span>
              </div>
            )}
            <CodeMirror
              value={currentDisplayPrompt}
              height="100%"
              extensions={[markdown()]}
              editable={false}
              theme="dark"
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                highlightActiveLine: false,
              }}
              className="text-xs font-mono h-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
