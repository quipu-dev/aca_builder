import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type React from 'react';
import { useEffect, useState } from 'react';

export function EditPackageModal({
  isOpen,
  onClose,
  packageName,
  initialVersion = '1.0.0',
  initialDescription = '',
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  packageName: string;
  initialVersion?: string;
  initialDescription?: string;
  onSubmit: (params: { version: string; description: string }) => void;
}) {
  const [version, setVersion] = useState(initialVersion);
  const [description, setDescription] = useState(initialDescription);

  useEffect(() => {
    setVersion(initialVersion);
    setDescription(initialDescription);
  }, [initialVersion, initialDescription]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSubmit({
      version: version.trim() || '1.0.0',
      description: description.trim(),
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`编辑组件包元数据: ${packageName}`}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
        <div>
          <label htmlFor="modal-pkg-version" className="block text-slate-400 mb-1">
            版本号 (Version)
          </label>
          <input
            id="modal-pkg-version"
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-mono"
            placeholder="例如: 1.0.0"
          />
        </div>

        <div>
          <label htmlFor="modal-pkg-desc" className="block text-slate-400 mb-1">
            功能描述 (Description)
          </label>
          <textarea
            id="modal-pkg-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-sans leading-relaxed"
            placeholder="说明此组件包的主要职责与契约..."
          />
        </div>

        <div className="pt-2 flex justify-end gap-2 font-sans">
          <Button type="button" variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button type="submit">保存修改</Button>
        </div>
      </form>
    </Modal>
  );
}
