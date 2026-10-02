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
  ArrowDown,
  ArrowUp,
  Box,
  Eye,
  Network,
  Plus,
  RotateCcw,
  Save,
  Sliders,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

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
  packages,
  onSaved,
}: {
  manifestName: string; // 若为空字符串则代表新建草稿
  packages: PackageItem[];
  onSaved?: () => void;
}) {
  const setTabDirty = useIdeStore((state) => state.setTabDirty);
  const openTab = useIdeStore((state) => state.openTab);

  // 视角切换：'list' (装配蓝图列表) | 'graph' (白板拓扑图)
  const [activeView, setActiveView] = useState<'list' | 'graph'>('list');
  const [showLivePreview, setShowLivePreview] = useState(true);

  // 稳定标识：manifestIdentifier 对应文件相对路径或逻辑标识，不可被 YAML 内部 name 覆写
  const [manifestIdentifier, setManifestIdentifier] = useState(manifestName);

  // 清单元数据
  const [name, setName] = useState(
    manifestName ? manifestName.split('/').pop() || manifestName : 'new_agent',
  );
  const [version, setVersion] = useState('1.0.0');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<ImportItem[]>([]);
  const [overrides, setOverrides] = useState<Record<string, { selectors: unknown[] }>>({});
  const [isModified, setIsModified] = useState(false);

  // 操作交互
  const [selectedLookup, setSelectedLookup] = useState<string>('');
  const [editingOverrideKey, setEditingOverrideKey] = useState<string | null>(null);
  const [overrideQueryId, setOverrideQueryId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // 实时编译数据
  const [prompt, setPrompt] = useState<string>('');
  const [hookedPrompt, setHookedPrompt] = useState<string | null>(null);
  const [chunks, setChunks] = useState<PromptChunk[]>([]);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [isHookActive, setIsHookActive] = useState(false);

  const tabId = manifestIdentifier ? `manifest:${manifestIdentifier}` : 'manifest:draft';

  const markDirty = () => {
    if (!isModified) {
      setIsModified(true);
      setTabDirty(tabId, true);
    }
  };

  // 提取所有可用公开 Lookup
  const availableExports: Array<{ key: string; pkg: string; pillar: string; desc: string }> = [];
  for (const pkg of packages) {
    for (const [key, def] of Object.entries(pkg.exports || {})) {
      const exportDef = def as LookupExportItem;
      availableExports.push({
        key,
        pkg: pkg.name,
        pillar: exportDef.pillar || 'd1',
        desc: exportDef.description || '',
      });
    }
  }

  // 加载已有清单数据
  useEffect(() => {
    if (!manifestName) return;
    fetch(`/api/manifests/${encodeURIComponent(manifestName)}`)
      .then((res) => {
        if (!res.ok) throw new Error('加载清单失败');
        return res.json();
      })
      .then((data) => {
        setName(data.name || manifestName);
        setVersion(data.version || '1.0.0');
        setDescription(data.description || '');
        setOverrides(data.overrides || {});
        const rawImports = (data.imports || []) as ManifestImportRaw[];
        const mappedItems = rawImports
          .filter((imp) => Boolean(imp.lookup))
          .map((imp) => ({
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            lookup: imp.lookup as string,
          }));
        setItems(mappedItems);
        setIsModified(false);
        setTabDirty(tabId, false);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [manifestName, tabId, setTabDirty]);

  // 实时编译当前清单
  const compileCurrent = useCallback(
    (hookFlag = isHookActive) => {
      const targetQueryKey = manifestIdentifier || name;
      if (manifestIdentifier && !isModified) {
        // 直接编译已保存清单，使用路径标识符
        fetch('/api/build', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            manifest: targetQueryKey,
            is_file: false,
            apply_hook: hookFlag,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.prompt) setPrompt(data.prompt);
            setHookedPrompt(data.hooked_prompt || null);
            setChunks(data.chunks || []);
            if (data.profile) setProfile(data.profile);
          })
          .catch(console.error);
      } else if (items.length > 0) {
        // 即席草稿编译
        fetch('/api/compile-adhoc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imports: items.map((item) => ({ lookup: item.lookup })),
            overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
            apply_hook: hookFlag,
          }),
        })
          .then((res) => res.json())
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

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const nextItems = [...items];
    const temp = nextItems[index];
    nextItems[index] = nextItems[targetIndex];
    nextItems[targetIndex] = temp;
    setItems(nextItems);
    markDirty();
  };

  const handleSaveManifest = async () => {
    if (!name.trim() || items.length === 0) return;
    setIsSaving(true);
    setSaveStatus('正在保存...');
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        version: version.trim(),
        description: description.trim(),
        imports: items.map((i) => ({ lookup: i.lookup })),
        identifier: manifestIdentifier || name.trim(),
      };
      if (Object.keys(overrides).length > 0) {
        payload.overrides = overrides;
      }
      const res = await fetch('/api/manifests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus('已保存');
        setIsModified(false);
        setTabDirty(tabId, false);
        if (!manifestIdentifier) {
          setManifestIdentifier(name.trim());
        }
        onSaved?.();
        setTimeout(() => setSaveStatus(''), 2500);
      } else {
        setSaveStatus(`保存失败: ${data.detail}`);
      }
    } catch (_e) {
      setSaveStatus('保存请求异常');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAtom = (atomId: string) => {
    openTab({
      id: `atom:${atomId}`,
      type: 'atom',
      title: atomId,
      closable: true,
      atomId,
    });
  };

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* 顶部工具栏：视角切换、保存、实时编译开关 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60 font-mono text-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-200">{name}</span>
            {isModified && (
              <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded">
                已修改
              </span>
            )}
          </div>

          {/* 视角切换器：蓝图装配 VS 白板拓扑 */}
          <div className="flex rounded bg-slate-950 border border-slate-800 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveView('list')}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded transition-colors ${
                activeView === 'list'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="h-3 w-3" /> 蓝图列表
            </button>
            <button
              type="button"
              onClick={() => setActiveView('graph')}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded transition-colors ${
                activeView === 'graph'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Network className="h-3 w-3" /> 白板拓扑
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveStatus && <span className="text-xs text-indigo-400 font-mono">{saveStatus}</span>}

          <button
            type="button"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-colors ${
              showLivePreview
                ? 'border-indigo-500 bg-indigo-950/60 text-indigo-300'
                : 'border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="开关伴生实时 Prompt 编译视口"
          >
            <Eye className="h-3 w-3" />
            <span>实时视口: {showLivePreview ? '显示' : '隐藏'}</span>
          </button>

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

      {/* 主视口工作区 (支持 SplitPane 弹性并排实时编译结果) */}
      <div className="flex-1 overflow-hidden">
        {showLivePreview ? (
          <SplitPane
            direction="horizontal"
            initialRatio={0.52}
            minPrimarySize={380}
            minSecondarySize={320}
            primary={
              activeView === 'list' ? (
                <div className="h-full flex flex-col p-4 space-y-3 overflow-y-auto">
                  {/* 元数据表单 */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-2 text-xs font-mono">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label htmlFor="manifest-name-input" className="text-slate-400 block mb-1">
                          名称
                        </label>
                        <input
                          id="manifest-name-input"
                          type="text"
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            markDirty();
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="manifest-version-input"
                          className="text-slate-400 block mb-1"
                        >
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

                  {/* 挑选 Lookup 区域 */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 flex gap-2">
                    <select
                      value={selectedLookup}
                      onChange={(e) => setSelectedLookup(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- 选择要注入的公开查找接口 --</option>
                      {availableExports.map((exp) => (
                        <option key={exp.key} value={exp.key}>
                          [{exp.pkg}] {exp.key} ({exp.pillar.toUpperCase()})
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={handleAddLookup}
                      disabled={!selectedLookup}
                      className="h-7 text-xs flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> 注入
                    </Button>
                  </div>

                  {/* 已选组件列表 */}
                  <div className="flex-1 rounded-lg border border-slate-800 bg-slate-900/20 p-3 space-y-2 overflow-y-auto">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span>已声明组件 ({items.length})</span>
                    </div>

                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-xs text-slate-600 font-mono py-12">
                        <Box className="h-8 w-8 text-slate-700 mb-2" />
                        尚未添加任何 Lookup 接口。
                      </div>
                    ) : (
                      items.map((item, idx) => (
                        <div key={item.id} className="space-y-1">
                          <div className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/80 p-2 text-xs font-mono">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-600 font-bold">{idx + 1}.</span>
                              <span className="text-slate-100 font-semibold">{item.lookup}</span>
                              {item.pillar && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0">
                                  {item.pillar}
                                </Badge>
                              )}
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
                                    setOverrideQueryId(
                                      typeof targetId === 'string' ? targetId : '',
                                    );
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
                                onClick={() => handleMoveItem(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveItem(idx, 'down')}
                                disabled={idx === items.length - 1}
                                className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveLookup(item.id)}
                                className="p-1 text-slate-500 hover:text-rose-400"
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
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full w-full">
                  <TopologyGraph
                    manifest={manifestIdentifier || name}
                    onSelectAtom={handleOpenAtom}
                  />
                </div>
              )
            }
            secondary={
              <div className="h-full p-3 bg-slate-950 overflow-hidden">
                <PromptViewer
                  value={prompt}
                  hookedValue={hookedPrompt}
                  chunks={chunks}
                  profile={profile}
                  onSelectAtom={handleOpenAtom}
                  onReload={() => compileCurrent()}
                  isHookActive={isHookActive}
                  onToggleHook={(active) => setIsHookActive(active)}
                />
              </div>
            }
          />
        ) : activeView === 'list' ? (
          <div className="h-full p-4 overflow-y-auto">
            {/* 全宽列表模式 */}
            <div className="max-w-3xl mx-auto space-y-4">
              {/* 重复列表主内容 */}
              <div className="text-slate-400 text-xs font-mono">
                当前正处于全宽蓝图设计模式。可在右上角重新开启“实时视口”。
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full w-full">
            <TopologyGraph manifest={manifestIdentifier || name} onSelectAtom={handleOpenAtom} />
          </div>
        )}
      </div>
    </div>
  );
}
