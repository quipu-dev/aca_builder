import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface SplitPaneProps {
  direction?: 'horizontal' | 'vertical'; // horizontal: 左右分栏 (常用); vertical: 上下分栏
  initialRatio?: number; // 默认左侧占比 0.5 (50%)
  minPrimarySize?: number; // 左侧/上侧最小像素
  minSecondarySize?: number; // 右侧/下侧最小像素
  primary: React.ReactNode;
  secondary: React.ReactNode;
  className?: string;
  onResize?: (ratio: number) => void;
}

export function SplitPane({
  direction = 'horizontal',
  initialRatio = 0.5,
  minPrimarySize = 240,
  minSecondarySize = 240,
  primary,
  secondary,
  className = '',
  onResize,
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState<number>(initialRatio);
  const [isDragging, setIsDragging] = useState(false);

  const isHorizontal = direction === 'horizontal';

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      let newRatio: number;

      if (isHorizontal) {
        const offset = e.clientX - rect.left;
        const total = rect.width;
        if (offset < minPrimarySize || total - offset < minSecondarySize) return;
        newRatio = Math.max(0.15, Math.min(0.85, offset / total));
      } else {
        const offset = e.clientY - rect.top;
        const total = rect.height;
        if (offset < minPrimarySize || total - offset < minSecondarySize) return;
        newRatio = Math.max(0.15, Math.min(0.85, offset / total));
      }

      setRatio(newRatio);
      onResize?.(newRatio);
    },
    [isDragging, isHorizontal, minPrimarySize, minSecondarySize, onResize],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full w-full overflow-hidden ${
        isHorizontal ? 'flex-row' : 'flex-col'
      } ${className}`}
      style={{ userSelect: isDragging ? 'none' : 'auto' }}
    >
      {/* 主面板 (左 / 上) */}
      <div
        style={{
          flex: `0 0 ${ratio * 100}%`,
          overflow: 'hidden',
        }}
        className="h-full"
      >
        {primary}
      </div>

      {/* 拖动分割手柄 */}
      <div
        onPointerDown={handlePointerDown}
        className={`relative z-20 shrink-0 group flex items-center justify-center transition-colors ${
          isHorizontal
            ? 'w-1.5 cursor-col-resize hover:bg-indigo-500/60'
            : 'h-1.5 cursor-row-resize hover:bg-indigo-500/60'
        } ${isDragging ? 'bg-indigo-500' : 'bg-slate-800'}`}
      >
        {/* 悬停时的提示指示器 */}
        <div
          className={`rounded-full bg-slate-600 group-hover:bg-white transition-colors ${
            isHorizontal ? 'h-8 w-1' : 'w-8 h-1'
          } ${isDragging ? '!bg-white' : ''}`}
        />
      </div>

      {/* 副面板 (右 / 下) */}
      <div
        style={{
          flex: `1 1 ${(1 - ratio) * 100}%`,
          overflow: 'hidden',
        }}
        className="h-full"
      >
        {secondary}
      </div>
    </div>
  );
}
