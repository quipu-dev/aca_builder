import {
  type ProfileSummary,
  type PromptChunk,
  PromptViewer,
} from '@/components/editor/PromptViewer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SplitPane } from '@/components/ui/split-pane';
import type { PackageItem } from '@/features/explorer/PackageExplorer';
import { TopologyGraph } from '@/features/graph/TopologyGraph';
import { useIdeStore } from '@/stores/ide-store';
import {
  AlertCircle,
  Box,
  Code2,
  ExternalLink,
  Filter,
  Layers,
  Link2,
  Loader2,
  Network,
  Plus,
  Save,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export interface MatchedAtom {
  id: string;
  type: string;
  priority?: number;
  package?: string;
  source_file?: string;
  domain: string[];
  preview: string;
}

export interface SelectorRule {
  query?: {
    id?: string;
    domain?: string[];
    [key: string]: unknown;
  };
  ref?: string;
}

export function LookupEditorTab({
  lookupKey,
  packages,
  onSaved,
}: {
  lookupKey: string;
  packages: PackageItem[];
  onSaved?: () => void;
}) {
  const setTabDirty = useIdeStore((state) => state.setTabDirty);
  const openTab = useIdeStore((state) => state.openTab);
  const saveSnapshot = useIdeStore((state) => state.saveSnapshot);
  const getSnapshot = useIdeStore((state) => state.getSnapshot);

  const isDraft = lookupKey.startsWith('draft:');
  const initialPkg = isDraft ? lookupKey.replace('draft:', '') : '';

  // 基础元信息与就绪守卫
  const [isReady, setIsReady] = useState(false);
  const [pkgName, setPkgName] = useState(initialPkg || packages[0]?.name || '');
  const [isPublic, setIsPublic] = useState(true);
  const [pillar, setPillar] = useState<'d1' | 'd2' | 'd3'>('d1');
  const [rawKeyName, setRawKeyName] = useState('');
  const [description, setDescription] = useState('');

  // 选择器规则列表
  const [selectors, setSelectors] = useState<SelectorRule[]>([]);
  const [isModified, setIsModified] = useState(false);

  // 右侧多维视口切换：'atoms' (命中原子) | 'graph' (白板拓扑) | 'prompt' (切片编译)
  const [rightView, setRightView] = useState<'atoms' | 'graph' | 'prompt'>('atoms');

  // 实时演算状态 (Atoms 模式)
  const [matchedAtoms, setMatchedAtoms] = useState<MatchedAtom[]>([]);
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState('');

  // 实时切片编译状态 (Prompt 模式)
  const [slicePrompt, setSlicePrompt] = useState<string>('');
  const [sliceChunks, setSliceChunks] = useState<PromptChunk[]>([]);
  const [sliceProfile, setProfile] = useState<ProfileSummary | null>(null);

  // 保存状态
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // 新增选择器临时状态
  const [selectorMode, setSelectorMode] = useState<'id' | 'domain' | 'ref'>('id');
  const [queryIdInput, setQueryIdInput] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [refInput, setRefInput] = useState('');

  const tabId = `lookup:${lookupKey}`;

  const markDirty = () => {
    if (!isModified) {
      setIsModified(true);
      setTabDirty(tabId, true);
    }
  };

  // 1. 初始化优先水合已存在的 Lookup 快照
  useEffect(() => {
    const snapshot = getSnapshot<{
      pkgName: string;
      isPublic: boolean;
      pillar: 'd1' | 'd2' | 'd3';
      rawKeyName: string;
      description: string;
      selectors: SelectorRule[];
      rightView: 'atoms' | 'graph' | 'prompt';
      isModified: boolean;
    }>(tabId);

    if (snapshot) {
      setPkgName(snapshot.pkgName);
      setIsPublic(snapshot.isPublic);
      setPillar(snapshot.pillar);
      setRawKeyName(snapshot.rawKeyName);
      setDescription(snapshot.description);
      setSelectors(snapshot.selectors);
      setRightView(snapshot.rightView);
      setIsModified(snapshot.isModified);
      setTabDirty(tabId, snapshot.isModified);
      setIsReady(true);
      return;
    }

    if (isDraft) {
      setIsReady(true);
      return;
    }

    const rawKey = lookupKey.includes('::') ? lookupKey.split('::')[1] : lookupKey;
    const targetPkg = lookupKey.includes('::') ? lookupKey.split('::')[0] : null;

    for (const pkg of packages) {
      if (targetPkg && pkg.name !== targetPkg) continue;

      const exportDef =
        pkg.exports?.[lookupKey] ||
        pkg.exports?.[`${pkg.name}::${rawKey}`] ||
        pkg.exports?.[rawKey];

      if (exportDef) {
        setPkgName(pkg.name);
        setPillar((exportDef.pillar as 'd1' | 'd2' | 'd3') || 'd1');
        setIsPublic(true);
        setDescription(exportDef.description || '');
        setRawKeyName(rawKey.replace(/^d[1-3]l-/, '') || '');
        setSelectors((exportDef.selectors as SelectorRule[]) || []);
        setIsReady(true);
        return;
      }

      const internalDef = pkg.internal_lookups?.[lookupKey] || pkg.internal_lookups?.[rawKey];
      if (internalDef) {
        setPkgName(pkg.name);
        setPillar((internalDef.pillar as 'd1' | 'd2' | 'd3') || 'd1');
        setIsPublic(false);
        setDescription(internalDef.description || '');
        setRawKeyName(rawKey.replace(/^d[1-3]l-/, '') || '');
        setSelectors((internalDef.selectors as SelectorRule[]) || []);
        setIsReady(true);
        return;
      }
    }
  }, [lookupKey, packages, isDraft, tabId, getSnapshot, setTabDirty]);

  // 2. 持续向全局快照池同步 (必须就绪后才允许持久化)
  useEffect(() => {
    if (!isReady) return;
    saveSnapshot(tabId, {
      pkgName,
      isPublic,
      pillar,
      rawKeyName,
      description,
      selectors,
      rightView,
      isModified,
    });
  }, [
    isReady,
    tabId,
    pkgName,
    isPublic,
    pillar,
    rawKeyName,
    description,
    selectors,
    rightView,
    isModified,
    saveSnapshot,
  ]);

  // 2. 实时演算核心：根据当前选中的视口按需防抖计算
  const runLiveDebug = useCallback(() => {
    if (selectors.length === 0) {
      setMatchedAtoms([]);
      setSlicePrompt('');
      setSliceChunks([]);
      setProfile(null);
      setEvalError('');
      return;
    }

    setEvaluating(true);
    setEvalError('');

    const targetKey = `${pillar}l-${rawKeyName.trim() || 'adhoc'}`;

    if (rightView === 'prompt') {
      fetch('/api/lookups/compile-adhoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: targetKey,
          selectors,
          package: pkgName,
          pillar,
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}: 编译切片失败`);
          return res.json();
        })
        .then((data) => {
          setSlicePrompt(data.prompt || '');
          setSliceChunks(data.chunks || []);
          setProfile(data.profile || null);
        })
        .catch((err) => {
          setEvalError(err.message || '编译切片请求异常');
        })
        .finally(() => setEvaluating(false));
    } else {
      // atoms 模式与 graph 模式通用原子命中计算
      fetch('/api/lookups/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectors,
          package: pkgName,
          pillar,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setEvalError(data.error);
            setMatchedAtoms([]);
          } else {
            setMatchedAtoms(data.matched_atoms || []);
          }
        })
        .catch((err) => {
          setEvalError(err.message || '演算请求失败');
        })
        .finally(() => setEvaluating(false));
    }
  }, [selectors, pkgName, pillar, rawKeyName, rightView]);

  useEffect(() => {
    const timer = setTimeout(() => {
      runLiveDebug();
    }, 200);
    return () => clearTimeout(timer);
  }, [runLiveDebug]);

  // 当前包内的可选原子列表
  const currentPkgObj = packages.find((p) => p.name === pkgName);
  const currentPillarAtoms = (currentPkgObj?.atoms || []).filter((a) => a.type === pillar);

  // 添加选择器
  const handleAddSelector = () => {
    if (selectorMode === 'id' && queryIdInput.trim()) {
      setSelectors([...selectors, { query: { id: queryIdInput.trim() } }]);
      setQueryIdInput('');
      markDirty();
    } else if (selectorMode === 'domain' && domainInput.trim()) {
      const domains = domainInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      setSelectors([...selectors, { query: { domain: domains } }]);
      setDomainInput('');
      markDirty();
    } else if (selectorMode === 'ref' && refInput.trim()) {
      setSelectors([...selectors, { ref: refInput.trim() }]);
      setRefInput('');
      markDirty();
    }
  };

  const handleRemoveSelector = (index: number) => {
    setSelectors(selectors.filter((_, i) => i !== index));
    markDirty();
  };

  // 保存查找接口
  const handleSave = async () => {
    const cleanSuffix = rawKeyName
      .trim()
      .toLowerCase()
      .replace(/^d[1-3]l-/, '')
      .replace(/[^a-z0-9_-]/g, '-');

    if (!cleanSuffix || selectors.length === 0) return;

    setSaving(true);
    setSaveStatus('正在写入...');
    try {
      const res = await fetch('/api/lookups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package: pkgName,
          key: `${pillar}l-${cleanSuffix}`,
          pillar,
          is_public: isPublic,
          description: description.trim(),
          selectors,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSaveStatus('已保存');
        setIsModified(false);
        setTabDirty(tabId, false);
        onSaved?.();
        setTimeout(() => setSaveStatus(''), 2500);
      } else {
        setSaveStatus(`保存失败: ${data.detail}`);
      }
    } catch (_err) {
      setSaveStatus('保存请求异常');
    } finally {
      setSaving(false);
    }
  };

  const fullLookupKey = `${pillar}l-${rawKeyName.trim() || '...'}`;

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100 overflow-hidden select-none font-mono">
      {/* 顶部操作条 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60 text-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-200">{fullLookupKey}</span>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase font-bold px-1.5 py-0">
            {pillar}
          </Badge>
          <span className="text-slate-500 text-[11px]">@{pkgName}</span>
        </div>

        <div className="flex items-center gap-2">
          {saveStatus && <span className="text-xs text-indigo-400">{saveStatus}</span>}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || selectors.length === 0}
            className="h-7 text-xs flex items-center gap-1.5 px-3 bg-indigo-600 hover:bg-indigo-500"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            <span>保存接口定义</span>
          </Button>
        </div>
      </div>

      {/* 核心工作区：双栏并排 (左侧 Query Builder | 右侧 Live Debug 演算) */}
      <div className="flex-1 overflow-hidden">
        <SplitPane
          direction="horizontal"
          initialRatio={0.52}
          minPrimarySize={380}
          minSecondarySize={320}
          primary={
            <div className="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
              {/* 基础配置表单 */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
                  <Sparkles className="h-4 w-4" />
                  <span>接口契约规范</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="lookup-pkg" className="text-slate-400 block mb-1">
                      所属组件包
                    </label>
                    <select
                      id="lookup-pkg"
                      value={pkgName}
                      onChange={(e) => {
                        setPkgName(e.target.value);
                        markDirty();
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      {packages.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="lookup-visibility" className="text-slate-400 block mb-1">
                      可见性契约
                    </label>
                    <select
                      id="lookup-visibility"
                      value={isPublic ? 'public' : 'private'}
                      onChange={(e) => {
                        setIsPublic(e.target.value === 'public');
                        markDirty();
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="public">公开导出 (package.yaml exports)</option>
                      <option value="private">内部私有 (d4/lookups.yaml)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="lookup-pillar" className="text-slate-400 block mb-1">
                      构造类别
                    </label>
                    <select
                      id="lookup-pillar"
                      value={pillar}
                      onChange={(e) => {
                        setPillar(e.target.value as 'd1' | 'd2' | 'd3');
                        markDirty();
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="d1">D1 陈述基质 (d1l-*)</option>
                      <option value="d2">D2 程序基质 (d2l-*)</option>
                      <option value="d3">D3 控制基质 (d3l-*)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="lookup-key-name" className="text-slate-400 block mb-1">
                      后缀标识符
                    </label>
                    <input
                      id="lookup-key-name"
                      type="text"
                      value={rawKeyName}
                      onChange={(e) => {
                        setRawKeyName(e.target.value);
                        markDirty();
                      }}
                      placeholder="例如: core-safety"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="lookup-desc" className="text-slate-400 block mb-1">
                      描述说明
                    </label>
                    <input
                      id="lookup-desc"
                      type="text"
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        markDirty();
                      }}
                      placeholder="导出该模块的基础协议与守则"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* 可视化 Query Builder 规则配置 */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <Filter className="h-4 w-4 text-indigo-400" />
                    <span>选择器构建器 (Selectors Builder)</span>
                  </div>
                  <div className="flex rounded bg-slate-950 p-0.5 border border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSelectorMode('id')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        selectorMode === 'id' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      按原子 ID 选取
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectorMode('domain')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        selectorMode === 'domain' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      按 Domain 领域查询
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectorMode('ref')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        selectorMode === 'ref' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      跨 Lookup 引用
                    </button>
                  </div>
                </div>

                {/* 规则添加交互行 */}
                <div className="flex gap-2">
                  {selectorMode === 'id' && (
                    <div className="flex-1 flex gap-2">
                      <select
                        value={queryIdInput}
                        onChange={(e) => setQueryIdInput(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- 点选当前包内的 {pillar.toUpperCase()} 原子 --</option>
                        {currentPillarAtoms.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.id}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={queryIdInput}
                        onChange={(e) => setQueryIdInput(e.target.value)}
                        placeholder="或直接手填 ID"
                        className="w-40 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  {selectorMode === 'domain' && (
                    <input
                      type="text"
                      value={domainInput}
                      onChange={(e) => setDomainInput(e.target.value)}
                      placeholder="输入领域标签，用逗号分隔，支持 - 排除，如: reasoning, -experimental"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  )}

                  {selectorMode === 'ref' && (
                    <input
                      type="text"
                      value={refInput}
                      onChange={(e) => setRefInput(e.target.value)}
                      placeholder="输入引用的另一个 lookup 键名，例如: pkg::d1l-public-name"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  )}

                  <Button
                    size="sm"
                    onClick={handleAddSelector}
                    className="h-7 text-xs flex items-center gap-1 shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" /> 追加规则
                  </Button>
                </div>

                {/* 现存选择器列表 */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                  <div className="text-[11px] text-slate-400">
                    已配置规则 ({selectors.length} 项):
                  </div>
                  {selectors.length === 0 ? (
                    <div className="text-slate-600 text-center py-6">
                      尚未配置任何规则，请在上方添加选择器。
                    </div>
                  ) : (
                    selectors.map((sel, idx) => (
                      <div
                        key={`${JSON.stringify(sel)}-${idx}`}
                        className="flex items-center justify-between p-2 rounded border border-slate-800 bg-slate-950/80 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 font-bold">{idx + 1}.</span>
                          {sel.query?.id && (
                            <span className="flex items-center gap-1 text-indigo-300">
                              <Box className="h-3 w-3 text-slate-400" />
                              精确 ID: <strong>{sel.query.id}</strong>
                            </span>
                          )}
                          {sel.query?.domain && (
                            <span className="flex items-center gap-1 text-emerald-300">
                              <Tag className="h-3 w-3 text-slate-400" />
                              Domain 匹配: <strong>{JSON.stringify(sel.query.domain)}</strong>
                            </span>
                          )}
                          {sel.ref && (
                            <span className="flex items-center gap-1 text-purple-300">
                              <Link2 className="h-3 w-3 text-slate-400" />
                              跨接口引用: <strong>{sel.ref}</strong>
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSelector(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          }
          secondary={
            <div className="h-full flex flex-col bg-slate-900/30 overflow-hidden">
              {/* 实时演算视口控制条 */}
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800 bg-slate-950/70 shrink-0">
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-0.5 rounded text-[11px]">
                  <button
                    type="button"
                    onClick={() => setRightView('atoms')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                      rightView === 'atoms'
                        ? 'bg-indigo-600 text-white font-medium shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="查看一阶命中原子"
                  >
                    <Layers className="h-3 w-3" /> 命中原子
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightView('graph')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                      rightView === 'graph'
                        ? 'bg-indigo-600 text-white font-medium shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="查看以此 Lookup 为根的级联依赖拓扑图"
                  >
                    <Network className="h-3 w-3" /> 白板拓扑
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightView('prompt')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                      rightView === 'prompt'
                        ? 'bg-indigo-600 text-white font-medium shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="查看此接口传递依赖排序生成的切片 Prompt 文本"
                  >
                    <Code2 className="h-3 w-3" /> 切片编译
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {evaluating ? (
                    <span className="flex items-center gap-1 text-indigo-400 text-[11px]">
                      <Loader2 className="h-3 w-3 animate-spin" /> 计算中...
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      一阶命中: <strong className="text-emerald-400">{matchedAtoms.length}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* 演算错误提示 */}
              {evalError && (
                <div className="m-3 mb-0 rounded bg-rose-950/60 border border-rose-800/80 p-2.5 text-xs text-rose-300 flex items-center gap-1.5 shrink-0 font-sans">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{evalError}</span>
                </div>
              )}

              {/* 三重视图内容区分支 */}
              <div className="flex-1 overflow-hidden">
                {rightView === 'atoms' && (
                  <div className="h-full overflow-y-auto p-4 space-y-2.5">
                    {matchedAtoms.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-xs text-slate-600 font-mono py-12">
                        <Box className="h-8 w-8 text-slate-700 mb-2" />
                        当前规则在组件库中未命中任何有效原子
                      </div>
                    ) : (
                      matchedAtoms.map((atom) => (
                        <div
                          key={atom.id}
                          className="rounded border border-slate-800 bg-slate-950/80 p-2.5 text-xs hover:border-indigo-500/50 transition-colors shadow-sm"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 truncate">
                              <Badge
                                variant={
                                  atom.type === 'd1'
                                    ? 'd1'
                                    : atom.type === 'd2'
                                      ? 'd2'
                                      : atom.type === 'd3'
                                        ? 'd3'
                                        : 'kernel'
                                }
                                className="text-[10px] uppercase font-bold px-1.5 py-0"
                              >
                                {atom.type}
                                {typeof atom.priority === 'number' ? `-P${atom.priority}` : ''}
                              </Badge>
                              <span className="font-semibold text-slate-200 truncate">
                                {atom.id}
                              </span>
                              <span className="text-[10px] text-slate-500 truncate">
                                @{atom.package || '全局'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                openTab({
                                  id: `atom:${atom.id}`,
                                  type: 'atom',
                                  title: atom.id,
                                  closable: true,
                                  atomId: atom.id,
                                });
                              }}
                              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-300 hover:bg-slate-800 px-2 py-0.5 rounded transition-colors shrink-0"
                              title="在新 Tab 中打开编辑该原子"
                            >
                              <ExternalLink className="h-3 w-3" /> 打开编辑
                            </button>
                          </div>

                          {atom.domain && atom.domain.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {atom.domain.map((d) => (
                                <span
                                  key={d}
                                  className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded"
                                >
                                  #{d}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="text-[11px] text-slate-400 line-clamp-2 bg-slate-900/60 p-1.5 rounded font-sans leading-relaxed">
                            {atom.preview || '（原子内容为空）'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {rightView === 'graph' && (
                  <div className="h-full w-full bg-slate-950">
                    <TopologyGraph
                      lookupAdhoc={{
                        key: fullLookupKey,
                        selectors: selectors as Array<Record<string, unknown>>,
                        package: pkgName,
                        pillar,
                      }}
                      onSelectAtom={(atomId) => {
                        openTab({
                          id: `atom:${atomId}`,
                          type: 'atom',
                          title: atomId,
                          closable: true,
                          atomId,
                        });
                      }}
                    />
                  </div>
                )}

                {rightView === 'prompt' && (
                  <div className="h-full p-3 bg-slate-950">
                    <PromptViewer
                      value={slicePrompt}
                      chunks={sliceChunks}
                      profile={sliceProfile}
                      onSelectAtom={(atomId) => {
                        openTab({
                          id: `atom:${atomId}`,
                          type: 'atom',
                          title: atomId,
                          closable: true,
                          atomId,
                        });
                      }}
                      onReload={() => runLiveDebug()}
                    />
                  </div>
                )}
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
