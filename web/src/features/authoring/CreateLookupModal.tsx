import { Button } from '@/components/ui/button';
import type { PackageItem } from '@/features/explorer/PackageExplorer';
import { Layers, Sparkles, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

export function CreateLookupModal({
  isOpen,
  onClose,
  packages,
  defaultPkg,
  defaultPublic = true,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  packages: PackageItem[];
  defaultPkg?: string;
  defaultPublic?: boolean;
  onCreated: () => void;
}) {
  const [selectedPkg, setSelectedPkg] = useState<string>(defaultPkg || packages[0]?.name || '');
  const [isPublic, setIsPublic] = useState<boolean>(defaultPublic);
  const [pillarType, setPillarType] = useState<'d1' | 'd2' | 'd3'>('d1');
  const [rawKeyName, setRawKeyName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedAtomIds, setSelectedAtomIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const currentPkgObj = packages.find((p) => p.name === selectedPkg);
  const currentAtoms = (currentPkgObj?.atoms || []).filter((a) => a.type === pillarType);

  // 格式化 Lookup 键名，确保遵循 d1l-, d2l-, d3l-
  const cleanSuffix = rawKeyName
    .trim()
    .toLowerCase()
    .replace(/^d[1-3]l-/, '')
    .replace(/[^a-z0-9_-]/g, '-');
  const fullLookupKey = cleanSuffix ? `${pillarType}l-${cleanSuffix}` : `${pillarType}l-...`;

  const toggleAtom = (atomId: string) => {
    setSelectedAtomIds((prev) =>
      prev.includes(atomId) ? prev.filter((id) => id !== atomId) : [...prev, atomId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg || !cleanSuffix) {
      setErrorMsg('请填写完整的包与查找接口名称');
      return;
    }

    if (selectedAtomIds.length === 0) {
      setErrorMsg('请至少勾选一个包含的原子组件');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    const selectors = selectedAtomIds.map((id) => ({
      query: { id },
    }));

    try {
      const res = await fetch('/api/lookups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package: selectedPkg,
          key: `${pillarType}l-${cleanSuffix}`,
          pillar: pillarType,
          is_public: isPublic,
          description: description.trim(),
          selectors,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onCreated();
        onClose();
      } else {
        setErrorMsg(data.detail || '保存 Lookup 失败');
      }
    } catch (_err) {
      setErrorMsg('网络请求异常');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-lg border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-100">新建 D4 查找接口向导</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-mono"
        >
          {errorMsg && (
            <div className="rounded bg-rose-950/60 border border-rose-800/80 p-2.5 text-rose-300">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="create-lookup-pkg" className="text-slate-400 block mb-1">
                所属组件包
              </label>
              <select
                id="create-lookup-pkg"
                value={selectedPkg}
                onChange={(e) => {
                  setSelectedPkg(e.target.value);
                  setSelectedAtomIds([]);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {packages.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="create-lookup-visibility" className="text-slate-400 block mb-1">
                可见性契约
              </label>
              <select
                id="create-lookup-visibility"
                value={isPublic ? 'public' : 'private'}
                onChange={(e) => setIsPublic(e.target.value === 'public')}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="public">公开导出 (写入 package.yaml exports)</option>
                <option value="private">内部私有 (写入 d4/lookups.yaml)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="create-lookup-pillar" className="text-slate-400 block mb-1">
                构造类别
              </label>
              <select
                id="create-lookup-pillar"
                value={pillarType}
                onChange={(e) => {
                  setPillarType(e.target.value as 'd1' | 'd2' | 'd3');
                  setSelectedAtomIds([]);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="d1">D1 陈述基质 (d1l-*)</option>
                <option value="d2">D2 程序基质 (d2l-*)</option>
                <option value="d3">D3 控制基质 (d3l-*)</option>
              </select>
            </div>

            <div>
              <label htmlFor="create-lookup-key" className="text-slate-400 block mb-1">
                标识后缀与生成键
              </label>
              <input
                id="create-lookup-key"
                type="text"
                value={rawKeyName}
                onChange={(e) => setRawKeyName(e.target.value)}
                placeholder="例如: core-rules"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-indigo-400 block mt-1">
                完整键: {fullLookupKey}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="create-lookup-desc" className="text-slate-400 block mb-1">
              接口描述说明
            </label>
            <input
              id="create-lookup-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如: 导出核心交互协议与安全守则"
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* 原子点选区域 */}
          <div className="rounded border border-slate-800 bg-slate-950/60 p-3 space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-400" />
                点选关联原子 ({selectedAtomIds.length} 项已选)
              </span>
              <span className="text-[10px] text-slate-500">仅展示当前包内匹配构造的原子</span>
            </div>

            {currentAtoms.length === 0 ? (
              <div className="text-slate-500 py-4 text-center">
                包 '{selectedPkg}' 中暂无可用的 {pillarType.toUpperCase()} 原子。
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pt-1">
                {currentAtoms.map((atom) => {
                  const isChecked = selectedAtomIds.includes(atom.id);
                  return (
                    <label
                      key={atom.id}
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-indigo-500/80 bg-indigo-950/40 text-indigo-200'
                          : 'border-slate-800/80 bg-slate-900/40 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleAtom(atom.id)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <span className="truncate">{atom.id}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? '正在写入...' : '保存查找接口'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
