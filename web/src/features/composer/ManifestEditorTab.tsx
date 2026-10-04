import {
  buildManifest,
  compileAdhocManifest,
  fetchManifestDetail,
  useSaveManifestMutation,
} from '@/api/manifests';
import {
  type ProfileSummary,
  type PromptChunk,
  PromptViewer,
} from '@/components/editor/PromptViewer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SplitPane } from '@/components/ui/split-pane';
import type { LookupExportItem, PackageItem } from '@/features/explorer/PackageExplorer';
import { TopologyGraph } from '@/features/graph/TopologyGraph';
import { useIdeStore } from '@/stores/ide-store';
import {
  Box,
  Code2,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Network,
  Plus,
  RotateCcw,
  Save,
  Sliders,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface ImportItem {
  id: string;
  lookup: string;
  pillar?: string;
  description?: string;
}

interface ManifestImportRaw {
  lookup?: string;
  query?: Record<string, unknown>;
}

export function ManifestEditorTab({
  manifestName,
  workspacePath,
  packages,
  onSaved,
}: {
  manifestName: string;
  workspacePath?: string;
  packages: PackageItem[];
  onSaved?: () => void;
}) {
  const setTabDirty = useIdeStore((state) => state.setTabDirty);
  const openTab = useIdeStore((state) => state.openTab);
  const replaceTab = useIdeStore((state) => state.replaceTab);
  const saveSnapshot = useIdeStore((state) => state.saveSnapshot);
  const getSnapshot = useIdeStore((state) => state.getSnapshot);
  const clearSnapshot = useIdeStore((state) => state.clearSnapshot);
  const preferences = useIdeStore((state) => state.preferences);

  const isDraft = !manifestName || manifestName.startsWith('draft_');

  const [rightView, setRightView] = useState<'graph' | 'prompt'>(
    preferences?.defaultRightPanel === 'prompt' ? 'prompt' : 'graph',
  );
  const [showRightPanel, setShowRightPanel] = useState(true);

  const [manifestIdentifier, setManifestIdentifier] = useState(isDraft ? '' : manifestName);
  const [isReady, setIsReady] = useState(false);
  const [name, setName] = useState(
    !isDraft && manifestName ? manifestName.split('/').pop() || manifestName : '',
  );
  const [version, setVersion] = useState('1.0.0');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<ImportItem[]>([]);
  const [overrides, setOverrides] = useState<Record<string, { selectors: unknown[] }>>({});
  const [isModified, setIsModified] = useState(false);

  const [initialSnapshot, setInitialSnapshot] = useState<{
    name: string;
    version: string;
    description: string;
    items: ImportItem[];
    overrides: Record<string, { selectors: unknown[] }>;
  } | null>(null);

  const [selectedLookup, setSelectedLookup] = useState<string>('');
  const [lookupFilterQuery, setLookupFilterQuery] = useState<string>('');
  const [editingOverrideKey, setEditingOverrideKey] = useState<string | null>(null);
  const [overrideQueryId, setOverrideQueryId] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState('');

  const [prompt, setPrompt] = useState<string>('');
  const [hookedPrompt, setHookedPrompt] = useState<string | null>(null);
  const [chunks, setChunks] = useState<PromptChunk[]>([]);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [isHookActive, setIsHookActive] = useState(false);

  const saveManifestMutation = useSaveManifestMutation();
  const isSaving = saveManifestMutation.isPending;

  const tabId = manifestIdentifier ? `manifest:${manifestIdentifier}` : 'manifest:draft';

  const markDirty = () => {
    if (!isModified) {
      setIsModified(true);
      setTabDirty(tabId, true);
    }
  };

  const availableExports = useMemo(() => {
    const list: Array<{ key: string; pkg: string; pillar: string; desc: string }> = [];
    for (const pkg of packages) {
      for (const [key, def] of Object.entries(pkg.exports || {})) {
        const exportDef = def as LookupExportItem;
        list.push({
          key,
          pkg: pkg.name,
          pillar: exportDef.pillar || 'd1',
          desc: exportDef.description || '',
        });
      }
    }
    return list;
  }, [packages]);

  useEffect(() => {
    const snapshot = getSnapshot<{
      name: string;
      version: string;
      description: string;
      items: ImportItem[];
      overrides: Record<string, { selectors: unknown[] }>;
      rightView: 'graph' | 'prompt';
      showRightPanel: boolean;
      isModified: boolean;
      initialSnapshot: {
        name: string;
        version: string;
        description: string;
        items: ImportItem[];
        overrides: Record<string, { selectors: unknown[] }>;
      } | null;
    }>(tabId);

    if (snapshot) {
      setName(snapshot.name);
      setVersion(snapshot.version);
      setDescription(snapshot.description);
      setItems(snapshot.items);
      setOverrides(snapshot.overrides);
      if (snapshot.rightView) setRightView(snapshot.rightView);
      setShowRightPanel(snapshot.showRightPanel);
      setIsModified(snapshot.isModified);
      if (snapshot.initialSnapshot) {
        setInitialSnapshot(snapshot.initialSnapshot);
      }
      setTabDirty(tabId, snapshot.isModified);
      setIsReady(true);
      return;
    }

    if (!manifestName) {
      setIsReady(true);
      return;
    }

    fetchManifestDetail(manifestName)
      .then((data) => {
        const loadedName = data.name || manifestName;
        const loadedVersion = data.version || '1.0.0';
        const loadedDesc = data.description || '';
        const loadedOverrides = data.overrides || {};
        const rawImports = (data.imports || []) as ManifestImportRaw[];
        const mappedItems = rawImports
          .filter((imp) => Boolean(imp.lookup))
          .map((imp) => ({
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            lookup: imp.lookup as string,
          }));

        setName(loadedName);
        setVersion(loadedVersion);
        setDescription(loadedDesc);
        setOverrides(loadedOverrides);
        setItems(mappedItems);
        setIsModified(false);
        setTabDirty(tabId, false);

        setInitialSnapshot({
          name: loadedName,
          version: loadedVersion,
          description: loadedDesc,
          items: mappedItems,
          overrides: loadedOverrides,
        });
        setIsReady(true);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [manifestName, tabId, setTabDirty, getSnapshot]);

  useEffect(() => {
    if (!isReady) return;
    saveSnapshot(tabId, {
      name,
      version,
      description,
      items,
      overrides,
      rightView,
      showRightPanel,
      isModified,
      initialSnapshot,
    });
  }, [
    isReady,
    tabId,
    name,
    version,
    description,
    items,
    overrides,
    rightView,
    showRightPanel,
    isModified,
    initialSnapshot,
    saveSnapshot,
  ]);

  const compileCurrent = useCallback(
    (hookFlag = isHookActive) => {
      const targetQueryKey = manifestIdentifier || name;
      if (manifestIdentifier && !isModified) {
        buildManifest({
          manifest: targetQueryKey,
          is_file: false,
          apply_hook: hookFlag,
        })
          .then((data) => {
            if (data.prompt) setPrompt(data.prompt);
            setHookedPrompt(data.hooked_prompt || null);
            setChunks(data.chunks || []);
            if (data.profile) setProfile(data.profile);
          })
          .catch(console.error);
      } else if (items.length > 0) {
        compileAdhocManifest({
          imports: items.map((item) => ({ lookup: item.lookup })),
          overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
          apply_hook: hookFlag,
        })
          .then((data) => {
            if (data.prompt) setPrompt(data.prompt);
            setHookedPrompt(data.hooked_prompt || null);
            setChunks(data.chunks || []);
            if (data.profile) setProfile(data.profile);
          })
          .catch(console.error);
      }
    },
    [manifestIdentifier, name, isModified, items, overrides, isHookActive],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      compileCurrent();
    }, 250);
    return () => clearTimeout(timer);
  }, [compileCurrent]);

  const handleAddLookup = () => {
    if (!selectedLookup) return;
    if (items.some((i) => i.lookup === selectedLookup)) return;

    const found = availableExports.find((e) => e.key === selectedLookup);
    const newItem: ImportItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      lookup: selectedLookup,
      pillar: found?.pillar,
      description: found?.desc,
    };
    setItems([...items, newItem]);
    setSelectedLookup('');
    markDirty();
  };

  const handleRemoveLookup = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
    markDirty();
  };

  const handleSaveManifest = useCallback(async () => {
    const targetIdentifier = manifestIdentifier.trim() || name.trim();
    if (!name.trim() || !targetIdentifier || items.length === 0) return;

    setSaveStatus('正在保存...');
    try {
      await saveManifestMutation.mutateAsync({
        name: name.trim(),
        version: version.trim(),
        description: description.trim(),
        imports: items.map((i) => ({ lookup: i.lookup })),
        identifier: targetIdentifier,
        workspace_path: workspacePath,
        overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
      });

      setSaveStatus('已保存');
      setIsModified(false);
      setTabDirty(tabId, false);
      setManifestIdentifier(targetIdentifier);
      setInitialSnapshot({
        name: name.trim(),
        version: version.trim(),
        description: description.trim(),
        items: [...items],
        overrides: { ...overrides },
      });
      clearSnapshot(tabId);
      onSaved?.();

      if (isDraft) {
        replaceTab(tabId, {
          id: `manifest:${targetIdentifier}`,
          type: 'manifest',
          title: name.trim(),
          closable: true,
          manifestName: targetIdentifier,
          workspacePath,
        });
      }
      setTimeout(() => setSaveStatus(''), 2500);
    } catch (err: unknown) {
      setSaveStatus(`保存失败: ${err instanceof Error ? err.message : '异常'}`);
    }
  }, [
    manifestIdentifier,
    name,
    items,
    version,
    description,
    workspacePath,
    overrides,
    tabId,
    setTabDirty,
    clearSnapshot,
    onSaved,
    isDraft,
    replaceTab,
    saveManifestMutation,
  ]);

  useEffect(() => {
    const handleGlobalSave = () => {
      const activeTabId = useIdeStore.getState().activeTabId;
      if (activeTabId === tabId && isModified && !isSaving) {
        handleSaveManifest();
      }
    };
    window.addEventListener('aca:save-active-tab', handleGlobalSave);
    return () => window.removeEventListener('aca:save-active-tab', handleGlobalSave);
  }, [tabId, isModified, isSaving, handleSaveManifest]);

  const handleResetManifest = () => {
    if (!isModified) return;
    if (!window.confirm('确定要放弃所有未保存的修改并恢复吗？')) return;

    if (initialSnapshot) {
      setName(initialSnapshot.name);
      setVersion(initialSnapshot.version);
      setDescription(initialSnapshot.description);
      setItems([...initialSnapshot.items]);
      setOverrides({ ...initialSnapshot.overrides });
    } else {
      setName(manifestName ? manifestName.split('/').pop() || manifestName : 'new_agent');
      setVersion('1.0.0');
      setDescription('');
      setItems([]);
      setOverrides({});
    }

    setIsModified(false);
    setTabDirty(tabId, false);
    clearSnapshot(tabId);
  };

  const handleOpenAtom = useCallback(
    (atomId: string) => {
      openTab({
        id: `atom:${atomId}`,
        type: 'atom',
        title: atomId,
        closable: true,
        atomId,
      });
    },
    [openTab],
  );

  const handleOpenLookup = useCallback(
    (lKey: string) => {
      openTab({
        id: `lookup:${lKey}`,
        type: 'lookup',
        title: lKey.split('::').pop() || lKey,
        closable: true,
        lookupKey: lKey,
      });
    },
    [openTab],
  );

  const renderBlueprintContent = (isFullWidth = false) => (
    <div
      className={`h-full flex flex-col p-4 space-y-3 overflow-y-auto ${
        isFullWidth ? 'max-w-4xl mx-auto w-full' : ''
      }`}
    >
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-2 text-xs font-mono">
        <div className="grid grid-cols-4 gap-2">
          <div>
            <label htmlFor="manifest-id-input" className="text-slate-400 block mb-1">
              清单标识符 / 路径
            </label>
            <input
              id="manifest-id-input"
              type="text"
              value={manifestIdentifier}
              onChange={(e) => {
                setManifestIdentifier(e.target.value);
                markDirty();
              }}
              placeholder="例如: smart-contract-auditor"
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="manifest-name-input" className="text-slate-400 block mb-1">
              显示名称
            </label>
            <input
              id="manifest-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                markDirty();
              }}
              placeholder="智能体装配名称"
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="manifest-version-input" className="text-slate-400 block mb-1">
              版本
            </label>
            <input
              id="manifest-version-input"
              type="text"
              value={version}
              onChange={(e) => {
                setVersion(e.target.value);
                markDirty();
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="manifest-desc-input" className="text-slate-400 block mb-1">
              描述说明
            </label>
            <input
              id="manifest-desc-input"
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                markDirty();
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Filter className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              value={lookupFilterQuery}
              onChange={(e) => setLookupFilterQuery(e.target.value)}
              placeholder="过滤可用公开接口 (按包名或键名搜索)..."
              className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <select
            value={selectedLookup}
            onChange={(e) => setSelectedLookup(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- 选择要注入的公开查找接口 --</option>
            {availableExports
              .filter(
                (exp) =>
                  !lookupFilterQuery.trim() ||
                  exp.key.toLowerCase().includes(lookupFilterQuery.trim().toLowerCase()) ||
                  exp.pkg.toLowerCase().includes(lookupFilterQuery.trim().toLowerCase()),
              )
              .map((exp) => (
                <option key={exp.key} value={exp.key}>
                  [{exp.pkg}] {exp.key} ({exp.pillar.toUpperCase()})
                </option>
              ))}
          </select>
          <Button
            size="sm"
            onClick={handleAddLookup}
            disabled={!selectedLookup}
            className="h-7 text-xs flex items-center gap-1 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" /> 注入蓝图
          </Button>
        </div>
      </div>

      <div className="flex-1 rounded-lg border border-slate-800 bg-slate-900/20 p-3 space-y-3 overflow-y-auto">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span>已注入组件清单 ({items.length})</span>
          <span className="text-[10px] text-slate-500">
            按基质架构语义分组渲染（序列化顺序由编译内核自动确定）
          </span>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-xs text-slate-600 font-mono py-12">
            <Box className="h-8 w-8 text-slate-700 mb-2" />
            尚未添加任何 Lookup 接口。
          </div>
        ) : (
          [
            { title: 'D3', key: 'd3', variant: 'd3' as const },
            { title: 'D2', key: 'd2', variant: 'd2' as const },
            { title: 'D1', key: 'd1', variant: 'd1' as const },
            { title: '其它', key: 'other', variant: 'outline' as const },
          ].map((group) => {
            const groupItems = items.filter((item) => {
              const rawLookupName = item.lookup.split('::').pop() || item.lookup;
              const p = (item.pillar || rawLookupName.slice(0, 2)).toLowerCase();

              if (group.key === 'other') {
                return p !== 'd1' && p !== 'd2' && p !== 'd3';
              }
              return p === group.key;
            });

            if (groupItems.length === 0) return null;

            return (
              <div key={group.key} className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-2 pt-1">
                  <Badge variant={group.variant} className="text-[9px] px-1 py-0 uppercase">
                    {group.key}
                  </Badge>
                  <span>{group.title}</span>
                  <span className="text-slate-600 text-[10px]">({groupItems.length})</span>
                </div>

                <div className="space-y-1 pl-1">
                  {groupItems.map((item) => (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/80 p-2 text-xs font-mono">
                        <div className="flex items-center gap-2 truncate">
                          <button
                            type="button"
                            onClick={() => handleOpenLookup(item.lookup)}
                            className="text-slate-100 font-semibold hover:text-indigo-300 hover:underline transition-colors text-left truncate flex items-center gap-1.5 group cursor-pointer"
                            title={`点击编辑接口契约: ${item.lookup}`}
                          >
                            <span className="truncate">{item.lookup}</span>
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-indigo-400 shrink-0 transition-opacity" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {overrides[item.lookup] && (
                            <Badge variant="d3" className="text-[9px] px-1 py-0">
                              已覆写
                            </Badge>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (editingOverrideKey === item.lookup) {
                                setEditingOverrideKey(null);
                              } else {
                                setEditingOverrideKey(item.lookup);
                                const currentOverride = overrides[item.lookup] as {
                                  selectors?: Array<{ query?: { id?: string } }>;
                                };
                                const targetId = currentOverride?.selectors?.[0]?.query?.id;
                                setOverrideQueryId(typeof targetId === 'string' ? targetId : '');
                              }
                            }}
                            className={`p-1 rounded ${
                              editingOverrideKey === item.lookup
                                ? 'text-indigo-400 bg-indigo-950'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title="配置 Overrides 覆写"
                          >
                            <Sliders className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveLookup(item.id)}
                            className="p-1 text-slate-500 hover:text-rose-400"
                            title="移除该接口"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {editingOverrideKey === item.lookup && (
                        <div className="rounded border border-indigo-800/60 bg-indigo-950/30 p-2 text-xs font-mono space-y-2">
                          <div className="flex items-center justify-between text-indigo-300 font-semibold text-[11px]">
                            <span>覆写选择器: {item.lookup}</span>
                            {overrides[item.lookup] && (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextOverrides = { ...overrides };
                                  delete nextOverrides[item.lookup];
                                  setOverrides(nextOverrides);
                                  markDirty();
                                }}
                                className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                              >
                                <RotateCcw className="h-3 w-3" /> 重置
                              </button>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={overrideQueryId}
                              onChange={(e) => setOverrideQueryId(e.target.value)}
                              placeholder="目标特定原子 ID，如 d1-custom"
                              className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                if (overrideQueryId.trim()) {
                                  setOverrides({
                                    ...overrides,
                                    [item.lookup]: {
                                      selectors: [{ query: { id: overrideQueryId.trim() } }],
                                    },
                                  });
                                  setEditingOverrideKey(null);
                                  markDirty();
                                }
                              }}
                              disabled={!overrideQueryId.trim()}
                              className="h-7 text-xs"
                            >
                              应用
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60 font-mono text-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-200">{name}</span>
            <span className="text-[10px] text-slate-500 font-mono">v{version}</span>
          </div>

          {!showRightPanel && (
            <button
              type="button"
              onClick={() => setShowRightPanel(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="展开白板拓扑 / 编译产物伴生栏"
            >
              <Eye className="h-3 w-3 text-indigo-400" />
              <span>展开伴生栏</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {saveStatus && <span className="text-xs text-indigo-400 font-mono">{saveStatus}</span>}

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetManifest}
            disabled={!isModified || isSaving}
            className="h-7 text-xs flex items-center gap-1 px-2 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
            title="放弃未保存的修改并重置"
          >
            <RotateCcw className="h-3 w-3" />
            <span>重置</span>
          </Button>

          <Button
            size="sm"
            onClick={handleSaveManifest}
            disabled={isSaving || !isModified}
            className="h-7 text-xs flex items-center gap-1 px-2.5"
          >
            <Save className="h-3 w-3" />
            <span>保存清单</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {showRightPanel ? (
          <SplitPane
            direction="horizontal"
            initialRatio={0.52}
            minPrimarySize={380}
            minSecondarySize={320}
            primary={renderBlueprintContent(false)}
            secondary={
              <div className="h-full flex flex-col bg-slate-900/30 overflow-hidden">
                <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-slate-800 bg-slate-950/70 shrink-0">
                  <div className="flex rounded bg-slate-950 border border-slate-800 p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setRightView('graph')}
                      className={`flex items-center gap-1 px-2.5 py-0.5 rounded transition-colors cursor-pointer ${
                        rightView === 'graph'
                          ? 'bg-indigo-600 text-white font-medium shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="在右侧观察依赖拓扑 DAG 变化"
                    >
                      <Network className="h-3 w-3" /> 白板拓扑
                    </button>
                    <button
                      type="button"
                      onClick={() => setRightView('prompt')}
                      className={`flex items-center gap-1 px-2.5 py-0.5 rounded transition-colors cursor-pointer ${
                        rightView === 'prompt'
                          ? 'bg-indigo-600 text-white font-medium shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="在右侧查看拼接好的完整 Prompt 文本与词元"
                    >
                      <Code2 className="h-3 w-3" /> 实时编译
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowRightPanel(false)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                    title="折叠伴生栏"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden">
                  {rightView === 'graph' ? (
                    <div className="h-full w-full bg-slate-950 overflow-hidden">
                      <TopologyGraph
                        manifest={manifestIdentifier || name}
                        imports={items.map((i) => ({ lookup: i.lookup }))}
                        overrides={overrides}
                        onSelectAtom={handleOpenAtom}
                        onSelectLookup={handleOpenLookup}
                      />
                    </div>
                  ) : (
                    <div className="h-full p-3 bg-slate-950 overflow-hidden">
                      <PromptViewer
                        value={prompt}
                        hookedValue={hookedPrompt}
                        chunks={chunks}
                        profile={profile}
                        onSelectAtom={handleOpenAtom}
                        onOpenLookup={handleOpenLookup}
                        onReload={() => compileCurrent()}
                        isHookActive={isHookActive}
                        onToggleHook={(active) => setIsHookActive(active)}
                      />
                    </div>
                  )}
                </div>
              </div>
            }
          />
        ) : (
          renderBlueprintContent(true)
        )}
      </div>
    </div>
  );
}
