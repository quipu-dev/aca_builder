import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';

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
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newPkgName.trim()) {
      onSubmit();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="新建组件包 (Package)">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="modal-pkg-name" className="block text-xs font-mono text-slate-400 mb-1">
            包名称 (需在全局范围内唯一)
          </label>
          <Input
            id="modal-pkg-name"
            type="text"
            value={newPkgName}
            onChange={(e) => setNewPkgName(e.target.value)}
            placeholder="例如: core_agent"
          />
        </div>
        {libraryPaths && libraryPaths.length > 1 && (
          <div>
            <label htmlFor="modal-pkg-ws" className="block text-xs font-mono text-slate-400 mb-1">
              选择工作区 (Workspace)
            </label>
            <Select
              id="modal-pkg-ws"
              value={newPkgWs}
              onChange={(e) => setNewPkgWs(e.target.value)}
            >
              {libraryPaths.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={!newPkgName.trim()}>
            确定创建
          </Button>
        </div>
      </form>
    </Modal>
  );
}
