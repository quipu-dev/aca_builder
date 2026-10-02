import { Button } from '@/components/ui/button';
import type { PackageItem } from '@/features/explorer/PackageExplorer';
import { Layers, Save, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';

interface LookupSelector {
  query?: { id?: string };
  ref?: string;
}

export function EditLookupModal({
  isOpen,
  onClose,
  packages,
  lookupKey,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  packages: PackageItem[];
  lookupKey: string | null;
  onSaved: () => void;
}) {
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedAtomIds, setSelectedAtomIds] = useState<string[]>([]);
  const [pillar, setPillar] = useState('d1');
  const [pkgName, setPkgName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !lookupKey) return;
    setErrorMsg('');

    // 定位该 lookup 的所属包和现有定义
    for (const pkg of packages) {
      if (pkg.exports?.[lookupKey]) {
        const def = pkg.exports[lookupKey];
        setPkgName(pkg.name);
        setPillar(def.pillar || 'd1');
        setIsPublic(true);
        setDescription(def.description || '');
        const ids = ((def.selectors || []) as LookupSelector[])
          .map((s) => s.query?.id)
          .filter((id): id is string => Boolean(id));
        setSelectedAtomIds(ids);
        return;
      }
      if (pkg.internal_lookups?.[lookupKey]) {
        const def = pkg.internal_lookups[lookupKey];
        setPkgName(pkg.name);
        setPillar(def.pillar || 'd1');
        setIsPublic(false);
        setDescription(def.description || '');
        const ids = ((def.selectors || []) as LookupSelector[])
          .map((s) => s.query?.id)
          .filter((id): id is string => Boolean(id));
        setSelectedAtomIds(ids);
        return;
      }
    }
  }, [isOpen, lookupKey, packages]);

  if (!isOpen || !lookupKey) return null;

  const currentPkgObj = packages.find((p) => p.name === pkgName);
  const currentAtoms = (currentPkgObj?.atoms || []).filter((a) => a.type === pillar);

  const toggleAtom = (atomId: string) => {
    setSelectedAtomIds((prev) =>
      prev.includes(atomId) ? prev.filter((id) => id !== atomId) : [...prev, atomId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    const selectors = selectedAtomIds.map((id) => ({
      query: { id },
    }));

    try {
      const res = await fetch(`/api/lookups/${encodeURIComponent(lookupKey)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          selectors,
          is_public: isPublic,
        }),
      });

      if (res.ok) {
        onSaved();
        onClose();
      } else {
        const data = await res.json();
        setErrorMsg(data.detail || '更新 Lookup 失败');
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
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-100">
              编辑 D4 接口契约: <span className="text-indigo-400 font-mono">{lookupKey}</span>
            </h2>
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
              <span className="text-slate-400 block mb-1">所属组件包</span>
              <div className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300">
                {pkgName}
              </div>
            </div>

            <div>
              <label htmlFor="edit-lookup-visibility" className="text-slate-400 block mb-1">
                可见性契约
              </label>
              <select
                id="edit-lookup-visibility"
                value={isPublic ? 'public' : 'private'}
                onChange={(e) => setIsPublic(e.target.value === 'public')}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="public">公开导出 (package.yaml exports)</option>
                <option value="private">内部私有 (d4/lookups.yaml)</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="edit-lookup-desc" className="text-slate-400 block mb-1">
              接口描述说明
            </label>
            <input
              id="edit-lookup-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="rounded border border-slate-800 bg-slate-950/60 p-3 space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-400" />
                关联选择原子组件 ({selectedAtomIds.length} 项已选)
              </span>
              <span className="text-[10px] text-slate-500">
                仅展示当前包内匹配的 {pillar.toUpperCase()} 原子
              </span>
            </div>

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
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="flex items-center gap-1"
            >
              <Save className="h-3.5 w-3.5" />
              {submitting ? '正在保存...' : '保存更改'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
