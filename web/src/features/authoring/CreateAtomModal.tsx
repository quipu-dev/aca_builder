import { Button } from '@/components/ui/button';
import type { PackageItem } from '@/features/explorer/PackageExplorer';
import { Sparkles, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

export function CreateAtomModal({
  isOpen,
  onClose,
  packages,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  packages: PackageItem[];
  onCreated: () => void;
}) {
  const [selectedPkg, setSelectedPkg] = useState<string>(packages[0]?.name || '');
  const [pillarType, setPillarType] = useState<'d1' | 'd2' | 'd3'>('d3');
  const [rawName, setRawName] = useState<string>('');
  const [priority, setPriority] = useState<number>(1);
  const [domainStr, setDomainStr] = useState<string>('');
  const [usesStr, setUsesStr] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // 自动规范化 ID
  const cleanName = rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-');
  const autoId = cleanName ? `${pillarType}-${cleanName}` : `${pillarType}-...`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg || !cleanName || !content.trim()) {
      setErrorMsg('请填写完整的必要信息（包、名称与正文）');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    const domainList = domainStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const usesList = usesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/atoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package: selectedPkg,
          id: `${pillarType}-${cleanName}`,
          type: pillarType,
          priority: pillarType === 'd3' ? priority : undefined,
          domain: domainList,
          uses: pillarType === 'd2' ? usesList : [],
          content: content,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onCreated();
        onClose();
      } else {
        setErrorMsg(data.detail || '保存原子失败');
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
            <h2 className="text-sm font-semibold text-slate-100">新建原子组件向导</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 表单内容 */}
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
              <label htmlFor="create-atom-pkg" className="text-slate-400 block mb-1">
                所属组件包
              </label>
              <select
                id="create-atom-pkg"
                value={selectedPkg}
                onChange={(e) => setSelectedPkg(e.target.value)}
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
              <label htmlFor="create-atom-pillar" className="text-slate-400 block mb-1">
                构造类别
              </label>
              <select
                id="create-atom-pillar"
                value={pillarType}
                onChange={(e) => setPillarType(e.target.value as 'd1' | 'd2' | 'd3')}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="d3">D3 控制基质（公理与原则）</option>
                <option value="d2">D2 程序基质（流程与技能）</option>
                <option value="d1">D1 陈述基质（数据与事实）</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="create-atom-raw-name" className="text-slate-400 block mb-1">
                标识后缀名称
              </label>
              <input
                id="create-atom-raw-name"
                type="text"
                value={rawName}
                onChange={(e) => setRawName(e.target.value)}
                placeholder="例如: core-operations"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="create-atom-auto-id" className="text-slate-400 block mb-1">
                自动生成唯一标识
              </label>
              <input
                id="create-atom-auto-id"
                type="text"
                readOnly
                value={autoId}
                className="w-full bg-slate-950/60 border border-slate-800/80 rounded px-2.5 py-1.5 text-indigo-300 select-all"
              />
            </div>
          </div>

          {/* D3 专属：优先级设定 */}
          {pillarType === 'd3' && (
            <div className="rounded border border-purple-900/40 bg-purple-950/20 p-3">
              <span className="text-purple-300 font-semibold block mb-2">绝对优先级设定</span>
              <div className="flex gap-4">
                {[
                  { val: 0, label: '0 级（最高公理）' },
                  { val: 1, label: '1 级（核心原则）' },
                  { val: 2, label: '2 级（情境指令）' },
                ].map((item) => (
                  <label
                    key={item.val}
                    className="flex items-center gap-1.5 cursor-pointer text-slate-300"
                  >
                    <input
                      type="radio"
                      name="priority"
                      checked={priority === item.val}
                      onChange={() => setPriority(item.val)}
                      className="text-indigo-600 focus:ring-0"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* D2 专属：引用依赖设定 */}
          {pillarType === 'd2' && (
            <div className="rounded border border-emerald-900/40 bg-emerald-950/20 p-3">
              <label
                htmlFor="create-atom-uses"
                className="text-emerald-300 font-semibold block mb-1"
              >
                依赖查找接口列表
              </label>
              <input
                id="create-atom-uses"
                type="text"
                value={usesStr}
                onChange={(e) => setUsesStr(e.target.value)}
                placeholder="用逗号分隔，例如: fhrsk::d3l-core-protocol, quipu::d2l-file-skill"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div>
            <label htmlFor="create-atom-domain" className="text-slate-400 block mb-1">
              领域标签（逗号分隔）
            </label>
            <input
              id="create-atom-domain"
              type="text"
              value={domainStr}
              onChange={(e) => setDomainStr(e.target.value)}
              placeholder="例如: fhrsk, reasoning, language"
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="create-atom-content" className="text-slate-400 block mb-1">
              原子正文内容
            </label>
            <textarea
              id="create-atom-content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="在这里编写组件的具体规则、流程或数据..."
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-xs resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? '正在写入...' : '保存原子到磁盘'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
