import { type ProfileSummary, PromptViewer } from '@/components/editor/PromptViewer';
import { Button } from '@/components/ui/button';
import { AtomEditorDrawer } from '@/features/authoring/AtomEditorDrawer';
import { CreateAtomModal } from '@/features/authoring/CreateAtomModal';
import { CreateLookupModal } from '@/features/authoring/CreateLookupModal';
import { VisualComposer } from '@/features/composer/VisualComposer';
import { DiagnosticsDrawer, type LintIssue } from '@/features/diagnostics/DiagnosticsDrawer';
import { PackageExplorer, type PackageItem } from '@/features/explorer/PackageExplorer';
import { TopologyGraph } from '@/features/graph/TopologyGraph';
import { useComposerStore } from '@/stores/composer-store';
import {
  AlertCircle,
  Cpu,
  Eye,
  FilePlus2,
  Layers,
  Network,
  Package,
  Plus,
  ShieldCheck,
  Sliders,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export function App() {
  const [manifests, setManifests] = useState<string[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [selectedManifest, setSelectedManifest] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [status, setStatus] = useState<string>('检测中...');
  const [viewMode, setViewMode] = useState<'composer' | 'graph' | 'preview'>('composer');
  const [leftTab, setLeftTab] = useState<'manifests' | 'packages'>('manifests');

  // 状态：创作弹窗、查找接口弹窗、诊断抽屉与原子在线编辑器
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [lookupTargetPkg, setLookupTargetPkg] = useState<string>('');
  const [lookupIsPublic, setLookupIsPublic] = useState(true);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [lintLoading, setLintLoading] = useState(false);
  const [lintErrors, setLintErrors] = useState(0);
  const [lintWarnings, setLintWarnings] = useState(0);
  const [lintIssues, setLintIssues] = useState<LintIssue[]>([]);
  const [editingAtomId, setEditingAtomId] = useState<string | null>(null);

  const composerItems = useComposerStore((state) => state.items);
  const composerOverrides = useComposerStore((state) => state.overrides);
  const loadManifestData = useComposerStore((state) => state.loadManifestData);
  const resetNewManifest = useComposerStore((state) => state.resetNewManifest);

  const fetchAssets = useCallback(() => {
    fetch('/api/assets')
      .then((res) => res.json())
      .then((data) => {
        setManifests(data.manifests || []);
        setPackages(data.packages || []);
        setSelectedManifest((prev) => prev || (data.manifests?.[0] ?? ''));
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

    // 建立 Server-Sent Events 事件监听通道
    const eventSource = new EventSource('/api/events/stream');

    eventSource.addEventListener('change', () => {
      // 收到后端广播的文件变动，静默热刷新资产与诊断报告
      fetchAssets();
      fetchLintReport();
    });

    eventSource.onerror = () => {
      // 网络波动自动重连，无需干扰用户
    };

    return () => {
      eventSource.close();
    };
  }, [fetchAssets, fetchLintReport]);

  // 装配与 Overrides 变动防抖编译
  useEffect(() => {
    if (composerItems.length === 0) return;

    const timer = setTimeout(() => {
      fetch('/api/compile-adhoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imports: composerItems.map((item) => ({ lookup: item.lookup })),
          overrides: Object.keys(composerOverrides).length > 0 ? composerOverrides : undefined,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.prompt) {
            setPrompt(data.prompt);
          }
          if (data.profile) {
            setProfile(data.profile);
          }
        })
        .catch(console.error);
    }, 300);

    return () => clearTimeout(timer);
  }, [composerItems, composerOverrides]);

  const handleSelectManifest = async (mName: string) => {
    setSelectedManifest(mName);
    // 1. 构建并预览 Prompt 及画像
    try {
      const res = await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifest: mName, is_file: false }),
      });
      const data = await res.json();
      if (res.ok) {
        setPrompt(data.prompt);
        if (data.profile) {
          setProfile(data.profile);
        }
      }
    } catch (e) {
      console.error(e);
    }

    // 2. 读取清单配置并回显到装配器
    try {
      const mRes = await fetch(`/api/manifests/${encodeURIComponent(mName)}`);
      if (mRes.ok) {
        const mData = await mRes.json();
        loadManifestData(mData);
      }
    } catch (e) {
      console.error('回显清单数据失败:', e);
    }
  };

  const handleCreateNewManifest = () => {
    resetNewManifest();
    setSelectedManifest('');
    setPrompt('');
    setViewMode('composer');
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
        if (selectedManifest === mName) {
          handleCreateNewManifest();
        }
      } else {
        const data = await res.json();
        alert(`删除失败: ${data.detail}`);
      }
    } catch (_err) {
      alert('删除清单网络请求异常');
    }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      {/* 顶部栏 */}
      <header className="flex h-14 items-center justify-between border-b border-slate-800 px-6 bg-slate-900/60">
        <div className="flex items-center space-x-3">
          <Cpu className="h-6 w-6 text-indigo-400" />
          <h1 className="text-lg font-bold tracking-wide">ACA 工作台</h1>
          <span className="text-xs text-indigo-300/80 font-mono bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/40">
            服务: {status}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* 新建原子向导按钮 */}
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 h-8 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" /> 新建原子
          </Button>

          {/* 实时合规诊断指示灯 */}
          <button
            type="button"
            onClick={() => setIsDiagnosticsOpen(true)}
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
                ? `${lintErrors} 处错误`
                : lintWarnings > 0
                  ? `${lintWarnings} 处警告`
                  : '完全合规'}
            </span>
          </button>
        </div>
      </header>

      {/* 主体三栏布局 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：资产浏览区 */}
        <aside className="w-80 border-r border-slate-800 p-4 flex flex-col space-y-3 bg-slate-950">
          <div className="flex rounded bg-slate-900 p-1 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setLeftTab('manifests')}
              className={`flex-1 py-1 rounded font-medium flex items-center justify-center gap-1.5 transition-colors ${
                leftTab === 'manifests'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" /> 清单列表
            </button>
            <button
              type="button"
              onClick={() => setLeftTab('packages')}
              className={`flex-1 py-1 rounded font-medium flex items-center justify-center gap-1.5 transition-colors ${
                leftTab === 'packages'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className="h-3.5 w-3.5" /> 组件包
            </button>
          </div>

          {leftTab === 'manifests' && (
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateNewManifest}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-indigo-300 border-indigo-800/60 bg-indigo-950/20 hover:bg-indigo-950/50"
              >
                <FilePlus2 className="h-3.5 w-3.5 text-indigo-400" /> 新建清单蓝图
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-1">
            {leftTab === 'manifests' ? (
              manifests.map((m) => (
                <div
                  key={m}
                  className={`group w-full flex items-center justify-between px-2 py-1 rounded text-xs font-mono transition-colors ${
                    selectedManifest === m
                      ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/50'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectManifest(m)}
                    className="flex-1 text-left truncate py-1 px-1 hover:text-white"
                  >
                    {m}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteManifest(m, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity p-1 rounded"
                    title="删除清单"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <PackageExplorer
                packages={packages}
                onSelectAtom={(atomId) => setEditingAtomId(atomId)}
                onCreateLookup={(pkgName, isPublic) => {
                  setLookupTargetPkg(pkgName);
                  setLookupIsPublic(isPublic);
                  setIsLookupOpen(true);
                }}
              />
            )}
          </div>
        </aside>

        {/* 中栏与右栏工作区 */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-900/30">
          {/* 模式切换栏 */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950/40">
            <div className="flex items-center space-x-2 text-xs font-mono">
              <span className="text-slate-500">目标清单:</span>
              <span className="text-indigo-300 font-bold">
                {selectedManifest || '即席装配草稿'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex rounded bg-slate-900 border border-slate-800 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('composer')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                    viewMode === 'composer'
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sliders className="h-3.5 w-3.5" /> 可视化装配
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('graph')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                    viewMode === 'graph'
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Network className="h-3.5 w-3.5" /> 依赖拓扑图
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                    viewMode === 'preview'
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" /> 全屏提示词预览
                </button>
              </div>
            </div>
          </div>

          {/* 核心工作视图 */}
          <div className="flex-1 flex overflow-hidden">
            {viewMode === 'composer' && (
              <>
                <div className="w-1/2 border-r border-slate-800 overflow-hidden">
                  <VisualComposer packages={packages} />
                </div>
                <div className="w-1/2 p-4 overflow-hidden bg-slate-950">
                  <PromptViewer
                    value={prompt}
                    profile={profile}
                    onSelectAtom={(aid) => setEditingAtomId(aid)}
                  />
                </div>
              </>
            )}

            {viewMode === 'graph' && (
              <div className="flex-1 h-full">
                <TopologyGraph manifest={selectedManifest} />
              </div>
            )}

            {viewMode === 'preview' && (
              <div className="flex-1 p-4 h-full bg-slate-950">
                <PromptViewer
                  value={prompt}
                  profile={profile}
                  onSelectAtom={(aid) => setEditingAtomId(aid)}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 新建原子向导模态框 */}
      <CreateAtomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        packages={packages}
        onCreated={() => {
          fetchAssets();
          fetchLintReport();
        }}
      />

      {/* 新建 D4 查找接口向导模态框 */}
      <CreateLookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        packages={packages}
        defaultPkg={lookupTargetPkg}
        defaultPublic={lookupIsPublic}
        onCreated={() => {
          fetchAssets();
          fetchLintReport();
        }}
      />

      {/* 合规诊断抽屉 */}
      <DiagnosticsDrawer
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        errorCount={lintErrors}
        warnCount={lintWarnings}
        issues={lintIssues}
        onRefresh={fetchLintReport}
        loading={lintLoading}
      />

      {/* 原子在线编辑抽屉 */}
      <AtomEditorDrawer
        atomId={editingAtomId}
        isOpen={!!editingAtomId}
        onClose={() => setEditingAtomId(null)}
        onSaved={() => {
          fetchAssets();
          fetchLintReport();
          if (selectedManifest) {
            handleSelectManifest(selectedManifest);
          }
        }}
      />
    </div>
  );
}
