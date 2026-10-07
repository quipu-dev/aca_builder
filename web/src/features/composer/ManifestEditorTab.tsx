import {
  buildManifest,
  compileAdhocManifest,
  fetchManifestDetail,
  useSaveManifestMutation,
} from '@/api/manifests';
import type { ManifestInvariants } from '@/api/manifests';
import {
  type ProfileSummary,
  type PromptChunk,
  PromptViewer,
} from '@/components/editor/PromptViewer';
import { Autocomplete, type AutocompleteOption } from '@/components/ui/autocomplete';
import { TagAutocomplete } from '@/components/ui/autocomplete';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SplitPane } from '@/components/ui/split-pane';
import type { LookupExportItem, PackageItem } from '@/features/explorer/PackageExplorer';
import { TopologyGraph } from '@/features/graph/TopologyGraph';
import { useWorkspaceCandidates } from '@/hooks/use-workspace-candidates';
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
  Share2,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';

export interface ImportItem {
  id: string;
  lookup: string;
  pillar?: string;
  description?: string;
  with?: Record<string, string>;
}

interface ManifestImportRaw {
  lookup: string;
  with?: Record<string, string>;
}

interface ManifestDraftState {
  identifier: string;
  name: string;
  version: string;
  description: string;
  invariants: ManifestInvariants;
  items: ImportItem[];
  initialSnapshot: {
    name: string;
    version: string;
    description: string;
    invariants: ManifestInvariants;
    items: ImportItem[];
  } | null;
  isModified: boolean;
}

type ManifestAction =
  | {
      type: 'LOAD_SUCCESS';
      payload: {
        identifier: string;
        name: string;
        version: string;
        description: string;
        invariants?: ManifestInvariants;
        items: ImportItem[];
      };
    }
  | { type: 'SET_FIELD'; field: 'identifier' | 'name' | 'version' | 'description'; value: string }
  | { type: 'SET_INVARIANTS'; payload: Partial<ManifestInvariants> }
  | { type: 'ADD_IMPORT'; item: ImportItem }
  | { type: 'REMOVE_IMPORT'; id: string }
  | { type: 'SET_IMPORT_WITH'; itemId: string; slotKey: string; targetValue: string }
  | { type: 'REMOVE_IMPORT_WITH'; itemId: string; slotKey: string }
  | { type: 'RESET' }
  | { type: 'COMMIT_SAVE'; newIdentifier?: string };

