import { Badge as UiBadge, getPillarVariant } from '@/components/ui/badge';
import { Handle, Position } from '@xyflow/react';
import { AlertTriangle, Box, Layers } from 'lucide-react';

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
  hasContract?: boolean;
  onEdit?: (lookupKey: string) => void;
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
          <span className="font-semibold">{data.pillar?.toUpperCase()} 接口</span>
          {data.hasContract && (
            <span className="text-[9px] font-bold px-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              契约
            </span>
          )}
        </div>
        {isBroken && (
          <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold">
            <AlertTriangle className="h-3 w-3" /> 引用断链
          </span>
        )}
      </div>
      <button
        type="button"
        className="w-full text-left text-xs font-mono text-slate-100 font-bold truncate cursor-pointer hover:text-indigo-300 hover:underline bg-transparent border-none p-0"
        onClick={() => data.onEdit?.(data.key)}
        title="点击编辑查找接口契约"
      >
        {data.key}
      </button>
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
  description?: string;
  source_file?: string;
  onEdit?: (atomId: string) => void;
}

export function AtomNode({ data }: { data: AtomNodeData }) {
  const variant = getPillarVariant(data.type);

  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/90 p-2.5 text-slate-100 shadow-md transition-all min-w-[200px] max-w-[240px]">
      <Handle type="target" position={Position.Left} className="!bg-slate-500 w-2 h-2" />
      <div className="flex items-center justify-between gap-1 mb-1">
        <UiBadge variant={variant} className="text-[10px] uppercase font-mono px-1.5 py-0">
          {data.type}
          {typeof data.priority === 'number' && `-P${data.priority}`}
        </UiBadge>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-500 font-mono truncate max-w-[70px]">
            {data.package || '全局'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="text-xs font-mono font-medium text-slate-200 truncate flex-1 text-left cursor-pointer hover:text-indigo-300 hover:underline bg-transparent border-none p-0"
          onClick={() => data.onEdit?.(data.id)}
          title={`点击打开原子 ${data.id} 编辑`}
        >
          {data.id}
        </button>
      </div>

      {data.description && (
        <div
          className="text-[10px] text-slate-400 mt-1 line-clamp-2 font-sans leading-tight border-t border-slate-800/60 pt-1"
          title={data.description}
        >
          {data.description}
        </div>
      )}

      {data.type === 'd2' && (
        <Handle type="source" position={Position.Right} className="!bg-emerald-500 w-2 h-2" />
      )}
    </div>
  );
}
