import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIdeStore } from '@/stores/ide-store';
import { markdown } from '@codemirror/lang-markdown';
import CodeMirror from '@uiw/react-codemirror';
import { AlertCircle, Check, ExternalLink, Layers, Loader2, Save, Shield, Tag } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';

export function AtomEditorTab({
  atomId,
  packages = [],
  onSaved,
}: {
  atomId: string;
  packages?: Array<{ name: string }>;
  onSaved?: () => void;
}) {
  const setTabDirty = useIdeStore((state) => state.setTabDirty);
  const openTab = useIdeStore((state) => state.openTab);

  const isDraft = atomId.startsWith('draft:') || atomId === 'new_atom';
  const draftInitialPkg = isDraft ? atomId.replace('draft:', '') : '';

  const [loading, setLoading] = useState(!isDraft);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 基础数据与草稿字段
  const [currentId, setCurrentId] = useState(isDraft ? '' : atomId);
  const [draftSuffix, setDraftSuffix] = useState('');
  const [pkgName, setPkgName] = useState<string>(draftInitialPkg || packages[0]?.name || '');
  const [sourceFile, setSourceFile] = useState<string>('');
  const [atomType, setAtomType] = useState<string>('d3');

  // 可视化元数据状态
  const [priority, setPriority] = useState<number>(1);
  const [domainList, setDomainList] = useState<string[]>([]);
  const [domainInput, setDomainInput] = useState<string>('');
  const [usesList, setUsesList] = useState<string[]>([]);
  const [usesInput, setUsesInput] = useState<string>('');

  // Markdown 正文
  const [content, setContent] = useState<string>(
    isDraft ? '# 新建原子组件\n\n在此输入具体的规则规范或程序技能...' : '',
  );
  const [isModified, setIsModified] = useState(false);

  useEffect(() => {
    if (isDraft) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    fetch(`/api/atoms/${encodeURIComponent(atomId)}`)
      .then((res) => {
        if (!res.ok) throw new Error('加载原子失败');
        return res.json();
      })
      .then((data) => {
        const meta = data.meta || {};
        setCurrentId(atomId);
        setPkgName(data.package || '全局');
        setSourceFile(data.source_file || '');
        setAtomType(meta.type || 'd1');
        setPriority(meta.priority !== undefined ? meta.priority : 1);
        setDomainList(Array.isArray(meta.domain) ? meta.domain : []);
        setUsesList(Array.isArray(meta.uses) ? meta.uses : []);
        setContent(data.content || '');
        setIsModified(false);
        setTabDirty(`atom:${atomId}`, false);
      })
      .catch((err) => {
        setErrorMsg(err.message || '加载异常');
      })
      .finally(() => setLoading(false));
  }, [atomId, isDraft, setTabDirty]);

  const markDirty = () => {
    if (!isModified) {
      setIsModified(true);
      setTabDirty(`atom:${atomId}`, true);
    }
  };

  const handleOpenObsidian = async () => {
    if (!sourceFile) return;
    try {
      await fetch('/api/system/open-obsidian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: sourceFile }),
      });
    } catch (_err) {
      // 忽略调起异常
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');

    if (isDraft) {
      // 草稿原子新建持久化逻辑
      const cleanSuffix = draftSuffix
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-');
      const generatedId = `${atomType}-${cleanSuffix}`;

      if (!pkgName || !cleanSuffix || !content.trim()) {
        setErrorMsg('请填写完整的所属包、标识后缀与正文');
        setSaving(false);
        return;
      }

      try {
        const res = await fetch('/api/atoms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            package: pkgName,
            id: generatedId,
            type: atomType,
            priority: atomType === 'd3' ? priority : undefined,
            domain: domainList,
            uses: atomType === 'd2' ? usesList : [],
            content: content,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setSaveSuccess(true);
          setIsModified(false);
          setTabDirty(`atom:${atomId}`, false);
          onSaved?.();
          // 保存成功后无缝跳转到正式编辑 Tab
          openTab({
            id: `atom:${generatedId}`,
            type: 'atom',
            title: generatedId,
            closable: true,
            atomId: generatedId,
          });
        } else {
          setErrorMsg(data.detail || '创建原子失败');
        }
      } catch (_err) {
        setErrorMsg('创建请求异常');
      } finally {
        setSaving(false);
      }
      return;
    }

    // 已有原子更新逻辑
    const newMeta: Record<string, unknown> = {
      id: currentId,
      type: atomType,
      domain: domainList,
      status: 'stable',
    };

    if (atomType === 'd3') {
      newMeta.priority = priority;
    }
    if (atomType === 'd2') {
      newMeta.uses = usesList;
    }

    try {
      const res = await fetch(`/api/atoms/${encodeURIComponent(currentId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meta: newMeta,
          content: content,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setIsModified(false);
        setTabDirty(`atom:${atomId}`, false);
        onSaved?.();
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        const data = await res.json();
        setErrorMsg(data.detail || '保存原子失败');
      }
    } catch (_err) {
      setErrorMsg('网络请求异常');
    } finally {
      setSaving(false);
    }
  };

  // 支持键盘快捷键 Ctrl+S / Cmd+S
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  const addDomainTag = () => {
    const trimmed = domainInput.trim().toLowerCase();
    if (trimmed && !domainList.includes(trimmed)) {
      setDomainList([...domainList, trimmed]);
      setDomainInput('');
      markDirty();
    }
  };

  const removeDomainTag = (tag: string) => {
    setDomainList(domainList.filter((t) => t !== tag));
    markDirty();
  };

  const addUsesRef = () => {
    const trimmed = usesInput.trim();
    if (trimmed && !usesList.includes(trimmed)) {
      setUsesList([...usesList, trimmed]);
      setUsesInput('');
      markDirty();
    }
  };

  const removeUsesRef = (ref: string) => {
    setUsesList(usesList.filter((u) => u !== ref));
    markDirty();
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-slate-500 font-mono gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
        正在加载原子组件: {atomId}...
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col bg-slate-950 text-slate-100 overflow-hidden"
      onKeyDown={handleKeyDown}
    >
      {/* 顶部工具栏与状态 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60 font-mono text-xs">
        <div className="flex items-center gap-2 truncate">
          <Badge
            variant={
              atomType === 'd1'
                ? 'd1'
                : atomType === 'd2'
                  ? 'd2'
                  : atomType === 'd3'
                    ? 'd3'
                    : 'kernel'
            }
            className="text-[10px] uppercase font-bold"
          >
            {atomType}
            {atomType === 'd3' ? `-P${priority}` : ''}
          </Badge>
          <span className="font-semibold text-slate-100 truncate">{atomId}</span>
          <span className="text-[11px] text-slate-500 truncate">@{pkgName}</span>
          {isModified && (
            <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded">
              已修改
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {errorMsg && (
            <span className="text-[11px] text-rose-400 flex items-center gap-1 font-sans">
              <AlertCircle className="h-3 w-3" /> {errorMsg}
            </span>
          )}
          {sourceFile && (
            <button
              type="button"
              onClick={handleOpenObsidian}
              className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-purple-300 hover:bg-slate-800 rounded transition-colors text-[11px]"
              title="在 Obsidian 中打开外部编辑"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Obsidian</span>
            </button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !isModified}
            className="h-7 text-xs flex items-center gap-1 px-2.5"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-3 w-3 text-emerald-300" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            <span>{saveSuccess ? '已保存' : '保存 (Ctrl+S)'}</span>
          </Button>
        </div>
      </div>

      {/* 草稿模式：定义所属包、构造类别与生成标识符 */}
      {isDraft && (
        <div className="px-4 py-2.5 border-b border-slate-800 bg-indigo-950/20 grid grid-cols-3 gap-3 text-xs font-mono">
          <div>
            <label htmlFor="atom-draft-pkg" className="text-slate-400 block mb-1">
              所属包
            </label>
            <select
              id="atom-draft-pkg"
              value={pkgName}
              onChange={(e) => {
                setPkgName(e.target.value);
                markDirty();
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {packages.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="atom-draft-type" className="text-slate-400 block mb-1">
              构造类别
            </label>
            <select
              id="atom-draft-type"
              value={atomType}
              onChange={(e) => {
                setAtomType(e.target.value);
                markDirty();
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="d3">D3 控制基质</option>
              <option value="d2">D2 程序基质</option>
              <option value="d1">D1 陈述基质</option>
            </select>
          </div>
          <div>
            <label htmlFor="atom-draft-suffix" className="text-slate-400 block mb-1">
              标识后缀 (将自动生成: {atomType}-{draftSuffix || '...'})
            </label>
            <input
              id="atom-draft-suffix"
              type="text"
              value={draftSuffix}
              onChange={(e) => {
                setDraftSuffix(e.target.value);
                markDirty();
              }}
              placeholder="例如: core-operations"
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      {/* 可视化 Frontmatter 属性编辑条 (无需手写 YAML) */}
      <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-900/30 space-y-2.5 text-xs font-mono">
        <div className="flex items-center gap-6">
          {/* D3 专属：绝对优先级单选 */}
          {atomType === 'd3' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-purple-400" /> 优先级:
              </span>
              <div className="flex items-center gap-2">
                {[
                  { val: 0, label: 'P0 公理' },
                  { val: 1, label: 'P1 原则' },
                  { val: 2, label: 'P2 指令' },
                ].map((item) => (
                  <label
                    key={item.val}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer border text-[11px] transition-colors ${
                      priority === item.val
                        ? 'border-purple-500 bg-purple-950/60 text-purple-200 font-semibold'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="atom-priority"
                      className="hidden"
                      checked={priority === item.val}
                      onChange={() => {
                        setPriority(item.val);
                        markDirty();
                      }}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 领域 Domain 标签设定 */}
          <div className="flex-1 flex items-center gap-2">
            <span className="text-slate-400 flex items-center gap-1 shrink-0">
              <Tag className="h-3.5 w-3.5 text-indigo-400" /> 领域标签:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              {domainList.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[11px] border border-slate-700"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeDomainTag(tag)}
                    className="hover:text-rose-400"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addDomainTag();
                  }
                }}
                placeholder="+ 添加标签 (回车)"
                className="bg-slate-950 border border-slate-800/80 rounded px-2 py-0.5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 w-32"
              />
            </div>
          </div>
        </div>

        {/* D2 专属：Uses 依赖查找接口列表 */}
        {atomType === 'd2' && (
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/40">
            <span className="text-slate-400 flex items-center gap-1 shrink-0">
              <Layers className="h-3.5 w-3.5 text-emerald-400" /> 依赖引用 (Uses):
            </span>
            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              {usesList.map((ref) => (
                <span
                  key={ref}
                  className="inline-flex items-center gap-1 bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded text-[11px] border border-emerald-800/60"
                >
                  <span>{ref}</span>
                  <button
                    type="button"
                    onClick={() => removeUsesRef(ref)}
                    className="hover:text-rose-400 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={usesInput}
                onChange={(e) => setUsesInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addUsesRef();
                  }
                }}
                placeholder="+ 关联 lookup (回车，例如 pkg::d1l-name)"
                className="bg-slate-950 border border-slate-800/80 rounded px-2 py-0.5 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500 w-64"
              />
            </div>
          </div>
        )}
      </div>

      {/* Markdown 正文沉浸式编辑区 */}
      <div className="flex-1 overflow-hidden p-2 bg-slate-950">
        <CodeMirror
          value={content}
          height="100%"
          extensions={[markdown()]}
          theme="dark"
          onChange={(val) => {
            setContent(val);
            markDirty();
          }}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
          }}
          className="text-xs font-mono h-full"
        />
      </div>
    </div>
  );
}
