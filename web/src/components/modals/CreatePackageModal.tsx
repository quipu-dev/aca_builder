import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

export function CreatePackageModal({
  isOpen,
  onClose,
  newPkgName,
  setNewPkgName,
  newPkgWs,
  setNewPkgWs,
  libraryPaths,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  newPkgName: string;
  setNewPkgName: (val: string) => void;
  newPkgWs: string;
  setNewPkgWs: (val: string) => void;
  libraryPaths?: string[];
  onSubmit: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="新建组件包 (Package)">
      <div className="space-y-4">
        <div>
          <label htmlFor="modal-pkg-name" className="block text-xs font-mono text-slate-400 mb-1">
            包名称 (需在全局范围内唯一)
          </label>
          <input
            id="modal-pkg-name"
            type="text"
            value={newPkgName}
            onChange={(e) => setNewPkgName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            placeholder="例如: core_agent"
          />
        </div>
        {libraryPaths && libraryPaths.length > 1 && (
          <div>
            <label htmlFor="modal-pkg-ws" className="block text-xs font-mono text-slate-400 mb-1">
              选择工作区 (Workspace)
            </label>
            <select
              id="modal-pkg-ws"
              value={newPkgWs}
              onChange={(e) => setNewPkgWs(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            >
              {libraryPaths.map((p) => (
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
          <Button onClick={onSubmit} disabled={!newPkgName.trim()}>
            确定创建
          </Button>
        </div>
      </div>
    </Modal>
  );
}
