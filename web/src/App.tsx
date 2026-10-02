import { CommandPalette } from '@/components/CommandPalette';
import { Button } from '@/components/ui/button';
import { AtomEditorTab } from '@/features/authoring/AtomEditorTab';
import { LookupEditorTab } from '@/features/authoring/LookupEditorTab';
import { ManifestEditorTab } from '@/features/composer/ManifestEditorTab';
import { ManifestExplorer } from '@/features/explorer/ManifestExplorer';
import { PackageExplorer, type PackageItem } from '@/features/explorer/PackageExplorer';
import { EmptyTab } from '@/features/home/EmptyTab';
import { type IdeTab, useIdeStore } from '@/stores/ide-store';
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Cpu,
  ExternalLink,
  FilePlus2,
  FolderTree,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import type React from 'react';
import { memo, useCallback, useEffect, useState } from 'react';

export interface LintIssue {
  level: string;
  code: string;
  message: string;
}

interface TabPaneProps {
  tab: IdeTab;
  isActive: boolean;
  packages: PackageItem[];
  manifestsCount: number;
  onSaved: () => void;
  onOpenCommandPalette: () => void;
  onCreateManifest: () => void;
  onCreateAtom: () => void;
}

const TabPane = memo(
  function TabPane({
    tab,
    isActive,
    packages,
    manifestsCount,
    onSaved,
    onOpenCommandPalette,
    onCreateManifest,
    onCreateAtom,
  }: TabPaneProps) {
    return (
      <div className={`h-full w-full ${isActive ? 'block' : 'hidden'}`}>
        {tab.type === 'empty' && (
          <EmptyTab
            manifestsCount={manifestsCount}
            packagesCount={packages.length}
            onOpenCommandPalette={onOpenCommandPalette}
            onCreateManifest={onCreateManifest}
            onCreateAtom={onCreateAtom}
          />
        )}
        {tab.type === 'atom' && tab.atomId && (
          <AtomEditorTab
            key={tab.atomId}
            atomId={tab.atomId}
            packages={packages}
            onSaved={onSaved}
          />
        )}
        {tab.type === 'manifest' && (
          <ManifestEditorTab
            key={tab.id}
            manifestName={tab.manifestName || ''}
            packages={packages}
            onSaved={onSaved}
          />
        )}
        {tab.type === 'lookup' && tab.lookupKey && (
          <LookupEditorTab
            key={tab.id}
            lookupKey={tab.lookupKey}
            packages={packages}
            onSaved={onSaved}
          />
        )}
      </div>
    );
  },
  (prev, next) => {
    // 性能核心拦截：若前后均处于非激活状态，且核心元数据无变动，直接跳过整个组件树的 Diff
    return (
      prev.isActive === next.isActive &&
      prev.tab.id === next.tab.id &&
      prev.tab.isDirty === next.tab.isDirty &&
      prev.tab.title === next.tab.title &&
      prev.packages === next.packages &&
      prev.manifestsCount === next.manifestsCount &&
      prev.onSaved === next.onSaved
    );
  },
);

