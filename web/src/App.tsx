import { CommandPalette } from '@/components/CommandPalette';
import { Button } from '@/components/ui/button';
import { SplitPane } from '@/components/ui/split-pane';
import { AtomEditorTab } from '@/features/authoring/AtomEditorTab';
import { LookupEditorTab } from '@/features/authoring/LookupEditorTab';
import { ManifestEditorTab } from '@/features/composer/ManifestEditorTab';
import { PackageExplorer, type PackageItem } from '@/features/explorer/PackageExplorer';
import { EmptyTab } from '@/features/home/EmptyTab';
import { type IdeTab, useIdeStore } from '@/stores/ide-store';
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Columns,
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
  Trash2,
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

    // 全局快捷键监听: Ctrl+P 唤起命令面板，Ctrl+T 新建标签页
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        handleCreateEmptyTab();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      eventSource.close();
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [fetchAssets, fetchLintReport]);

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
    ideStore.openTab(
      {
        id: `atom:${atomId}`,
        type: 'atom',
        title: atomId,
        closable: true,
        atomId,
      },
      { newTab },
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
  const splitTab = ideStore.tabs.find((t) => t.id === ideStore.splitTabId);

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* 顶部简明标题与操作栏 */}
      <header className="flex h-11 items-center justify-between border-b border-slate-800 px-4 bg-slate-900/80 shrink-0">
        <div className="flex items-center space-x-3">
          <Cpu className="h-5 w-5 text-indigo-400" />
          <span className="text-sm font-bold tracking-wide">ACA Studio IDE</span>
          <span className="text-[10px] text-indigo-300 font-mono bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/40">
            {status}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* 全局命令面板按钮 (提示 Ctrl+P) */}
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
            title="快捷全局跳转 (Ctrl+P / Cmd+P)"
          >
            <Search className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline">跳转文件...</span>
            <span className="text-[10px] text-slate-500 bg-slate-900 px-1 py-0.2 rounded border border-slate-800">
              Ctrl+P
            </span>
          </button>

          <Button
            size="sm"
            onClick={handleCreateNewAtomDraft}
            className="h-7 text-xs flex items-center gap-1 font-medium bg-indigo-600 hover:bg-indigo-500"
          >
            <Plus className="h-3 w-3" /> 新建原子
          </Button>

          {/* 分屏开关按钮 */}
          <button
            type="button"
            onClick={ideStore.toggleSplit}
            className={`p-1.5 rounded border text-xs font-mono transition-colors flex items-center gap-1 ${
              ideStore.isSplitActive
                ? 'border-indigo-500 bg-indigo-950/80 text-indigo-300 font-semibold'
                : 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="开启/关闭并排分屏视口 (Split View)"
          >
            <Columns className="h-3.5 w-3.5" />
            <span className="text-[11px]">{ideStore.isSplitActive ? '关闭分屏' : '并排分屏'}</span>
          </button>

          {/* 底部诊断抽屉开关 */}
          <button
            type="button"
            onClick={ideStore.toggleBottomPanel}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
              lintErrors > 0
                ? 'border-rose-600 bg-rose-950/40 text-rose-300 hover:bg-rose-900/40'
                : lintWarnings > 0
                  ? 'border-amber-600 bg-amber-950/40 text-amber-300 hover:bg-amber-900/40'
                  : 'border-emerald-600 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40'
            }`}
          >
            {lintErrors > 0 ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
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
      </header>

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
            className={`p-2 rounded-lg transition-colors ${
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
                className="text-slate-400 hover:text-white p-0.5"
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
                  className={`flex-1 py-1 rounded font-medium flex items-center justify-center gap-1 transition-colors ${
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
                  className={`flex-1 py-1 rounded font-medium flex items-center justify-center gap-1 transition-colors ${
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
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-indigo-300 border-indigo-800/60 bg-indigo-950/20 hover:bg-indigo-950/50 h-7"
                  >
                    <FilePlus2 className="h-3.5 w-3.5 text-indigo-400" /> 新建清单蓝图
                  </Button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {explorerTab === 'manifests' ? (
                manifests.map((m) => (
                  <div
                    key={m}
                    className={`group w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono transition-colors ${
                      activeTab?.manifestName === m
                        ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/50'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => handleOpenManifestTab(m, e)}
                      className="flex-1 text-left truncate hover:text-white"
                      title="点击在当前标签页打开，按住 Ctrl 点击新建标签页"
                    >
                      {m}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteManifest(m, e)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity p-0.5 rounded"
                      title="删除清单"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
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
          {/* Tab 标签栏 */}
          <div className="flex items-center border-b border-slate-800 bg-slate-900/60 overflow-x-auto shrink-0 scrollbar-none">
            {ideStore.tabs.map((tab) => {
              const isActive = tab.id === ideStore.activeTabId;
              const isSecondary = tab.id === ideStore.splitTabId;
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
                      : isSecondary
                        ? 'bg-slate-950/70 text-purple-300 border-t-2 border-t-purple-500'
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
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white rounded"
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

          {/* 编辑器视口：单视口 VS 左右分屏视口 (SplitPane) */}
          <div className="flex-1 overflow-hidden relative">
            {ideStore.isSplitActive ? (
              <SplitPane
                direction="horizontal"
                initialRatio={0.5}
                primary={
                  <div className="h-full w-full relative overflow-hidden">
                    {ideStore.tabs.map((tab) => (
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
                    ))}
                  </div>
                }
                secondary={
                  <div className="h-full overflow-hidden border-l border-slate-800">
                    {splitTab ? (
                      <TabPane
                        key={`split_${splitTab.id}`}
                        tab={splitTab}
                        isActive={true}
                        packages={packages}
                        manifestsCount={manifests.length}
                        onSaved={handleTabSaved}
                        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
                        onCreateManifest={handleCreateNewManifest}
                        onCreateAtom={handleCreateNewAtomDraft}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-600 font-mono">
                        未选择分屏视口内容
                      </div>
                    )}
                  </div>
                }
              />
            ) : (
              <div className="h-full w-full relative overflow-hidden">
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
                    className="text-slate-400 hover:text-indigo-400 p-1"
                    title="重新运行规范诊断"
                  >
                    <RefreshCw className={`h-3 w-3 ${lintLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={ideStore.toggleBottomPanel}
                  className="text-slate-400 hover:text-white p-1"
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
