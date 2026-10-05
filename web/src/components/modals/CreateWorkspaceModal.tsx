import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useState } from 'react';

export function CreateWorkspaceModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: { id: string; name: string; root: string }) => void;
}) {
  const [wsId, setWsId] = useState('');
  const [wsName, setWsName] = useState('');
  const [wsRoot, setWsRoot] = useState('');

  const handleSubmit = () => {
    if (!wsId.trim() || !wsRoot.trim()) return;
    onSubmit({
      id: wsId
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-'),
      name: wsName.trim() || wsId.trim(),
      root: wsRoot.trim(),
    });
    setWsId('');
    setWsName('');
    setWsRoot('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="注册新工作区 (Vault)">
      <div className="space-y-4 text-xs font-mono">
        <div>
          <label htmlFor="modal-ws-id" className="block text-slate-400 mb-1">
            工作区标识符 (ID, 英文/数字)
          </label>
          <Input
            id="modal-ws-id"
            type="text"
            value={wsId}
            onChange={(e) => setWsId(e.target.value)}
            placeholder="例如: aca_en 或 agent_exp"
          />
        </div>

        <div>
          <label htmlFor="modal-ws-name" className="block text-slate-400 mb-1">
            显示名称 (Display Name)
          </label>
          <Input
            id="modal-ws-name"
            type="text"
            value={wsName}
            onChange={(e) => setWsName(e.target.value)}
            placeholder="例如: 英文公理库"
          />
        </div>

        <div>
          <label htmlFor="modal-ws-root" className="block text-slate-400 mb-1">
            根目录绝对路径 (Root Path)
          </label>
          <Input
            id="modal-ws-root"
            type="text"
            value={wsRoot}
            onChange={(e) => setWsRoot(e.target.value)}
            placeholder="例如: /home/user/Projects/aca_en"
          />
          <span className="text-[10px] text-slate-500 mt-1 block">
            系统将自动从该目录下推断 library/ 或 packages/ 以及 manifests/ 目录。
          </span>
        </div>

        <div className="pt-2 flex justify-end gap-2 font-sans">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!wsId.trim() || !wsRoot.trim()}>
            注册工作区
          </Button>
        </div>
      </div>
    </Modal>
  );
}
