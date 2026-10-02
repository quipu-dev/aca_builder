import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { LookupExportItem, PackageItem } from '@/features/explorer/PackageExplorer';
import { useComposerStore } from '@/stores/composer-store';
import {
  ArrowDown,
  ArrowUp,
  Box,
  Plus,
  RotateCcw,
  Save,
  Sliders,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

export function VisualComposer({
  packages,
}: {
  packages: PackageItem[];
}) {
  const store = useComposerStore();
  const [selectedLookup, setSelectedLookup] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [editingOverrideKey, setEditingOverrideKey] = useState<string | null>(null);
  const [overrideQueryId, setOverrideQueryId] = useState<string>('');

  // 提取所有公开接口，替换嵌套 forEach 为 for...of
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

  const handleAdd = () => {
    if (!selectedLookup) return;
    const found = availableExports.find((e) => e.key === selectedLookup);
    store.addItem({
      lookup: selectedLookup,
      pillar: found?.pillar,
      description: found?.desc,
    });
    setSelectedLookup('');
  };

  const handleSaveManifest = async () => {
    if (!store.manifestName || store.items.length === 0) return;
    setIsSaving(true);
    setSaveStatus('正在保存...');
    try {
      const payload: Record<string, unknown> = {
        name: store.manifestName,
        version: store.version,
        description: store.description,
        imports: store.items.map((i) => ({ lookup: i.lookup })),
      };
      if (Object.keys(store.overrides).length > 0) {
        payload.overrides = store.overrides;
      }
      const res = await fetch('/api/manifests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus('已保存');
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setSaveStatus(`保存失败: ${data.detail}`);
      }
    } catch (_e) {
      setSaveStatus('保存出错');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col space-y-4 p-4 overflow-y-auto">
      {/* 顶部元数据卡片 */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-200">清单蓝图设置</h2>
          </div>
          <div className="flex items-center gap-2">
            {saveStatus && <span className="text-xs text-indigo-400 font-mono">{saveStatus}</span>}
            <Button
              size="sm"
              onClick={handleSaveManifest}
              disabled={isSaving || store.items.length === 0}
              className="flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" /> 保存清单
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="composer-manifest-name"
              className="text-[11px] font-mono text-slate-400 block mb-1"
            >
              清单名称
            </label>
            <input
              id="composer-manifest-name"
              type="text"
              value={store.manifestName}
              onChange={(e) => store.setManifestName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="composer-manifest-version"
              className="text-[11px] font-mono text-slate-400 block mb-1"
            >
              版本
            </label>
            <input
              id="composer-manifest-version"
              type="text"
              value={store.version}
              onChange={(e) => store.setVersion(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="composer-manifest-desc"
              className="text-[11px] font-mono text-slate-400 block mb-1"
            >
              描述说明
            </label>
            <input
              id="composer-manifest-desc"
              type="text"
              value={store.description}
              onChange={(e) => store.setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 挑选组件区域 */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <label htmlFor="lookup-select" className="text-xs font-semibold text-slate-300 block">
          从公开接口添加组件
        </label>
        <div className="flex gap-2">
          <select
            id="lookup-select"
            value={selectedLookup}
            onChange={(e) => setSelectedLookup(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- 请选择要注入的公开查找接口 --</option>
            {availableExports.map((exp) => (
              <option key={exp.key} value={exp.key}>
                [{exp.pkg}] {exp.key} ({exp.pillar?.toUpperCase()})
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!selectedLookup}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> 添加
          </Button>
        </div>
      </div>

      {/* 已选组件列表 */}
      <div className="flex-1 rounded-lg border border-slate-800 bg-slate-900/20 p-4 flex flex-col space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
          <span>当前已注入组件 ({store.items.length})</span>
          {store.items.length > 0 && (
            <button
              type="button"
              onClick={store.clearItems}
              className="text-slate-500 hover:text-rose-400 transition-colors"
            >
              清空全部
            </button>
          )}
        </div>

        {store.items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-600 font-mono py-8">
            <Box className="h-8 w-8 text-slate-700 mb-2" />
            尚未添加任何组件。请在上方选择查找接口以装配智能体。
          </div>
        ) : (
          <div className="space-y-2">
            {store.items.map((item, idx) => (
              <div key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/80 p-2.5 shadow-sm text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600 font-bold">{idx + 1}.</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-100 font-semibold">{item.lookup}</span>
                        {item.pillar && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {item.pillar}
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {store.overrides[item.lookup] ? (
                      <Badge variant="d3" className="text-[9px] px-1 py-0 mr-1">
                        已覆写
                      </Badge>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        if (editingOverrideKey === item.lookup) {
                          setEditingOverrideKey(null);
                        } else {
                          setEditingOverrideKey(item.lookup);
                          const targetId = store.overrides[item.lookup]?.selectors?.[0]?.query?.id;
                          setOverrideQueryId(typeof targetId === 'string' ? targetId : '');
                        }
                      }}
                      className={`p-1 rounded transition-colors ${
                        editingOverrideKey === item.lookup
                          ? 'text-indigo-400 bg-indigo-950/60'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="配置 Overrides 覆写"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => store.moveItem(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                      title="上移"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => store.moveItem(idx, 'down')}
                      disabled={idx === store.items.length - 1}
                      className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                      title="下移"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => store.removeItem(item.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400"
                      title="移除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {editingOverrideKey === item.lookup && (
                  <div className="rounded border border-indigo-800/60 bg-indigo-950/30 p-2.5 text-xs font-mono space-y-2">
                    <div className="flex items-center justify-between text-indigo-300 font-semibold">
                      <span>覆盖 '{item.lookup}' 的原子选择器 (Override Selectors)</span>
                      {store.overrides[item.lookup] && (
                        <button
                          type="button"
                          onClick={() => {
                            store.removeOverride(item.lookup);
                            setOverrideQueryId('');
                          }}
                          className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <RotateCcw className="h-3 w-3" /> 重置为默认
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={overrideQueryId}
                        onChange={(e) => setOverrideQueryId(e.target.value)}
                        placeholder="指定特定目标原子 ID，如 d1-custom-rule"
                        className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          if (overrideQueryId.trim()) {
                            store.setOverride(item.lookup, [
                              { query: { id: overrideQueryId.trim() } },
                            ]);
                            setEditingOverrideKey(null);
                          }
                        }}
                        disabled={!overrideQueryId.trim()}
                        className="h-7 text-xs"
                      >
                        应用覆写
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
