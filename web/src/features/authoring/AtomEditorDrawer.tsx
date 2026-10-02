import { Button } from '@/components/ui/button';
import { markdown } from '@codemirror/lang-markdown';
import CodeMirror from '@uiw/react-codemirror';
import { FileCode, Loader2, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function AtomEditorDrawer({
  atomId,
  isOpen,
  onClose,
  onSaved,
}: {
  atomId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [content, setContent] = useState('');
  const [sourceFile, setSourceFile] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !atomId) return;

    setLoading(true);
    setStatusMsg('');
    fetch(`/api/atoms/${encodeURIComponent(atomId)}`)
      .then((res) => {
        if (!res.ok) throw new Error('读取原子失败');
        return res.json();
      })
      .then((data) => {
        setContent(data.raw || '');
        setSourceFile(data.source_file || '');
      })
      .catch((err) => {
        setStatusMsg(err.message || '加载异常');
      })
      .finally(() => setLoading(false));
  }, [atomId, isOpen]);

  const handleSave = async () => {
    if (!atomId) return;
    setSaving(true);
    setStatusMsg('正在保存...');
    try {
      const res = await fetch(`/api/atoms/${encodeURIComponent(atomId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_content: content }),
      });
      if (res.ok) {
        setStatusMsg('保存成功');
        onSaved();
        setTimeout(() => setStatusMsg(''), 2500);
      } else {
        const data = await res.json();
        setStatusMsg(`保存失败: ${data.detail}`);
      }
    } catch (_err) {
      setStatusMsg('保存请求异常');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[600px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100">
      {/* 头部工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2 overflow-hidden">
          <FileCode className="h-4 w-4 text-indigo-400 shrink-0" />
          <div className="flex flex-col truncate">
            <span className="text-sm font-semibold truncate">{atomId}</span>
            {sourceFile && (
              <span className="text-[10px] text-slate-500 font-mono truncate" title={sourceFile}>
                {sourceFile}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusMsg && <span className="text-xs text-indigo-400 font-mono">{statusMsg}</span>}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-1.5 h-8 text-xs"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            保存
          </Button>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 编辑区域 */}
      <div className="flex-1 overflow-hidden p-2 bg-slate-950">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            正在加载原子内容...
          </div>
        ) : (
          <CodeMirror
            value={content}
            height="100%"
            extensions={[markdown()]}
            theme="dark"
            onChange={(val) => setContent(val)}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
            }}
            className="text-xs font-mono h-full"
          />
        )}
      </div>
    </div>
  );
}
