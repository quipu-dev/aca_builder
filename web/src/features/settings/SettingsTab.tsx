import { Button } from '@/components/ui/button';
import { ConfirmIconButton } from '@/components/ui/confirm-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { useIdeStore } from '@/stores/ide-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { Database, FolderTree, Save, Settings, Sliders } from 'lucide-react';
import { useEffect, useState } from 'react';

export function SettingsTab() {
  const wsStore = useWorkspaceStore();
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchWorkspaces);
  const { preferences, updatePreferences } = useIdeStore();

  const [activeWsId, setActiveWsId] = useState<string>('');
  const [wsName, setWsName] = useState<string>('');
  const [wsRoot, setWsRoot] = useState<string>('');
  const [hookCommand, setHookCommand] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    const current = wsStore.workspaces.find((w) => w.id === wsStore.activeWorkspaceId);
    if (current) {
      setActiveWsId(current.id);
      setWsName(current.name);
      setWsRoot(current.root || '');
      setHookCommand(current.post_process_hook || '');
    }
  }, [wsStore.workspaces, wsStore.activeWorkspaceId]);

  const handleSaveActiveWorkspace = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/system/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: wsName.trim(),
          root: wsRoot.trim() || undefined,
          post_process_hook: hookCommand.trim() || undefined,
        }),
      });
      if (res.ok) {
        await wsStore.fetchWorkspaces();
        toast.success('当前工作区设置已保存！');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(`保存设置失败: ${data.detail || res.statusText}`);
      }
    } catch (_err) {
      toast.error('保存设置网络异常');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (wsId: string) => {
    try {
      const res = await fetch('/api/workspaces/default', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: wsId }),
      });
      if (res.ok) {
        await wsStore.fetchWorkspaces();
        toast.success(`已设置 "${wsId}" 为默认工作区`);
      } else {
        toast.error('设置默认工作区失败');
      }
    } catch (_err) {
      toast.error('设置默认工作区网络异常');
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100 overflow-y-auto font-sans">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-indigo-400" />
          <h2 className="text-sm font-semibold">工作区设置与管理</h2>
        </div>
        <Button
          size="sm"
          onClick={handleSaveActiveWorkspace}
          disabled={saving}
          className="h-8 text-xs"
        >
          <Save className="h-4 w-4 mr-1.5" /> 保存当前工作区
        </Button>
      </div>

      <div className="max-w-4xl p-6 space-y-8">
        {/* 已注册工作区概览卡片 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 font-mono">
              <FolderTree className="h-4 w-4" /> 隔离工作区列表 (Vaults)
            </h3>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 divide-y divide-slate-800/80">
            {wsStore.workspaces.map((ws) => (
              <div key={ws.id} className="p-4 flex items-center justify-between font-mono text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100">{ws.name}</span>
                    <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                      ID: {ws.id}
                    </span>
                    {ws.is_default && (
                      <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.2 rounded font-semibold">
                        默认
                      </span>
                    )}
                    {ws.is_active && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-1.5 py-0.2 rounded font-semibold">
                        当前活动
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    根目录: {ws.root || '自定子路径'}
                  </div>
                </div>

                <div className="flex items-center gap-2 font-sans">
                  {!ws.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(ws.id)}
                      className="h-7 text-xs border-slate-700"
                    >
                      设为默认
                    </Button>
                  )}
                  {wsStore.workspaces.length > 1 && (
                    <ConfirmIconButton
                      onConfirm={async () => {
                        await wsStore.deleteWorkspace(ws.id);
                        toast.success(`工作区 "${ws.name}" 已注销`);
                      }}
                      title={`注销工作区 ${ws.name} (Shift+点击快速注销)`}
                      confirmTitle="确认注销?"
                      iconClassName="h-4 w-4"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 当前工作区路径与钩子细粒度配置 */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 font-mono">
            <Sliders className="h-4 w-4" /> 当前工作区基础设置 ({activeWsId})
          </h3>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-5 text-sm">
            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
              <div>
                <label htmlFor="settings-ws-name" className="text-slate-400 block mb-1">
                  工作区显示名称
                </label>
                <Input
                  id="settings-ws-name"
                  type="text"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="settings-ws-root" className="text-slate-400 block mb-1">
                  根目录绝对路径 (Root)
                </label>
                <Input
                  id="settings-ws-root"
                  type="text"
                  value={wsRoot}
                  onChange={(e) => setWsRoot(e.target.value)}
                />
              </div>
            </div>

            {/* 自动推导的约定路径展示卡片 */}
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 space-y-2 font-mono text-xs">
              <div className="text-[11px] text-slate-400 font-semibold mb-1">
                已固化的资源约定路径（由根目录自动确定）：
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Database className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span className="text-slate-500">知识库目录:</span>
                <span className="text-slate-200">
                  {wsRoot ? `${wsRoot}/library` : '(未设置根目录)'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Database className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-slate-500">清单蓝图目录:</span>
                <span className="text-slate-200">
                  {wsRoot ? `${wsRoot}/manifests` : '(未设置根目录)'}
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="settings-hook-cmd" className="font-medium block mb-1">
                后处理管道钩子 (Post-Process Hook)
              </label>
              <Input
                id="settings-hook-cmd"
                type="text"
                value={hookCommand}
                onChange={(e) => setHookCommand(e.target.value)}
                className="focus:border-purple-500"
                placeholder="例如: pbcopy 或 cat"
              />
            </div>
          </div>
        </section>

        {/* IDE 首选项 */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 font-mono">
            <Sliders className="h-4 w-4" /> 界面偏好
          </h3>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-sm flex items-center justify-between">
            <div>
              <div className="font-medium">蓝图伴生面板默认视图</div>
              <div className="text-xs text-slate-500 mt-1">
                选择打开 Manifest 或 Lookup 编辑器时，右侧默认展开拓扑图还是实时切片 Prompt。
              </div>
            </div>
            <Select
              value={preferences.defaultRightPanel}
              onChange={(e) =>
                updatePreferences({ defaultRightPanel: e.target.value as 'graph' | 'prompt' })
              }
              className="py-1.5"
            >
              <option value="graph">白板拓扑图 (Graph)</option>
              <option value="prompt">实时切片编译 (Prompt)</option>
            </Select>
          </div>
        </section>
      </div>
    </div>
  );
}