function manifestReducer(state: ManifestDraftState, action: ManifestAction): ManifestDraftState {
  switch (action.type) {
    case 'LOAD_SUCCESS': {
      const invariants = action.payload.invariants || {};
      const snapshot = {
        name: action.payload.name,
        version: action.payload.version,
        description: action.payload.description,
        invariants: { ...invariants },
        items: action.payload.items,
      };
      return {
        ...action.payload,
        invariants: { ...invariants },
        initialSnapshot: snapshot,
        isModified: false,
      };
    }
    case 'SET_INVARIANTS': {
      return {
        ...state,
        invariants: {
          ...state.invariants,
          ...action.payload,
        },
        isModified: true,
      };
    }
    case 'SET_FIELD': {
      return {
        ...state,
        [action.field]: action.value,
        isModified: true,
      };
    }
    case 'ADD_IMPORT': {
      if (state.items.some((i) => i.lookup === action.item.lookup)) return state;
      return {
        ...state,
        items: [...state.items, action.item],
        isModified: true,
      };
    }
    case 'REMOVE_IMPORT': {
      return {
        ...state,
        items: state.items.filter((i) => i.id !== action.id),
        isModified: true,
      };
    }
    case 'SET_IMPORT_WITH': {
      return {
        ...state,
        items: state.items.map((item) => {
          if (item.id !== action.itemId) return item;
          return {
            ...item,
            with: {
              ...(item.with || {}),
              [action.slotKey]: action.targetValue,
            },
          };
        }),
        isModified: true,
      };
    }
    case 'REMOVE_IMPORT_WITH': {
      return {
        ...state,
        items: state.items.map((item) => {
          if (item.id !== action.itemId) return item;
          const nextWith = { ...(item.with || {}) };
          delete nextWith[action.slotKey];
          return {
            ...item,
            with: Object.keys(nextWith).length > 0 ? nextWith : undefined,
          };
        }),
        isModified: true,
      };
    }
    case 'RESET': {
      if (!state.initialSnapshot) return state;
      return {
        ...state,
        name: state.initialSnapshot.name,
        version: state.initialSnapshot.version,
        description: state.initialSnapshot.description,
        invariants: { ...state.initialSnapshot.invariants },
        items: [...state.initialSnapshot.items],
        isModified: false,
      };
    }
    case 'COMMIT_SAVE': {
      const newSnapshot = {
        name: state.name,
        version: state.version,
        description: state.description,
        invariants: { ...state.invariants },
        items: [...state.items],
      };
      return {
        ...state,
        identifier: action.newIdentifier || state.identifier,
        initialSnapshot: newSnapshot,
        isModified: false,
      };
    }
    default:
      return state;
  }
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
  const preferences = useIdeStore((state) => state.preferences);

  const isDraft = !manifestName || manifestName.startsWith('draft_');

  const [rightView, setRightView] = useState<'graph' | 'prompt'>(
    preferences?.defaultRightPanel === 'prompt' ? 'prompt' : 'graph',
  );
  const [showRightPanel, setShowRightPanel] = useState(true);

  // 单向动作循环 (Unidirectional Action Loop) 状态管理
  const [state, dispatch] = useReducer(manifestReducer, {
    identifier: isDraft ? '' : manifestName,
    name: !isDraft && manifestName ? manifestName.split('/').pop() || manifestName : '',
    version: '1.0.0',
    description: '',
    invariants: {},
    items: [],
    initialSnapshot: null,
    isModified: false,
  });

  const {
    identifier: manifestIdentifier,
    name,
    version,
    description,
    invariants,
    items,
    isModified,
  } = state;
  const [showInvariantsPanel, setShowInvariantsPanel] = useState(false);

  const [selectedLookup, setSelectedLookup] = useState<string>('');
  const [editingWithItemId, setEditingWithItemId] = useState<string | null>(null);
  const [withSlotKey, setWithSlotKey] = useState<string>('');
  const [withTargetVal, setWithTargetVal] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState('');

  const [prompt, setPrompt] = useState<string>('');
  const [hookedPrompt, setHookedPrompt] = useState<string | null>(null);
  const [chunks, setChunks] = useState<PromptChunk[]>([]);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [isHookActive, setIsHookActive] = useState(false);

  const { atomOptions, domainOptions } = useWorkspaceCandidates(packages);

  const saveManifestMutation = useSaveManifestMutation();
  const isSaving = saveManifestMutation.isPending;

  const tabId = manifestIdentifier ? `manifest:${manifestIdentifier}` : 'manifest:draft';

  useEffect(() => {
    setTabDirty(tabId, isModified);
  }, [tabId, isModified, setTabDirty]);

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

  const exportLookupOptions = useMemo<AutocompleteOption[]>(() => {
    return availableExports.map((exp) => ({
      value: exp.key,
      label: exp.key,
      badge: exp.pillar.toUpperCase(),
      badgeVariant: exp.pillar.toLowerCase() as 'd1' | 'd2' | 'd3',
      group: `@${exp.pkg}`,
      description: exp.desc || undefined,
    }));
  }, [availableExports]);

  useEffect(() => {
    if (!manifestName || isDraft) return;

    fetchManifestDetail(manifestName)
      .then((data) => {
        const loadedName = data.name || manifestName;
        const loadedVersion = data.version || '1.0.0';
        const loadedDesc = data.description || '';
        const rawImports = (data.imports || []) as ManifestImportRaw[];
        const mappedItems = rawImports
          .filter((imp) => Boolean(imp?.lookup))
          .map((imp) => ({
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            lookup: imp.lookup,
            with: imp.with && typeof imp.with === 'object' ? imp.with : undefined,
          }));

        dispatch({
          type: 'LOAD_SUCCESS',
          payload: {
            identifier: manifestName,
            name: loadedName,
            version: loadedVersion,
            description: loadedDesc,
            invariants: data.invariants,
            items: mappedItems,
          },
        });
      })
      .catch((err) => {
        console.error(err);
      });
  }, [manifestName, isDraft]);

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
          imports: items.map((item) => ({
            lookup: item.lookup,
            with: item.with && Object.keys(item.with).length > 0 ? item.with : undefined,
          })),
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
    [manifestIdentifier, name, isModified, items, isHookActive],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      compileCurrent();
    }, 250);
    return () => clearTimeout(timer);
  }, [compileCurrent]);

  const handleAddLookup = () => {
    if (!selectedLookup) return;
    const found = availableExports.find((e) => e.key === selectedLookup);
    const newItem: ImportItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      lookup: selectedLookup,
      pillar: found?.pillar,
      description: found?.desc,
    };
    dispatch({ type: 'ADD_IMPORT', item: newItem });
    setSelectedLookup('');
  };

  const handleRemoveLookup = (id: string) => {
    dispatch({ type: 'REMOVE_IMPORT', id });
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
        imports: items.map((i) => ({
          lookup: i.lookup,
          with: i.with && Object.keys(i.with).length > 0 ? i.with : undefined,
        })),
        invariants: Object.keys(invariants).length > 0 ? invariants : undefined,
        identifier: targetIdentifier,
        workspace_path: workspacePath,
      });

      setSaveStatus('已保存');
      dispatch({ type: 'COMMIT_SAVE', newIdentifier: targetIdentifier });
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
    invariants,
    version,
    description,
    workspacePath,
    tabId,
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
    dispatch({ type: 'RESET' });
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
            <Input
              id="manifest-id-input"
              type="text"
              value={manifestIdentifier}
              onChange={(e) => {
                dispatch({ type: 'SET_FIELD', field: 'identifier', value: e.target.value });
              }}
              placeholder="例如: smart-contract-auditor"
            />
          </div>
          <div>
            <label htmlFor="manifest-name-input" className="text-slate-400 block mb-1">
              显示名称
            </label>
            <Input
              id="manifest-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                dispatch({ type: 'SET_FIELD', field: 'name', value: e.target.value });
              }}
              placeholder="智能体装配名称"
            />
          </div>
          <div>
            <label htmlFor="manifest-version-input" className="text-slate-400 block mb-1">
              版本
            </label>
            <Input
              id="manifest-version-input"
              type="text"
              value={version}
              onChange={(e) => {
                dispatch({ type: 'SET_FIELD', field: 'version', value: e.target.value });
              }}
            />
          </div>
          <div>
            <label htmlFor="manifest-desc-input" className="text-slate-400 block mb-1">
              描述说明
            </label>
            <Input
              id="manifest-desc-input"
              type="text"
              value={description}
              onChange={(e) => {
                dispatch({ type: 'SET_FIELD', field: 'description', value: e.target.value });
              }}
            />
          </div>
        </div>

        {/* Invariants 架构断言守卫折叠开关 */}
        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowInvariantsPanel((prev) => !prev)}
            className="flex items-center gap-1.5 text-[11px] text-amber-400 hover:text-amber-300 cursor-pointer font-semibold"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>离散架构断言守卫 (Invariants Guardrails)</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1">
              {showInvariantsPanel ? '收起' : '展开配置'}
            </Badge>
          </button>
          <span className="text-[10px] text-slate-500">
            {invariants.forbidden_tags?.length || 0} 禁忌标签 · 深度限制:{' '}
            {invariants.max_graph_depth ?? '无'}
          </span>
        </div>

        {showInvariantsPanel && (
          <div className="rounded border border-amber-900/50 bg-amber-950/20 p-3 space-y-2.5 mt-2 text-xs">
            <div className="flex items-center gap-3">
              <label htmlFor="inv-max-depth" className="text-slate-400 shrink-0">
                最大依赖拓扑深度:
              </label>
              <Input
                id="inv-max-depth"
                type="number"
                min="1"
                max="20"
                value={invariants.max_graph_depth ?? ''}
                onChange={(e) => {
                  const val = e.target.value.trim() ? Number(e.target.value) : undefined;
                  dispatch({ type: 'SET_INVARIANTS', payload: { max_graph_depth: val } });
                }}
                placeholder="如: 4 (留空表示不限制)"
                className="w-40 h-7"
              />
            </div>

            <div>
              <span className="text-slate-400 block mb-1">
                禁忌标签 (Forbidden Tags - 生产环境严禁包含):
              </span>
              <TagAutocomplete
                values={invariants.forbidden_tags || []}
                onChange={(tags) => {
                  dispatch({ type: 'SET_INVARIANTS', payload: { forbidden_tags: tags } });
                }}
                options={domainOptions}
                placeholder="输入禁止在编译闭包中出现的标签 (如 deprecated)"
                badgeVariant="destructive"
              />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-300">
          <div className="flex items-center gap-1.5 font-semibold text-indigo-400">
            <Filter className="h-3.5 w-3.5" />
            <span>注入公开查找接口 (Imports)</span>
          </div>
          <span className="text-[10px] text-slate-500">输入包名或键名即可实时模糊过滤与预览</span>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <Autocomplete
              value={selectedLookup}
              onChange={setSelectedLookup}
              options={exportLookupOptions}
              placeholder="搜索或输入要注入的公开查找接口 (如 pkg::d1l-xxx)..."
              onSelectOption={(opt) => {
                setSelectedLookup(opt.value);
              }}
            />
          </div>
          <Button
            size="sm"
            onClick={handleAddLookup}
            disabled={!selectedLookup.trim()}
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
                          {item.with && Object.keys(item.with).length > 0 && (
                            <Badge
                              variant="d2"
                              className="text-[9px] px-1.5 py-0 font-bold bg-purple-950/80 text-purple-300 border-purple-700/60"
                            >
                              with ({Object.keys(item.with).length})
                            </Badge>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (editingWithItemId === item.id) {
                                setEditingWithItemId(null);
                              } else {
                                setEditingWithItemId(item.id);
                              }
                            }}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              editingWithItemId === item.id
                                ? 'text-purple-300 bg-purple-950/80 ring-1 ring-purple-600'
                                : 'text-slate-400 hover:text-purple-300'
                            }`}
                            title="配置作用域依赖注入 (with)"
                          >
                            <Share2 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveLookup(item.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                            title="移除该接口"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {editingWithItemId === item.id && (
                        <div className="rounded border border-purple-800/60 bg-purple-950/25 p-2.5 text-xs font-mono space-y-2">
                          <div className="flex items-center justify-between text-purple-300 font-semibold text-[11px]">
                            <span className="flex items-center gap-1.5">
                              <Share2 className="h-3.5 w-3.5" /> 局部依赖注入配置 (Scoped with)
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              仅对 {item.lookup} 分支生效
                            </span>
                          </div>

                          {item.with && Object.keys(item.with).length > 0 && (
                            <div className="space-y-1">
                              {Object.entries(item.with).map(([slot, target]) => (
                                <div
                                  key={slot}
                                  className="flex items-center justify-between px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[11px]"
                                >
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="text-slate-400 truncate">{slot}</span>
                                    <span className="text-purple-400 font-bold">➔</span>
                                    <span className="text-emerald-300 font-semibold truncate">
                                      {target}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      dispatch({
                                        type: 'REMOVE_IMPORT_WITH',
                                        itemId: item.id,
                                        slotKey: slot,
                                      });
                                    }}
                                    className="text-slate-500 hover:text-rose-400 p-0.5 ml-2 cursor-pointer"
                                    title="删除此项注入"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2 items-center pt-1">
                            <div className="flex-1">
                              <Autocomplete
                                value={withSlotKey}
                                onChange={setWithSlotKey}
                                options={exportLookupOptions}
                                placeholder="输入/选择被替换的插槽 (如 d2l-file-skill)"
                              />
                            </div>
                            <div className="flex-1">
                              <Autocomplete
                                value={withTargetVal}
                                onChange={setWithTargetVal}
                                options={atomOptions}
                                placeholder="选择目标实现原子 (如 d2-file-skill-mcp)"
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (withSlotKey.trim() && withTargetVal.trim()) {
                                  dispatch({
                                    type: 'SET_IMPORT_WITH',
                                    itemId: item.id,
                                    slotKey: withSlotKey.trim(),
                                    targetValue: withTargetVal.trim(),
                                  });
                                  setWithSlotKey('');
                                  setWithTargetVal('');
                                }
                              }}
                              disabled={!withSlotKey.trim() || !withTargetVal.trim()}
                              className="h-7 text-xs shrink-0 bg-purple-600 hover:bg-purple-500"
                            >
                              注入
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
    <div className="flex h-full flex-col bg-slate-950 text-slate-100 overflow-hidden">
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
                  <SegmentedControl
                    size="sm"
                    value={rightView}
                    onChange={setRightView}
                    options={[
                      {
                        value: 'graph',
                        label: '白板拓扑',
                        icon: <Network className="h-3 w-3" />,
                        title: '在右侧观察依赖拓扑 DAG 变化',
                      },
                      {
                        value: 'prompt',
                        label: '实时编译',
                        icon: <Code2 className="h-3 w-3" />,
                        title: '在右侧查看拼接好的完整 Prompt 文本与词元',
                      },
                    ]}
                  />

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
                        imports={items.map((i) => ({ lookup: i.lookup, with: i.with }))}
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
