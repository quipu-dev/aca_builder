import {
  fetchAtomDetail,
  fetchAtomReferences,
  renameAtomApi,
  useCreateAtomMutation,
  useDeleteAtomMutation,
  useUpdateAtomMutation,
} from '@/api/atoms';
import { openInObsidian } from '@/api/system';
import { TagAutocomplete } from '@/components/ui/autocomplete';
import { Badge, getPillarVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import type { PackageItem } from '@/features/explorer/PackageExplorer';
import { useWorkspaceCandidates } from '@/hooks/use-workspace-candidates';
import { useIdeStore } from '@/stores/ide-store';
import { generateIdSuffix } from '@/utils/ulid';
import { markdown } from '@codemirror/lang-markdown';
import CodeMirror from '@uiw/react-codemirror';
import {
  AlertCircle,
  Check,
  Dna,
  ExternalLink,
  FileText,
  Layers,
  Loader2,
  Save,
  Shield,
  Tag,
  Trash2,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

export function AtomEditorTab({
  atomId,
  packages = [],
  onSaved,
  onDeleted,
}: {
  atomId: string;
  packages?: PackageItem[];
  onSaved?: () => void;
  onDeleted?: () => void;
}) {
  const setTabDirty = useIdeStore((state) => state.setTabDirty);
  const replaceTab = useIdeStore((state) => state.replaceTab);
  const openTab = useIdeStore((state) => state.openTab);

  const tabId = `atom:${atomId}`;
  const isKernel = atomId === 'kernel' || atomId.startsWith('draft:kernel');
  const isDraft = atomId.startsWith('draft:') || atomId === 'new_atom';
  const draftParts = isDraft ? atomId.split(':') : [];
  const draftInitialPkg = isDraft && draftParts[1] !== 'kernel' ? draftParts[1] : '';

  // 显式有限状态机 (FSM)
  type EditorPhase =
    | { state: 'LOADING' }
    | { state: 'IDLE' }
    | { state: 'SAVING' }
    | { state: 'SUCCESS' }
    | { state: 'ERROR'; error: string }
    | { state: 'CONFIRM_DELETE' };

  const [phase, setPhase] = useState<EditorPhase>(
    isDraft ? { state: 'IDLE' } : { state: 'LOADING' },
  );

  // 基础数据与草稿字段
  const [currentId, setCurrentId] = useState(isDraft ? (isKernel ? 'kernel' : '') : atomId);
  const [draftSuffix, setDraftSuffix] = useState(() =>
    isKernel ? 'kernel' : isDraft ? generateIdSuffix() : '',
  );
  const [pkgName, setPkgName] = useState<string>(
    isKernel ? '全局' : draftInitialPkg || packages[0]?.name || '',
  );
  const [sourceFile, setSourceFile] = useState<string>('');
  const [atomType, setAtomType] = useState<string>(isKernel ? 'kernel' : 'd3');

  // 可视化元数据状态
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<number>(1);
  const [domainList, setDomainList] = useState<string[]>([]);
  const [usesList, setUsesList] = useState<string[]>([]);

  const { domainOptions, lookupOptions } = useWorkspaceCandidates(packages);

  // Markdown 正文
  const [content, setContent] = useState<string>(
    isDraft
      ? isKernel
        ? '# ACA 运行时协议 v1.0\n\n## 1. 系统声明\n本文档定义了当前工作区的公理边界与核心执行契约。\n'
        : '# 新建原子组件\n\n在此输入具体的规则规范或程序技能...'
      : '',
  );
  const [isModified, setIsModified] = useState(false);

  // 重命名与引用状态
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [cascadeRename, setCascadeRename] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [referenceCount, setReferenceCount] = useState<number | null>(null);

  // Mutations
  const createAtomMutation = useCreateAtomMutation();
  const updateAtomMutation = useUpdateAtomMutation();
  const deleteAtomMutation = useDeleteAtomMutation();
  const saving =
    phase.state === 'SAVING' || createAtomMutation.isPending || updateAtomMutation.isPending;
  const saveSuccess = phase.state === 'SUCCESS';
  const errorMsg = phase.state === 'ERROR' ? phase.error : '';
  const confirmDeleting = phase.state === 'CONFIRM_DELETE';

  useEffect(() => {
    if (isDraft) {
      setPhase({ state: 'IDLE' });
      return;
    }

    setPhase({ state: 'LOADING' });
    fetchAtomDetail(atomId)
      .then((data) => {
        const meta = data.meta || {};
        setCurrentId(atomId);
        setPkgName(data.package || '全局');
        setSourceFile(data.source_file || '');
        setAtomType(String(meta.type || 'd1'));
        setDescription(String(meta.description || ''));
        setPriority(meta.priority !== undefined ? Number(meta.priority) : 1);
        setDomainList(Array.isArray(meta.domain) ? (meta.domain as string[]) : []);
        setUsesList(Array.isArray(meta.uses) ? (meta.uses as string[]) : []);
        setContent(data.content || '');
        setIsModified(false);
        setTabDirty(tabId, false);
        setPhase({ state: 'IDLE' });

        // 加载被引用数
        if (!isKernel) {
          fetchAtomReferences(atomId)
            .then((refRes) => setReferenceCount(refRes.reference_count))
            .catch(() => {});
        }
      })
      .catch((err) => {
        setPhase({ state: 'ERROR', error: err.message || '加载异常' });
      });
  }, [atomId, isDraft, isKernel, setTabDirty, tabId]);

  const markDirty = () => {
    if (!isModified) {
      setIsModified(true);
      setTabDirty(tabId, true);
    }
  };

  const handleOpenObsidian = async () => {
    if (!sourceFile) return;
    try {
      await openInObsidian(sourceFile);
    } catch {
      // 忽略外部调起错误
    }
  };

  const handleSave = useCallback(async () => {
    setPhase({ state: 'SAVING' });

    if (isDraft) {
      if (isKernel) {
        if (!content.trim()) {
          setPhase({ state: 'ERROR', error: 'Kernel 协议正文不可为空' });
          return;
        }
        try {
          await createAtomMutation.mutateAsync({
            type: 'kernel',
            content: content,
          });
          setPhase({ state: 'SUCCESS' });
          setIsModified(false);
          setTabDirty(tabId, false);
          onSaved?.();
          replaceTab(tabId, {
            id: 'atom:kernel',
            type: 'atom',
            title: 'kernel',
            closable: true,
            atomId: 'kernel',
          });
        } catch (err: unknown) {
          setPhase({
            state: 'ERROR',
            error: err instanceof Error ? err.message : '创建 Kernel 失败',
          });
        }
        return;
      }

      const cleanSuffix = draftSuffix
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-');
      const generatedId = `${atomType}-${cleanSuffix}`;

      if (!pkgName || !cleanSuffix || !content.trim()) {
        setPhase({ state: 'ERROR', error: '请填写完整的所属包、标识后缀与正文' });
        return;
      }

      try {
        await createAtomMutation.mutateAsync({
          package: pkgName,
          id: generatedId,
          type: atomType,
          priority: atomType === 'd3' ? priority : undefined,
          description: description.trim() || undefined,
          domain: domainList,
          uses: atomType === 'd2' ? usesList : [],
          content: content,
        });

        setPhase({ state: 'SUCCESS' });
        setIsModified(false);
        setTabDirty(tabId, false);
        onSaved?.();
        replaceTab(tabId, {
          id: `atom:${generatedId}`,
          type: 'atom',
          title: generatedId,
          closable: true,
          atomId: generatedId,
        });
      } catch (err: unknown) {
        setPhase({ state: 'ERROR', error: err instanceof Error ? err.message : '创建原子失败' });
      }
      return;
    }

    const newMeta: Record<string, unknown> = {
      id: currentId,
      type: atomType,
      domain: domainList,
      status: 'stable',
    };

    if (description.trim()) {
      newMeta.description = description.trim();
    }
    if (atomType === 'd3') {
      newMeta.priority = priority;
    }
    if (atomType === 'd2') {
      newMeta.uses = usesList;
    }

    try {
      await updateAtomMutation.mutateAsync({
        atomId: currentId,
        payload: {
          meta: newMeta,
          content: content,
        },
      });

      setPhase({ state: 'SUCCESS' });
      setIsModified(false);
      setTabDirty(tabId, false);
      onSaved?.();
      setTimeout(() => setPhase({ state: 'IDLE' }), 2000);
    } catch (err: unknown) {
      setPhase({ state: 'ERROR', error: err instanceof Error ? err.message : '保存原子失败' });
    }
  }, [
    isDraft,
    isKernel,
    content,
    tabId,
    onSaved,
    replaceTab,
    draftSuffix,
    atomType,
    pkgName,
    description,
    domainList,
    usesList,
    priority,
    currentId,
    setTabDirty,
    createAtomMutation,
    updateAtomMutation,
  ]);

  const handleOpenRename = () => {
    setRenameInput(currentId);
    setIsRenameModalOpen(true);
  };

  const handleConfirmRename = async () => {
    const clean = renameInput.trim();
    if (!clean || clean === currentId) {
      setIsRenameModalOpen(false);
      return;
    }
    setRenaming(true);
    try {
      const res = await renameAtomApi(currentId, clean, cascadeRename);
      const countMsg = res.cascaded_lookups_count
        ? ` (已同步更新 ${res.cascaded_lookups_count} 处 Lookup 选择器)`
        : '';
      toast.success(`原子已重命名为 "${clean}"${countMsg}`);
      setIsRenameModalOpen(false);
      onSaved?.();
      replaceTab(tabId, {
        id: `atom:${clean}`,
        type: 'atom',
        title: clean,
        closable: true,
        atomId: clean,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '重命名失败');
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = async (e?: React.MouseEvent) => {
    if (isDraft) return;
    if (referenceCount && referenceCount > 0 && !e?.shiftKey && !confirmDeleting) {
      const confirmForce = window.confirm(
        `警告：当前原子正被 ${referenceCount} 个 Lookup 接口引用！\n删除可能导致这些接口解析为空集合。确定要删除吗？`,
      );
      if (!confirmForce) return;
    }

    if (e?.shiftKey || confirmDeleting) {
      setPhase({ state: 'IDLE' });
      try {
        await deleteAtomMutation.mutateAsync(currentId);
        toast.success(`原子 "${currentId}" 已物理删除`);
        onDeleted?.();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '删除原子失败';
        setPhase({ state: 'ERROR', error: msg });
        toast.error(msg);
      }
    } else {
      setPhase({ state: 'CONFIRM_DELETE' });
      setTimeout(() => setPhase({ state: 'IDLE' }), 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  useEffect(() => {
    const handleGlobalSave = () => {
      const activeTabId = useIdeStore.getState().activeTabId;
      if (activeTabId === tabId && isModified && !saving) {
        handleSave();
      }
    };
    window.addEventListener('aca:save-active-tab', handleGlobalSave);
    return () => window.removeEventListener('aca:save-active-tab', handleGlobalSave);
  }, [tabId, isModified, saving, handleSave]);

  // 智能解析非限定 Lookup 键的目标完整限定名称
  const resolveLookupRef = (ref: string): string => {
    if (ref.includes('::')) return ref;

    // 1. 优先在当前原子所属包中匹配
    const currentPkgObj = packages.find((p) => p.name === pkgName);
    if (currentPkgObj) {
      if (currentPkgObj.exports?.[ref] || currentPkgObj.exports?.[`${pkgName}::${ref}`]) {
        return `${pkgName}::${ref}`;
      }
      if (
        currentPkgObj.internal_lookups?.[ref] ||
        currentPkgObj.internal_lookups?.[`${pkgName}::internal::${ref}`]
      ) {
        return `${pkgName}::internal::${ref}`;
      }
    }

    // 2. 当前包未找到时，遍历全库所有包
    for (const pkg of packages) {
      if (pkg.exports?.[ref] || pkg.exports?.[`${pkg.name}::${ref}`]) {
        return `${pkg.name}::${ref}`;
      }
      if (pkg.internal_lookups?.[ref] || pkg.internal_lookups?.[`${pkg.name}::internal::${ref}`]) {
        return `${pkg.name}::internal::${ref}`;
      }
    }

    // 3. 兜底回退为当前包局部作用域
    return pkgName && pkgName !== '全局' ? `${pkgName}::${ref}` : ref;
  };

  if (phase.state === 'LOADING') {
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
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60 font-mono text-xs">
        <div className="flex items-center gap-2 truncate">
          <Badge
            variant={getPillarVariant(atomType, 'kernel')}
            className="text-[10px] uppercase font-bold"
          >
            {atomType}
            {atomType === 'd3' ? `-P${priority}` : ''}
          </Badge>
          <span className="font-semibold text-slate-100 truncate">{atomId}</span>
          <span className="text-[11px] text-slate-500 truncate">@{pkgName}</span>
          {!isDraft && !isKernel && (
            <button
              type="button"
              onClick={handleOpenRename}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer ml-1"
              title="重命名原子标识符并移动文件"
            >
              [重命名]
            </button>
          )}
          {typeof referenceCount === 'number' && referenceCount > 0 && (
            <span
              className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.2 rounded"
              title={`当前有 ${referenceCount} 个 Lookup 引用该原子`}
            >
              {referenceCount} 处引用
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {errorMsg && (
            <span className="text-[11px] text-rose-400 flex items-center gap-1">
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
          {!isDraft && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleteAtomMutation.isPending}
              className={`h-7 text-xs flex items-center gap-1 px-2 cursor-pointer transition-colors ${
                confirmDeleting
                  ? 'bg-rose-600 text-white border-rose-500 hover:bg-rose-500 font-bold'
                  : 'text-rose-400 border-rose-900/50 hover:bg-rose-950/50 hover:border-rose-700'
              }`}
              title="物理删除该原子 (Shift+点击直接删除)"
            >
              <Trash2 className="h-3 w-3" />
              <span>{confirmDeleting ? '确定删除?' : '删除'}</span>
            </Button>
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

      {isDraft && !isKernel && (
        <div className="px-4 py-2.5 border-b border-slate-800 bg-indigo-950/20 grid grid-cols-3 gap-3 text-xs font-mono">
          <div>
            <label htmlFor="atom-draft-pkg" className="text-slate-400 block mb-1">
              所属包
            </label>
            <Select
              id="atom-draft-pkg"
              value={pkgName}
              onChange={(e) => {
                setPkgName(e.target.value);
                markDirty();
              }}
            >
              {packages.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="atom-draft-type" className="text-slate-400 block mb-1">
              构造类别
            </label>
            <Select
              id="atom-draft-type"
              value={atomType}
              onChange={(e) => {
                setAtomType(e.target.value);
                markDirty();
              }}
            >
              <option value="d3">D3</option>
              <option value="d2">D2</option>
              <option value="d1">D1</option>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="atom-draft-suffix" className="text-slate-400 block">
                标识后缀 ({atomType}-{draftSuffix || '...'})
              </label>
              <button
                type="button"
                onClick={() => {
                  setDraftSuffix(generateIdSuffix());
                  markDirty();
                }}
                className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 cursor-pointer"
                title="生成新 ULID 标识"
              >
                <Dna className="h-3 w-3" />
                <span>ULID</span>
              </button>
            </div>
            <div className="flex items-center gap-1">
              <Input
                id="atom-draft-suffix"
                type="text"
                value={draftSuffix}
                onChange={(e) => {
                  setDraftSuffix(e.target.value);
                  markDirty();
                }}
                placeholder="例如: 01k47... 或业务词"
                className="flex-1"
              />
            </div>
          </div>
        </div>
      )}

      {!isKernel && (
        <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-900/30 space-y-2.5 text-xs font-mono">
          <div className="flex items-center gap-6">
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

            <div className="flex-1 flex items-center gap-2">
              <span className="text-slate-400 flex items-center gap-1 shrink-0">
                <FileText className="h-3.5 w-3.5 text-cyan-400" /> 描述说明:
              </span>
              <Input
                type="text"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  markDirty();
                }}
                placeholder="简明业务描述（将在白板拓扑节点卡片中直观呈现）"
                className="flex-1 border-slate-800/80 py-0.5 text-[11px] focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-start gap-2 pt-1 border-t border-slate-800/40">
            <span className="text-slate-400 flex items-center gap-1 shrink-0 mt-1">
              <Tag className="h-3.5 w-3.5 text-indigo-400" /> 领域标签:
            </span>
            <div className="flex-1">
              <TagAutocomplete
                values={domainList}
                onChange={(newTags) => {
                  setDomainList(newTags);
                  markDirty();
                }}
                options={domainOptions}
                placeholder="输入标签 (回车添加，支持下拉联想推荐已用标签)"
                badgeVariant="default"
              />
            </div>
          </div>

          {atomType === 'd2' && (
            <div className="flex items-start gap-2 pt-1 border-t border-slate-800/40">
              <span className="text-slate-400 flex items-center gap-1 shrink-0 mt-1">
                <Layers className="h-3.5 w-3.5 text-emerald-400" /> 依赖引用 (Uses):
              </span>
              <div className="flex-1">
                <TagAutocomplete
                  values={usesList}
                  onChange={(newRefs) => {
                    setUsesList(newRefs);
                    markDirty();
                  }}
                  options={lookupOptions}
                  placeholder="关联 Lookup (输入 d1l- 或包名自动检索)"
                  badgeVariant="d2"
                  onTagClick={(ref) => {
                    const targetKey = resolveLookupRef(ref);
                    openTab({
                      id: `lookup:${targetKey}`,
                      type: 'lookup',
                      title: targetKey.split('::').pop() || targetKey,
                      closable: true,
                      lookupKey: targetKey,
                    });
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

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

      <Modal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        title={`重命名原子: ${currentId}`}
      >
        <div className="space-y-4 text-xs font-mono">
          <div>
            <label htmlFor="atom-rename-input" className="block text-slate-400 mb-1">
              新原子标识符 (ID)
            </label>
            <Input
              id="atom-rename-input"
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
            />
            <div className="mt-2 flex items-center gap-2">
              <input
                id="atom-cascade-check"
                type="checkbox"
                checked={cascadeRename}
                onChange={(e) => setCascadeRename(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
              />
              <label
                htmlFor="atom-cascade-check"
                className="text-slate-300 text-[11px] cursor-pointer"
              >
                级联同步更新所有显式引用该 ID 的 Lookup 选择器
              </label>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              重命名将物理重命名磁盘文件、更新 Frontmatter ID，并可选传播至所有关联接口。
            </span>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsRenameModalOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleConfirmRename}
              disabled={renaming || !renameInput.trim() || renameInput.trim() === currentId}
            >
              {renaming ? '重命名中...' : '确认重命名'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
