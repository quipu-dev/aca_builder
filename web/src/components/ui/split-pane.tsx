import type React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

export interface SplitPaneProps {
  direction?: 'horizontal' | 'vertical';
  initialRatio?: number;
  minPrimarySize?: number;
  minSecondarySize?: number;
  primary: React.ReactNode;
  secondary: React.ReactNode;
  className?: string;
  onResize?: (ratio: number) => void;
}

export function SplitPane({
  direction = 'horizontal',
  initialRatio = 0.5,
  primary,
  secondary,
  className = '',
  onResize,
}: SplitPaneProps) {
  const isHorizontal = direction === 'horizontal';

  return (
    <PanelGroup
      direction={isHorizontal ? 'horizontal' : 'vertical'}
      className={`h-full w-full ${className}`}
      onLayout={(sizes) => {
        if (sizes[0] !== undefined && onResize) {
          onResize(sizes[0] / 100);
        }
      }}
    >
      <Panel defaultSize={initialRatio * 100} minSize={15}>
        <div className="h-full w-full overflow-hidden">{primary}</div>
      </Panel>

      <PanelResizeHandle
        className={`relative z-20 shrink-0 group flex items-center justify-center transition-colors ${
          isHorizontal
            ? 'w-1.5 cursor-col-resize hover:bg-indigo-500/60'
            : 'h-1.5 cursor-row-resize hover:bg-indigo-500/60'
        } bg-slate-800 data-[resize-handle-active]:bg-indigo-500`}
      >
        <div
          className={`rounded-full bg-slate-600 group-hover:bg-white transition-colors group-data-[resize-handle-active]:!bg-white ${
            isHorizontal ? 'h-8 w-1' : 'w-8 h-1'
          }`}
        />
      </PanelResizeHandle>

      <Panel defaultSize={(1 - initialRatio) * 100} minSize={15}>
        <div className="h-full w-full overflow-hidden">{secondary}</div>
      </Panel>
    </PanelGroup>
  );
}
