import { CommandPalette } from '@/components/CommandPalette';
import { TabPane } from '@/components/layout/TabPane';
import { CreateManifestModal } from '@/components/modals/CreateManifestModal';
import { CreatePackageModal } from '@/components/modals/CreatePackageModal';
import { CreateWorkspaceModal } from '@/components/modals/CreateWorkspaceModal';
import { Button } from '@/components/ui/button';
import { ManifestExplorer } from '@/features/explorer/ManifestExplorer';
import { PackageExplorer, type PackageItem } from '@/features/explorer/PackageExplorer';
import { type IdeTab, useIdeStore } from '@/stores/ide-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Cpu,
  ExternalLink,
  FilePlus2,
  FolderTree,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

export interface LintIssue {
  level: string;
  code: string;
  message: string;
}

export function App() {
  const ideStore = useIdeStore();
  const wsStore = useWorkspaceStore();

  const [manifests, setManifests] = useState<
    Array<string | { name: string; workspace?: string; workspace_path?: string }>
  >([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [status, setStatus] = useState<string>('检测中...');

  // 新建资产 Modal
  const [isCreatePkgOpen, setIsCreatePkgOpen] = useState(false);
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgWs, setNewPkgWs] = useState('');

  const [isCreateManOpen, setIsCreateManOpen] = useState(false);
  const [newManName, setNewManName] = useState('');
  const [newManWs, setNewManWs] = useState('');

  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);

  // 命令面板
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // 诊断控制台数据
  const [lintLoading, setLintLoading] = useState(false);
  const [lintErrors, setLintErrors] = useState(0);
  const [lintWarnings, setLintWarnings] = useState(0);
  const [lintIssues, setLintIssues] = useState<LintIssue[]>([]);

  // 侧边栏宽度拖拽状态
  const sidebarWidth = ideStore.sidebarWidth;
  const setSidebarWidth = ideStore.setSidebarWidth;
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);

  const handleSidebarPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingSidebar(true);
  };

  const handleSidebarPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDraggingSidebar) return;
      const newWidth = e.clientX - 48;
      if (newWidth >= 180 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    },
    [isDraggingSidebar, setSidebarWidth],
  );

  const handleSidebarPointerUp = useCallback(() => {
    setIsDraggingSidebar(false);
  }, []);

  useEffect(() => {
    if (isDraggingSidebar) {
      window.addEventListener('pointermove', handleSidebarPointerMove);
      window.addEventListener('pointerup', handleSidebarPointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handleSidebarPointerMove);
      window.removeEventListener('pointerup', handleSidebarPointerUp);
    };
  }, [isDraggingSidebar, handleSidebarPointerMove, handleSidebarPointerUp]);

  const [explorerTab, setExplorerTab] = useState<'manifests' | 'packages'>('manifests');

  const fetchAssets = useCallback(() => {
    fetch('/api/assets')
      .then((res) => res.json())
      .then((data) => {
        setManifests(data.manifests || []);
        setPackages(data.packages || []);
      })
      .catch(() => {
        setManifests([]);
        setPackages([]);
      });
  }, []);

  const fetchLintReport = useCallback(() => {
    setLintLoading(true);
    fetch('/api/lint')
      .then((res) => res.json())
      .then((data) => {
        setLintErrors(data.error_count || 0);
        setLintWarnings(data.warn_count || 0);
        setLintIssues(data.issues || []);
      })
      .catch(console.error)
      .finally(() => setLintLoading(false));
  }, []);

  // 初始化加载工作区与资产
  useEffect(() => {
    useWorkspaceStore
      .getState()
      .fetchWorkspaces()
      .then(() => {
        const activeId = useWorkspaceStore.getState().activeWorkspaceId || 'default';
        useIdeStore.getState().setCurrentWorkspace(activeId);
      });

    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setStatus(data.status === 'ok' ? '正常' : data.status))
      .catch(() => setStatus('离线'));

    fetchAssets();
    fetchLintReport();

    const eventSource = new EventSource('/api/events/stream');
    eventSource.addEventListener('change', () => {
      fetchAssets();
      fetchLintReport();
    });

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (isMod && e.key.toLowerCase() === 't') {
        e.preventDefault();
        useIdeStore.getState().openTab(
          {
            id: `empty_${Date.now()}`,
            type: 'empty',
            title: '新标签页',
            closable: true,
          },
          { newTab: true },
        );
      } else if (isMod && e.key === '[') {
        e.preventDefault();
        useIdeStore.getState().goBack();
      } else if (isMod && e.key === ']') {
        e.preventDefault();
        useIdeStore.getState().goForward();
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        useIdeStore.getState().goBack();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        useIdeStore.getState().goForward();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      eventSource.close();
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [fetchAssets, fetchLintReport]);

  // 当切换工作区时刷新数据
  const handleSelectWorkspace = async (wsId: string) => {
    setIsWsDropdownOpen(false);
    await wsStore.switchWorkspace(wsId);
    ideStore.setCurrentWorkspace(wsId);
    fetchAssets();
    fetchLintReport();
  };

  const handleOpenManifestTab = (
    mName: string,
    e?: React.MouseEvent,
    opts?: { isPreview?: boolean },
  ) => {
    const newTab = e ? e.ctrlKey || e.metaKey : false;
    const isPreview = opts?.isPreview ?? !newTab;
    ideStore.openTab(
      {
        id: `manifest:${mName}`,
        type: 'manifest',
        title: mName,
        closable: true,
        manifestName: mName,
        isPreview,
      },
      { newTab, isPreview },
    );
  };

  const handleOpenAtomTab = (
    atomId: string,
    e?: React.MouseEvent,
    opts?: { isPreview?: boolean },
  ) => {
    const newTab = e ? e.ctrlKey || e.metaKey : false;
    const isDraft = atomId.startsWith('draft:');
    const tabTitle = isDraft ? `新建原子 (${atomId.replace('draft:', '')})` : atomId;
    const isPreview = isDraft ? false : (opts?.isPreview ?? !newTab);
    ideStore.openTab(
      {
        id: `atom:${atomId}`,
        type: 'atom',
        title: tabTitle,
        closable: true,
        atomId,
        isPreview,
      },
      { newTab: isDraft ? true : newTab, isPreview },
    );
  };

  const handleOpenLookupTab = (
    lookupKey: string,
    e?: React.MouseEvent,
    opts?: { isPreview?: boolean },
  ) => {
    const newTab = e ? e.ctrlKey || e.metaKey : false;
    const isDraft = lookupKey.startsWith('draft:');
    const isPreview = isDraft ? false : (opts?.isPreview ?? !newTab);
    ideStore.openTab(
      {
        id: `lookup:${lookupKey}`,
        type: 'lookup',
        title: lookupKey.split('::').pop() || lookupKey,
        closable: true,
        lookupKey,
        isPreview,
      },
      { newTab: isDraft ? true : newTab, isPreview },
    );
  };

  const handleSafeCloseTab = (tab: IdeTab, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!tab.closable) return;
    if (tab.isDirty) {
      const confirmDiscard = window.confirm(
        `标签页「${tab.title}」存在尚未保存的更改。确定要放弃修改并关闭吗？`,
      );
      if (!confirmDiscard) return;
    }
    ideStore.closeTab(tab.id);
  };

  const handleProblemClick = (issue: LintIssue) => {
    const text = `${issue.code} ${issue.message}`;
    const atomMatch = text.match(/\b(d[1-3]-[a-zA-Z0-9_-]+)\b/);
    if (atomMatch) {
      handleOpenAtomTab(atomMatch[1]);
      return;
    }
    const manifestMatch = text.match(/Manifest '([^']+)'/);
    if (manifestMatch) {
      handleOpenManifestTab(manifestMatch[1]);
      return;
    }
    const lookupMatch = text.match(/Lookup '([^']+)'/);
    if (lookupMatch) {
      const lKey = lookupMatch[1];
      handleOpenLookupTab(lKey);
    }
  };

  const handleCreateNewAtomDraft = () => {
    const defaultPkg = packages[0]?.name || '';
    ideStore.openTab(
      {
        id: `atom:draft_${Date.now()}`,
        type: 'atom',
        title: '新建原子草稿',
        closable: true,
        atomId: `draft:${defaultPkg}`,
      },
      { newTab: true },
    );
  };

  const handleCreateNewManifest = () => {
    setNewManName(`未命名蓝图_${Date.now().toString().slice(-4)}`);
    const activeWs = wsStore.workspaces.find((w) => w.id === wsStore.activeWorkspaceId);
    setNewManWs(activeWs?.manifest_paths?.[0] || '');
    setIsCreateManOpen(true);
  };

  const submitCreateManifest = () => {
    if (!newManName.trim()) return;
    setIsCreateManOpen(false);
    ideStore.openTab(
      {
        id: `manifest:${newManName.trim()}`,
        type: 'manifest',
        title: newManName.trim(),
        closable: true,
        manifestName: '',
        workspacePath: newManWs || undefined,
      },
      { newTab: true },
    );
  };

  const handleCreateEmptyTab = () => {
    const newTabId = `empty_${Date.now()}`;
    ideStore.openTab(
      {
        id: newTabId,
        type: 'empty',
        title: '新标签页',
        closable: true,
      },
      { newTab: true },
    );
  };

  const handleDeleteManifest = async (mName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`确定要在当前工作区删除清单 "${mName}" 吗？`)) return;
    try {
      const res = await fetch(`/api/manifests/${encodeURIComponent(mName)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchAssets();
        ideStore.closeTab(`manifest:${mName}`);
      } else {
        const data = await res.json();
        alert(`删除失败: ${data.detail}`);
      }
    } catch (_err) {
      alert('删除清单网络请求异常');
    }
  };

  const handleTabSaved = useCallback(() => {
    fetchAssets();
    fetchLintReport();
  }, [fetchAssets, fetchLintReport]);

  const handleTabDeleted = useCallback(
    (tabId: string) => {
      ideStore.closeTab(tabId);
      fetchAssets();
      fetchLintReport();
    },
    [ideStore, fetchAssets, fetchLintReport],
  );

  const handleCreatePackage = useCallback(() => {
    setNewPkgName('');
    const activeWs = wsStore.workspaces.find((w) => w.id === wsStore.activeWorkspaceId);
    setNewPkgWs(activeWs?.library_paths?.[0] || '');
    setIsCreatePkgOpen(true);
  }, [wsStore.workspaces, wsStore.activeWorkspaceId]);

  const submitCreatePackage = useCallback(() => {
    if (!newPkgName.trim()) return;
    setIsCreatePkgOpen(false);

    fetch('/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newPkgName.trim(),
        workspace_path: newPkgWs || undefined,
      }),
    })
      .then(async (res) => {
        if (res.ok) {
          fetchAssets();
          fetchLintReport();
        } else {
          const data = await res.json();
          alert(`创建组件包失败: ${data.detail}`);
        }
      })
      .catch(() => alert('创建组件包网络异常'));
  }, [newPkgName, newPkgWs, fetchAssets, fetchLintReport]);

  const handleDeletePackage = useCallback(
    (pkgName: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.confirm(`确定要删除组件包 "${pkgName}" 吗？`)) return;
      fetch(`/api/packages/${encodeURIComponent(pkgName)}`, {
        method: 'DELETE',
      })
        .then(async (res) => {
          if (res.ok) {
            fetchAssets();
            fetchLintReport();
          } else {
            const data = await res.json();
            alert(`删除组件包失败: ${data.detail}`);
          }
        })
        .catch(() => alert('删除组件包网络异常'));
    },
    [fetchAssets, fetchLintReport],
  );

  const handleDeleteLookup = useCallback(
    (lookupKey: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.confirm(`确定要删除查找接口 "${lookupKey}" 吗？`)) return;
      fetch(`/api/lookups/${encodeURIComponent(lookupKey)}`, {
        method: 'DELETE',
      })
        .then(async (res) => {
          if (res.ok) {
            ideStore.closeTab(`lookup:${lookupKey}`);
            fetchAssets();
            fetchLintReport();
          } else {
            const data = await res.json();
            alert(`删除接口失败: ${data.detail}`);
          }
        })
        .catch(() => alert('删除接口网络异常'));
    },
    [ideStore, fetchAssets, fetchLintReport],
  );

  const handleDeleteAtom = useCallback(
    (atomId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.confirm(`确定要物理删除原子文件 "${atomId}" 吗？`)) return;
      fetch(`/api/atoms/${encodeURIComponent(atomId)}`, {
        method: 'DELETE',
      })
        .then(async (res) => {
          if (res.ok) {
            ideStore.closeTab(`atom:${atomId}`);
            fetchAssets();
            fetchLintReport();
          } else {
            const data = await res.json();
            alert(`删除原子失败: ${data.detail}`);
          }
        })
        .catch(() => alert('删除原子网络异常'));
    },
    [ideStore, fetchAssets, fetchLintReport],
  );

  const activeTab = ideStore.tabs.find((t) => t.id === ideStore.activeTabId);
  const canGoBack = ideStore.historyIndex > 0;
  const canGoForward = ideStore.historyIndex < ideStore.navigationHistory.length - 1;

  const currentWsObj = wsStore.workspaces.find((w) => w.id === wsStore.activeWorkspaceId);

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      <div className="flex flex-1 overflow-hidden">
        {/* 最左侧：活动栏 */}
        <div className="w-12 border-r border-slate-800 bg-slate-950 flex flex-col items-center py-3 space-y-4 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (!ideStore.sidebarOpen) ideStore.setSidebarOpen(true);
              ideStore.setActiveSidebarView('explorer');
            }}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              ideStore.sidebarOpen && ideStore.activeSidebarView === 'explorer'
                ? 'text-indigo-400 bg-indigo-950/60 ring-1 ring-indigo-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
            title="资源视图"
          >
            <FolderTree className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              ideStore.openTab({
                id: 'system:settings',
                type: 'settings',
                title: '设置',
                closable: true,
              });
            }}
            className={`mt-auto p-2 rounded-lg transition-colors cursor-pointer ${
              ideStore.activeTabId === 'system:settings'
                ? 'text-indigo-400 bg-indigo-950/60 ring-1 ring-indigo-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
            title="全局设置与工作区管理"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* 侧边栏：资源视图 */}
        {ideStore.sidebarOpen && (
          <>
            <aside
              style={{
                width: `${sidebarWidth}px`,
                userSelect: isDraggingSidebar ? 'none' : 'auto',
              }}
              className="border-r border-slate-800 bg-slate-900/40 flex flex-col shrink-0 overflow-hidden"
            >
              {/* 侧边栏顶部操作条 */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 bg-slate-950/70">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  资源管理器
                </span>
                <button
                  type="button"
                  onClick={ideStore.toggleSidebar}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                  title="折叠侧边栏"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* 清单 / 组件包 切换选项卡 */}
              <div className="p-2 border-b border-slate-800/60 bg-slate-950/40">
                <div className="flex rounded bg-slate-900 p-0.5 border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setExplorerTab('manifests')}
                    className={`flex-1 py-1 rounded font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      explorerTab === 'manifests'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" /> 清单蓝图
                  </button>
                  <button
                    type="button"
                    onClick={() => setExplorerTab('packages')}
                    className={`flex-1 py-1 rounded font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      explorerTab === 'packages'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Package className="h-3.5 w-3.5" /> 组件包
                  </button>
                </div>

                <div className="pt-2">
                  {explorerTab === 'manifests' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreateNewManifest}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-indigo-300 border-indigo-800/60 bg-indigo-950/20 hover:bg-indigo-950/50 h-7 cursor-pointer"
                    >
                      <FilePlus2 className="h-3.5 w-3.5 text-indigo-400" /> 新建清单蓝图
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreatePackage}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-indigo-300 border-indigo-800/60 bg-indigo-950/20 hover:bg-indigo-950/50 h-7 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 text-indigo-400" /> 新建组件包
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {explorerTab === 'manifests' ? (
                  <ManifestExplorer
                    manifests={manifests}
                    activeManifestName={activeTab?.manifestName}
                    onSelectManifest={(m, e) => handleOpenManifestTab(m, e)}
                    onDeleteManifest={(m, e) => handleDeleteManifest(m, e)}
                  />
                ) : (
                  <PackageExplorer
                    packages={packages}
                    onSelectAtom={(atomId, e) => handleOpenAtomTab(atomId, e)}
                    onOpenLookup={(lKey, e) => handleOpenLookupTab(lKey, e)}
                    onDeletePackage={handleDeletePackage}
                    onDeleteLookup={handleDeleteLookup}
                    onDeleteAtom={handleDeleteAtom}
                  />
                )}
              </div>
            </aside>
            <div
              onPointerDown={handleSidebarPointerDown}
              className={`relative z-20 shrink-0 group flex items-center justify-center w-1.5 cursor-col-resize hover:bg-indigo-500/60 transition-colors ${
                isDraggingSidebar ? 'bg-indigo-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`rounded-full bg-slate-600 group-hover:bg-white h-8 w-1 transition-colors ${
                  isDraggingSidebar ? '!bg-white' : ''
                }`}
              />
            </div>
          </>
        )}

        {/* 中央主工作区 */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          <div className="flex items-center border-b border-slate-800 bg-slate-900/60 overflow-x-auto shrink-0 scrollbar-none h-9">
            <div className="flex items-center gap-0.5 px-2 border-r border-slate-800 shrink-0">
              <button
                type="button"
                onClick={ideStore.goBack}
                disabled={!canGoBack}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors cursor-pointer"
                title="后退"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={ideStore.goForward}
                disabled={!canGoForward}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors cursor-pointer"
                title="前进"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {ideStore.tabs.map((tab) => {
              const isActive = tab.id === ideStore.activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => ideStore.setActiveTab(tab.id)}
                  onDoubleClick={() => ideStore.pinTab(tab.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      ideStore.setActiveTab(tab.id);
                    }
                  }}
                  onAuxClick={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      handleSafeCloseTab(tab, e);
                    }
                  }}
                  className={`group flex items-center gap-2 px-3.5 py-2 border-r border-slate-800 cursor-pointer text-xs font-mono transition-colors shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 ${
                    isActive
                      ? 'bg-slate-950 text-indigo-300 border-t-2 border-t-indigo-500 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-t-2 border-t-transparent'
                  }`}
                >
                  <span
                    className={`truncate max-w-[140px] ${tab.isPreview ? 'italic text-slate-300/80' : ''}`}
                  >
                    {tab.title}
                  </span>
                  {tab.isDirty && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  )}
                  {tab.closable && (
                    <button
                      type="button"
                      onClick={(e) => handleSafeCloseTab(tab, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white rounded cursor-pointer transition-opacity"
                      title="关闭标签页"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={handleCreateEmptyTab}
              className="flex items-center justify-center p-1.5 ml-1.5 mr-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded transition-colors shrink-0 cursor-pointer"
              title="新建标签页"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {ideStore.tabs.map((tab) => (
              <TabPane
                key={tab.id}
                tab={tab}
                isActive={tab.id === ideStore.activeTabId}
                packages={packages}
                manifestsCount={manifests.length}
                onSaved={handleTabSaved}
                onDeleted={handleTabDeleted}
                onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
                onCreateManifest={handleCreateNewManifest}
                onCreateAtom={handleCreateNewAtomDraft}
              />
            ))}
          </div>

          {/* 底部控制台：诊断问题 */}
          {ideStore.bottomPanelOpen && (
            <div className="h-56 border-t border-slate-800 bg-slate-900/95 flex flex-col shrink-0 font-mono text-xs">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 bg-slate-950 text-slate-300">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 font-bold text-indigo-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>工作区合规诊断 ({lintIssues.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={fetchLintReport}
                    disabled={lintLoading}
                    className="text-slate-400 hover:text-indigo-400 p-1 cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${lintLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={ideStore.toggleBottomPanel}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 select-text">
                {lintIssues.length === 0 ? (
                  <div className="flex items-center gap-2 text-emerald-400 py-4 justify-center">
                    <ShieldCheck className="h-4 w-4" />
                    <span>当前工作区下的知识库、Lookup 接口与 Manifest 清单均严格合规</span>
                  </div>
                ) : (
                  lintIssues.map((issue) => {
                    const isErr = issue.level === '错误';
                    return (
                      <button
                        type="button"
                        key={`${issue.level}-${issue.code}-${issue.message}`}
                        onClick={() => handleProblemClick(issue)}
                        className={`w-full text-left flex items-start justify-between p-2 rounded border cursor-pointer group transition-colors ${
                          isErr
                            ? 'border-rose-900/50 bg-rose-950/20 text-rose-200 hover:bg-rose-950/40'
                            : 'border-amber-900/50 bg-amber-950/20 text-amber-200 hover:bg-amber-950/40'
                        }`}
                      >
                        <div className="flex items-start gap-2 flex-1">
                          {isErr ? (
                            <AlertOctagon className="h-3.5 w-3.5 text-rose-400 mt-0.5 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                          )}
                          <span className="font-sans leading-relaxed flex-1">{issue.message}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className="text-[10px] text-slate-500 font-mono">{issue.code}</span>
                          <ExternalLink className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 底部紧凑状态栏 */}
      <footer className="h-6 border-t border-slate-800 bg-slate-950 px-3 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0 select-none z-20">
        <div className="flex items-center gap-3">
          {/* 工作区切换下拉触发器 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsWsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white px-1.5 py-0.5 -mx-1.5 rounded hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="切换工作区"
            >
              <Cpu className="h-3.5 w-3.5 text-indigo-400" />
              <span className="font-semibold text-slate-200">
                {currentWsObj ? currentWsObj.name : 'ACA Studio'}
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {isWsDropdownOpen && (
              <>
                <div
                  role="presentation"
                  className="fixed inset-0 z-40"
                  onClick={() => setIsWsDropdownOpen(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsWsDropdownOpen(false);
                  }}
                />
                <div className="absolute bottom-full left-0 mb-1.5 w-64 z-50 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden py-1 font-mono text-xs">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-800/60">
                    切换工作区 (Vaults)
                  </div>
                  <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
                    {wsStore.workspaces.map((ws) => {
                      const isActive = ws.id === wsStore.activeWorkspaceId;
                      return (
                        <button
                          key={ws.id}
                          type="button"
                          onClick={() => handleSelectWorkspace(ws.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40'
                              : 'text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex flex-col truncate flex-1 min-w-0">
                            <span className="font-semibold text-slate-100 truncate">{ws.name}</span>
                            <span className="text-[10px] text-slate-500 truncate">
                              {ws.root || ws.id}
                            </span>
                          </div>
                          {isActive && <Check className="h-3.5 w-3.5 text-indigo-400 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="p-1 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        setIsWsDropdownOpen(false);
                        setIsCreateWorkspaceOpen(true);
                      }}
                      className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-indigo-300 hover:bg-indigo-950/40 rounded-lg text-left cursor-pointer transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5 text-indigo-400" />
                      <span>注册新工作区...</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status === '正常'
                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                  : 'bg-rose-500'
              }`}
            />
            <span>{status}</span>
          </span>
          <span className="text-slate-600">·</span>
          <button
            type="button"
            onClick={ideStore.toggleBottomPanel}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
              lintErrors > 0
                ? 'text-rose-400 hover:bg-rose-950/60 font-semibold'
                : lintWarnings > 0
                  ? 'text-amber-400 hover:bg-amber-950/60'
                  : 'text-slate-400 hover:text-emerald-300'
            }`}
          >
            {lintErrors > 0 ? (
              <AlertCircle className="h-3 w-3 text-rose-400" />
            ) : (
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
            )}
            <span>
              {lintErrors > 0
                ? `${lintErrors} 错误`
                : lintWarnings > 0
                  ? `${lintWarnings} 警告`
                  : '合规'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-500 hidden sm:inline">
            {manifests.length} 清单 · {packages.length} 组件包
          </span>
          <span className="text-slate-600 hidden sm:inline">·</span>
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="打开命令面板 (Ctrl+P)"
          >
            <Search className="h-3 w-3 text-indigo-400" />
            <span className="text-[10px]">Ctrl+P</span>
          </button>
        </div>
      </footer>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        manifests={manifests}
        packages={packages}
      />

      <CreatePackageModal
        isOpen={isCreatePkgOpen}
        onClose={() => setIsCreatePkgOpen(false)}
        newPkgName={newPkgName}
        setNewPkgName={setNewPkgName}
        newPkgWs={newPkgWs}
        setNewPkgWs={setNewPkgWs}
        libraryPaths={currentWsObj?.library_paths}
        onSubmit={submitCreatePackage}
      />

      <CreateManifestModal
        isOpen={isCreateManOpen}
        onClose={() => setIsCreateManOpen(false)}
        newManName={newManName}
        setNewManName={setNewManName}
        newManWs={newManWs}
        setNewManWs={setNewManWs}
        manifestPaths={currentWsObj?.manifest_paths}
        onSubmit={submitCreateManifest}
      />

      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceOpen}
        onClose={() => setIsCreateWorkspaceOpen(false)}
        onSubmit={async (params) => {
          await wsStore.createWorkspace(params);
          await handleSelectWorkspace(params.id);
        }}
      />
    </div>
  );
}
