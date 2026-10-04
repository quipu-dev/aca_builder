import { createFolderFs, deleteFsItem, moveFsItem } from '@/api/fs';
import { CommandPalette } from '@/components/CommandPalette';
import { TabPane } from '@/components/layout/TabPane';
import { CreateFolderModal } from '@/components/modals/CreateFolderModal';
import { CreatePackageModal } from '@/components/modals/CreatePackageModal';
import { CreateWorkspaceModal } from '@/components/modals/CreateWorkspaceModal';
import { Button } from '@/components/ui/button';
import { ToastContainer, toast } from '@/components/ui/toast';
import type { LintIssue } from '@/features/diagnostics/DiagnosticsDrawer';
import { ManifestExplorer } from '@/features/explorer/ManifestExplorer';
import {
  type KernelInfo,
  PackageExplorer,
  type PackageItem,
} from '@/features/explorer/PackageExplorer';
import { type IdeTab, useIdeStore } from '@/stores/ide-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderPlus } from 'lucide-react';
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
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

const EMPTY_MANIFESTS: Array<
  string | { name: string; workspace?: string; workspace_path?: string }
> = [];
const EMPTY_PACKAGES: PackageItem[] = [];

export function App() {
  const ideStore = useIdeStore();
  const wsStore = useWorkspaceStore();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<string>('检测中...');
  const [explorerTab, setExplorerTab] = useState<'manifests' | 'packages'>('manifests');

  // 新建资产 Modal
  const [isCreatePkgOpen, setIsCreatePkgOpen] = useState(false);
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgWs, setNewPkgWs] = useState('');

  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [targetParentFolder, setTargetParentFolder] = useState('');

  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // 1. 使用 React Query 接管工作区资产数据
  const { data: assetsData } = useQuery<{
    manifests: Array<string | { name: string; workspace?: string; workspace_path?: string }>;
    packages: PackageItem[];
    kernel: KernelInfo | null;
  }>({
    queryKey: ['assets', wsStore.activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch('/api/assets');
      if (!res.ok) throw new Error('获取工作区资产失败');
      return res.json();
    },
  });

  const manifests = assetsData?.manifests ?? EMPTY_MANIFESTS;
  const packages = assetsData?.packages ?? EMPTY_PACKAGES;
  const kernel = assetsData?.kernel || null;

  // 2. 使用 React Query 接管合规诊断报告
  const {
    data: lintData,
    isFetching: lintLoading,
    refetch: fetchLintReport,
  } = useQuery<{
    error_count: number;
    warn_count: number;
    issues: LintIssue[];
  }>({
    queryKey: ['lint', wsStore.activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch('/api/lint');
      if (!res.ok) throw new Error('获取合规诊断报告失败');
      return res.json();
    },
  });

  const lintErrors = lintData?.error_count || 0;
  const lintWarnings = lintData?.warn_count || 0;
  const lintIssues = lintData?.issues || [];

  // 全局刷新触发器
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    queryClient.invalidateQueries({ queryKey: ['lint'] });
  }, [queryClient]);

  // 初始化加载工作区与后端状态检测（带 SSE 防抖）
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

    let sseTimer: ReturnType<typeof setTimeout> | null = null;
    const eventSource = new EventSource('/api/events/stream');
    eventSource.addEventListener('change', () => {
      if (sseTimer) clearTimeout(sseTimer);
      sseTimer = setTimeout(() => {
        invalidateAll();
      }, 350);
    });

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('aca:save-active-tab'));
      } else if (isMod && e.key.toLowerCase() === 'p') {
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
      } else if (e.key === ']') {
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
      if (sseTimer) clearTimeout(sseTimer);
      eventSource.close();
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [invalidateAll]);

  const handleSelectWorkspace = async (wsId: string) => {
    setIsWsDropdownOpen(false);
    await wsStore.switchWorkspace(wsId);
    ideStore.setCurrentWorkspace(wsId);
    invalidateAll();
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
    let tabTitle = atomId;
    if (isDraft) {
      const parts = atomId.split(':');
      const targetPkg = parts[1] || '';
      tabTitle = targetPkg === 'kernel' ? '初始化 Kernel' : `新建原子 (${targetPkg || '草稿'})`;
    }
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
    if (!issue.target) return;
    switch (issue.target.type) {
      case 'atom':
        handleOpenAtomTab(issue.target.id);
        break;
      case 'lookup':
        handleOpenLookupTab(issue.target.id);
        break;
      case 'manifest':
        handleOpenManifestTab(issue.target.id);
        break;
    }
  };

  const handleCreateNewAtomDraft = () => {
    const defaultPkg = packages[0]?.name || '';
    const draftId = `draft:${defaultPkg}:${Date.now()}`;
    ideStore.openTab(
      {
        id: `atom:${draftId}`,
        type: 'atom',
        title: `新建原子 (${defaultPkg || '草稿'})`,
        closable: true,
        atomId: draftId,
      },
      { newTab: true },
    );
  };

  const handleCreateKernelDraft = () => {
    const draftId = `draft:kernel:${Date.now()}`;
    ideStore.openTab(
      {
        id: `atom:${draftId}`,
        type: 'atom',
        title: '初始化 Kernel 协议',
        closable: true,
        atomId: draftId,
      },
      { newTab: true },
    );
  };

  const handleCreateNewManifest = (prefixPath = '') => {
    const draftId = prefixPath ? `${prefixPath}/draft_${Date.now()}` : `draft_${Date.now()}`;
    ideStore.openTab(
      {
        id: `manifest:${draftId}`,
        type: 'manifest',
        title: prefixPath ? `${prefixPath}/新建清单` : '新建清单',
        closable: true,
        manifestName: draftId,
      },
      { newTab: true },
    );
  };

  const handleOpenCreateFolder = (parent = '') => {
    setTargetParentFolder(parent);
    setIsCreateFolderOpen(true);
  };

  const handleSubmitCreateFolder = async (folderPath: string) => {
    try {
      await createFolderFs({ path: folderPath, scope: 'manifests' });
      toast.success(`目录 "${folderPath}" 创建成功`);
      invalidateAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '创建目录失败');
    }
  };

  const handleDeleteFolder = (folderPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const wsId = wsStore.activeWorkspaceId;
    const queryKey = ['assets', wsId];
    const previousAssets = queryClient.getQueryData(queryKey);

    // 乐观剔除该目录下所有项
    queryClient.setQueryData(queryKey, (old: typeof assetsData) => {
      if (!old) return old;
      return {
        ...old,
        manifests: old.manifests.filter((m) => {
          const name = typeof m === 'string' ? m : m.name;
          return name !== folderPath && !name.startsWith(`${folderPath}/`);
        }),
      };
    });

    deleteFsItem({ path: folderPath, scope: 'manifests' })
      .then(() => {
        toast.success(`物理目录 "${folderPath}" 已删除`);
        queryClient.invalidateQueries({ queryKey: ['lint', wsId] });
      })
      .catch((err: unknown) => {
        queryClient.setQueryData(queryKey, previousAssets);
        toast.error(err instanceof Error ? err.message : '删除目录失败');
      });
  };

  const handleMoveManifestItem = (srcPath: string, destFolder: string, isFolder: boolean) => {
    const itemName = srcPath.split('/').pop() || srcPath;
    const cleanDestFolder = destFolder.trim().replace(/^\/+|\/+$/g, '');
    const newPath = cleanDestFolder ? `${cleanDestFolder}/${itemName}` : itemName;

    // 1. 同位置移动检查
    if (srcPath === newPath) return;

    // 2. 文件夹循环嵌套防卫
    if (isFolder && (cleanDestFolder === srcPath || cleanDestFolder.startsWith(`${srcPath}/`))) {
      toast.error('禁止将文件夹移动到其自身或其子目录内部');
      return;
    }

    moveFsItem({
      src: srcPath,
      dest: newPath,
      scope: 'manifests',
    })
      .then(() => {
        toast.success(`已移动至 ${cleanDestFolder ? `${cleanDestFolder}/` : '根目录'}`);
        invalidateAll();

        // 同步迁移已打开的对应 Tab
        const oldTabId = `manifest:${srcPath}`;
        const activeTabs = ideStore.tabs;
        const targetTab = activeTabs.find((t) => t.id === oldTabId);
        if (targetTab) {
          ideStore.replaceTab(oldTabId, {
            ...targetTab,
            id: `manifest:${newPath}`,
            title: itemName,
            manifestName: newPath,
          });
        }
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : '移动失败');
      });
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
    const wsId = wsStore.activeWorkspaceId;
    const queryKey = ['assets', wsId];
    const previousAssets = queryClient.getQueryData(queryKey);

    // 1. 乐观更新：0ms 瞬间从视图中移除目标清单
    queryClient.setQueryData(queryKey, (old: typeof assetsData) => {
      if (!old) return old;
      return {
        ...old,
        manifests: old.manifests.filter((m) =>
          typeof m === 'string' ? m !== mName : m.name !== mName,
        ),
      };
    });
    ideStore.closeTab(`manifest:${mName}`);

    // 2. 直接发起异步删除网络请求
    fetch(`/api/manifests/${encodeURIComponent(mName)}`, {
      method: 'DELETE',
    })
      .then(async (res) => {
        if (res.ok) {
          toast.success(`清单 "${mName}" 已删除`);
          queryClient.invalidateQueries({ queryKey: ['lint', wsId] });
        } else {
          const data = await res.json();
          queryClient.setQueryData(queryKey, previousAssets);
          toast.error(`删除清单失败: ${data.detail || res.statusText}`);
        }
      })
      .catch(() => {
        queryClient.setQueryData(queryKey, previousAssets);
        toast.error('删除清单网络请求异常');
      });
  };

  const handleTabSaved = useCallback(() => {
    invalidateAll();
  }, [invalidateAll]);

  const handleTabDeleted = useCallback(
    (tabId: string) => {
      ideStore.closeTab(tabId);
      invalidateAll();
    },
    [ideStore, invalidateAll],
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
          toast.success(`组件包 "${newPkgName.trim()}" 创建成功`);
          invalidateAll();
        } else {
          const data = await res.json();
          toast.error(`创建组件包失败: ${data.detail || res.statusText}`);
        }
      })
      .catch(() => toast.error('创建组件包网络异常'));
  }, [newPkgName, newPkgWs, invalidateAll]);

  const handleDeletePackage = useCallback(
    (pkgName: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const wsId = wsStore.activeWorkspaceId;
      const queryKey = ['assets', wsId];
      const previousAssets = queryClient.getQueryData(queryKey);

      // 乐观剔除 Package
      queryClient.setQueryData(queryKey, (old: typeof assetsData) => {
        if (!old) return old;
        return {
          ...old,
          packages: old.packages.filter((pkg) => pkg.name !== pkgName),
        };
      });

      fetch(`/api/packages/${encodeURIComponent(pkgName)}`, {
        method: 'DELETE',
      })
        .then(async (res) => {
          if (res.ok) {
            toast.success(`组件包 "${pkgName}" 已删除`);
            queryClient.invalidateQueries({ queryKey: ['lint', wsId] });
          } else {
            const data = await res.json();
            queryClient.setQueryData(queryKey, previousAssets);
            toast.error(`删除组件包失败: ${data.detail || res.statusText}`);
          }
        })
        .catch(() => {
          queryClient.setQueryData(queryKey, previousAssets);
          toast.error('删除组件包网络异常');
        });
    },
    [wsStore.activeWorkspaceId, queryClient],
  );

  const handleDeleteLookup = useCallback(
    (lookupKey: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const wsId = wsStore.activeWorkspaceId;
      const queryKey = ['assets', wsId];
      const previousAssets = queryClient.getQueryData(queryKey);

      // 乐观剔除该 Lookup
      queryClient.setQueryData(queryKey, (old: typeof assetsData) => {
        if (!old) return old;
        return {
          ...old,
          packages: old.packages.map((pkg) => {
            const exports = { ...pkg.exports };
            const internal = { ...pkg.internal_lookups };
            delete exports[lookupKey];
            delete internal[lookupKey];
            return { ...pkg, exports, internal_lookups: internal };
          }),
        };
      });
      ideStore.closeTab(`lookup:${lookupKey}`);

      fetch(`/api/lookups/${encodeURIComponent(lookupKey)}`, {
        method: 'DELETE',
      })
        .then(async (res) => {
          if (res.ok) {
            toast.success(`接口 "${lookupKey}" 已删除`);
            queryClient.invalidateQueries({ queryKey: ['lint', wsId] });
          } else {
            const data = await res.json();
            queryClient.setQueryData(queryKey, previousAssets);
            toast.error(`删除接口失败: ${data.detail || res.statusText}`);
          }
        })
        .catch(() => {
          queryClient.setQueryData(queryKey, previousAssets);
          toast.error('删除接口网络异常');
        });
    },
    [ideStore, wsStore.activeWorkspaceId, queryClient],
  );

  const handleDeleteAtom = useCallback(
    (atomId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const wsId = wsStore.activeWorkspaceId;
      const queryKey = ['assets', wsId];
      const previousAssets = queryClient.getQueryData(queryKey);

      // 乐观剔除该 Atom
      queryClient.setQueryData(queryKey, (old: typeof assetsData) => {
        if (!old) return old;
        if (atomId === 'kernel') {
          return { ...old, kernel: null };
        }
        return {
          ...old,
          packages: old.packages.map((pkg) => ({
            ...pkg,
            atoms: pkg.atoms.filter((a) => a.id !== atomId),
          })),
        };
      });

      ideStore.closeTab(`atom:${atomId}`);

      fetch(`/api/atoms/${encodeURIComponent(atomId)}`, {
        method: 'DELETE',
      })
        .then(async (res) => {
          if (res.ok) {
            toast.success(`原子 "${atomId}" 已物理删除`);
            queryClient.invalidateQueries({ queryKey: ['lint', wsId] });
          } else {
            const data = await res.json();
            queryClient.setQueryData(queryKey, previousAssets);
            toast.error(`删除原子失败: ${data.detail || res.statusText}`);
          }
        })
        .catch(() => {
          queryClient.setQueryData(queryKey, previousAssets);
          toast.error('删除原子网络异常');
        });
    },
    [ideStore, wsStore.activeWorkspaceId, queryClient],
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
              if (ideStore.sidebarOpen && ideStore.activeSidebarView === 'explorer') {
                ideStore.setSidebarOpen(false);
              } else {
                ideStore.setSidebarOpen(true);
                ideStore.setActiveSidebarView('explorer');
              }
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

        {/* 主视口布局：使用 PanelGroup 处理侧边栏与主编辑区 */}
        <PanelGroup direction="horizontal" className="flex-1 overflow-hidden">
          {ideStore.sidebarOpen && (
            <>
              <Panel
                defaultSize={20}
                minSize={14}
                maxSize={40}
                className="flex flex-col overflow-hidden"
              >
                <aside className="h-full border-r border-slate-800 bg-slate-900/40 flex flex-col overflow-hidden">
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
                        <div className="flex gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateNewManifest()}
                            className="flex-1 flex items-center justify-center gap-1 text-xs text-indigo-300 border-indigo-800/60 bg-indigo-950/20 hover:bg-indigo-950/50 h-7 cursor-pointer"
                            title="新建清单蓝图"
                          >
                            <FilePlus2 className="h-3.5 w-3.5 text-indigo-400" />
                            <span>新建清单</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCreateFolder()}
                            className="flex-1 flex items-center justify-center gap-1 text-xs text-slate-300 border-slate-800 bg-slate-900/60 hover:bg-slate-800 h-7 cursor-pointer"
                            title="在清单根目录新建物理文件夹"
                          >
                            <FolderPlus className="h-3.5 w-3.5 text-indigo-400" />
                            <span>新建目录</span>
                          </Button>
                        </div>
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
                        onCreateInFolder={(folder) => handleCreateNewManifest(folder)}
                        onCreateSubFolder={(parent) => handleOpenCreateFolder(parent)}
                        onDeleteFolder={(folder, e) => handleDeleteFolder(folder, e)}
                        onMoveItem={handleMoveManifestItem}
                      />
                    ) : (
                      <PackageExplorer
                        packages={packages}
                        kernel={kernel}
                        onSelectAtom={(atomId, e) => handleOpenAtomTab(atomId, e)}
                        onOpenLookup={(lKey, e) => handleOpenLookupTab(lKey, e)}
                        onCreateKernel={handleCreateKernelDraft}
                        onDeletePackage={handleDeletePackage}
                        onDeleteLookup={handleDeleteLookup}
                        onDeleteAtom={handleDeleteAtom}
                      />
                    )}
                  </div>
                </aside>
              </Panel>

              <PanelResizeHandle className="relative z-20 shrink-0 group flex items-center justify-center w-1.5 cursor-col-resize hover:bg-indigo-500/60 bg-slate-800 transition-colors data-[resize-handle-active]:bg-indigo-500">
                <div className="rounded-full bg-slate-600 group-hover:bg-white h-8 w-1 transition-colors group-data-[resize-handle-active]:!bg-white" />
              </PanelResizeHandle>
            </>
          )}

          {/* 中央主工作区 */}
          <Panel className="flex-1 flex flex-col overflow-hidden">
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
                        onClick={() => fetchLintReport()}
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
                              <span className="font-sans leading-relaxed flex-1">
                                {issue.message}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              <span className="text-[10px] text-slate-500 font-mono">
                                {issue.code}
                              </span>
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
          </Panel>
        </PanelGroup>
      </div>

      {/* 底部紧凑状态栏 */}
      <footer className="h-6 border-t border-slate-800 bg-slate-950 px-3 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0 select-none z-20">
        <div className="flex items-center gap-3">
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
        kernel={kernel}
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

      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        parentPath={targetParentFolder}
        onSubmit={handleSubmitCreateFolder}
      />

      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceOpen}
        onClose={() => setIsCreateWorkspaceOpen(false)}
        onSubmit={async (params) => {
          await wsStore.createWorkspace(params);
          await handleSelectWorkspace(params.id);
        }}
      />

      <ToastContainer />
    </div>
  );
}
