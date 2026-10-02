import { type BadgeProps, Badge as UiBadge } from '@/components/ui/badge';
import { Handle, Position } from '@xyflow/react';
import { AlertTriangle, Box, ChevronDown, ChevronUp, Edit2, Layers } from 'lucide-react';
import { useState } from 'react';

export interface ManifestNodeData {
  label: string;
  version: string;
  description?: string;
}

export function ManifestNode({ data }: { data: ManifestNodeData }) {
  return (
    <div className="rounded-lg border border-indigo-500/60 bg-indigo-950/80 p-3 shadow-lg shadow-indigo-950/50 min-w-[200px] text-slate-100 backdrop-blur">
      <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-1">
        <Layers className="h-4 w-4" />
        <span>智能体清单</span>
      </div>
      <div className="text-sm font-bold text-slate-100 truncate">{data.label}</div>
      <div className="text-[10px] text-slate-400 font-mono mt-1">版本: {data.version}</div>
      <Handle type="source" position={Position.Right} className="!bg-indigo-500 w-2.5 h-2.5" />
    </div>
  );
}

export interface LookupNodeData {
  key: string;
  pillar?: string;
  description?: string;
  isBroken?: boolean;
  isPrivate?: boolean;
}

export function LookupNode({ data }: { data: LookupNodeData }) {
  const isBroken = data.isBroken;
  const isPrivate = data.isPrivate;

  return (
    <div
      className={`rounded-md border p-2.5 min-w-[220px] backdrop-blur text-slate-200 transition-all ${
        isBroken
          ? 'border-rose-600 bg-rose-950/80 shadow-rose-900/40'
          : isPrivate
            ? 'border-amber-600 bg-amber-950/80'
            : 'border-slate-800 bg-slate-900/90 shadow-md'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400 w-2 h-2" />
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <Box className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-semibold">{data.pillar?.toUpperCase()} 查找接口</span>
        </div>
        {isBroken && (
          <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold">
            <AlertTriangle className="h-3 w-3" /> 引用断链
          </span>
        )}
      </div>
      <div className="text-xs font-mono text-slate-100 font-bold truncate">{data.key}</div>
      {data.description && (
        <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{data.description}</div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-slate-400 w-2 h-2" />
    </div>
  );
}

export interface AtomNodeData {
  id: string;
  type: string;
  priority?: number;
  package?: string;
  content?: string;
  source_file?: string;
  onEdit?: (atomId: string) => void;
}

export function AtomNode({ data }: { data: AtomNodeData }) {
  const [expanded, setExpanded] = useState(false);

  const typeVariantMap: Record<string, BadgeProps['variant']> = {
    kernel: 'kernel',
    d1: 'd1',
    d2: 'd2',
    d3: 'd3',
  };

  const variant = typeVariantMap[data.type] || 'default';

  return (
    <div
      className={`rounded-md border border-slate-800 bg-slate-950/90 p-2.5 text-slate-100 shadow-md transition-all ${
        expanded ? 'w-[320px] max-h-[300px] flex flex-col' : 'min-w-[200px] max-w-[240px]'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-500 w-2 h-2" />
      <div className="flex items-center justify-between gap-1 mb-1">
        <UiBadge variant={variant} className="text-[10px] uppercase font-mono px-1.5 py-0">
          {data.type}
          {data.priority !== undefined && `-P${data.priority}`}
        </UiBadge>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-500 font-mono truncate max-w-[70px]">
            {data.package || '全局'}
          </span>
          {data.content && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="p-0.5 text-slate-400 hover:text-white rounded"
              title={expanded ? '收起内容' : '展开白板阅读内容'}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div
          className="text-xs font-mono font-medium text-slate-200 truncate flex-1"
          title={data.id}
        >
          {data.id}
        </div>
        {data.onEdit && (
          <button
            type="button"
            onClick={() => data.onEdit?.(data.id)}
            className="text-slate-400 hover:text-indigo-300 p-0.5"
            title="在线编辑原子"
          >
            <Edit2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {expanded && data.content && (
        <div className="mt-2 pt-2 border-t border-slate-800/80 overflow-y-auto text-[11px] font-mono text-slate-300 leading-relaxed max-h-[200px] whitespace-pre-wrap select-text bg-slate-900/60 p-1.5 rounded">
          {data.content}
        </div>
      )}

      {data.type === 'd2' && (
        <Handle type="source" position={Position.Right} className="!bg-emerald-500 w-2 h-2" />
      )}
    </div>
  );
}
