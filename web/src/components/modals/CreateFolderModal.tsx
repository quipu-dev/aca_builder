import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import type React from 'react';
import { useState } from 'react';

export function CreateFolderModal({
  isOpen,
  onClose,
  parentPath = '',
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  parentPath?: string;
  onSubmit: (folderPath: string) => void;
}) {
  const [name, setName] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = name.trim().replace(/^\/+|\/+$/g, '');
    if (!clean) return;
    const fullPath = parentPath ? `${parentPath}/${clean}` : clean;
    onSubmit(fullPath);
    setName('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={parentPath ? `新建子目录 (${parentPath}/)` : '新建物理目录'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
        <div>
          <label htmlFor="modal-folder-name" className="block text-slate-400 mb-1">
            目录名称
          </label>
          <Input
            id="modal-folder-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如: projects/alpha"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2 font-sans">
          <Button type="button" variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={!name.trim()}>
            创建目录
          </Button>
        </div>
      </form>
    </Modal>
  );
}
