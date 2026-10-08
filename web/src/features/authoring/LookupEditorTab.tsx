import {
  type MatchedAtomItem,
  compileLookupAdhoc,
  evaluateLookupAdhoc,
  useDeleteLookupMutation,
  useSaveLookupMutation,
} from '@/api/lookups';
import {
  type ProfileSummary,
  type PromptChunk,
  PromptViewer,
} from '@/components/editor/PromptViewer';
import { Autocomplete, type AutocompleteOption } from '@/components/ui/autocomplete';
import { Badge, getPillarVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select } from '@/components/ui/select';
import { SplitPane } from '@/components/ui/split-pane';
import { toast } from '@/components/ui/toast';
import type { PackageItem } from '@/features/explorer/PackageExplorer';
import { TopologyGraph } from '@/features/graph/TopologyGraph';
import { useWorkspaceCandidates } from '@/hooks/use-workspace-candidates';
import { useIdeStore } from '@/stores/ide-store';
import { generateIdSuffix } from '@/utils/ulid';
import {
  AlertCircle,
  Box,
  Code2,
  Dna,
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
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface SelectorRule {
  query?: {
    id?: string;
    domain?: string[];
    [key: string]: unknown;
  };
  ref?: string;
}

export function LookupEditorTab({
  tabId,
  lookupKey,
  packages,
  onSaved,
  onDeleted,
}: {
  tabId: string;
  lookupKey: string;
  packages: PackageItem[];
  onSaved?: () => void;
  onDeleted?: () => void;
}) {
  const setTabDirty = useIdeStore((state) => state.setTabDirty);
  const openTab = useIdeStore((state) => state.openTab);
  const replaceTab = useIdeStore((state) => state.replaceTab);

  const isDraft = lookupKey.startsWith('draft:');
  const draftParts = isDraft ? lookupKey.split(':') : [];
  const isInternalKey = lookupKey.includes('::internal::');
  const initialPkg = isDraft
    ? draftParts[1] || ''
    : lookupKey.includes('::')
      ? lookupKey.split('::')[0]
      : '';
  const initialPublic = isDraft ? !draftParts[2]?.startsWith('private') : !isInternalKey;

  const cleanRawName = lookupKey.split('::').pop() || lookupKey;

  const inferPillarFromKey = useCallback((key: string): 'd1' | 'd2' | 'd3' => {
    const m = key.match(/^d([1-3])l-/i);
    if (m) return `d${m[1]}`.toLowerCase() as 'd1' | 'd2' | 'd3';
    return 'd1';
  }, []);

  const [pkgName, setPkgName] = useState(initialPkg || packages[0]?.name || '');
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [pillar, setPillar] = useState<'d1' | 'd2' | 'd3'>(() => inferPillarFromKey(cleanRawName));
  const [rawKeyName, setRawKeyName] = useState(
    !isDraft ? cleanRawName.replace(/^d[1-3]l-/, '') : '',
  );
  const [description, setDescription] = useState('');
  const [initialKey, setInitialKey] = useState(isDraft ? '' : lookupKey);

  // 2.0 集合代数三段式管道
  const [algebraPipeline, setAlgebraPipeline] = useState<'union' | 'exclude' | 'intersect'>(
    'union',
  );
  const [unionSelectors, setUnionSelectors] = useState<SelectorRule[]>([]);
  const [excludeSelectors, setExcludeSelectors] = useState<SelectorRule[]>([]);
  const [intersectSelectors, setIntersectSelectors] = useState<SelectorRule[]>([]);
  const [isModified, setIsModified] = useState(false);

  const preferences = useIdeStore((state) => state.preferences);
  const [rightView, setRightView] = useState<'atoms' | 'graph' | 'prompt'>(
    preferences?.defaultRightPanel === 'prompt' ? 'prompt' : 'graph',
  );

  const [matchedAtoms, setMatchedAtoms] = useState<MatchedAtomItem[]>([]);
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState('');

  const [slicePrompt, setSlicePrompt] = useState<string>('');
  const [sliceChunks, setSliceChunks] = useState<PromptChunk[]>([]);
  const [sliceProfile, setProfile] = useState<ProfileSummary | null>(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [confirmDeleting, setConfirmDeleting] = useState(false);

  const [selectorMode, setSelectorMode] = useState<'id' | 'domain' | 'ref'>('id');
  const [queryIdInput, setQueryIdInput] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [refInput, setRefInput] = useState('');

  const saveLookupMutation = useSaveLookupMutation();
  const deleteLookupMutation = useDeleteLookupMutation();
  const saving = saveLookupMutation.isPending;

  const { lookupOptions, domainOptions } = useWorkspaceCandidates(packages);

  const currentPkgObj = packages.find((p) => p.name === pkgName);

  // 严格隔离作用域：仅补全当前包 (@pkgName) 内匹配当前 Pillar 的原子
  const currentPkgAtomOptions = useMemo<AutocompleteOption[]>(() => {
    if (!currentPkgObj || !currentPkgObj.atoms) return [];

    const pillarMatched = currentPkgObj.atoms.filter(
      (a) => (a.type || '').toLowerCase() === pillar.toLowerCase(),
    );

    const targetAtoms = pillarMatched.length > 0 ? pillarMatched : currentPkgObj.atoms;

    return targetAtoms.map((a) => {
      const atype = (a.type || 'd1').toLowerCase() as 'd1' | 'd2' | 'd3' | 'kernel';
      return {
        value: a.id,
        label: a.id,
        badge: typeof a.priority === 'number' ? `${atype}-P${a.priority}` : atype.toUpperCase(),
        badgeVariant: atype,
        group: `@${currentPkgObj.name}`,
      };
    });
  }, [currentPkgObj, pillar]);

  const markDirty = useCallback(() => {
    if (!isModified) {
      setIsModified(true);
      setTabDirty(tabId, true);
    }
  }, [isModified, tabId, setTabDirty]);

  useEffect(() => {
    if (isDraft) return;
    if (!packages || packages.length === 0) return;

    const rawKey = lookupKey.split('::').pop() || lookupKey;
    const targetPkg = lookupKey.includes('::') ? lookupKey.split('::')[0] : null;

    for (const pkg of packages) {
      if (targetPkg && pkg.name !== targetPkg) continue;

      // 1. 尝试匹配公开导出 (exports)
      const exportDef =
        pkg.exports?.[lookupKey] ||
        pkg.exports?.[`${pkg.name}::${rawKey}`] ||
        pkg.exports?.[rawKey];

      if (exportDef) {
        setPkgName(pkg.name);
        setPillar((exportDef.pillar as 'd1' | 'd2' | 'd3') || inferPillarFromKey(rawKey));
        setIsPublic(true);
        setDescription(exportDef.description || '');
        setRawKeyName(rawKey.replace(/^d[1-3]l-/, '') || '');
        const rawU =
          exportDef.union && exportDef.union.length > 0 ? exportDef.union : exportDef.selectors;
        const u = (rawU as SelectorRule[]) || [];
        const e = (exportDef.exclude as SelectorRule[]) || [];
        const i = (exportDef.intersect as SelectorRule[]) || [];
        setUnionSelectors(u);
        setExcludeSelectors(e);
        setIntersectSelectors(i);
        setInitialKey(lookupKey.includes('::') ? lookupKey : `${pkg.name}::${rawKey}`);
        return;
      }

      // 2. 尝试匹配内部查找 (internal_lookups)
      const internalDef =
        pkg.internal_lookups?.[lookupKey] ||
        pkg.internal_lookups?.[`${pkg.name}::internal::${rawKey}`] ||
        pkg.internal_lookups?.[rawKey];

      if (internalDef) {
        setPkgName(pkg.name);
        setPillar((internalDef.pillar as 'd1' | 'd2' | 'd3') || inferPillarFromKey(rawKey));
        setIsPublic(false);
        setDescription(internalDef.description || '');
        setRawKeyName(rawKey.replace(/^d[1-3]l-/, '') || '');
        const rawU =
          internalDef.union && internalDef.union.length > 0
            ? internalDef.union
            : internalDef.selectors;
        const u = (rawU as SelectorRule[]) || [];
        const e = (internalDef.exclude as SelectorRule[]) || [];
        const i = (internalDef.intersect as SelectorRule[]) || [];
        setUnionSelectors(u);
        setExcludeSelectors(e);
        setIntersectSelectors(i);
        setInitialKey(lookupKey.includes('::') ? lookupKey : `${pkg.name}::internal::${rawKey}`);
        return;
      }
    }
  }, [lookupKey, packages, isDraft, inferPillarFromKey]);

  const runLiveDebug = useCallback(() => {
    if (
      unionSelectors.length === 0 &&
      excludeSelectors.length === 0 &&
      intersectSelectors.length === 0
    ) {
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
      compileLookupAdhoc({
        key: targetKey,
        selectors: unionSelectors as Array<Record<string, unknown>>,
        union: unionSelectors as Array<Record<string, unknown>>,
        exclude: excludeSelectors as Array<Record<string, unknown>>,
        intersect: intersectSelectors as Array<Record<string, unknown>>,
        package: pkgName,
        pillar,
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
      evaluateLookupAdhoc({
        union: unionSelectors as Array<Record<string, unknown>>,
        exclude: excludeSelectors as Array<Record<string, unknown>>,
        intersect: intersectSelectors as Array<Record<string, unknown>>,
        package: pkgName,
        pillar,
      })
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
  }, [
    unionSelectors,
    excludeSelectors,
    intersectSelectors,
    pkgName,
    pillar,
    rawKeyName,
    rightView,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      runLiveDebug();
    }, 200);
    return () => clearTimeout(timer);
  }, [runLiveDebug]);

  const setActivePipelineList = useCallback(
    (updater: (prev: SelectorRule[]) => SelectorRule[]) => {
      if (algebraPipeline === 'union') {
        setUnionSelectors(updater);
      } else if (algebraPipeline === 'exclude') {
        setExcludeSelectors(updater);
      } else {
        setIntersectSelectors(updater);
      }
      markDirty();
    },
    [algebraPipeline, markDirty],
  );

  const handleAddSelector = () => {
    let newRule: SelectorRule | null = null;
    if (selectorMode === 'id' && queryIdInput.trim()) {
      newRule = { query: { id: queryIdInput.trim() } };
      setQueryIdInput('');
    } else if (selectorMode === 'domain' && domainInput.trim()) {
      const domains = domainInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      newRule = { query: { domain: domains } };
      setDomainInput('');
    } else if (selectorMode === 'ref' && refInput.trim()) {
      newRule = { ref: refInput.trim() };
      setRefInput('');
    }

    if (newRule) {
      setActivePipelineList((prev) => [...prev, newRule as SelectorRule]);
    }
  };

  const handleRemoveSelector = (pipe: 'union' | 'exclude' | 'intersect', index: number) => {
    if (pipe === 'union') {
      setUnionSelectors((prev) => prev.filter((_, i) => i !== index));
    } else if (pipe === 'exclude') {
      setExcludeSelectors((prev) => prev.filter((_, i) => i !== index));
    } else {
      setIntersectSelectors((prev) => prev.filter((_, i) => i !== index));
    }
    markDirty();
  };

  const handleSave = useCallback(async () => {
    const cleanSuffix = rawKeyName
      .trim()
      .toLowerCase()
      .replace(/^d[1-3]l-/, '')
      .replace(/[^a-z0-9_-]/g, '-');

    if (!cleanSuffix || unionSelectors.length === 0) return;

    setSaveStatus('正在写入...');
    try {
      const fullTargetKey = isPublic
        ? `${pkgName}::${pillar}l-${cleanSuffix}`
        : `${pkgName}::internal::${pillar}l-${cleanSuffix}`;

      await saveLookupMutation.mutateAsync({
        package: pkgName,
        key: `${pillar}l-${cleanSuffix}`,
        pillar,
        is_public: isPublic,
        description: description.trim(),
        union: unionSelectors as Array<Record<string, unknown>>,
        exclude: excludeSelectors as Array<Record<string, unknown>>,
        intersect: intersectSelectors as Array<Record<string, unknown>>,
        old_key: initialKey || undefined,
      });

      setSaveStatus('已保存');
      setIsModified(false);
      setTabDirty(tabId, false);
      setInitialKey(fullTargetKey);

      if (isDraft) {
        replaceTab(tabId, {
          type: 'lookup',
          title: `${pillar}l-${cleanSuffix}`,
          lookupKey: fullTargetKey,
        });
      }

      onSaved?.();
      setTimeout(() => setSaveStatus(''), 2500);
    } catch (err: unknown) {
      setSaveStatus(`保存失败: ${err instanceof Error ? err.message : '异常'}`);
    }
  }, [
    rawKeyName,
    unionSelectors,
    excludeSelectors,
    intersectSelectors,
    pkgName,
    pillar,
    isPublic,
    description,
    initialKey,
    tabId,
    setTabDirty,
    onSaved,
    isDraft,
    replaceTab,
    saveLookupMutation,
  ]);

  const handleVisibilityChange = async (nextPublic: boolean) => {
    setIsPublic(nextPublic);
    markDirty();

    const cleanSuffix = rawKeyName
      .trim()
      .toLowerCase()
      .replace(/^d[1-3]l-/, '')
      .replace(/[^a-z0-9_-]/g, '-');

    if (!isDraft && cleanSuffix && unionSelectors.length > 0) {
      try {
        setSaveStatus('正在更新可见性...');
        await saveLookupMutation.mutateAsync({
          package: pkgName,
          key: `${pillar}l-${cleanSuffix}`,
          pillar,
          is_public: nextPublic,
          description: description.trim(),
          union: unionSelectors as Array<Record<string, unknown>>,
          exclude: excludeSelectors as Array<Record<string, unknown>>,
          intersect: intersectSelectors as Array<Record<string, unknown>>,
        });

        const fullTargetKey = nextPublic
          ? `${pkgName}::${pillar}l-${cleanSuffix}`
          : `${pkgName}::internal::${pillar}l-${cleanSuffix}`;

        replaceTab(tabId, {
          type: 'lookup',
          title: `${pillar}l-${cleanSuffix}`,
          lookupKey: fullTargetKey,
        });

        setIsModified(false);
        setTabDirty(tabId, false);
        setSaveStatus('已更新可见性');
        onSaved?.();
        toast.success(nextPublic ? '已迁移为公开导出接口' : '已迁移为内部私有查找');
        setTimeout(() => setSaveStatus(''), 2500);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '更新可见性失败';
        setSaveStatus(`失败: ${msg}`);
        toast.error(msg);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  useEffect(() => {
    const handleGlobalSave = () => {
      const activeTabId = useIdeStore.getState().activeTabId;
      if (activeTabId === tabId && !saving && unionSelectors.length > 0) {
        handleSave();
      }
    };
    window.addEventListener('aca:save-active-tab', handleGlobalSave);
    return () => window.removeEventListener('aca:save-active-tab', handleGlobalSave);
  }, [tabId, saving, unionSelectors.length, handleSave]);

  const handleDelete = async (e?: React.MouseEvent) => {
    if (isDraft) return;
    if (e?.shiftKey || confirmDeleting) {
      setConfirmDeleting(false);
      try {
        await deleteLookupMutation.mutateAsync(lookupKey);
        toast.success(`查找接口 "${lookupKey}" 已删除`);
        onDeleted?.();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '删除失败';
        setSaveStatus(`删除失败: ${msg}`);
        toast.error(msg);
      }
    } else {
      setConfirmDeleting(true);
      setTimeout(() => setConfirmDeleting(false), 3000);
    }
  };

  const fullLookupKey = `${pillar}l-${rawKeyName.trim() || '...'}`;

  return (
    <div
      className="flex h-full flex-col bg-slate-950 text-slate-100 overflow-hidden"
      onKeyDown={handleKeyDown}
    >
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
          {!isDraft && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleteLookupMutation.isPending}
              className={`h-7 text-xs flex items-center gap-1 px-2.5 cursor-pointer transition-colors ${
                confirmDeleting
                  ? 'bg-rose-600 text-white border-rose-500 hover:bg-rose-500 font-bold'
                  : 'text-rose-400 border-rose-900/50 hover:bg-rose-950/50 hover:border-rose-700'
              }`}
              title="删除此接口契约 (Shift+点击直接删除)"
            >
              <Trash2 className="h-3 w-3" />
              <span>{confirmDeleting ? '确定删除?' : '删除接口'}</span>
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || unionSelectors.length === 0}
            className="h-7 text-xs flex items-center gap-1.5 px-3 bg-indigo-600 hover:bg-indigo-500"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            <span>保存接口定义</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <SplitPane
          direction="horizontal"
          initialRatio={0.52}
          minPrimarySize={380}
          minSecondarySize={320}
          primary={
            <div className="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
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
                    <Select
                      id="lookup-pkg"
                      value={pkgName}
                      onChange={(e) => {
                        setPkgName(e.target.value);
                        markDirty();
                      }}
                    >
                      {packages.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label htmlFor="lookup-visibility" className="text-slate-400 block mb-1">
                      可见性契约
                    </label>
                    <Select
                      id="lookup-visibility"
                      value={isPublic ? 'public' : 'private'}
                      onChange={(e) => handleVisibilityChange(e.target.value === 'public')}
                    >
                      <option value="public">公开导出</option>
                      <option value="private">内部私有</option>
                    </Select>
                  </div>

                  <div>
                    <label htmlFor="lookup-pillar" className="text-slate-400 block mb-1">
                      构造类别
                    </label>
                    <Select
                      id="lookup-pillar"
                      value={pillar}
                      onChange={(e) => {
                        setPillar(e.target.value as 'd1' | 'd2' | 'd3');
                        markDirty();
                      }}
                    >
                      <option value="d1">D1 (d1l-*)</option>
                      <option value="d2">D2 (d2l-*)</option>
                      <option value="d3">D3 (d3l-*)</option>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="lookup-key-name" className="text-slate-400 block">
                        后缀标识符
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setRawKeyName(generateIdSuffix());
                          markDirty();
                        }}
                        className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 cursor-pointer"
                        title="生成新 ULID 标识"
                      >
                        <Dna className="h-3 w-3" />
                        <span>ULID</span>
                      </button>
                    </div>
                    <Input
                      id="lookup-key-name"
                      type="text"
                      value={rawKeyName}
                      onChange={(e) => {
                        setRawKeyName(e.target.value);
                        markDirty();
                      }}
                      placeholder="例如: core-safety"
                    />
                  </div>

                  <div>
                    <label htmlFor="lookup-desc" className="text-slate-400 block mb-1">
                      描述说明
                    </label>
                    <Input
                      id="lookup-desc"
                      type="text"
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        markDirty();
                      }}
                      placeholder="导出该模块的基础协议与守则"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-3 text-xs">
                {/* 集合代数三段式流水线开关 */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <Filter className="h-4 w-4 text-indigo-400" />
                    <span>集合代数管道</span>
                    <span className="text-[10px] text-slate-500 font-mono font-normal">
                      (Union \ Exclude) ∩ Intersect
                    </span>
                  </div>
                  <SegmentedControl
                    size="sm"
                    value={algebraPipeline}
                    onChange={setAlgebraPipeline}
                    options={[
                      {
                        value: 'union',
                        label: `并集 Union (${unionSelectors.length})`,
                        title: '基础并集候选池 (Base Candidates)',
                      },
                      {
                        value: 'exclude',
                        label: `差集 Exclude (${excludeSelectors.length})`,
                        title: '黑名单剔除池 (Blacklist/Filter out)',
                      },
                      {
                        value: 'intersect',
                        label: `交集 Intersect (${intersectSelectors.length})`,
                        title: '严格约束交集 (Must Also Satisfy)',
                      },
                    ]}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                    <span>规则类别:</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase font-bold px-1.5 py-0"
                    >
                      {algebraPipeline === 'union'
                        ? '1. 候选集合并'
                        : algebraPipeline === 'exclude'
                          ? '2. 负向集合剔除'
                          : '3. 约束连续求交'}
                    </Badge>
                  </div>
                  <SegmentedControl
                    size="sm"
                    value={selectorMode}
                    onChange={setSelectorMode}
                    options={[
                      { value: 'id', label: '按原子 ID' },
                      { value: 'domain', label: '按 Domain' },
                      { value: 'ref', label: '跨 Lookup 引用' },
                    ]}
                  />
                </div>

                <div className="flex gap-2 items-center">
                  {selectorMode === 'id' && (
                    <div className="flex-1">
                      <Autocomplete
                        value={queryIdInput}
                        onChange={setQueryIdInput}
                        options={currentPkgAtomOptions}
                        placeholder={`选择或搜索当前包 (@${pkgName || '本包'}) 内的 ${pillar.toUpperCase()} 原子 ID`}
                      />
                    </div>
                  )}

                  {selectorMode === 'domain' && (
                    <div className="flex-1">
                      <Autocomplete
                        value={domainInput}
                        onChange={setDomainInput}
                        options={domainOptions}
                        placeholder="输入领域标签，支持 - 排除 (如 reasoning 或 -deprecated)"
                      />
                    </div>
                  )}

                  {selectorMode === 'ref' && (
                    <div className="flex-1">
                      <Autocomplete
                        value={refInput}
                        onChange={setRefInput}
                        options={lookupOptions}
                        placeholder="搜索并引用已有的 Lookup 接口 (pkg::d1l-xxx 或短名)"
                      />
                    </div>
                  )}

                  <Button
                    size="sm"
                    onClick={handleAddSelector}
                    className="h-7 text-xs flex items-center gap-1 shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" /> 追加规则
                  </Button>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-800/60">
                  {/* 分组流水线规则列表 */}
                  {(['union', 'exclude', 'intersect'] as const).map((pipe) => {
                    const list =
                      pipe === 'union'
                        ? unionSelectors
                        : pipe === 'exclude'
                          ? excludeSelectors
                          : intersectSelectors;
                    const pipeLabel =
                      pipe === 'union'
                        ? '并集 Union'
                        : pipe === 'exclude'
                          ? '剔除 Exclude'
                          : '交集 Intersect';
                    const pipeBadge =
                      pipe === 'union' ? 'd1' : pipe === 'exclude' ? 'destructive' : 'd2';

                    return (
                      <div key={pipe} className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Badge
                              variant={pipeBadge}
                              className="text-[9px] uppercase px-1.5 py-0 font-bold"
                            >
                              {pipeLabel}
                            </Badge>
                            <span>({list.length} 项)</span>
                          </span>
                        </div>

                        {list.length === 0 ? (
                          <div className="text-[10px] text-slate-600 font-mono py-1 px-2 rounded bg-slate-950/40 border border-slate-800/40">
                            （无规则）
                          </div>
                        ) : (
                          list.map((sel, idx) => (
                            <div
                              key={`${pipe}-${JSON.stringify(sel)}-${idx}`}
                              className="flex items-center justify-between p-2 rounded border border-slate-800 bg-slate-950/80 text-xs font-mono"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-slate-600 font-bold">{idx + 1}.</span>
                                {sel.query?.id && (
                                  <span className="flex items-center gap-1 text-indigo-300 truncate">
                                    <Box className="h-3 w-3 text-slate-400 shrink-0" />
                                    精确 ID:
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (typeof sel.query?.id === 'string') {
                                          openTab({
                                            type: 'atom',
                                            title: sel.query.id,
                                            atomId: sel.query.id,
                                          });
                                        }
                                      }}
                                      className="font-semibold underline hover:text-indigo-200 cursor-pointer truncate"
                                      title={`点击跳转到原子: ${sel.query.id}`}
                                    >
                                      {sel.query.id}
                                    </button>
                                  </span>
                                )}
                                {sel.query?.domain && (
                                  <span className="flex items-center gap-1 text-emerald-300 truncate">
                                    <Tag className="h-3 w-3 text-slate-400 shrink-0" />
                                    Domain: <strong>{JSON.stringify(sel.query.domain)}</strong>
                                  </span>
                                )}
                                {sel.ref && (
                                  <span className="flex items-center gap-1 text-purple-300 truncate">
                                    <Link2 className="h-3 w-3 text-slate-400 shrink-0" />
                                    跨接口引用:
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (sel.ref) {
                                          openTab({
                                            type: 'lookup',
                                            title: sel.ref.split('::').pop() || sel.ref,
                                            lookupKey: sel.ref,
                                          });
                                        }
                                      }}
                                      className="font-semibold underline hover:text-purple-200 cursor-pointer truncate"
                                      title={`点击跳转到接口: ${sel.ref}`}
                                    >
                                      {sel.ref}
                                    </button>
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveSelector(pipe, idx)}
                                className="text-slate-500 hover:text-rose-400 p-1 rounded cursor-pointer shrink-0"
                                title="删除该规则"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          }
          secondary={
            <div className="h-full flex flex-col bg-slate-900/30 overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800 bg-slate-950/70 shrink-0">
                <SegmentedControl
                  size="sm"
                  value={rightView}
                  onChange={setRightView}
                  options={[
                    {
                      value: 'atoms',
                      label: '命中原子',
                      icon: <Layers className="h-3 w-3" />,
                      title: '查看一阶命中原子',
                    },
                    {
                      value: 'graph',
                      label: '白板拓扑',
                      icon: <Network className="h-3 w-3" />,
                      title: '查看以此 Lookup 为根的级联依赖拓扑图',
                    },
                    {
                      value: 'prompt',
                      label: '切片编译',
                      icon: <Code2 className="h-3 w-3" />,
                      title: '查看此接口传递依赖排序生成的切片 Prompt 文本',
                    },
                  ]}
                />

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

              {evalError && (
                <div className="m-3 mb-0 rounded bg-rose-950/60 border border-rose-800/80 p-2.5 text-xs text-rose-300 flex items-center gap-1.5 shrink-0">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{evalError}</span>
                </div>
              )}

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
                                variant={getPillarVariant(atom.type, 'kernel')}
                                className="text-[10px] uppercase font-bold px-1.5 py-0"
                              >
                                {atom.type}
                                {typeof atom.priority === 'number' ? `-P${atom.priority}` : ''}
                              </Badge>
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
                                className="font-semibold text-slate-200 truncate hover:text-indigo-300 hover:underline cursor-pointer text-left"
                                title={`点击打开原子: ${atom.id}`}
                              >
                                {atom.id}
                              </button>
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
                              className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded transition-colors shrink-0 cursor-pointer"
                              title="在新 Tab 中打开编辑该原子"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
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

                          <div className="text-[11px] text-slate-400 line-clamp-2 pt-1 border-t border-slate-800/40 font-sans leading-relaxed">
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
                        selectors: unionSelectors as Array<Record<string, unknown>>,
                        union: unionSelectors as Array<Record<string, unknown>>,
                        exclude: excludeSelectors as Array<Record<string, unknown>>,
                        intersect: intersectSelectors as Array<Record<string, unknown>>,
                        package: pkgName,
                        pillar,
                      }}
                      onSelectAtom={(atomId) => {
                        openTab({
                          type: 'atom',
                          title: atomId,
                          atomId,
                        });
                      }}
                      onSelectLookup={(lKey) => {
                        openTab({
                          type: 'lookup',
                          title: lKey.split('::').pop() || lKey,
                          lookupKey: lKey,
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
                      onOpenLookup={(lKey) => {
                        openTab({
                          id: `lookup:${lKey}`,
                          type: 'lookup',
                          title: lKey.split('::').pop() || lKey,
                          closable: true,
                          lookupKey: lKey,
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