export function App() {
  const ideStore = useIdeStore();
  const [manifests, setManifests] = useState<string[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [status, setStatus] = useState<string>('检测中...');

  // 命令面板
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // 诊断控制台数据
  const [lintLoading, setLintLoading] = useState(false);
  const [lintErrors, setLintErrors] = useState(0);
  const [lintWarnings, setLintWarnings] = useState(0);
  const [lintIssues, setLintIssues] = useState<LintIssue[]>([]);

  // 侧边栏子视图
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

  useEffect(() => {
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

    // 全局快捷键监听: Ctrl+P 唤起命令面板，Ctrl+T 新建标签页，Cmd+[ 后退，Cmd+] 前进
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (isMod && e.key.toLowerCase() === 't') {
        e.preventDefault();
        handleCreateEmptyTab();
      } else if (isMod && e.key === '[') {
        e.preventDefault();
        ideStore.goBack();
      } else if (isMod && e.key === ']') {
        e.preventDefault();
        ideStore.goForward();
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        ideStore.goBack();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        ideStore.goForward();
      }
    };

    // 鼠标侧键原生后退/前进监听
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 3) {
        e.preventDefault();
        ideStore.goBack();
      } else if (e.button === 4) {
        e.preventDefault();
        ideStore.goForward();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      eventSource.close();
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [fetchAssets, fetchLintReport, ideStore.goBack, ideStore.goForward]);

  const handleOpenManifestTab = (mName: string, e?: React.MouseEvent) => {
    const newTab = e ? e.ctrlKey || e.metaKey : false;
    ideStore.openTab(
      {
        id: `manifest:${mName}`,
        type: 'manifest',
        title: mName,
        closable: true,
        manifestName: mName,
      },
      { newTab },
    );
  };

  const handleOpenAtomTab = (atomId: string, e?: React.MouseEvent) => {
    const newTab = e ? e.ctrlKey || e.metaKey : false;
    const isDraft = atomId.startsWith('draft:');
    const tabTitle = isDraft ? `新建原子 (${atomId.replace('draft:', '')})` : atomId;
    ideStore.openTab(
      {
        id: `atom:${atomId}`,
        type: 'atom',
        title: tabTitle,
        closable: true,
        atomId,
      },
      { newTab: isDraft ? true : newTab },
    );
  };

  const handleOpenLookupTab = (lookupKey: string, e?: React.MouseEvent) => {
    const newTab = e ? e.ctrlKey || e.metaKey : false;
    ideStore.openTab(
      {
        id: `lookup:${lookupKey}`,
        type: 'lookup',
        title: lookupKey.split('::').pop() || lookupKey,
        closable: true,
        lookupKey,
      },
      { newTab },
    );
  };

  // 诊断直通：解析 issue 中的实体并一键在主编辑区打开对应 Tab
  const handleProblemClick = (issue: LintIssue) => {
    const text = `${issue.code} ${issue.message}`;

    // 1. 尝试匹配 Atom ID (如 d1-valid, d2-core)
    const atomMatch = text.match(/\b(d[1-3]-[a-zA-Z0-9_-]+)\b/);
    if (atomMatch) {
      handleOpenAtomTab(atomMatch[1]);
      return;
    }

    // 2. 尝试匹配 Manifest (如 Manifest 'agent_name')
    const manifestMatch = text.match(/Manifest '([^']+)'/);
    if (manifestMatch) {
      handleOpenManifestTab(manifestMatch[1]);
      return;
    }

    // 3. 尝试匹配 Lookup (如 Lookup 'pkg::d1l-name' 或 'd1l-name')
    const lookupMatch = text.match(/Lookup '([^']+)'/);
    if (lookupMatch) {
      const lKey = lookupMatch[1];
      handleOpenLookupTab(lKey);
    }
  };

  const handleCreateNewAtomDraft = () => {
    const defaultPkg = packages[0]?.name || '';
    const draftId = `draft_${Date.now().toString().slice(-4)}`;
    ideStore.openTab(
      {
        id: `atom:${draftId}`,
        type: 'atom',
        title: '新建原子草稿',
        closable: true,
        atomId: `draft:${defaultPkg}`,
      },
      { newTab: true },
    );
  };

  const handleCreateNewManifest = () => {
    const draftName = `未命名蓝图_${Date.now().toString().slice(-4)}`;
    ideStore.openTab(
      {
        id: `manifest:${draftName}`,
        type: 'manifest',
        title: draftName,
        closable: true,
        manifestName: '', // 空字符串触发新建草稿
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
    if (!window.confirm(`确定要删除清单 "${mName}" 吗？此操作不可逆。`)) {
      return;
    }
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

  const activeTab = ideStore.tabs.find((t) => t.id === ideStore.activeTabId);
  const canGoBack = ideStore.historyIndex > 0;
  const canGoForward = ideStore.historyIndex < ideStore.navigationHistory.length - 1;

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* 主体视口 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 最左侧：活动栏 (Activity Bar) */}
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
            title="资源管理器 (Explorer)"
          >
            <FolderTree className="h-5 w-5" />
          </button>
        </div>

        {/* 侧边栏：资源视图 */}
        {ideStore.sidebarOpen && (
          <aside className="w-72 border-r border-slate-800 bg-slate-900/40 flex flex-col shrink-0 overflow-hidden">
            <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-bold font-mono tracking-wider text-slate-300">
                资源视图
              </span>
              <button
                type="button"
                onClick={ideStore.toggleSidebar}
                className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                title="折叠侧边栏"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

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

              {explorerTab === 'manifests' && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateNewManifest}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-indigo-300 border-indigo-800/60 bg-indigo-950/20 hover:bg-indigo-950/50 h-7 cursor-pointer"
                  >
                    <FilePlus2 className="h-3.5 w-3.5 text-indigo-400" /> 新建清单蓝图
                  </Button>
                </div>
              )}
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
                />
              )}
            </div>
          </aside>
        )}

        {/* 中央主工作区 */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {/* Tab 标签栏与历史导航 */}
          <div className="flex items-center border-b border-slate-800 bg-slate-900/60 overflow-x-auto shrink-0 scrollbar-none h-9">
            {/* 紧凑历史后退/前进导航 */}
            <div className="flex items-center gap-0.5 px-2 border-r border-slate-800 shrink-0">
              <button
                type="button"
                onClick={ideStore.goBack}
                disabled={!canGoBack}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors cursor-pointer"
                title="后退 (Cmd+[ 或 Alt+←)"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={ideStore.goForward}
                disabled={!canGoForward}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors cursor-pointer"
                title="前进 (Cmd+] 或 Alt+→)"
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      ideStore.setActiveTab(tab.id);
                    }
                  }}
                  className={`group flex items-center gap-2 px-3.5 py-2 border-r border-slate-800 cursor-pointer text-xs font-mono transition-colors shrink-0 ${
                    isActive
                      ? 'bg-slate-950 text-indigo-300 border-t-2 border-t-indigo-500 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-t-2 border-t-transparent'
                  }`}
                >
                  <span className="truncate max-w-[140px]">{tab.title}</span>
                  {tab.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  {tab.closable && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        ideStore.closeTab(tab.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white rounded cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* 新建标签页按钮 (+) */}
            <button
              type="button"
              onClick={handleCreateEmptyTab}
              className="flex items-center justify-center p-1.5 ml-1.5 mr-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded transition-colors shrink-0 cursor-pointer"
              title="新建标签页 (Ctrl+T)"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 编辑器视口 */}
          <div className="flex-1 overflow-hidden relative">
            {ideStore.tabs.length === 0 ? (
              <EmptyTab
                manifestsCount={manifests.length}
                packagesCount={packages.length}
                onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
                onCreateManifest={handleCreateNewManifest}
                onCreateAtom={handleCreateNewAtomDraft}
              />
            ) : (
              ideStore.tabs.map((tab) => (
                <TabPane
                  key={tab.id}
                  tab={tab}
                  isActive={tab.id === ideStore.activeTabId}
                  packages={packages}
                  manifestsCount={manifests.length}
                  onSaved={handleTabSaved}
                  onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
                  onCreateManifest={handleCreateNewManifest}
                  onCreateAtom={handleCreateNewAtomDraft}
                />
              ))
            )}
          </div>

          {/* 底部控制台：诊断问题 */}
          {ideStore.bottomPanelOpen && (
            <div className="h-56 border-t border-slate-800 bg-slate-900/95 flex flex-col shrink-0 font-mono text-xs">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 bg-slate-950 text-slate-300">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 font-bold text-indigo-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>问题与诊断 ({lintIssues.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={fetchLintReport}
                    disabled={lintLoading}
                    className="text-slate-400 hover:text-indigo-400 p-1 cursor-pointer"
                    title="重新运行规范诊断"
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
                    <span>所有知识库、Lookup 接口与 Manifest 清单均严格合规</span>
                  </div>
                ) : (
                  lintIssues.map((issue) => {
                    const isErr = issue.level === '错误';
                    return (
                      <div
                        key={`${issue.level}-${issue.code}-${issue.message}`}
                        onClick={() => handleProblemClick(issue)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleProblemClick(issue);
                          }
                        }}
                        className={`flex items-start justify-between p-2 rounded border cursor-pointer group transition-colors ${
                          isErr
                            ? 'border-rose-900/50 bg-rose-950/20 text-rose-200 hover:bg-rose-950/40 hover:border-rose-700'
                            : 'border-amber-900/50 bg-amber-950/20 text-amber-200 hover:bg-amber-950/40 hover:border-amber-700'
                        }`}
                        title="点击直接在主编辑区打开对应文件定位"
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
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 底部紧凑状态栏 (Status Bar) */}
      <footer className="h-6 border-t border-slate-800 bg-slate-950 px-3 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0 select-none z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Cpu className="h-3.5 w-3.5 text-indigo-400" />
            <span className="font-semibold text-slate-200">ACA Studio</span>
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
            title="切换架构合规与诊断面板"
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
            title="打开命令面板 (Ctrl+P / Cmd+P)"
          >
            <Search className="h-3 w-3 text-indigo-400" />
            <span className="text-[10px]">Ctrl+P</span>
          </button>
        </div>
      </footer>

      {/* 全局命令与搜索面板 (Ctrl+P / Cmd+P) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        manifests={manifests}
        packages={packages}
      />
    </div>
  );
}
