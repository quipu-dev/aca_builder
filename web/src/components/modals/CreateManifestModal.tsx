import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

export function CreateManifestModal({
  isOpen,
  onClose,
  newManName,
  setNewManName,
  newManWs,
  setNewManWs,
  manifestPaths,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  newManName: string;
  setNewManName: (val: string) => void;
  newManWs: string;
  setNewManWs: (val: string) => void;
  manifestPaths?: string[];
  onSubmit: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="新建蓝图草稿">
      <div className="space-y-4">
        <div>
          <label htmlFor="modal-man-name" className="block text-xs font-mono text-slate-400 mb-1">
            蓝图名称 (可选带目录层级)
          </label>
          <input
            id="modal-man-name"
            type="text"
            value={newManName}
            onChange={(e) => setNewManName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            placeholder="例如: project_a/main_agent"
          />
        </div>
        {manifestPaths && manifestPaths.length > 1 && (
          <div>
            <label htmlFor="modal-man-ws" className="block text-xs font-mono text-slate-400 mb-1">
              选择工作区 (Workspace)
            </label>
            <select
              id="modal-man-ws"
              value={newManWs}
              onChange={(e) => setNewManWs(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            >
              {manifestPaths.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="pt-2 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onSubmit} disabled={!newManName.trim()}>
            创建草稿
          </Button>
        </div>
      </div>
    </Modal>
  );
}
