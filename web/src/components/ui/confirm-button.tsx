import { Trash2 } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';

export interface ConfirmIconButtonProps {
  onConfirm: (e: React.MouseEvent) => void;
  title?: string;
  confirmTitle?: string;
  className?: string;
  iconClassName?: string;
}

export function ConfirmIconButton({
  onConfirm,
  title = '删除 (按住 Shift 可直接删除)',
  confirmTitle = '确定?',
  className = '',
  iconClassName = 'h-3.5 w-3.5',
}: ConfirmIconButtonProps) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => {
      setConfirming(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [confirming]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // 如果按住了 Shift 键，直接静默触发删除
    if (e.shiftKey) {
      setConfirming(false);
      onConfirm(e);
      return;
    }

    if (confirming) {
      setConfirming(false);
      onConfirm(e);
    } else {
      setConfirming(true);
    }
  };

  if (confirming) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-mono font-bold animate-in fade-in transition-all shrink-0 cursor-pointer shadow-sm"
        title="再次点击确认删除 (3 秒后自动取消)"
      >
        {confirmTitle}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`p-0.5 rounded transition-colors text-slate-500 hover:text-rose-400 cursor-pointer shrink-0 ${className}`}
      title={title}
    >
      <Trash2 className={iconClassName} />
    </button>
  );
}
