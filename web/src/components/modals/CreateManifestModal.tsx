import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';

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
          <Input
            id="modal-man-name"
            type="text"
            value={newManName}
            onChange={(e) => setNewManName(e.target.value)}
            placeholder="例如: project_a/main_agent"
          />
        </div>
        {manifestPaths && manifestPaths.length > 1 && (
          <div>
            <label htmlFor="modal-man-ws" className="block text-xs font-mono text-slate-400 mb-1">
              选择工作区 (Workspace)
            </label>
            <Select
              id="modal-man-ws"
              value={newManWs}
              onChange={(e) => setNewManWs(e.target.value)}
            >
              {manifestPaths.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
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
