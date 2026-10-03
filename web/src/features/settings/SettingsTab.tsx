import { Button } from '@/components/ui/button';
import { useConfigStore } from '@/stores/config-store';
import { useIdeStore } from '@/stores/ide-store';
import { Database, FolderTree, Save, Settings, Sliders } from 'lucide-react';
import { useEffect, useState } from 'react';

export function SettingsTab() {
  const { config, fetchConfig, updateConfig } = useConfigStore();
  const { preferences, updatePreferences } = useIdeStore();

  const [libPaths, setLibPaths] = useState<string>('');
  const [manPaths, setManPaths] = useState<string>('');
  const [hookCommand, setHookCommand] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (config) {
      setLibPaths(config.library_paths?.join('\n') || '');
      setManPaths(config.manifest_paths?.join('\n') || '');
      setHookCommand(config.post_process_hook || '');
    }
  }, [config]);

  const handleSaveConfig = async () => {
    setSaving(true);
    const newLibPaths = libPaths
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);
    const newManPaths = manPaths
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);
    try {
      await updateConfig({
        library_paths: newLibPaths,
        manifest_paths: newManPaths,
        post_process_hook: hookCommand.trim() || undefined,
      });
      alert('系统配置已保存！可能会触发工作空间重载。');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '保存失败';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100 overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-indigo-400" />
          <h2 className="text-sm font-semibold">系统设置</h2>
        </div>
        <Button size="sm" onClick={handleSaveConfig} disabled={saving} className="h-8 text-xs">
          <Save className="h-4 w-4 mr-1.5" /> 保存配置
        </Button>
      </div>

      <div className="max-w-4xl p-6 space-y-8 font-sans">
        {/* IDE 首选项 */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="h-4 w-4" /> IDE 偏好设置
          </h3>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">蓝图编辑器默认伴生视图</div>
                <div className="text-xs text-slate-500 mt-1">
                  选择打开 Manifest 或 Lookup 编辑器时，右侧默认展开的视图。
                </div>
              </div>
              <select
                value={preferences.defaultRightPanel}
                onChange={(e) =>
                  updatePreferences({ defaultRightPanel: e.target.value as 'graph' | 'prompt' })
                }
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="graph">依赖白板拓扑 (Graph)</option>
                <option value="prompt">实时切片编译 (Prompt)</option>
              </select>
            </div>
          </div>
        </section>

        {/* 工作区配置 */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <FolderTree className="h-4 w-4" /> 多工作区配置 (config.yaml)
          </h3>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-6 text-sm">
            <div>
              <label
                htmlFor="settings-lib-paths"
                className="font-medium block mb-1 flex items-center gap-2"
              >
                <Database className="h-4 w-4 text-indigo-400" /> 知识库挂载点 (Library Paths)
              </label>
              <div className="text-xs text-slate-500 mb-2">
                每一行填写一个绝对路径，首个路径将作为默认新建组件包的目标位置。
              </div>
              <textarea
                id="settings-lib-paths"
                value={libPaths}
                onChange={(e) => setLibPaths(e.target.value)}
                rows={3}
                className="w-full font-mono bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                placeholder="/home/user/workspace/aca_library"
              />
            </div>

            <div>
              <label
                htmlFor="settings-man-paths"
                className="font-medium block mb-1 flex items-center gap-2"
              >
                <Database className="h-4 w-4 text-emerald-400" /> 清单蓝图存放点 (Manifest Paths)
              </label>
              <div className="text-xs text-slate-500 mb-2">
                每一行填写一个绝对路径，定义了系统中智能体组装图谱的存放位置。
              </div>
              <textarea
                id="settings-man-paths"
                value={manPaths}
                onChange={(e) => setManPaths(e.target.value)}
                rows={3}
                className="w-full font-mono bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-emerald-500"
                placeholder="/home/user/workspace/manifests"
              />
            </div>

            <div>
              <label
                htmlFor="settings-hook-command"
                className="font-medium block mb-1 flex items-center gap-2"
              >
                后处理钩子 (Post-Process Hook)
              </label>
              <div className="text-xs text-slate-500 mb-2">
                一段将被管道调用的 Shell 命令，编译生成的 Prompt 会通过 STDIN 传入。
              </div>
              <input
                id="settings-hook-command"
                type="text"
                value={hookCommand}
                onChange={(e) => setHookCommand(e.target.value)}
                className="w-full font-mono bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-purple-500"
                placeholder="例如: pbcopy 或者 cat"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
